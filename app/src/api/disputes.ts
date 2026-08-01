import type { UsuarioActual } from "./auth";
import { apiRequest } from "./client";
import type { OutcomePartido } from "./matches";

export type CapaDisputa = "C1_EVIDENCIA" | "C2_PLANTELES" | "C3_ADMIN";

export interface EquipoResumen {
  id: string;
  nombre: string;
}

export interface DisputeEvidencia {
  id: string;
  teamId: string;
  team: EquipoResumen;
  subidoPor: UsuarioActual;
  url: string;
  descripcion: string | null;
  createdAt: string;
}

export interface Dispute {
  id: string;
  matchId: string;
  capa: CapaDisputa;
  nonce: string;
  capaExpiraEn: string;
  resuelta: boolean;
  resolucion: OutcomePartido | null;
  anulada: boolean;
  resueltaPor: UsuarioActual | null;
  resueltaEn: string | null;
  evidencias: DisputeEvidencia[];
}

export function obtenerDisputa(token: string, matchId: string): Promise<Dispute> {
  return apiRequest(`/disputes/${matchId}`, { token });
}
