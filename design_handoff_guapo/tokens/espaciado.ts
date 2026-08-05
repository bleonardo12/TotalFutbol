/** Espaciado y radios Guapo. Reemplaza app/src/theme/espaciado.ts */

export const ESPACIADO = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Padding horizontal de pantalla. Baja de 24 a 20: las cards ganan ancho. */
export const PADDING_PANTALLA = 20;

/** Gap vertical por defecto entre bloques de una pantalla. */
export const GAP_BLOQUE = 14;

export const RADIO = {
  /** Chips cuadrados chicos, barras de progreso internas. */
  sm: 8,
  /** Botones y chips de opcion (cantidad de jugadores, superficie), celdas de stat. */
  md: 11,
  /** Botones grandes y cards de lista. */
  lg: 14,
  /** Card estandar. */
  xl: 16,
  /** Card hero: rating, firmar, provisional, perfil de equipo. */
  xxl: 20,
  /** Chips de division y estado. */
  pill: 999,
} as const;

/** Padding interno por tipo de card. */
export const PADDING_CARD = {
  normal: 16,
  hero: 22,
} as const;
