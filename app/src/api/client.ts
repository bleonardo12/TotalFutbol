const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

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

function extraerMensaje(datos: unknown, status: number): string {
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

export async function apiRequest<T>(path: string, opciones: OpcionesRequest = {}): Promise<T> {
  const respuesta = await fetch(`${API_URL}${path}`, {
    method: opciones.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
    },
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
  });

  if (respuesta.status === 204) {
    return undefined as T;
  }

  const datos: unknown = await respuesta.json().catch(() => undefined);

  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, extraerMensaje(datos, respuesta.status));
  }

  return datos as T;
}

/** Para subidas multipart (archivos). No se fija Content-Type a mano: fetch arma el boundary solo. */
export async function apiRequestFormData<T>(
  path: string,
  formData: FormData,
  token: string,
): Promise<T> {
  const respuesta = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const datos: unknown = await respuesta.json().catch(() => undefined);

  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, extraerMensaje(datos, respuesta.status));
  }

  return datos as T;
}
