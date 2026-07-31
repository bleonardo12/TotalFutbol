import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { esEstadoInicialValido, transicionar } from "@totalfutbol/core";
import { randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { ConsumirHandshakeDto } from "./dto/consumir-handshake.dto";
import { GenerarHandshakeDto } from "./dto/generar-handshake.dto";
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
} as const;

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

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
