import { File, UploadTask, UploadType } from "expo-file-system";
import { API_URL, ApiError, apiRequest, extraerMensaje } from "./client";

export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

export type RolUsuario = "JUGADOR" | "ADMIN";
export type Genero = "MASCULINO" | "FEMENINO" | "OTRO" | "PREFIERO_NO_DECIR";

export interface UsuarioActual {
  id: string;
  telefono: string;
  nombre: string | null;
  apellido: string | null;
  fechaNacimiento: string | null;
  genero: Genero | null;
  fotoUrl: string | null;
  rol: RolUsuario;
}

export function solicitarOtp(telefono: string): Promise<void> {
  return apiRequest("/auth/otp/solicitar", { method: "POST", body: { telefono } });
}

export function verificarOtp(telefono: string, codigo: string): Promise<ParDeTokens> {
  return apiRequest("/auth/otp/verificar", { method: "POST", body: { telefono, codigo } });
}

export function obtenerUsuarioActual(token: string): Promise<UsuarioActual> {
  return apiRequest("/auth/me", { token });
}

export interface ActualizarPerfilInput {
  nombre?: string;
  apellido?: string;
  fechaNacimiento?: string;
  genero?: Genero;
}

export function actualizarPerfil(
  token: string,
  datos: ActualizarPerfilInput,
): Promise<UsuarioActual> {
  return apiRequest("/auth/me", { method: "PATCH", token, body: datos });
}

/** Mismo patron que subirEvidencia (expo-file-system, no fetch+FormData -- ver rn-formdata-roto). */
export async function subirFotoPerfil(
  token: string,
  foto: { uri: string; nombre: string; tipo: string },
): Promise<UsuarioActual> {
  const archivo = new File(foto.uri);
  const tarea = new UploadTask(archivo, `${API_URL}/auth/me/foto`, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "foto",
    mimeType: foto.tipo,
    headers: { Authorization: `Bearer ${token}` },
  });

  const resultado = await tarea.uploadAsync();
  const datos: unknown = JSON.parse(resultado.body);

  if (resultado.status < 200 || resultado.status >= 300) {
    throw new ApiError(resultado.status, extraerMensaje(datos, resultado.status));
  }

  return datos as UsuarioActual;
}
