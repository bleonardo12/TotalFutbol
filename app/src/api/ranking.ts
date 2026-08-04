import { apiRequest } from "./client";
import type { CategoriaFutbol, Division } from "./teams";

export interface EntradaRanking {
  posicion: number;
  id: string;
  nombre: string;
  rating: number;
  rd: number;
  volatilidad: number;
  division: Division;
}

/** No existe un ranking "todas las categorias mezcladas" (Hito 6c): categoria es obligatoria. */
export function obtenerRanking(
  categoria: CategoriaFutbol,
  division?: Division,
): Promise<EntradaRanking[]> {
  const query = division ? `&division=${division}` : "";
  return apiRequest(`/ranking?categoria=${categoria}${query}`);
}
