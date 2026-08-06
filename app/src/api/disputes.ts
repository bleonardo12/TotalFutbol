import { File, UploadTask, UploadType } from "expo-file-system";
import type { UsuarioActual } from "./auth";
import { API_URL, ApiError, apiRequest, extraerMensaje } from "./client";
import type { OutcomePartido } from "./matches";

export type CapaDisputa = "C1_EVIDENCIA" | "C2_PLANTELES" | "C3_ADMIN";
export type RespuestaPoll = "CONFIRMA_CAPITAN" | "CONTRADICE_CAPITAN";

export const ETIQUETA_CAPA: Record<CapaDisputa, string> = {
  C1_EVIDENCIA: "Evidencia",
  C2_PLANTELES: "Consulta a planteles",
  C3_ADMIN: "Admin",
};

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
  /** Solo presente para ADMIN (concepto.md §11): nunca se muestra a los equipos en disputa. */
  presuncionContraEquipoId?: string | null;
}

export function obtenerDisputa(token: string, matchId: string): Promise<Dispute> {
  return apiRequest(`/disputes/${matchId}`, { token });
}

export interface DisputaPendiente {
  id: string;
  matchId: string;
  capa: CapaDisputa;
  capaExpiraEn: string;
  presuncionContraEquipoId?: string | null;
  evidenciasCount: number;
  respuestasPlantelCount: number;
  match: {
    id: string;
    equipoLocal: EquipoResumen & { fairPlay: number };
    equipoVisitante: EquipoResumen & { fairPlay: number };
  };
}

/** Solo ADMIN. Cola de disputas sin resolver, en cualquier capa, ordenadas por vencimiento. */
export function listarDisputasPendientes(token: string): Promise<DisputaPendiente[]> {
  return apiRequest("/disputes", { token });
}

export interface DisputePollRespuesta {
  id: string;
  teamId: string;
  team: EquipoResumen;
  integranteId: string;
  integrante: UsuarioActual;
  respuesta: RespuestaPoll;
  comentario: string | null;
  createdAt: string;
}

/**
 * Sube la foto con expo-file-system en vez de fetch+FormData: esta version de
 * React Native (0.86) ya no soporta el shape clasico {uri, name, type} que
 * el fetch global espera para archivos ("Unsupported FormDataPart
 * implementation"). UploadTask maneja el multipart de forma nativa.
 */
export async function subirEvidencia(
  token: string,
  matchId: string,
  foto: { uri: string; nombre: string; tipo: string },
  descripcion?: string,
): Promise<DisputeEvidencia> {
  const archivo = new File(foto.uri);
  const tarea = new UploadTask(archivo, `${API_URL}/disputes/${matchId}/evidencia`, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "archivo",
    mimeType: foto.tipo,
    headers: { Authorization: `Bearer ${token}` },
    parameters: descripcion ? { descripcion } : undefined,
  });

  const resultado = await tarea.uploadAsync();
  const datos: unknown = JSON.parse(resultado.body);

  if (resultado.status < 200 || resultado.status >= 300) {
    throw new ApiError(resultado.status, extraerMensaje(datos, resultado.status));
  }

  return datos as DisputeEvidencia;
}

export function responderPoll(
  token: string,
  matchId: string,
  respuesta: RespuestaPoll,
  comentario?: string,
): Promise<DisputePollRespuesta> {
  return apiRequest(`/disputes/${matchId}/poll`, {
    method: "POST",
    token,
    body: { respuesta, comentario },
  });
}
