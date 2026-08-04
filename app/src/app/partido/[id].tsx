import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import {
  desistirPartido,
  flaggearIncidente,
  flaggearNoShow,
  obtenerPartido,
  reportarResultado,
  type OutcomePartido,
} from "@/api/matches";
import { misEquipos } from "@/api/teams";
import { useAuthStore } from "@/store/auth-store";

/** Mismo numero que VENTANA_DESISTIMIENTO_HORAS del backend (matches.constantes.ts) -- solo para mostrar u ocultar el boton, el backend es quien manda. */
const VENTANA_DESISTIMIENTO_HORAS = 24;

type ResultadoPropio = "GANE" | "PERDI" | "EMPATE";

const ETIQUETA_ESTADO: Record<string, string> = {
  PACTADO: "Pactado",
  FIRMADO: "Firmado",
  EN_JUEGO: "En juego",
  REPORTADO: "Esperando confirmacion",
  CONFIRMADO: "Confirmado",
  EN_DISPUTA: "En disputa",
  LIQUIDADO: "Liquidado",
  SUSPENDIDO: "Suspendido",
  VOID: "Anulado",
};

/** El usuario reporta desde su propia perspectiva; el outcome de la API es absoluto (local/visitante). */
function mapearResultadoPropio(resultado: ResultadoPropio, esLocal: boolean): OutcomePartido {
  if (resultado === "EMPATE") {
    return "EMPATE";
  }
  if (resultado === "GANE") {
    return esLocal ? "GANA_LOCAL" : "GANA_VISITANTE";
  }
  return esLocal ? "GANA_VISITANTE" : "GANA_LOCAL";
}

