import { router } from "expo-router";
import { useAuthStore } from "@/store/auth-store";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface OpcionesRequest {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
}

export function extraerMensaje(datos: unknown, status: number): string {
  if (datos && typeof datos === "object" && "message" in datos) {
    const { message } = datos as { message: unknown };
    if (typeof message === "string") {
      return message;
    }
    if (Array.isArray(message) && message.length > 0) {
      return String(message[0]);
    }
  }
  return `Error ${status}`;
}

function fetchCrudo(path: string, opciones: OpcionesRequest, token: string | undefined) {
  return fetch(`${API_URL}${path}`, {
    method: opciones.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
  });
}

/**
 * El access token dura 15 minutos a proposito (sin refresh automatico era
 * el diseño original), pero eso obligaba a re-loguearse por OTP cada vez
 * que expiraba. Ahora, si una request autenticada da 401, se renueva sola
 * con el refresh token guardado (dura 30 dias) y se reintenta una vez, sin
 * que el usuario lo note. Si el refresh token tambien vencio, recien ahi
 * se cierra la sesion y se manda a /login. `refrescoEnCurso` evita pedir
 * dos refresh en paralelo si varias queries pegan 401 al mismo tiempo.
 */
let refrescoEnCurso: Promise<string | null> | null = null;

async function refrescarToken(): Promise<string | null> {
  if (!refrescoEnCurso) {
    refrescoEnCurso = intentarRefrescar().finally(() => {
      refrescoEnCurso = null;
    });
  }
  return refrescoEnCurso;
}

async function intentarRefrescar(): Promise<string | null> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    return null;
  }
  try {
    const respuesta = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!respuesta.ok) {
      return null;
    }
    const tokens = (await respuesta.json()) as { accessToken: string; refreshToken: string };
    await useAuthStore.getState().iniciarSesion(tokens);
    return tokens.accessToken;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, opciones: OpcionesRequest = {}): Promise<T> {
  let respuesta = await fetchCrudo(path, opciones, opciones.token);

  if (respuesta.status === 401 && opciones.token && path !== "/auth/refresh") {
    const nuevoToken = await refrescarToken();
    if (nuevoToken) {
      respuesta = await fetchCrudo(path, opciones, nuevoToken);
    } else {
      await useAuthStore.getState().cerrarSesion();
      router.replace("/login");
    }
  }

  if (respuesta.status === 204) {
    return undefined as T;
  }

  const datos: unknown = await respuesta.json().catch(() => undefined);

  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, extraerMensaje(datos, respuesta.status));
  }

  return datos as T;
}
