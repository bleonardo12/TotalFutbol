import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from "@expo-google-fonts/sora";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth-store";
import { TIPOGRAFIA, useTema } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout(): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient());
  const hidratado = useAuthStore((s) => s.hidratado);
  const hidratar = useAuthStore((s) => s.hidratar);
  const { colores } = useTema();
  const [fuentesListas] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    hidratar();
  }, [hidratar]);

  useEffect(() => {
    if (hidratado && fuentesListas) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [hidratado, fuentesListas]);

  if (!hidratado || !fuentesListas) {
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
