import { ORDEN_DIVISIONES, PARTIDOS_MINIMOS_PARA_ELITE } from "./constantes";
import type { Division } from "./tipos";

/**
 * La division de un equipo no es un dato guardado: es lo que resulta de
 * cortar el ranking global (siempre vivo) por percentil, ahora mismo
 * (concepto.md §6 — no es una liga con tabla de puntos, es un ranking de
 * desafios tipo Spindex). `posicion` es 0-indexed, ordenado por rating
 * descendente entre los equipos RANKEADO; `total` es la cantidad de esos
 * equipos.
 *
 * Un equipo que por rating caeria en Elite pero todavia no tiene
 * `PARTIDOS_MINIMOS_PARA_ELITE` partidos liquidados queda bloqueado en Oro
 * — bloqueo por confianza (RD bajo), no por rank.
 */
export function asignarDivision(
  posicion: number,
  total: number,
  partidosLiquidados: number,
): Division {
  const percentil = posicion / total;
  const indiceBanda = Math.min(
    ORDEN_DIVISIONES.length - 1,
    Math.floor(percentil * ORDEN_DIVISIONES.length),
  );
  const bandaPorRating = ORDEN_DIVISIONES[indiceBanda] as Division;

  if (bandaPorRating === "ELITE" && partidosLiquidados < PARTIDOS_MINIMOS_PARA_ELITE) {
    return "ORO";
  }

  return bandaPorRating;
}
