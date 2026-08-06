import { apiRequest } from "./client";
import type { CantidadJugadores, Superficie } from "./matches";

/** De mejor a peor (concepto.md §6): corte por percentil del ranking global, no un dato guardado. */
export type Division = "ELITE" | "ORO" | "PLATA" | "BRONCE";

/** Pools de ranking separados, fijos por equipo -- se elige al crear y no cambia mas (Hito 6c). */
export type CategoriaFutbol = "MASCULINO" | "FEMENINO" | "MIXTO";

export interface Equipo {
  id: string;
  nombre: string;
  capitanId: string;
  categoria: CategoriaFutbol;
  estado: "PROVISIONAL" | "RANKEADO";
  rating: number;
  rd: number;
  volatilidad: number;
  fairPlay: number;
  /** null si el equipo es PROVISIONAL: todavia no rankea. */
  division: Division | null;
}

export function crearEquipo(
  token: string,
  nombre: string,
  categoria: CategoriaFutbol,
): Promise<Equipo> {
  return apiRequest("/teams", { method: "POST", token, body: { nombre, categoria } });
}

export function misEquipos(token: string): Promise<Equipo[]> {
  return apiRequest("/teams/mios", { token });
}

/** Publico (sin token): perfil de cualquier equipo, para verificar contra quien se juega. */
export function obtenerEquipoPorId(id: string): Promise<Equipo> {
  return apiRequest(`/teams/${id}`);
}

export interface FormaEquipo {
  gEP: { g: number; e: number; p: number };
  /** Upsets / partidos ganados, redondeado. 0 si nunca gano. */
  upsetPorcentaje: number;
  /** Rating mas alto alcanzado historicamente. */
  pico: number;
  /** Hasta 10 valores normalizados 0-1, en orden cronologico. */
  barras: number[];
}

/** "TU FORMA" en Inicio: G-E-P, % de upsets, pico historico, mini-grafico (docs Guapo §3.1). */
export function obtenerForma(teamId: string): Promise<FormaEquipo> {
  return apiRequest(`/teams/${teamId}/forma`);
}

export interface ProyeccionDesafio {
  siGano: number;
  siPierdo: number;
}

/** Deltas reales antes de crear el desafio, para Proponer desafio (docs Guapo §3.3). */
export function obtenerProyeccionDesafio(teamId: string, rivalId: string): Promise<ProyeccionDesafio> {
  return apiRequest(`/teams/${teamId}/proyectar-desafio?rivalId=${rivalId}`);
}

export interface FormatoEquipo {
  cantidadJugadores: CantidadJugadores;
  superficie: Superficie;
  partidos: number;
  victorias: number;
  porcentaje: number;
}

/** "DONDE SON BUENOS" del perfil de equipo: partidos liquidados por formato, mejor % primero (docs Guapo §3.5). */
export function obtenerPorFormato(teamId: string): Promise<FormatoEquipo[]> {
  return apiRequest(`/teams/${teamId}/formato`);
}

export interface PalmaresItem {
  anio: number;
  division: Division;
  esCampeonDelAnio: boolean;
}

/** "PALMARES" del perfil de equipo: 1° de cada division al cierre de cada temporada (docs Guapo §3.5). */
export function obtenerPalmares(teamId: string): Promise<PalmaresItem[]> {
  return apiRequest(`/teams/${teamId}/palmares`);
}

export interface PatronSospechoso {
  equipoId: string;
  equipoNombre: string;
  categoria: CategoriaFutbol;
  rivalId: string;
  rivalNombre: string;
  partidos: number;
  porcentaje: number;
}

/** Solo ADMIN. Senal de colusion (equipos fantasma): equipos que concentran sus partidos contra un mismo rival. */
export function obtenerPatronesSospechosos(token: string): Promise<PatronSospechoso[]> {
  return apiRequest("/teams/patrones-sospechosos", { token });
}

export interface IntegranteEquipo {
  id: string;
  rol: "CAPITAN" | "JUGADOR";
  nombre: string;
}

/** Plantel progresivo (concepto.md §4): quien ya es parte del equipo. */
export function obtenerIntegrantes(teamId: string): Promise<IntegranteEquipo[]> {
  return apiRequest(`/teams/${teamId}/integrantes`);
}

export interface InvitacionPendiente {
  id: string;
  telefono: string;
  expiraEn: string;
}

/** Solo el capitan. Manda una invitacion por SMS/WhatsApp con un codigo para sumarse al plantel. */
export function invitarJugador(token: string, teamId: string, telefono: string): Promise<void> {
  return apiRequest(`/teams/${teamId}/invitaciones`, { method: "POST", token, body: { telefono } });
}

/** Solo el capitan. Invitaciones mandadas y todavia no consumidas/vencidas. */
export function obtenerInvitacionesPendientes(token: string, teamId: string): Promise<InvitacionPendiente[]> {
  return apiRequest(`/teams/${teamId}/invitaciones`, { token });
}

/** El jugador invitado consume su propio codigo, logueado con su propia cuenta. */
export function consumirInvitacion(token: string, codigo: string): Promise<Equipo> {
  return apiRequest("/teams/consumir-invitacion", { method: "POST", token, body: { codigo } });
}
