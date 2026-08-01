import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/store/auth-store";

export default function RootLayout(): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient());
  const hidratado = useAuthStore((s) => s.hidratado);
  const hidratar = useAuthStore((s) => s.hidratar);

  useEffect(() => {
    hidratar();
  }, [hidratar]);

  if (!hidratado) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerTitleAlign: "center" }} />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
