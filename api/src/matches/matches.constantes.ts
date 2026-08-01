export const HANDSHAKE_CODIGO_LONGITUD = 8;
export const HANDSHAKE_TTL_MINUTOS = 10;

/** Sin 0/O/1/I/L: se puede tipear a mano si falla el escaneo del QR (concepto.md §2). */
export const HANDSHAKE_ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Ventana unica con reloj para todo lo que pide concepto.md §10: reporte
 * (Capa B, silencio=asentimiento) y cada capa del arbol de disputa
 * (C1 evidencia, C2 planteles, C3 admin). Un solo numero porque es lo que
 * se definio; si alguna capa necesita otra duracion, es un solo lugar.
 */
export const VENTANA_DISPUTA_HORAS = 24;

export const COLA_VENCIMIENTO_REPORTE = "vencimiento-reporte";
