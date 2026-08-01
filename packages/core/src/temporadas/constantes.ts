import type { Division } from "./tipos";

/** Orden estilo AFA de menor a mayor (concepto.md §6). */
export const ORDEN_DIVISIONES: readonly Division[] = ["PROMOCIONAL", "ASCENSO", "PRIMERA", "ELITE"];

/**
 * Cuantos equipos suben/bajan por division al cierre de temporada. Sin
 * numero definido en los docs — default a calibrar despues, mismo criterio
 * que RATING_INICIAL.
 */
export const EQUIPOS_QUE_ASCIENDEN = 2;
export const EQUIPOS_QUE_DESCIENDEN = 2;

/**
 * Partidos LIQUIDADO perpetuos minimos para que un equipo pueda entrar a
 * Elite (concepto.md §6: "bloqueada hasta completar X partidos verificados",
 * X sin definir). Default a calibrar despues.
 */
export const PARTIDOS_MINIMOS_PARA_ELITE = 5;

export const PUNTOS_POR_RESULTADO = {
  G: 3,
  E: 1,
  P: 0,
} as const;
