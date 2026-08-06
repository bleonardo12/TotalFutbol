import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { listarDisputasPendientes, type DisputaPendiente } from "@/api/disputes";
import { cerrarTemporada, obtenerTemporadaActual } from "@/api/seasons";
import { obtenerPatronesSospechosos } from "@/api/teams";
import { Boton, EtiquetaSeccion, Pantalla, Tarjeta } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

const SLA_URGENTE_HORAS = 24;

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function horasHasta(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (60 * 60 * 1000);
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

  const patronesQuery = useQuery({
    queryKey: ["equipos", "patrones-sospechosos"],
    queryFn: () => obtenerPatronesSospechosos(accessToken as string),
    enabled: accessToken !== null,
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

  const disputas = disputasQuery.data ?? [];

  return (
    <Pantalla style={{ padding: 0 }}>
      <Stack.Screen options={{ title: "Panel de admin" }} />

      <View style={{ padding: espaciado.lg, gap: espaciado.lg }}>
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

        {patronesQuery.data && patronesQuery.data.length > 0 && (
          <View style={{ gap: espaciado.sm }}>
            <EtiquetaSeccion>Patrones sospechosos</EtiquetaSeccion>
            {patronesQuery.data.map((p) => (
              <Pressable
                key={`${p.equipoId}-${p.rivalId}`}
                onPress={() => router.push({ pathname: "/equipo/[id]", params: { id: p.equipoId } })}
              >
                <Tarjeta style={{ gap: 2 }}>
                  <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                    {p.equipoNombre}
                  </Text>
                  <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                    {`${p.porcentaje}% de sus ${p.partidos} partidos son contra ${p.rivalNombre}. No decide nada por si solo.`}
                  </Text>
                </Tarjeta>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: espaciado.sm }}>
          <Text style={[tipografia.titulo, { color: colores.textoPrimario }]}>Cola</Text>
          {disputas.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>{disputas.length}</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={disputas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: espaciado.lg, paddingBottom: espaciado.lg, gap: espaciado.sm }}
        refreshControl={
          <RefreshControl
            refreshing={disputasQuery.isFetching}
            onRefresh={() => disputasQuery.refetch()}
            tintColor={colores.acento}
          />
        }
        ListEmptyComponent={
          !disputasQuery.isLoading ? (
            <Text style={[tipografia.cuerpo, { color: colores.textoApagado, textAlign: "center", paddingVertical: espaciado.xl }]}>
              No hay disputas pendientes.
            </Text>
          ) : null
        }
        renderItem={({ item }) => <TarjetaDisputa item={item} styles={styles} onPress={() =>
          router.push({ pathname: "/disputa/[matchId]", params: { matchId: item.matchId } })
        } />}
      />
    </Pantalla>
  );
}

function TarjetaDisputa({
  item,
  styles,
  onPress,
}: {
  item: DisputaPendiente;
  styles: ReturnType<typeof crearEstilos>;
  onPress: () => void;
}): React.JSX.Element {
  const { colores, espaciado, tipografia } = useTema();
  const horasRestantes = horasHasta(item.capaExpiraEn);
  const urgente = horasRestantes < SLA_URGENTE_HORAS;
  const diferencialFairPlay = Math.abs(item.match.equipoLocal.fairPlay - item.match.equipoVisitante.fairPlay);

  return (
    <Pressable onPress={onPress}>
      <Tarjeta style={{ gap: espaciado.sm }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={[tipografia.cuerpoDestacado, { flex: 1, color: colores.textoPrimario }]}>
            {item.match.equipoLocal.nombre} vs {item.match.equipoVisitante.nombre}
          </Text>
          <Text
            style={{
              fontFamily: "JetBrainsMono_700Bold",
              fontSize: 12,
              color: urgente ? colores.error : colores.textoApagado,
            }}
          >
            {horasRestantes > 0 ? `vence ${formatearFecha(item.capaExpiraEn)}` : "vencida"}
          </Text>
        </View>

        {item.presuncionContraEquipoId && (
          <Text style={[tipografia.caption, styles.presuncion]}>
            Presuncion por fair-play contra{" "}
            {item.presuncionContraEquipoId === item.match.equipoLocal.id
              ? item.match.equipoLocal.nombre
              : item.match.equipoVisitante.nombre}
            . No decide nada por si sola.
          </Text>
        )}

        <View style={{ flexDirection: "row", gap: espaciado.sm }}>
          <View style={styles.celdaSenal}>
            <Text style={styles.celdaSenalValor}>{item.evidenciasCount}</Text>
            <EtiquetaSeccion>Evidencia</EtiquetaSeccion>
          </View>
          <View style={styles.celdaSenal}>
            <Text style={styles.celdaSenalValor}>{item.respuestasPlantelCount}</Text>
            <EtiquetaSeccion>Plantel</EtiquetaSeccion>
          </View>
          <View style={styles.celdaSenal}>
            <Text style={styles.celdaSenalValor}>{Math.round(diferencialFairPlay)}</Text>
            <EtiquetaSeccion>Fair-play</EtiquetaSeccion>
          </View>
        </View>
      </Tarjeta>
    </Pressable>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    badge: {
      backgroundColor: colores.error,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 1,
    },
    badgeTexto: {
      fontFamily: "JetBrainsMono_800ExtraBold",
      fontSize: 11,
      color: colores.textoPrimario,
    },
    celdaSenal: {
      flex: 1,
      backgroundColor: colores.superficieHundida,
      borderRadius: radio.md,
      paddingVertical: espaciado.sm,
      alignItems: "center" as const,
      gap: 3,
    },
    celdaSenalValor: {
      fontFamily: "JetBrainsMono_800ExtraBold",
      fontSize: 16,
      color: colores.textoPrimario,
    },
    presuncion: {
      color: colores.alerta,
      backgroundColor: `${colores.alerta}26`,
      padding: 8,
      borderRadius: radio.sm,
    },
  };
}
