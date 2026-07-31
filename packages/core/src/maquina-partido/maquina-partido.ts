/**
 * Maquina de estados del partido (concepto.md §8):
 *
 *   [PACTADO, solo etapa 2] -> FIRMADO (QR en cancha) -> EN_JUEGO -> REPORTADO
 *   -> CONFIRMADO | EN_DISPUTA -> LIQUIDADO
 *                                        ↘ SUSPENDIDO/ABANDONADO -> VOID
 *
 * Hito 1 (la espina) solo cablea el camino feliz: PACTADO -> FIRMADO ->
 * EN_JUEGO -> REPORTADO -> CONFIRMADO -> LIQUIDADO. EN_DISPUTA, SUSPENDIDO
 * y VOID ya estan en el tipo (coinciden con el enum de Prisma) porque son
 * parte del modelo cerrado del dominio, pero sus transiciones dependen del
 * arbol de disputa y se cablean en el hito de disputas (arquitectura.md §8).
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
  PACTADO: ["FIRMADO"],
  FIRMADO: ["EN_JUEGO"],
  EN_JUEGO: ["REPORTADO"],
  REPORTADO: ["CONFIRMADO"],
  CONFIRMADO: ["LIQUIDADO"],
  LIQUIDADO: [],
  EN_DISPUTA: [],
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
