import { apiRequest } from "./client";
import type { Division } from "./teams";

export interface EntradaRanking {
  posicion: number;
  id: string;
  nombre: string;
  rating: number;
  rd: number;
  volatilidad: number;
  division: Division;
}

export function obtenerRanking(division?: Division): Promise<EntradaRanking[]> {
  const query = division ? `?division=${division}` : "";
  return apiRequest(`/ranking${query}`);
}
