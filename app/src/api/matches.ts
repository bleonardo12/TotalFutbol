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

export const ETIQUETA_ESTADO_PARTIDO: Record<EstadoPartido, string> = {
  PACTADO: "Pactado",
  FIRMADO: "Firmado",
  EN_JUEGO: "En juego",
  REPORTADO: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_DISPUTA: "En disputa",
  LIQUIDADO: "Liquidado",
  SUSPENDIDO: "Suspendido",
  VOID: "Anulado",
};

export const TONO_ESTADO_PARTIDO: Record<
  EstadoPartido,
  "neutral" | "elite" | "error" | "alerta"
> = {
  PACTADO: "neutral",
  FIRMADO: "elite",
  EN_JUEGO: "elite",
  REPORTADO: "alerta",
  CONFIRMADO: "elite",
  EN_DISPUTA: "error",
  LIQUIDADO: "elite",
  SUSPENDIDO: "alerta",
  VOID: "neutral",
};

export interface EquipoResumen {
  id: string;
  nombre: string;
  fairPlay: number;
}

export interface UsuarioResumen {
  id: string;
  telefono: string;
  nombre: string | null;
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
  createdAt: string;
}

export interface Partido {
  id: string;
  equipoLocalId: string;
  equipoVisitanteId: string;
  cantidadJugadores: CantidadJugadores;
  superficie: Superficie;
  estado: EstadoPartido;
  /** null en un partido PACTADO a distancia hasta que alguien lo genera al firmar en cancha. */
  codigoHandshake: string | null;
  reporterLocalId: string | null;
  reporterVisitanteId: string | null;
  outcomeFinal: OutcomePartido | null;
  createdAt: string;
  equipoLocal: EquipoResumen;
  equipoVisitante: EquipoResumen;
  /** null hasta que alguien genera/confirma el codigo -- el reporter se fija recien al firmar. */
  reporterLocal: UsuarioResumen | null;
  reporterVisitante: UsuarioResumen | null;
  reportes: ReporteResultado[];
}

interface EquipoResumenConRating extends EquipoResumen {
  rating: number;
  rd: number;
  volatilidad: number;
}

interface DeltaPorLado {
  local: number;
  visitante: number;
}

/**
 * `obtenerPartido` (GET /matches/:id) trae mas que la lista de `misPartidos`: rating/rd/volatilidad
 * de ambos equipos, la sede, y proyeccion/deltas de rating (docs Guapo §3.2 -- celda "EN JUEGO" de
 * Firmar, delta por opcion en Reportar, delta real en Liquidado).
 */
export interface PartidoDetalle extends Omit<Partido, "equipoLocal" | "equipoVisitante"> {
  equipoLocal: EquipoResumenConRating;
  equipoVisitante: EquipoResumenConRating;
  sede: { id: string; nombre: string; lat: number; lng: number } | null;
  /** Presente si el partido todavia no tiene outcomeFinal. */
  proyeccion?: {
    siGanaLocal: DeltaPorLado;
    siGanaVisitante: DeltaPorLado;
    siEmpate: DeltaPorLado;
  };
  /** Presente solo si estado === "LIQUIDADO". */
  deltas?: DeltaPorLado;
}

export function generarHandshake(
  token: string,
  equipoLocalId: string,
  cantidadJugadores: CantidadJugadores,
  superficie: Superficie,
  sedeId?: string,
): Promise<{ codigo: string; expiraEn: string }> {
  return apiRequest("/matches/generar", {
    method: "POST",
    token,
    body: { equipoLocalId, cantidadJugadores, superficie, sedeId },
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

export function obtenerPartido(token: string, id: string): Promise<PartidoDetalle> {
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

/**
 * Incidentes/agresiones (concepto.md §11): no adjudica quien tuvo la culpa,
 * se pega al partido. Un flag por equipo por partido (la API da 409 en el
 * segundo intento del mismo equipo).
 */
export function flaggearIncidente(token: string, id: string, descripcion?: string): Promise<void> {
  return apiRequest(`/matches/${id}/incidente`, {
    method: "POST",
    token,
    body: { descripcion },
  });
}

/** Baja gratis de un pacto a distancia, solo dentro de la ventana de desistimiento (24h). */
export function desistirPartido(token: string, id: string): Promise<void> {
  return apiRequest(`/matches/${id}/desistir`, { method: "POST", token });
}

/** Firmar en cancha un partido pactado: un capitan genera el codigo/QR. */
export function generarCodigoFirma(
  token: string,
  id: string,
): Promise<{ codigo: string; expiraEn: string }> {
  return apiRequest(`/matches/${id}/firmar/generar`, { method: "POST", token });
}

/** El capitan del otro equipo confirma el codigo mostrado en persona. */
export function confirmarFirma(token: string, id: string, codigo: string): Promise<Partido> {
  return apiRequest(`/matches/${id}/firmar/confirmar`, { method: "POST", token, body: { codigo } });
}

/**
 * "El rival no aparecio" (concepto.md §12), solo disponible pasada la
 * ventana de desistimiento. Si el otro equipo no lo contesta, a las 24h
 * se aplica el golpe de fair-play; si tambien flaggea, se anula sin
 * penalidad (mutuo, ambiguo).
 */
export function flaggearNoShow(token: string, id: string): Promise<void> {
  return apiRequest(`/matches/${id}/no-show`, { method: "POST", token });
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
