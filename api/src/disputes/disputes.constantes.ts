export const NONCE_LONGITUD = 8;

/** Sin 0/O/1/I/L: se puede leer/escribir a mano desde una foto (concepto.md §9). */
export const NONCE_ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const EVIDENCIA_MIME_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
export const EVIDENCIA_TAMANO_MAXIMO_BYTES = 8 * 1024 * 1024;
