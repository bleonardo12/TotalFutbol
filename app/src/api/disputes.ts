import type { UsuarioActual } from "./auth";
import { apiRequest, apiRequestFormData } from "./client";
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

export function subirEvidencia(
  token: string,
  matchId: string,
  foto: { uri: string; nombre: string; tipo: string },
  descripcion?: string,
): Promise<DisputeEvidencia> {
  const formData = new FormData();
  formData.append("archivo", {
    uri: foto.uri,
    name: foto.nombre,
    type: foto.tipo,
  } as unknown as Blob);
  if (descripcion) {
    formData.append("descripcion", descripcion);
  }

  return apiRequestFormData(`/disputes/${matchId}/evidencia`, formData, token);
}
