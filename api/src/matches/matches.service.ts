import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { type EstadoPartido, OutcomePartido, Prisma } from "@prisma/client";
import { esEstadoInicialValido, transicionar } from "@totalfutbol/core";
import { randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RatingService } from "../rating/rating.service";
import { ConsumirHandshakeDto } from "./dto/consumir-handshake.dto";
import { GenerarHandshakeDto } from "./dto/generar-handshake.dto";
import { ReportarResultadoDto } from "./dto/reportar-resultado.dto";
import {
  HANDSHAKE_ALFABETO,
  HANDSHAKE_CODIGO_LONGITUD,
  HANDSHAKE_TTL_MINUTOS,
} from "./matches.constantes";

const INCLUIR_DETALLE = {
  equipoLocal: { select: { id: true, nombre: true } },
  equipoVisitante: { select: { id: true, nombre: true } },
  sede: true,
  reporterLocal: { select: { id: true, telefono: true, nombre: true } },
  reporterVisitante: { select: { id: true, telefono: true, nombre: true } },
  reportes: true,
} as const;

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingService: RatingService,
  ) {}

  async generar(
    usuarioId: string,
    dto: GenerarHandshakeDto,
  ): Promise<{ codigo: string; expiraEn: Date }> {
    await this.verificarPertenencia(usuarioId, dto.equipoLocalId);

    const expiraEn = new Date(Date.now() + HANDSHAKE_TTL_MINUTOS * 60_000);

    for (let intento = 0; intento < 5; intento++) {
      const codigo = this.generarCodigo();
      try {
        const handshake = await this.prisma.matchHandshake.create({
          data: {
            codigo,
            equipoLocalId: dto.equipoLocalId,
            generadoPorId: usuarioId,
            cantidadJugadores: dto.cantidadJugadores,
            superficie: dto.superficie,
            sedeId: dto.sedeId,
            expiraEn,
          },
        });
        return { codigo: handshake.codigo, expiraEn: handshake.expiraEn };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue; // colision de codigo (muy improbable): reintenta con uno nuevo
        }
        throw error;
      }
    }

    throw new Error("No se pudo generar un codigo de partido unico");
  }

  async consumir(usuarioId: string, dto: ConsumirHandshakeDto) {
    const handshake = await this.prisma.matchHandshake.findFirst({
      where: { codigo: dto.codigo, consumidoEn: null, expiraEn: { gt: new Date() } },
    });

    if (!handshake) {
      throw new NotFoundException("Codigo invalido, vencido o ya usado");
    }

    if (handshake.equipoLocalId === dto.equipoVisitanteId) {
      throw new ConflictException("Un equipo no puede jugar contra si mismo");
    }

    await this.verificarPertenencia(usuarioId, dto.equipoVisitanteId);

    // Marca de consumo atomica: si otro request ya lo uso en el medio, count da 0.
    const marcado = await this.prisma.matchHandshake.updateMany({
      where: { id: handshake.id, consumidoEn: null },
      data: { consumidoEn: new Date() },
    });
    if (marcado.count === 0) {
      throw new ConflictException("El codigo ya fue usado");
    }

    if (!esEstadoInicialValido("FIRMADO")) {
      throw new Error("FIRMADO dejo de ser un estado inicial valido");
    }
    const estadoDeArranque = transicionar("FIRMADO", "EN_JUEGO");

    return this.prisma.match.create({
      data: {
        equipoLocalId: handshake.equipoLocalId,
        equipoVisitanteId: dto.equipoVisitanteId,
        cantidadJugadores: handshake.cantidadJugadores,
        superficie: handshake.superficie,
        sedeId: handshake.sedeId,
        codigoHandshake: handshake.codigo,
        estado: estadoDeArranque,
        reporterLocalId: handshake.generadoPorId,
        reporterVisitanteId: usuarioId,
      },
      include: INCLUIR_DETALLE,
    });
  }

  async buscarPorId(id: string) {
    return this.prisma.match.findUnique({ where: { id }, include: INCLUIR_DETALLE });
  }

  /**
   * Doble reporte independiente (concepto.md §9). Un reporte mueve
   * EN_JUEGO -> REPORTADO; el segundo, si coincide en outcome con el
   * primero, mueve REPORTADO -> CONFIRMADO y liquida en el acto
   * (CONFIRMADO -> LIQUIDADO), escribiendo el asiento en rating_ledger
   * dentro de la misma transaccion. Si discrepan, el partido queda en
   * REPORTADO — el arbol de disputa (§10) es del hito de disputas,
   * todavia no esta cableado.
   */
  async reportar(usuarioId: string, matchId: string, dto: ReportarResultadoDto) {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) {
        throw new NotFoundException("Partido no encontrado");
      }

      let teamId: string;
      if (match.reporterLocalId === usuarioId) {
        teamId = match.equipoLocalId;
      } else if (match.reporterVisitanteId === usuarioId) {
        teamId = match.equipoVisitanteId;
      } else {
        throw new ForbiddenException("No sos el reporter fijado para este partido");
      }

      if (match.estado !== "EN_JUEGO" && match.estado !== "REPORTADO") {
        throw new ConflictException("Este partido ya no admite reportes");
      }

      try {
        await tx.matchReport.create({
          data: {
            matchId,
            teamId,
            reporterId: usuarioId,
            outcome: dto.outcome,
            golesLocal: dto.golesLocal,
            golesVisita: dto.golesVisita,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("Ya reportaste el resultado de este partido");
        }
        throw error;
      }

      let estadoActual: EstadoPartido = match.estado;
      if (estadoActual === "EN_JUEGO") {
        estadoActual = transicionar("EN_JUEGO", "REPORTADO");
      }

      const reportes = await tx.matchReport.findMany({ where: { matchId } });
      let outcomeFinal: OutcomePartido | undefined;

      if (reportes.length >= 2) {
        const primero = reportes[0];
        if (primero && reportes.every((r) => r.outcome === primero.outcome)) {
          estadoActual = transicionar("REPORTADO", "CONFIRMADO");
          outcomeFinal = primero.outcome;
        }
      }

      if (estadoActual === "CONFIRMADO" && outcomeFinal) {
        await this.ratingService.liquidar(
          tx,
          matchId,
          match.equipoLocalId,
          match.equipoVisitanteId,
          outcomeFinal,
        );
        estadoActual = transicionar("CONFIRMADO", "LIQUIDADO");
      }

      return tx.match.update({
        where: { id: matchId },
        data: { estado: estadoActual, outcomeFinal },
        include: INCLUIR_DETALLE,
      });
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

  private generarCodigo(): string {
    let codigo = "";
    for (let i = 0; i < HANDSHAKE_CODIGO_LONGITUD; i++) {
      codigo += HANDSHAKE_ALFABETO[randomInt(HANDSHAKE_ALFABETO.length)];
    }
    return codigo;
  }
}
