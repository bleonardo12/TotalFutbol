import type { CantidadJugadores, Partido, Superficie } from "./matches";
import { apiRequest } from "./client";

export type EstadoDesafio = "PROPUESTO" | "ACEPTADO" | "RECHAZADO" | "EXPIRADO";

export interface EquipoResumenDesafio {
  id: string;
  nombre: string;
}

export interface Desafio {
  id: string;
  desafianteId: string;
  desafiadoId: string;
  cantidadJugadores: CantidadJugadores;
  superficie: Superficie;
  fechaPropuesta: string | null;
  estado: EstadoDesafio;
  createdAt: string;
  desafiante: EquipoResumenDesafio;
  desafiado: EquipoResumenDesafio;
  partido: { id: string } | null;
}

export const ETIQUETA_ESTADO_DESAFIO: Record<EstadoDesafio, string> = {
  PROPUESTO: "Propuesto",
  ACEPTADO: "Aceptado",
  RECHAZADO: "Rechazado",
  EXPIRADO: "Expirado",
};

export const TONO_ESTADO_DESAFIO: Record<
  EstadoDesafio,
  "neutral" | "acento" | "exito" | "error" | "alerta"
> = {
  PROPUESTO: "alerta",
  ACEPTADO: "exito",
  RECHAZADO: "error",
  EXPIRADO: "neutral",
};

export function proponerDesafio(
  token: string,
  equipoDesafianteId: string,
  equipoDesafiadoId: string,
  cantidadJugadores: CantidadJugadores,
  superficie: Superficie,
): Promise<Desafio> {
  return apiRequest("/challenges", {
    method: "POST",
    token,
    body: { equipoDesafianteId, equipoDesafiadoId, cantidadJugadores, superficie },
  });
}

export function misDesafios(token: string): Promise<Desafio[]> {
  return apiRequest("/challenges/mios", { token });
}

/** Solo el equipo desafiado puede aceptar. Devuelve el Match nacido en PACTADO. */
export function aceptarDesafio(token: string, id: string): Promise<Partido> {
  return apiRequest(`/challenges/${id}/aceptar`, { method: "POST", token });
}

export function rechazarDesafio(token: string, id: string): Promise<Desafio> {
  return apiRequest(`/challenges/${id}/rechazar`, { method: "POST", token });
}
