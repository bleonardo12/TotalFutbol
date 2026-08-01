import { apiRequest } from "./client";

export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

export type RolUsuario = "JUGADOR" | "ADMIN";

export interface UsuarioActual {
  id: string;
  telefono: string;
  nombre: string | null;
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
