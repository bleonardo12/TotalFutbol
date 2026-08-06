import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const CLAVE_EQUIPO_ACTIVO = "totalfutbol.equipoActivoId";

interface EstadoEquipoActivo {
  equipoActivoId: string | null;
  hidratado: boolean;
  seleccionar: (id: string) => Promise<void>;
  hidratar: () => Promise<void>;
}

/** Con que equipo "juega" el usuario cuando tiene mas de uno (uno por categoria). */
export const useEquipoActivoStore = create<EstadoEquipoActivo>((set) => ({
  equipoActivoId: null,
  hidratado: false,

  async seleccionar(id) {
    await SecureStore.setItemAsync(CLAVE_EQUIPO_ACTIVO, id);
    set({ equipoActivoId: id });
  },

  async hidratar() {
    const equipoActivoId = await SecureStore.getItemAsync(CLAVE_EQUIPO_ACTIVO);
    set({ equipoActivoId, hidratado: true });
  },
}));
