import { Injectable } from "@nestjs/common";
import type { Prisma, TipoDeclinacion, TipoEventoFairPlay } from "@prisma/client";
import { calcularFairPlay, debePenalizarBaja, FAIR_PLAY_DELTA } from "@totalfutbol/core";

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

  /**
   * Cuota mensual de bajas (Hito 5a, concepto.md no la especifica: gap
   * resuelto con Leonardo -- ver BAJAS_GRATIS_POR_MES en packages/core).
   * Rechazar un desafio propuesto y desistir de uno ya pactado cuentan
   * juntos para el mismo contador por equipo. Registra el asiento y, si
   * con este ya se supero la cuota del mes en curso, aplica
   * FAIR_PLAY_DELTA.DECLINACION_DESAFIO -- llamar SIEMPRE dentro de la
   * misma transaccion que la baja que la origina (igual que aplicar()).
   */
  async registrarDeclinacionSiCorresponde(
    tx: Prisma.TransactionClient,
    teamId: string,
    tipo: TipoDeclinacion,
    refs: { challengeId?: string; matchId?: string },
  ): Promise<void> {
    const ahora = new Date();
    const inicioDeMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1));

    await tx.declinacionDesafio.create({
      data: {
        teamId,
        tipo,
        challengeId: refs.challengeId,
        matchId: refs.matchId,
        createdAt: ahora,
      },
    });

    const totalEsteMes = await tx.declinacionDesafio.count({
      where: { teamId, createdAt: { gte: inicioDeMes } },
    });

    if (debePenalizarBaja(totalEsteMes)) {
      await this.aplicar(
        tx,
        teamId,
        refs.matchId ?? null,
        "DECLINACION_DESAFIO",
        FAIR_PLAY_DELTA.DECLINACION_DESAFIO,
      );
    }
  }
}
