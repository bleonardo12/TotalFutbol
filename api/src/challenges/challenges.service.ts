import { InjectQueue } from "@nestjs/bullmq";
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Challenge } from "@prisma/client";
import type { Queue } from "bullmq";
import { FairPlayService } from "../fair-play/fair-play.service";
import { MatchesService } from "../matches/matches.service";
import { PrismaService } from "../prisma/prisma.service";
import { CHALLENGE_TTL_HORAS, COLA_VENCIMIENTO_DESAFIO } from "./challenges.constantes";
import { ProponerDesafioDto } from "./dto/proponer-desafio.dto";

const INCLUIR_DETALLE = {
  desafiante: { select: { id: true, nombre: true } },
  desafiado: { select: { id: true, nombre: true } },
  sede: true,
  partido: { select: { id: true } },
} as const;

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchesService: MatchesService,
    private readonly fairPlayService: FairPlayService,
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

  /** Desafios (propuestos o respondidos) donde alguno de mis equipos participa. */
  async misDesafios(usuarioId: string) {
    const misEquipos = await this.prisma.teamMember.findMany({
      where: { userId: usuarioId },
      select: { teamId: true },
    });
    const equipoIds = misEquipos.map((m) => m.teamId);

    return this.prisma.challenge.findMany({
      where: { OR: [{ desafianteId: { in: equipoIds } }, { desafiadoId: { in: equipoIds } }] },
      orderBy: { createdAt: "desc" },
      include: INCLUIR_DETALLE,
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
}
