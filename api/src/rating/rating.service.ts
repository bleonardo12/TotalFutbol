import { Injectable } from "@nestjs/common";
import { OutcomePartido, Prisma } from "@prisma/client";
import { liquidarPartido, type ResultadoOutcome } from "@totalfutbol/core";

function outcomeLocalDesde(outcome: OutcomePartido): ResultadoOutcome {
  switch (outcome) {
    case "GANA_LOCAL":
      return "G";
    case "GANA_VISITANTE":
      return "P";
    case "EMPATE":
      return "E";
  }
}

@Injectable()
export class RatingService {
  /**
   * Calcula el delta Glicko-2 de ambos lados, escribe un asiento en
   * rating_ledger por equipo (append-only) y materializa el rating
   * resultante en Team. El equipo sale de PROVISIONAL: recien pisa la
   * escalera con un partido mutuamente confirmado (concepto.md §4).
   *
   * Debe correr dentro de la misma transaccion que confirma el partido
   * (quien llama es responsable de eso y de mover el estado a LIQUIDADO).
   */
  async liquidar(
    tx: Prisma.TransactionClient,
    matchId: string,
    equipoLocalId: string,
    equipoVisitanteId: string,
    outcome: OutcomePartido,
  ): Promise<void> {
    const [equipoLocal, equipoVisitante] = await Promise.all([
      tx.team.findUniqueOrThrow({ where: { id: equipoLocalId } }),
      tx.team.findUniqueOrThrow({ where: { id: equipoVisitanteId } }),
    ]);

    const { local, visitante } = liquidarPartido(
      { rating: equipoLocal.rating, rd: equipoLocal.rd, volatilidad: equipoLocal.volatilidad },
      {
        rating: equipoVisitante.rating,
        rd: equipoVisitante.rd,
        volatilidad: equipoVisitante.volatilidad,
      },
      outcomeLocalDesde(outcome),
    );

    await tx.ratingLedger.create({
      data: {
        teamId: equipoLocalId,
        matchId,
        delta: local.delta,
        ratingResultante: local.resultante.rating,
        rdResultante: local.resultante.rd,
        volatilidadResultante: local.resultante.volatilidad,
      },
    });
    await tx.ratingLedger.create({
      data: {
        teamId: equipoVisitanteId,
        matchId,
        delta: visitante.delta,
        ratingResultante: visitante.resultante.rating,
        rdResultante: visitante.resultante.rd,
        volatilidadResultante: visitante.resultante.volatilidad,
      },
    });

    await tx.team.update({
      where: { id: equipoLocalId },
      data: {
        rating: local.resultante.rating,
        rd: local.resultante.rd,
        volatilidad: local.resultante.volatilidad,
        estado: "RANKEADO",
      },
    });
    await tx.team.update({
      where: { id: equipoVisitanteId },
      data: {
        rating: visitante.resultante.rating,
        rd: visitante.resultante.rd,
        volatilidad: visitante.resultante.volatilidad,
        estado: "RANKEADO",
      },
    });
  }
}
