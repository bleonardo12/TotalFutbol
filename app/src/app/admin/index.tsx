import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Stack } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { type CapaDisputa, listarDisputasPendientes } from "@/api/disputes";
import { cerrarTemporada, obtenerTemporadaActual } from "@/api/seasons";
import { useAuthStore } from "@/store/auth-store";

const ETIQUETA_CAPA: Record<CapaDisputa, string> = {
  C1_EVIDENCIA: "Evidencia (C1)",
  C2_PLANTELES: "Plantel (C2)",
  C3_ADMIN: "Admin (C3)",
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function PanelAdmin(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const disputasQuery = useQuery({
    queryKey: ["disputas", "pendientes"],
    queryFn: () => listarDisputasPendientes(accessToken as string),
    enabled: accessToken !== null,
  });

  const temporadaQuery = useQuery({
    queryKey: ["temporada", "actual"],
    queryFn: obtenerTemporadaActual,
  });

  const cerrarMutacion = useMutation({
    mutationFn: () => cerrarTemporada(accessToken as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["temporada", "actual"] });
    },
  });

  function confirmarCierre(): void {
    Alert.alert(
      "Cerrar temporada",
      "Esto registra el palmares del año (quien es n°1 de cada division hoy) y no se puede deshacer. No reasigna ninguna division.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Cerrar temporada",
          style: "destructive",
          onPress: () => cerrarMutacion.mutate(),
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Panel de admin" }} />

      {temporadaQuery.data && (
        <View style={styles.tarjeta}>
          <Text style={styles.tarjetaTitulo}>Temporada {temporadaQuery.data.anio}</Text>
          {temporadaQuery.data.cerrada ? (
            <Text style={styles.tarjetaTexto}>Cerrada</Text>
          ) : (
            <Pressable
              style={[styles.botonPeligro, cerrarMutacion.isPending && styles.botonDeshabilitado]}
              disabled={cerrarMutacion.isPending}
              onPress={confirmarCierre}
            >
              {cerrarMutacion.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botonPeligroTexto}>Cerrar temporada</Text>
              )}
            </Pressable>
          )}
          {cerrarMutacion.isError && (
            <Text style={styles.error}>{cerrarMutacion.error.message}</Text>
          )}
        </View>
      )}

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
  tarjeta: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  tarjetaTitulo: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  tarjetaTexto: {
    textAlign: "center",
    color: "#888",
  },
  botonPeligro: {
    backgroundColor: "#c0392b",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  botonPeligroTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  error: {
    color: "#c0392b",
    textAlign: "center",
  },
});
