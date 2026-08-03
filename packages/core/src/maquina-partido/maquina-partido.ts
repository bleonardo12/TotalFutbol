/**
 * Maquina de estados del partido (concepto.md §8):
 *
 *   [PACTADO, solo etapa 2] -> FIRMADO (QR en cancha) -> EN_JUEGO -> REPORTADO
 *   -> CONFIRMADO | EN_DISPUTA -> LIQUIDADO
 *                                        ↘ SUSPENDIDO/ABANDONADO -> VOID
 *
 * Hito 1 (la espina) cablea el camino feliz completo: PACTADO -> FIRMADO ->
 * EN_JUEGO -> REPORTADO -> CONFIRMADO -> LIQUIDADO.
 *
 * Hito 2 (disputas) agrega REPORTADO -> EN_DISPUTA (los reportes discrepan)
 * y EN_DISPUTA -> CONFIRMADO | VOID (arbol de disputa, concepto.md §10; el
 * admin puede resolver en cualquier capa, no solo C3).
 *
 * Hito 5a (desafios a distancia) agrega PACTADO -> VOID: un pacto que se
 * cae antes de firmarse por QR (desistimiento dentro de la ventana o
 * no-show, concepto.md §8 y §12) nunca produce resultado de rating, solo
 * VOID -- nunca LIQUIDADO sin haber pasado por FIRMADO.
 *
 * SUSPENDIDO -> VOID (agresion/abandono en pleno partido) sigue sin
 * cablear.
 */
export type EstadoPartido =
  | "PACTADO"
  | "FIRMADO"
  | "EN_JUEGO"
  | "REPORTADO"
  | "CONFIRMADO"
  | "EN_DISPUTA"
  | "LIQUIDADO"
  | "SUSPENDIDO"
  | "VOID";

/** En etapa 1 (presencial) el partido nace directo en FIRMADO; PACTADO es solo etapa 2. */
export const ESTADOS_INICIALES_VALIDOS: readonly EstadoPartido[] = ["PACTADO", "FIRMADO"];

const TRANSICIONES: Readonly<Record<EstadoPartido, readonly EstadoPartido[]>> = {
  PACTADO: ["FIRMADO", "VOID"],
  FIRMADO: ["EN_JUEGO"],
  EN_JUEGO: ["REPORTADO"],
  REPORTADO: ["CONFIRMADO", "EN_DISPUTA"],
  CONFIRMADO: ["LIQUIDADO"],
  LIQUIDADO: [],
  EN_DISPUTA: ["CONFIRMADO", "VOID"],
  SUSPENDIDO: [],
  VOID: [],
};

export function esEstadoInicialValido(estado: EstadoPartido): boolean {
  return ESTADOS_INICIALES_VALIDOS.includes(estado);
}

export function puedeTransicionar(desde: EstadoPartido, hacia: EstadoPartido): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function esEstadoTerminal(estado: EstadoPartido): boolean {
  return TRANSICIONES[estado].length === 0;
}

export class TransicionInvalidaError extends Error {
  constructor(
    public readonly desde: EstadoPartido,
    public readonly hacia: EstadoPartido,
  ) {
    super(`Transicion invalida de partido: ${desde} -> ${hacia}`);
    this.name = "TransicionInvalidaError";
  }
}

/** Aplica la transicion si es valida; si no, lanza TransicionInvalidaError. */
export function transicionar(desde: EstadoPartido, hacia: EstadoPartido): EstadoPartido {
  if (!puedeTransicionar(desde, hacia)) {
    throw new TransicionInvalidaError(desde, hacia);
  }
  return hacia;
}
