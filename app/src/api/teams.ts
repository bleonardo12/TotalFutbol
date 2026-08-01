import { apiRequest } from "./client";

export interface Equipo {
  id: string;
  nombre: string;
  estado: "PROVISIONAL" | "RANKEADO";
  rating: number;
  rd: number;
  volatilidad: number;
}

export function crearEquipo(token: string, nombre: string): Promise<Equipo> {
  return apiRequest("/teams", { method: "POST", token, body: { nombre } });
}

export function misEquipos(token: string): Promise<Equipo[]> {
  return apiRequest("/teams/mios", { token });
}
