/** Rating + RD (deviation) + volatilidad de un equipo, en la escala original (r~1500). */
export interface EstadoGlicko {
  rating: number;
  rd: number;
  volatilidad: number;
}

/** Outcome-only (concepto.md §6): el marcador no mueve el rating. */
export type ResultadoOutcome = "G" | "E" | "P";

export interface ResultadoRival {
  rival: EstadoGlicko;
  resultado: ResultadoOutcome;
}

export interface ConfiguracionGlicko2 {
  /** Restringe cuanto puede cambiar la volatilidad de un periodo a otro. */
  tau: number;
}

export interface AsientoRating {
  anterior: EstadoGlicko;
  resultante: EstadoGlicko;
  delta: number;
}
