import * as SecureStore from "expo-secure-store";
import type { OutcomePartido } from "@/api/matches";

const CLAVE_COLA = "totalfutbol.colaReportes";

export interface ReporteEncolado {
  id: string;
  matchId: string;
  outcome: OutcomePartido;
  golesLocal?: number;
  golesVisita?: number;
  creadoEn: string;
}

/**
 * Cola offline solo para reportes de resultado (docs Guapo §4: "encolar reportes de resultado en
 * almacenamiento local y reintentar. Es el caso real mas comun de friccion"). Persistida con
 * expo-secure-store -- mismo patron que store/auth-store.ts, la cola es chica asi que no
 * justifica sumar un paquete de storage nuevo.
 */
export async function listar(): Promise<ReporteEncolado[]> {
  const crudo = await SecureStore.getItemAsync(CLAVE_COLA);
  if (!crudo) return [];
  try {
    return JSON.parse(crudo) as ReporteEncolado[];
  } catch {
    return [];
  }
}

export async function encolar(item: Omit<ReporteEncolado, "id" | "creadoEn">): Promise<void> {
  const cola = await listar();
  cola.push({ ...item, id: `${item.matchId}-${Date.now()}`, creadoEn: new Date().toISOString() });
  await SecureStore.setItemAsync(CLAVE_COLA, JSON.stringify(cola));
}

export async function quitar(id: string): Promise<void> {
  const cola = await listar();
  await SecureStore.setItemAsync(CLAVE_COLA, JSON.stringify(cola.filter((r) => r.id !== id)));
}
