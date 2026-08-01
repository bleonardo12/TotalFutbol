import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type User } from "@prisma/client";
import { randomInt } from "node:crypto";
import { VENTANA_DISPUTA_HORAS } from "../matches/matches.constantes";
import { PrismaService } from "../prisma/prisma.service";
import { NONCE_ALFABETO, NONCE_LONGITUD } from "./disputes.constantes";

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Abre la disputa cuando el segundo reporte discrepa del primero
   * (concepto.md §10, Capa C). Corre dentro de la misma transaccion que
   * el reporte que la dispara — quien llama es responsable de la
   * transicion de estado del Match (EN_DISPUTA).
   */
  async abrir(tx: Prisma.TransactionClient, matchId: string): Promise<void> {
    for (let intento = 0; intento < 5; intento++) {
      const nonce = this.generarNonce();
      try {
        await tx.dispute.create({
          data: {
            matchId,
            capa: "C1_EVIDENCIA",
            nonce,
            capaExpiraEn: new Date(Date.now() + VENTANA_DISPUTA_HORAS * 60 * 60 * 1000),
          },
        });
        return;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue; // colision de nonce (muy improbable): reintenta con uno nuevo
        }
        throw error;
      }
    }

    throw new Error("No se pudo generar un nonce de disputa unico");
  }

  /**
   * El admin ve todo, incluidas las respuestas del poll de plantel (C2).
   * Los equipos involucrados ven la disputa (evidencia de ambos lados
   * incluida) pero no las respuestas del poll — no es una votacion
   * publica, es señal para el admin (concepto.md §10).
   */
  async obtenerPorMatchId(matchId: string, usuario: User) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { equipoLocalId: true, equipoVisitanteId: true },
    });
    if (!match) {
      throw new NotFoundException("Partido no encontrado");
    }

    if (!(await this.puedeVer(usuario, match))) {
      throw new ForbiddenException("No podes ver esta disputa");
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { matchId },
      include: {
        evidencias: {
          include: {
            team: { select: { id: true, nombre: true } },
            subidoPor: { select: { id: true, telefono: true, nombre: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        resueltaPor: { select: { id: true, telefono: true, nombre: true } },
        respuestasPlantel:
          usuario.rol === "ADMIN"
            ? {
                include: {
                  integrante: { select: { id: true, telefono: true, nombre: true } },
                  team: { select: { id: true, nombre: true } },
                },
              }
            : false,
      },
    });

    if (!dispute) {
      throw new NotFoundException("Este partido no tiene una disputa abierta");
    }

    return dispute;
  }

  private async puedeVer(
    usuario: User,
    match: { equipoLocalId: string; equipoVisitanteId: string },
  ): Promise<boolean> {
    if (usuario.rol === "ADMIN") {
      return true;
    }
    const esIntegrante = await this.prisma.teamMember.findFirst({
      where: { userId: usuario.id, teamId: { in: [match.equipoLocalId, match.equipoVisitanteId] } },
    });
    return esIntegrante !== null;
  }

  private generarNonce(): string {
    let nonce = "";
    for (let i = 0; i < NONCE_LONGITUD; i++) {
      nonce += NONCE_ALFABETO[randomInt(NONCE_ALFABETO.length)];
    }
    return nonce;
  }
}
