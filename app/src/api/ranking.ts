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

export interface VecinoEscalera {
  id: string;
  nombre: string;
  rating: number;
  posicion: number;
  esPropio: boolean;
}

export interface MiEntorno {
  posicion: number;
  total: number;
  /** Hasta 2 arriba y 2 abajo, incluye al propio equipo. */
  vecinos: VecinoEscalera[];
  /** null si el equipo nunca liquido un partido. */
  diasInactivo: number | null;
  /** Aproximado: el vecino de arriba con el partido mas reciente, no tracking historico real. */
  pasadoPor: { id: string; nombre: string } | null;
  deltaDelMes: number;
}

/** Vecinos de escalera + posicion + inactividad, para el header y "TU ESCALERA" de Inicio (docs Guapo §3.1). */
export function obtenerMiEntorno(teamId: string): Promise<MiEntorno> {
  return apiRequest(`/ranking/mi-entorno?teamId=${teamId}`);
}
