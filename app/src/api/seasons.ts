import { apiRequest } from "./client";

export interface Temporada {
  id: string;
  anio: number;
  fechaInicio: string;
  fechaFin: string;
  cerrada: boolean;
  cerradaEn: string | null;
}

export function obtenerTemporadaActual(): Promise<Temporada> {
  return apiRequest("/seasons/actual");
}

/** Solo ADMIN. Irreversible: no reasigna divisiones, solo registra el palmares del año. */
export function cerrarTemporada(token: string): Promise<Temporada> {
  return apiRequest("/seasons/cerrar", { method: "POST", token });
}
