/** Un asiento crudo del ledger, tal como se necesita para recalcular el score. */
export interface EventoFairPlay {
  delta: number;
  createdAt: Date;
}

export type LadoPresuncion = "A" | "B";
