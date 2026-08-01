import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import {
  flaggearIncidente,
  obtenerPartido,
  reportarResultado,
  type OutcomePartido,
} from "@/api/matches";
import { useAuthStore } from "@/store/auth-store";

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

  const partidoQuery = useQuery({
    queryKey: ["partidos", id],
    queryFn: () => obtenerPartido(accessToken as string, id),
    enabled: accessToken !== null && !!id,
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
        <ActivityIndicator />
      </View>
    );
  }

  const partido = partidoQuery.data;
  const usuario = usuarioQuery.data;

  if (!partido || !usuario) {
    return (
      <View style={styles.container}>
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

  return (
    <View style={styles.container}>
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
