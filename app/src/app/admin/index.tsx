import { useQuery } from "@tanstack/react-query";
import { Link, Stack } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { type CapaDisputa, listarDisputasPendientes } from "@/api/disputes";
import { useAuthStore } from "@/store/auth-store";

const ETIQUETA_CAPA: Record<CapaDisputa, string> = {
  C1_EVIDENCIA: "Evidencia (C1)",
  C2_PLANTELES: "Consulta al plantel (C2)",
  C3_ADMIN: "Decision del admin (C3)",
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function PanelAdmin(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);

  const disputasQuery = useQuery({
    queryKey: ["disputas", "pendientes"],
    queryFn: () => listarDisputasPendientes(accessToken as string),
    enabled: accessToken !== null,
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Panel de admin" }} />
      <Text style={styles.titulo}>Disputas pendientes</Text>

      <FlatList
        data={disputasQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          !disputasQuery.isLoading ? (
            <Text style={styles.vacio}>No hay disputas pendientes.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Link
            href={{ pathname: "/disputa/[matchId]", params: { matchId: item.matchId } }}
            asChild
          >
            <Pressable style={styles.item}>
              <Text style={styles.itemTitulo}>
                {item.match.equipoLocal.nombre} vs {item.match.equipoVisitante.nombre}
              </Text>
              <Text style={styles.itemCapa}>{ETIQUETA_CAPA[item.capa]}</Text>
              <Text style={styles.itemVencimiento}>
                Vence el {formatearFecha(item.capaExpiraEn)}
              </Text>
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
  titulo: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
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
  itemCapa: {
    color: "#208AEF",
    fontWeight: "600",
  },
  itemVencimiento: {
    color: "#888",
    fontSize: 13,
  },
  vacio: {
    textAlign: "center",
    color: "#888",
    marginTop: 32,
  },
});
