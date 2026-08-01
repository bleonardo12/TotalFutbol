export type Division = "PROMOCIONAL" | "ASCENSO" | "PRIMERA" | "ELITE";

export type ResultadoTemporada = "G" | "E" | "P";

export interface PartidoDeTemporada {
  equipoId: string;
  resultado: ResultadoTemporada;
}

export interface FilaTabla {
  equipoId: string;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  puntos: number;
}
