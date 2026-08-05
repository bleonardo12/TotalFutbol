import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { Alert, FlatList, Pressable, RefreshControl, Text } from "react-native";
import { listarDisputasPendientes, ETIQUETA_CAPA } from "@/api/disputes";
import { cerrarTemporada, obtenerTemporadaActual } from "@/api/seasons";
import { Boton, Chip, EmptyState, Pantalla, Tarjeta } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function PanelAdmin(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);

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
    <Pantalla>
      <Stack.Screen options={{ title: "Panel de admin" }} />

      {temporadaQuery.data && (
        <Tarjeta style={{ alignItems: "center", gap: espaciado.sm }}>
          <Text style={[tipografia.subtitulo, { color: colores.textoPrimario }]}>
            {`Temporada ${temporadaQuery.data.anio}`}
          </Text>
          {temporadaQuery.data.cerrada ? (
            <Text style={[tipografia.cuerpo, { color: colores.textoApagado }]}>Cerrada</Text>
          ) : (
            <Boton
              variante="destructivo"
              onPress={confirmarCierre}
              cargando={cerrarMutacion.isPending}
            >
              Cerrar temporada
            </Boton>
          )}
          {cerrarMutacion.isError && (
            <Text style={[tipografia.caption, { color: colores.error }]}>
              {cerrarMutacion.error.message}
            </Text>
          )}
        </Tarjeta>
      )}

      <Text style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}>
        Disputas pendientes
      </Text>

      <FlatList
        data={disputasQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: espaciado.xs }}
        refreshControl={
          <RefreshControl
            refreshing={disputasQuery.isFetching}
            onRefresh={() => disputasQuery.refetch()}
            tintColor={colores.acento}
          />
        }
        ListEmptyComponent={
          !disputasQuery.isLoading ? <EmptyState titulo="No hay disputas pendientes." /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.item}
            onPress={() =>
              router.push({ pathname: "/disputa/[matchId]", params: { matchId: item.matchId } })
            }
          >
            <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
              {item.match.equipoLocal.nombre} vs {item.match.equipoVisitante.nombre}
            </Text>
            <Chip texto={ETIQUETA_CAPA[item.capa]} tono="acento" />
            <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
              {`Vence el ${formatearFecha(item.capaExpiraEn)}`}
            </Text>
          </Pressable>
        )}
      />
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    item: {
      backgroundColor: colores.superficie,
      borderRadius: radio.md,
      padding: espaciado.md,
      gap: espaciado.xs,
    },
  };
}
