import { apiRequest } from "./client";

export interface EntradaRanking {
  posicion: number;
  id: string;
  nombre: string;
  rating: number;
  rd: number;
  volatilidad: number;
}

export function obtenerRanking(): Promise<EntradaRanking[]> {
  return apiRequest("/ranking");
}
