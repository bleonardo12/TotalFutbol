import type { Division } from "./tipos";

/** Cortes por percentil del ranking global, de mejor a peor (concepto.md §6). */
export const ORDEN_DIVISIONES: readonly Division[] = ["ELITE", "ORO", "PLATA", "BRONCE"];

/**
 * Partidos LIQUIDADO perpetuos minimos para que un equipo pueda entrar a
 * Elite (concepto.md §6: "bloqueada hasta completar X partidos verificados",
 * X sin definir). Bloqueo por confianza, no por rank. Default a calibrar
 * despues, mismo criterio que RATING_INICIAL.
 */
export const PARTIDOS_MINIMOS_PARA_ELITE = 5;
