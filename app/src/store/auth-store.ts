import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import type { ParDeTokens } from "@/api/auth";

const CLAVE_ACCESS = "totalfutbol.accessToken";
const CLAVE_REFRESH = "totalfutbol.refreshToken";

interface EstadoAuth {
  accessToken: string | null;
  refreshToken: string | null;
  hidratado: boolean;
  iniciarSesion: (tokens: ParDeTokens) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  hidratar: () => Promise<void>;
}

export const useAuthStore = create<EstadoAuth>((set) => ({
  accessToken: null,
  refreshToken: null,
  hidratado: false,

  async iniciarSesion(tokens) {
    await SecureStore.setItemAsync(CLAVE_ACCESS, tokens.accessToken);
    await SecureStore.setItemAsync(CLAVE_REFRESH, tokens.refreshToken);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },

  async cerrarSesion() {
    await SecureStore.deleteItemAsync(CLAVE_ACCESS);
    await SecureStore.deleteItemAsync(CLAVE_REFRESH);
    set({ accessToken: null, refreshToken: null });
  },

  async hidratar() {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(CLAVE_ACCESS),
      SecureStore.getItemAsync(CLAVE_REFRESH),
    ]);
    set({ accessToken, refreshToken, hidratado: true });
  },
}));
