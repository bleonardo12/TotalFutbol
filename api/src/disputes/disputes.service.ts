import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomInt } from "node:crypto";
import { VENTANA_DISPUTA_HORAS } from "../matches/matches.constantes";
import { NONCE_ALFABETO, NONCE_LONGITUD } from "./disputes.constantes";

@Injectable()
export class DisputesService {
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

  private generarNonce(): string {
    let nonce = "";
    for (let i = 0; i < NONCE_LONGITUD; i++) {
      nonce += NONCE_ALFABETO[randomInt(NONCE_ALFABETO.length)];
    }
    return nonce;
  }
}
