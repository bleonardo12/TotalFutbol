export const FAIR_PLAY_INICIAL = 900;
export const FAIR_PLAY_MAX = 1000;
export const FAIR_PLAY_MIN = 0;

/**
 * Vida media del decay temporal (concepto.md §11: "~6-12 meses"). Un evento
 * de hace esta cantidad de dias pesa la mitad de su delta original. 270 dias
 * (~9 meses) es el punto medio del rango sugerido — pendiente de calibracion
 * con datos reales, mismo criterio que RATING_INICIAL.
 */
export const FAIR_PLAY_VENTANA_DECAY_DIAS = 270;

/**
 * Diferencial de fair-play que dispara la presuncion en C3 (concepto.md
 * §11). Sin numero definido en los docs — arranca en 150 (escala 0-1000)
 * como default a calibrar despues, no una decision final.
 */
export const FAIR_PLAY_UMBRAL_PRESUNCION = 150;

/**
 * Deltas por evento (concepto.md §11, tabla). NO_SHOW esta definido pero
 * sin uso todavia: depende de la Etapa 2 (pacto a distancia / Challenge),
 * que solo tiene el modelo Prisma escrito, sin service ni controller.
 */
export const FAIR_PLAY_DELTA = {
  REPORTE_FALSO_PROBADO: -150,
  NO_SHOW: -80,
  DISPUTA_FRIVOLA: -40,
  GHOSTING: -15,
  INCIDENTE_FLAG: -5,
  PARTIDO_LIMPIO: 3,
} as const;
