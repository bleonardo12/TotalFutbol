import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

export default function RootLayout(): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient());
  const hidratado = useAuthStore((s) => s.hidratado);
  const hidratar = useAuthStore((s) => s.hidratar);
  const { colores } = useTema();

  useEffect(() => {
    hidratar();
  }, [hidratar]);

  if (!hidratado) {
    return (
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
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: colores.superficie },
          headerTintColor: colores.textoPrimario,
          headerTitleStyle: { color: colores.textoPrimario },
          contentStyle: { backgroundColor: colores.fondo },
        }}
      />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
