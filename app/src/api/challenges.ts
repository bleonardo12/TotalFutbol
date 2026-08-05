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
  "neutral" | "elite" | "error" | "alerta"
> = {
  PROPUESTO: "alerta",
  ACEPTADO: "elite",
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

/** misDesafios() suma los deltas proyectados (docs Guapo §3.1) -- proponer/aceptar/rechazar no los traen. */
export interface DesafioConDeltas extends Desafio {
  /** Cuanto gana el desafiante si gana el partido. */
  deltaSiGanaDesafiante: number;
  /** Cuanto gana el desafiado si gana el partido. */
  deltaSiGanaDesafiado: number;
}

export function misDesafios(token: string): Promise<DesafioConDeltas[]> {
  return apiRequest("/challenges/mios", { token });
}

/** Solo el equipo desafiado puede aceptar. Devuelve el Match nacido en PACTADO. */
export function aceptarDesafio(token: string, id: string): Promise<Partido> {
  return apiRequest(`/challenges/${id}/aceptar`, { method: "POST", token });
}

export function rechazarDesafio(token: string, id: string): Promise<Desafio> {
  return apiRequest(`/challenges/${id}/rechazar`, { method: "POST", token });
}
