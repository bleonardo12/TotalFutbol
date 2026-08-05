import { InjectQueue } from "@nestjs/bullmq";
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Challenge } from "@prisma/client";
import type { Queue } from "bullmq";
import { FairPlayService } from "../fair-play/fair-play.service";
import { MatchesService } from "../matches/matches.service";
import { PrismaService } from "../prisma/prisma.service";
import { RatingService } from "../rating/rating.service";
import { CHALLENGE_TTL_HORAS, COLA_VENCIMIENTO_DESAFIO } from "./challenges.constantes";
import { ProponerDesafioDto } from "./dto/proponer-desafio.dto";

const INCLUIR_DETALLE = {
  desafiante: { select: { id: true, nombre: true } },
  desafiado: { select: { id: true, nombre: true } },
  sede: true,
  partido: { select: { id: true } },
} as const;

const INCLUIR_DETALLE_CON_RATING = {
  desafiante: { select: { id: true, nombre: true, rating: true, rd: true, volatilidad: true } },
  desafiado: { select: { id: true, nombre: true, rating: true, rd: true, volatilidad: true } },
  sede: true,
  partido: { select: { id: true } },
} as const;

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchesService: MatchesService,
    private readonly fairPlayService: FairPlayService,
    private readonly ratingService: RatingService,
    @InjectQueue(COLA_VENCIMIENTO_DESAFIO) private readonly colaVencimiento: Queue,
  ) {}

  /**
   * Propone un desafio a distancia (concepto.md §2, Etapa 2). Sin costo en
   * fichas todavia (Hito 5b) ni contraoferta de fecha/cancha -- el
   * desafiado acepta o rechaza tal cual se propuso.
   */
  async proponer(usuarioId: string, dto: ProponerDesafioDto): Promise<Challenge> {
    if (dto.equipoDesafianteId === dto.equipoDesafiadoId) {
      throw new ConflictException("Un equipo no puede desafiarse a si mismo");
    }
    await this.verificarPertenencia(usuarioId, dto.equipoDesafianteId);
    await this.verificarMismaCategoria(dto.equipoDesafianteId, dto.equipoDesafiadoId);

    const challenge = await this.prisma.challenge.create({
      data: {
        desafianteId: dto.equipoDesafianteId,
        desafiadoId: dto.equipoDesafiadoId,
        cantidadJugadores: dto.cantidadJugadores,
        superficie: dto.superficie,
        sedeId: dto.sedeId,
        fechaPropuesta: dto.fechaPropuesta ? new Date(dto.fechaPropuesta) : undefined,
      },
      include: INCLUIR_DETALLE,
    });

    await this.colaVencimiento.add(
      "vencimiento",
      { challengeId: challenge.id },
      { delay: CHALLENGE_TTL_HORAS * 60 * 60 * 1000, jobId: challenge.id },
    );

    return challenge;
  }

  /** Solo el equipo desafiado puede aceptar. Crea el Match en PACTADO. */
  async aceptar(usuarioId: string, challengeId: string) {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.challenge.findUnique({ where: { id: challengeId } });
      if (!challenge) {
        throw new NotFoundException("Desafio no encontrado");
      }
      await this.verificarPertenencia(usuarioId, challenge.desafiadoId);
      if (challenge.estado !== "PROPUESTO") {
        throw new ConflictException("Este desafio ya no esta pendiente de respuesta");
      }

      await tx.challenge.update({ where: { id: challengeId }, data: { estado: "ACEPTADO" } });
      const partido = await this.matchesService.crearDesdeChallenge(tx, challenge);

      return partido;
    });
  }

  /**
   * Solo el equipo desafiado puede rechazar. Cuenta para la cuota mensual
   * de bajas junto con los desistimientos de partidos ya pactados (ver
   * FairPlayService.registrarDeclinacionSiCorresponde) -- mismo criterio
   * para las dos, ninguna es "peor" que la otra.
   */
  async rechazar(usuarioId: string, challengeId: string): Promise<Challenge> {
    return this.prisma.$transaction(async (tx) => {
      const challenge = await tx.challenge.findUnique({ where: { id: challengeId } });
      if (!challenge) {
        throw new NotFoundException("Desafio no encontrado");
      }
      await this.verificarPertenencia(usuarioId, challenge.desafiadoId);
      if (challenge.estado !== "PROPUESTO") {
        throw new ConflictException("Este desafio ya no esta pendiente de respuesta");
      }

      const actualizado = await tx.challenge.update({
        where: { id: challengeId },
        data: { estado: "RECHAZADO" },
        include: INCLUIR_DETALLE,
      });

      await this.fairPlayService.registrarDeclinacionSiCorresponde(
        tx,
        challenge.desafiadoId,
        "RECHAZO",
        { challengeId },
      );

      return actualizado;
    });
  }

  /**
   * Desafios (propuestos o respondidos) donde alguno de mis equipos participa.
   * Suma el delta de rating proyectado para cada resultado posible ("Ganarles
   * vale +41. Perder, apenas -7", docs Guapo §3.1) -- calculado con el rating
   * actual de ambos equipos, sin persistir nada (`RatingService.proyectar`).
   */
  async misDesafios(usuarioId: string) {
    const misEquipos = await this.prisma.teamMember.findMany({
      where: { userId: usuarioId },
      select: { teamId: true },
    });
    const equipoIds = misEquipos.map((m) => m.teamId);

    const desafios = await this.prisma.challenge.findMany({
      where: { OR: [{ desafianteId: { in: equipoIds } }, { desafiadoId: { in: equipoIds } }] },
      orderBy: { createdAt: "desc" },
      include: INCLUIR_DETALLE_CON_RATING,
    });

    return desafios.map((desafio) => {
      const ganaDesafiante = this.ratingService.proyectar(
        desafio.desafiante,
        desafio.desafiado,
        "GANA_LOCAL",
      );
      const ganaDesafiado = this.ratingService.proyectar(
        desafio.desafiante,
        desafio.desafiado,
        "GANA_VISITANTE",
      );
      return {
        ...desafio,
        deltaDesafianteSiGana: ganaDesafiante.local,
        deltaDesafianteSiPierde: ganaDesafiado.local,
        deltaDesafiadoSiGana: ganaDesafiado.visitante,
        deltaDesafiadoSiPierde: ganaDesafiante.visitante,
      };
    });
  }

  /**
   * Handler del job de vencimiento (concepto.md §14: "los desafios expiran
   * si no se responden"). Idempotente: si ya se acepto o rechazo, no hace
   * nada -- mismo criterio que DisputesService.avanzarCapaSiVence.
   */
  async expirarSiVence(challengeId: string): Promise<void> {
    await this.prisma.challenge.updateMany({
      where: { id: challengeId, estado: "PROPUESTO" },
      data: { estado: "EXPIRADO" },
    });
  }

  private async verificarPertenencia(usuarioId: string, teamId: string): Promise<void> {
    const esIntegrante = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: usuarioId } },
    });
    if (!esIntegrante) {
      throw new ForbiddenException("No sos integrante de ese equipo");
    }
  }

  /** Pools de ranking separados por categoria (Hito 6c): no se puede cruzar un desafio entre ellos. */
  private async verificarMismaCategoria(desafianteId: string, desafiadoId: string): Promise<void> {
    const [desafiante, desafiado] = await Promise.all([
      this.prisma.team.findUniqueOrThrow({ where: { id: desafianteId }, select: { categoria: true } }),
      this.prisma.team.findUniqueOrThrow({ where: { id: desafiadoId }, select: { categoria: true } }),
    ]);
    if (desafiante.categoria !== desafiado.categoria) {
      throw new ConflictException("No podes desafiar a un equipo de otra categoria");
    }
  }
}
