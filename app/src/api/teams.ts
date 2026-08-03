import { apiRequest } from "./client";

/** De mejor a peor (concepto.md §6): corte por percentil del ranking global, no un dato guardado. */
export type Division = "ELITE" | "ORO" | "PLATA" | "BRONCE";

export interface Equipo {
  id: string;
  nombre: string;
  estado: "PROVISIONAL" | "RANKEADO";
  rating: number;
  rd: number;
  volatilidad: number;
  fairPlay: number;
  /** null si el equipo es PROVISIONAL: todavia no rankea. */
  division: Division | null;
}

export function crearEquipo(token: string, nombre: string): Promise<Equipo> {
  return apiRequest("/teams", { method: "POST", token, body: { nombre } });
}

export function misEquipos(token: string): Promise<Equipo[]> {
  return apiRequest("/teams/mios", { token });
}
