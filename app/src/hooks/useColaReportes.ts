import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { reportarResultado } from "@/api/matches";
import { encolar, listar, quitar, type ReporteEncolado } from "@/lib/cola-reportes";
import { useAuthStore } from "@/store/auth-store";

interface ResultadoColaReportes {
  cola: ReporteEncolado[];
  /** Reintenta mandar cada item encolado; si tiene exito lo saca de la cola, si no se queda. */
  reintentarTodo: () => Promise<void>;
  encolarReporte: (item: Omit<ReporteEncolado, "id" | "creadoEn">) => Promise<void>;
}

/** Cola de reportes de resultado pendientes de red (docs Guapo §3.4/§4, "Sin señal"). */
export function useColaReportes(): ResultadoColaReportes {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [cola, setCola] = useState<ReporteEncolado[]>([]);

  const recargar = useCallback(async () => {
    setCola(await listar());
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const reintentarTodo = useCallback(async () => {
    if (!accessToken) return;
    const pendientes = await listar();
    for (const item of pendientes) {
      try {
        await reportarResultado(accessToken, item.matchId, item.outcome, item.golesLocal, item.golesVisita);
        await quitar(item.id);
        queryClient.invalidateQueries({ queryKey: ["partidos", item.matchId] });
        queryClient.invalidateQueries({ queryKey: ["equipos", "mios"] });
      } catch {
        // Sigue sin señal (u otro error de red): se queda en la cola para el proximo intento.
      }
    }
    await recargar();
  }, [accessToken, queryClient, recargar]);

  const encolarReporte = useCallback(
    async (item: Omit<ReporteEncolado, "id" | "creadoEn">) => {
      await encolar(item);
      await recargar();
    },
    [recargar],
  );

  // Reintento oportunista al montar (ej. se reabre la pantalla con señal de vuelta).
  useEffect(() => {
    reintentarTodo();
  }, []);

  return { cola, reintentarTodo, encolarReporte };
}
