import { Injectable } from "@nestjs/common";
import type { Prisma, TipoEventoFairPlay } from "@prisma/client";
import { calcularFairPlay } from "@totalfutbol/core";

@Injectable()
export class FairPlayService {
  /**
   * Aplica un evento de fair-play a un equipo: lee su historial completo
   * de fair_play_ledger, recalcula el score con decay temporal incluyendo
   * el evento nuevo, escribe el asiento append-only y materializa el
   * resultado en Team.fairPlay. Mismo patron transaccional que
   * RatingService.liquidar — debe correr dentro de la misma transaccion
   * que quien llama.
   */
  async aplicar(
    tx: Prisma.TransactionClient,
    teamId: string,
    matchId: string | null,
    tipo: TipoEventoFairPlay,
    delta: number,
  ): Promise<void> {
    const eventosPrevios = await tx.fairPlayLedger.findMany({
      where: { teamId },
      select: { delta: true, createdAt: true },
    });

    const ahora = new Date();
    const fairPlayResultante = calcularFairPlay(
      [...eventosPrevios, { delta, createdAt: ahora }],
      ahora,
    );

    await tx.fairPlayLedger.create({
      data: { teamId, matchId, tipo, delta, fairPlayResultante, createdAt: ahora },
    });

    await tx.team.update({
      where: { id: teamId },
      data: { fairPlay: fairPlayResultante },
    });
  }
}
