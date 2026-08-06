import { useQuery } from "@tanstack/react-query";
import { misEquipos, type Equipo } from "@/api/teams";
import { useAuthStore } from "@/store/auth-store";
import { useEquipoActivoStore } from "@/store/equipo-activo-store";

/**
 * Reemplaza el patron repetido "misEquipos() + data?.[0]" -- respeta el equipo elegido en el
 * selector de Inicio (persistido) en vez de asumir siempre el primero de la lista.
 */
export function useEquipoActivo() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const equipoActivoId = useEquipoActivoStore((s) => s.equipoActivoId);
  const seleccionarEquipoActivo = useEquipoActivoStore((s) => s.seleccionar);

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });

  const equipos = equiposQuery.data ?? [];
  const equipo: Equipo | undefined = equipos.find((e) => e.id === equipoActivoId) ?? equipos[0];

  return { equiposQuery, equipos, equipo, seleccionarEquipoActivo };
}