export default function DetallePartido(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [resultado, setResultado] = useState<ResultadoPropio | null>(null);
  const [golesPropios, setGolesPropios] = useState("");
  const [golesRival, setGolesRival] = useState("");
  const [mostrarIncidente, setMostrarIncidente] = useState(false);
  const [descripcionIncidente, setDescripcionIncidente] = useState("");

  const usuarioQuery = useQuery({
    queryKey: ["usuario", "actual"],
    queryFn: () => obtenerUsuarioActual(accessToken as string),
    enabled: accessToken !== null,
  });

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });
  const miEquipoId = equiposQuery.data?.[0]?.id;

  const partidoQuery = useQuery({
    queryKey: ["partidos", id],
    queryFn: () => obtenerPartido(accessToken as string, id),
    enabled: accessToken !== null && !!id,
  });

  const desistirMutacion = useMutation({
    mutationFn: () => desistirPartido(accessToken as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partidos", id] });
    },
  });

  const noShowMutacion = useMutation({
    mutationFn: () => flaggearNoShow(accessToken as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partidos", id] });
    },
  });

  const reportarMutacion = useMutation({
    mutationFn: () => {
      if (!resultado || !partidoQuery.data) {
        throw new Error("Elegi un resultado");
      }
      const esLocal = partidoQuery.data.reporterLocalId === usuarioQuery.data?.id;
      const outcome = mapearResultadoPropio(resultado, esLocal);
      const propios = golesPropios ? Number(golesPropios) : undefined;
      const rival = golesRival ? Number(golesRival) : undefined;
      const golesLocal = esLocal ? propios : rival;
      const golesVisita = esLocal ? rival : propios;
      return reportarResultado(accessToken as string, id, outcome, golesLocal, golesVisita);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partidos", id] });
      queryClient.invalidateQueries({ queryKey: ["equipos", "mios"] });
    },
  });

  const incidenteMutacion = useMutation({
    mutationFn: () =>
      flaggearIncidente(accessToken as string, id, descripcionIncidente || undefined),
    onSuccess: () => {
      setMostrarIncidente(false);
      setDescripcionIncidente("");
    },
  });

  if (partidoQuery.isLoading || usuarioQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Partido" }} />
        <ActivityIndicator />
      </View>
    );
  }

  const partido = partidoQuery.data;
  const usuario = usuarioQuery.data;

  if (!partido || !usuario) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Partido" }} />
        <Text style={styles.aviso}>No se pudo cargar el partido.</Text>
      </View>
    );
  }

  const esLocal = partido.reporterLocalId === usuario.id;
  const esVisitante = partido.reporterVisitanteId === usuario.id;
  const yaReporte = partido.reportes.some((reporte) => reporte.reporterId === usuario.id);
  const puedeReportar =
    (esLocal || esVisitante) &&
    !yaReporte &&
    (partido.estado === "EN_JUEGO" || partido.estado === "REPORTADO");

  const esParteDelPacto =
    miEquipoId === partido.equipoLocalId || miEquipoId === partido.equipoVisitanteId;
  const ventanaDesistimientoPaso =
    Date.now() >
    new Date(partido.createdAt).getTime() + VENTANA_DESISTIMIENTO_HORAS * 60 * 60 * 1000;

  function confirmarDesistir(): void {
    Alert.alert(
      "Desistir del pacto",
      "No suma al rating. Tenes hasta 2 bajas por mes (contando rechazos de desafios) sin tocar tu fair-play; de la tercera en adelante resta puntos igual que rechazar. ¿Confirmas?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Desistir", style: "destructive", onPress: () => desistirMutacion.mutate() },
      ],
    );
  }

  function confirmarNoShow(): void {
    Alert.alert(
      "El rival no aparecio",
      "Si el otro equipo no lo contradice, a las 24hs se le aplica un golpe de fair-play. Si tambien te marca a vos, se anula sin penalidad para nadie.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Marcar no-show", style: "destructive", onPress: () => noShowMutacion.mutate() },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: `${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre}` }}
      />
      <Text style={styles.titulo}>
        {partido.equipoLocal.nombre} vs {partido.equipoVisitante.nombre}
      </Text>
      <Text style={styles.estado}>{ETIQUETA_ESTADO[partido.estado] ?? partido.estado}</Text>

      {partido.outcomeFinal && (
        <Text style={styles.resultado}>
          Resultado:{" "}
          {partido.outcomeFinal === "EMPATE"
            ? "Empate"
            : partido.outcomeFinal === "GANA_LOCAL"
              ? `Gano ${partido.equipoLocal.nombre}`
              : `Gano ${partido.equipoVisitante.nombre}`}
        </Text>
      )}

      {partido.estado === "PACTADO" && esParteDelPacto && (
        <View style={styles.pactoSeccion}>
          <Link href={{ pathname: "/partido/firmar", params: { id } }} asChild>
            <Pressable style={styles.boton}>
              <Text style={styles.botonTexto}>Firmar en cancha</Text>
            </Pressable>
          </Link>

          {!ventanaDesistimientoPaso ? (
            <Pressable
              style={[styles.botonSecundario, desistirMutacion.isPending && styles.botonDeshabilitado]}
              disabled={desistirMutacion.isPending}
              onPress={confirmarDesistir}
            >
              <Text style={styles.botonSecundarioTexto}>Desistir</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.botonSecundario, noShowMutacion.isPending && styles.botonDeshabilitado]}
              disabled={noShowMutacion.isPending}
              onPress={confirmarNoShow}
            >
              <Text style={styles.botonSecundarioTexto}>El rival no aparecio</Text>
            </Pressable>
          )}

          {desistirMutacion.isError && (
            <Text style={styles.error}>{desistirMutacion.error.message}</Text>
          )}
          {noShowMutacion.isError && <Text style={styles.error}>{noShowMutacion.error.message}</Text>}
        </View>
      )}

      {puedeReportar && (
        <View style={styles.formulario}>
          <Text style={styles.etiqueta}>Como salio para tu equipo?</Text>
          <View style={styles.opciones}>
            {(["GANE", "EMPATE", "PERDI"] as ResultadoPropio[]).map((opcion) => (
              <Pressable
                key={opcion}
                style={[styles.opcion, resultado === opcion && styles.opcionSeleccionada]}
                onPress={() => setResultado(opcion)}
              >
                <Text
                  style={[
                    styles.opcionTexto,
                    resultado === opcion && styles.opcionTextoSeleccionado,
                  ]}
                >
                  {opcion === "GANE" ? "Gane" : opcion === "PERDI" ? "Perdi" : "Empate"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.golesFila}>
            <View style={styles.golesCampo}>
              <Text style={styles.etiqueta}>Goles propios</Text>
              <TextInput
                style={styles.inputGoles}
                keyboardType="number-pad"
                value={golesPropios}
                onChangeText={setGolesPropios}
              />
            </View>
            <View style={styles.golesCampo}>
              <Text style={styles.etiqueta}>Goles rival</Text>
              <TextInput
                style={styles.inputGoles}
                keyboardType="number-pad"
                value={golesRival}
                onChangeText={setGolesRival}
              />
            </View>
          </View>

          {reportarMutacion.isError && (
            <Text style={styles.error}>{reportarMutacion.error.message}</Text>
          )}

          <Pressable
            style={[
              styles.boton,
              (reportarMutacion.isPending || !resultado) && styles.botonDeshabilitado,
            ]}
            disabled={reportarMutacion.isPending || !resultado}
            onPress={() => reportarMutacion.mutate()}
          >
            {reportarMutacion.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Reportar resultado</Text>
            )}
          </Pressable>
        </View>
      )}

      {!puedeReportar && yaReporte && !partido.outcomeFinal && (
        <Text style={styles.aviso}>Ya reportaste. Esperando el reporte del rival.</Text>
      )}

      {partido.estado === "EN_DISPUTA" && (
        <Link href={{ pathname: "/disputa/[matchId]", params: { matchId: id } }} asChild>
          <Pressable style={styles.boton}>
            <Text style={styles.botonTexto}>Ver disputa</Text>
          </Pressable>
        </Link>
      )}

      {(esLocal || esVisitante) && (
        <View style={styles.incidenteSeccion}>
          {!mostrarIncidente ? (
            <Pressable style={styles.botonSecundario} onPress={() => setMostrarIncidente(true)}>
              <Text style={styles.botonSecundarioTexto}>Reportar incidente</Text>
            </Pressable>
          ) : (
            <>
              <Text style={styles.etiqueta}>
                No hace falta decir quien tuvo la culpa, solo que paso algo en el partido.
              </Text>
              <TextInput
                style={styles.inputGoles}
                placeholder="Descripcion (opcional)"
                value={descripcionIncidente}
                onChangeText={setDescripcionIncidente}
                maxLength={280}
              />
              {incidenteMutacion.isError && (
                <Text style={styles.error}>{incidenteMutacion.error.message}</Text>
              )}
              <Pressable
                style={[styles.boton, incidenteMutacion.isPending && styles.botonDeshabilitado]}
                disabled={incidenteMutacion.isPending}
                onPress={() => incidenteMutacion.mutate()}
              >
                {incidenteMutacion.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.botonTexto}>Enviar reporte de incidente</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 8,
  },
  titulo: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  estado: {
    textAlign: "center",
    color: "#666",
    marginBottom: 8,
  },
  resultado: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  formulario: {
    gap: 12,
    marginTop: 16,
  },
  etiqueta: {
    fontSize: 14,
    color: "#555",
  },
  opciones: {
    flexDirection: "row",
    gap: 8,
  },
  opcion: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  opcionSeleccionada: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  opcionTexto: {
    color: "#333",
  },
  opcionTextoSeleccionado: {
    color: "#fff",
    fontWeight: "600",
  },
  golesFila: {
    flexDirection: "row",
    gap: 12,
  },
  golesCampo: {
    flex: 1,
    gap: 4,
  },
  inputGoles: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    textAlign: "center",
  },
  boton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  botonTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  error: {
    color: "#c0392b",
  },
  aviso: {
    textAlign: "center",
    color: "#666",
    marginTop: 16,
  },
  incidenteSeccion: {
    gap: 8,
    marginTop: 16,
  },
  pactoSeccion: {
    gap: 8,
    marginTop: 8,
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: "#c0392b",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  botonSecundarioTexto: {
    color: "#c0392b",
    fontWeight: "600",
    fontSize: 16,
  },
});
