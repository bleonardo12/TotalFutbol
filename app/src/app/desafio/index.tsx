import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Stack } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { aceptarDesafio, misDesafios, rechazarDesafio, type Desafio } from "@/api/challenges";
import { misEquipos } from "@/api/teams";
import { useAuthStore } from "@/store/auth-store";

const ETIQUETA_ESTADO: Record<Desafio["estado"], string> = {
  PROPUESTO: "Propuesto",
  ACEPTADO: "Aceptado",
  RECHAZADO: "Rechazado",
  EXPIRADO: "Expirado",
};

export default function MisDesafios(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });
  const miEquipoId = equiposQuery.data?.[0]?.id;

  const desafiosQuery = useQuery({
    queryKey: ["desafios", "mios"],
    queryFn: () => misDesafios(accessToken as string),
    enabled: accessToken !== null,
  });

  const aceptarMutacion = useMutation({
    mutationFn: (id: string) => aceptarDesafio(accessToken as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["desafios", "mios"] });
      queryClient.invalidateQueries({ queryKey: ["partidos", "mios"] });
    },
  });

  const rechazarMutacion = useMutation({
    mutationFn: (id: string) => rechazarDesafio(accessToken as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["desafios", "mios"] });
    },
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Mis desafios" }} />

      <FlatList
        data={desafiosQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          !desafiosQuery.isLoading ? (
            <Text style={styles.vacio}>Todavia no tenes desafios</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const puedoResponder = item.estado === "PROPUESTO" && item.desafiadoId === miEquipoId;
          const pendiente = aceptarMutacion.isPending || rechazarMutacion.isPending;

          return (
            <View style={styles.item}>
              <Text style={styles.itemTitulo}>
                {item.desafiante.nombre} vs {item.desafiado.nombre}
              </Text>
              <Text style={styles.itemEstado}>{ETIQUETA_ESTADO[item.estado]}</Text>

              {puedoResponder && (
                <View style={styles.acciones}>
                  <Pressable
                    style={[styles.boton, pendiente && styles.botonDeshabilitado]}
                    disabled={pendiente}
                    onPress={() => aceptarMutacion.mutate(item.id)}
                  >
                    <Text style={styles.botonTexto}>Aceptar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.botonSecundario, pendiente && styles.botonDeshabilitado]}
                    disabled={pendiente}
                    onPress={() => rechazarMutacion.mutate(item.id)}
                  >
                    <Text style={styles.botonSecundarioTexto}>Rechazar</Text>
                  </Pressable>
                </View>
              )}

              {item.estado === "ACEPTADO" && item.partido && (
                <Link href={{ pathname: "/partido/[id]", params: { id: item.partido.id } }} asChild>
                  <Pressable style={styles.boton}>
                    <Text style={styles.botonTexto}>Ver partido pactado</Text>
                  </Pressable>
                </Link>
              )}
            </View>
          );
        }}
      />

      {desafiosQuery.isLoading && <ActivityIndicator style={styles.spinner} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  lista: {
    gap: 8,
  },
  item: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  itemTitulo: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemEstado: {
    color: "#208AEF",
    fontWeight: "600",
  },
  acciones: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  boton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 4,
  },
  botonTexto: {
    color: "#fff",
    fontWeight: "600",
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: "#c0392b",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  botonSecundarioTexto: {
    color: "#c0392b",
    fontWeight: "600",
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  vacio: {
    textAlign: "center",
    color: "#888",
    marginTop: 32,
  },
  spinner: {
    marginTop: 32,
  },
});
