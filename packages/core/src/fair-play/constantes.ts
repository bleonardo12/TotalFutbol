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
 * Deltas por evento (concepto.md §11, tabla, mas DECLINACION_DESAFIO
 * agregado en Hito 5a: no esta en la tabla original, ver comentario de
 * BAJAS_GRATIS_POR_MES).
 */
export const FAIR_PLAY_DELTA = {
  REPORTE_FALSO_PROBADO: -150,
  NO_SHOW: -80,
  DISPUTA_FRIVOLA: -40,
  DECLINACION_DESAFIO: -40,
  GHOSTING: -15,
  INCIDENTE_FLAG: -5,
  PARTIDO_LIMPIO: 3,
} as const;

/**
 * Cuota mensual de bajas sin penalidad (Hito 5a): rechazar un desafio
 * propuesto y desistir de uno ya pactado (dentro de la ventana) cuentan
 * juntas para el mismo contador por equipo, sin distincion entre uno y
 * otro. Las primeras BAJAS_GRATIS_POR_MES del mes no penalizan (imprevistos
 * genuinos); de la siguiente en adelante, cada una aplica
 * FAIR_PLAY_DELTA.DECLINACION_DESAFIO. Sin esto, aceptar y despues
 * desistir gratis se vuelve un atajo para evitar cualquier penalidad de
 * rechazar directamente -- gap que no estaba cubierto por concepto.md
 * (que solo dice "desistir dentro de la ventana: gratis"), resuelto con
 * Leonardo en la sesion de Hito 5a. Valor inicial a calibrar con datos
 * reales, mismo criterio que el resto de los numeros de fair-play.
 */
export const BAJAS_GRATIS_POR_MES = 2;
