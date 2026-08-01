import { apiRequest } from "./client";

export type CantidadJugadores = "F5" | "F6" | "F7" | "F8" | "F11";
export type Superficie = "SINTETICO" | "SALON" | "PASTO" | "TIERRA";
export type EstadoPartido =
  | "PACTADO"
  | "FIRMADO"
  | "EN_JUEGO"
  | "REPORTADO"
  | "CONFIRMADO"
  | "EN_DISPUTA"
  | "LIQUIDADO"
  | "SUSPENDIDO"
  | "VOID";
export type OutcomePartido = "GANA_LOCAL" | "GANA_VISITANTE" | "EMPATE";

export interface EquipoResumen {
  id: string;
  nombre: string;
  fairPlay: number;
}

export type TipoSancionFairPlay = "REPORTE_FALSO_PROBADO" | "DISPUTA_FRIVOLA";

export interface SancionFairPlay {
  tipo: TipoSancionFairPlay;
  equipoSancionadoId: string;
}

export interface ReporteResultado {
  id: string;
  teamId: string;
  reporterId: string;
  outcome: OutcomePartido;
  golesLocal: number | null;
  golesVisita: number | null;
}

export interface Partido {
  id: string;
  equipoLocalId: string;
  equipoVisitanteId: string;
  cantidadJugadores: CantidadJugadores;
  superficie: Superficie;
  estado: EstadoPartido;
  codigoHandshake: string;
  reporterLocalId: string | null;
  reporterVisitanteId: string | null;
  outcomeFinal: OutcomePartido | null;
  equipoLocal: EquipoResumen;
  equipoVisitante: EquipoResumen;
  reportes: ReporteResultado[];
}

export function generarHandshake(
  token: string,
  equipoLocalId: string,
  cantidadJugadores: CantidadJugadores,
  superficie: Superficie,
): Promise<{ codigo: string; expiraEn: string }> {
  return apiRequest("/matches/generar", {
    method: "POST",
    token,
    body: { equipoLocalId, cantidadJugadores, superficie },
  });
}

export function consumirHandshake(
  token: string,
  codigo: string,
  equipoVisitanteId: string,
): Promise<Partido> {
  return apiRequest("/matches/consumir", {
    method: "POST",
    token,
    body: { codigo, equipoVisitanteId },
  });
}

export function misPartidos(token: string): Promise<Partido[]> {
  return apiRequest("/matches/mios", { token });
}

export function obtenerPartido(token: string, id: string): Promise<Partido> {
  return apiRequest(`/matches/${id}`, { token });
}

/**
 * Solo ADMIN. Sin `resolucion` la disputa se anula (VOID, indeterminable).
 * `sancion` es independiente de `resolucion`: se puede anular y ademas
 * sancionar si queda claro que un lado mintio.
 */
export function resolverDisputa(
  token: string,
  id: string,
  resolucion?: OutcomePartido,
  sancion?: SancionFairPlay,
): Promise<Partido> {
  return apiRequest(`/matches/${id}/resolver-disputa`, {
    method: "POST",
    token,
    body: { resolucion, sancion },
  });
}

export function reportarResultado(
  token: string,
  id: string,
  outcome: OutcomePartido,
  golesLocal?: number,
  golesVisita?: number,
): Promise<Partido> {
  return apiRequest(`/matches/${id}/reportar`, {
    method: "POST",
    token,
    body: { outcome, golesLocal, golesVisita },
  });
}
