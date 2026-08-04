import { useQuery } from "@tanstack/react-query";
import { Link, Stack } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { misPartidos } from "@/api/matches";
import { useAuthStore } from "@/store/auth-store";

const ETIQUETA_ESTADO: Record<string, string> = {
  PACTADO: "Pactado",
  FIRMADO: "Firmado",
  EN_JUEGO: "En juego",
  REPORTADO: "Pendiente",
  CONFIRMADO: "Confirmado",
  EN_DISPUTA: "En disputa",
  LIQUIDADO: "Liquidado",
  SUSPENDIDO: "Suspendido",
  VOID: "Anulado",
};

export default function ListaPartidos(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);

  const partidosQuery = useQuery({
    queryKey: ["partidos", "mios"],
    queryFn: () => misPartidos(accessToken as string),
    enabled: accessToken !== null,
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Mis partidos" }} />
      <View style={styles.acciones}>
        <Link href="/partido/generar" style={styles.link}>
          Generar codigo
        </Link>
        <Link href="/partido/unirse" style={styles.link}>
          Unirme con codigo
        </Link>
      </View>

      <FlatList
        data={partidosQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          !partidosQuery.isLoading ? (
            <Text style={styles.vacio}>Todavia no tenes partidos</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: "/partido/[id]", params: { id: item.id } }} asChild>
            <Pressable style={styles.item}>
              <Text style={styles.itemTitulo}>
                {item.equipoLocal.nombre} vs {item.equipoVisitante.nombre}
              </Text>
              <Text style={styles.itemEstado}>{ETIQUETA_ESTADO[item.estado] ?? item.estado}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  acciones: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  link: {
    color: "#208AEF",
    fontWeight: "600",
    fontSize: 16,
  },
  lista: {
    gap: 8,
  },
  item: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  itemTitulo: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemEstado: {
    color: "#666",
  },
  vacio: {
    textAlign: "center",
    color: "#888",
    marginTop: 32,
  },
});
