import type { EstadoGlicko } from "./tipos";

export const ESCALA_GLICKO2 = 173.7178;
export const RATING_BASE = 1500;
export const TAU_POR_DEFECTO = 0.5;
export const EPSILON_CONVERGENCIA = 0.000001;

/**
 * Sembrado de un equipo nuevo. Default estandar de Glicko-2 (rating 1500,
 * RD 350, volatilidad 0.06) — pendiente de calibracion propia (ver
 * docs/concepto.md §16), facil de tocar porque vive en un solo lugar.
 */
export const RATING_INICIAL: EstadoGlicko = {
  rating: 1500,
  rd: 350,
  volatilidad: 0.06,
};
