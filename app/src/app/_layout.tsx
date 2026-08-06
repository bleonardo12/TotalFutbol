import {
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from "@expo-google-fonts/archivo";
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
  JetBrainsMono_800ExtraBold,
} from "@expo-google-fonts/jetbrains-mono";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth-store";
import { useEquipoActivoStore } from "@/store/equipo-activo-store";
import { TIPOGRAFIA, useTema } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout(): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient());
  const hidratado = useAuthStore((s) => s.hidratado);
  const hidratar = useAuthStore((s) => s.hidratar);
  const equipoActivoHidratado = useEquipoActivoStore((s) => s.hidratado);
  const hidratarEquipoActivo = useEquipoActivoStore((s) => s.hidratar);
  const { colores } = useTema();
  const [fuentesListas] = useFonts({
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    Archivo_900Black,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    JetBrainsMono_800ExtraBold,
  });

  useEffect(() => {
    hidratar();
    hidratarEquipoActivo();
  }, [hidratar, hidratarEquipoActivo]);

  useEffect(() => {
    if (hidratado && equipoActivoHidratado && fuentesListas) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [hidratado, equipoActivoHidratado, fuentesListas]);

  if (!hidratado || !equipoActivoHidratado || !fuentesListas) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colores.fondo,
          }}
        >
          <ActivityIndicator color={colores.acento} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerTitleAlign: "center",
            headerStyle: { backgroundColor: colores.superficie },
            headerTintColor: colores.textoPrimario,
            headerTitleStyle: {
              color: colores.textoPrimario,
              fontFamily: TIPOGRAFIA.subtitulo.fontFamily,
              fontSize: 18,
            },
            contentStyle: { backgroundColor: colores.fondo },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
