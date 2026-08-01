import { ORDEN_DIVISIONES, PUNTOS_POR_RESULTADO } from "./constantes";
import type { Division, FilaTabla, PartidoDeTemporada } from "./tipos";

/** ELITE no tiene siguiente: devuelve la misma division (clamp). */
export function divisionSiguiente(division: Division): Division {
  const indice = ORDEN_DIVISIONES.indexOf(division);
  const siguiente = ORDEN_DIVISIONES[indice + 1];
  return siguiente ?? division;
}

/** PROMOCIONAL no tiene anterior: devuelve la misma division (clamp). */
export function divisionAnterior(division: Division): Division {
  const indice = ORDEN_DIVISIONES.indexOf(division);
  const anterior = ORDEN_DIVISIONES[indice - 1];
  return anterior ?? division;
}

/**
 * Agrupa resultados por equipo y calcula la tabla AFA-style (3-1-0). No
 * ordena: el desempate (rating perpetuo) lo resuelve quien llama, que tiene
 * el rating y esta funcion no.
 */
export function calcularTabla(partidos: readonly PartidoDeTemporada[]): FilaTabla[] {
  const filas = new Map<string, FilaTabla>();

  for (const { equipoId, resultado } of partidos) {
    const fila = filas.get(equipoId) ?? {
      equipoId,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      puntos: 0,
    };

    fila.pj += 1;
    if (resultado === "G") fila.pg += 1;
    if (resultado === "E") fila.pe += 1;
    if (resultado === "P") fila.pp += 1;
    fila.puntos += PUNTOS_POR_RESULTADO[resultado];

    filas.set(equipoId, fila);
  }

  return [...filas.values()];
}
