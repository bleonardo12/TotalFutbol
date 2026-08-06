export const INVITACION_CODIGO_LONGITUD = 8;

/** Mas largo que el handshake de partido (10 min): el invitado puede necesitar instalar la app y
 * registrarse antes de usar el codigo. */
export const INVITACION_TTL_DIAS = 7;

/** Sin 0/O/1/I/L, mismo alfabeto que HANDSHAKE_ALFABETO (matches.constantes.ts): se puede tipear a
 * mano sin ambiguedad. */
export const INVITACION_ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
