import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import {
  desistirPartido,
  flaggearIncidente,
  flaggearNoShow,
  obtenerPartido,
  reportarResultado,
  ETIQUETA_ESTADO_PARTIDO,
  TONO_ESTADO_PARTIDO,
  type OutcomePartido,
} from "@/api/matches";
import { misEquipos } from "@/api/teams";
import { Boton, Campo, Chip, Pantalla, SelectorChips, Tarjeta } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

/** Mismo numero que VENTANA_DESISTIMIENTO_HORAS del backend (matches.constantes.ts) -- solo para mostrar u ocultar el boton, el backend es quien manda. */
const VENTANA_DESISTIMIENTO_HORAS = 24;

type ResultadoPropio = "GANE" | "PERDI" | "EMPATE";

const OPCIONES_RESULTADO: { valor: ResultadoPropio; etiqueta: string }[] = [
  { valor: "GANE", etiqueta: "Gane" },
  { valor: "EMPATE", etiqueta: "Empate" },
  { valor: "PERDI", etiqueta: "Perdi" },
];

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colores, espaciado, tipografia } = useTema();
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

  const partido = partidoQuery.data;
  const usuario = usuarioQuery.data;
  const cargando = partidoQuery.isLoading || usuarioQuery.isLoading;

  const esLocal = partido?.reporterLocalId === usuario?.id;
  const esVisitante = partido?.reporterVisitanteId === usuario?.id;
  const yaReporte = partido?.reportes.some((reporte) => reporte.reporterId === usuario?.id) ?? false;
  const puedeReportar =
    !!partido &&
    (esLocal || esVisitante) &&
    !yaReporte &&
    (partido.estado === "EN_JUEGO" || partido.estado === "REPORTADO");

  const esParteDelPacto =
    !!partido && (miEquipoId === partido.equipoLocalId || miEquipoId === partido.equipoVisitanteId);
  const ventanaDesistimientoPaso =
    !!partido &&
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
    <Pantalla centrado={cargando || !partido || !usuario}>
      <Stack.Screen
        options={{ title: partido ? `${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre}` : "Partido" }}
      />

      {cargando ? null : !partido || !usuario ? (
        <Text style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}>
          No se pudo cargar el partido.
        </Text>
      ) : (
        <>
          <View style={{ alignItems: "center", gap: espaciado.xs }}>
            <Text
              style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}
            >
              {partido.equipoLocal.nombre} vs {partido.equipoVisitante.nombre}
            </Text>
            <Chip
              texto={ETIQUETA_ESTADO_PARTIDO[partido.estado]}
              tono={TONO_ESTADO_PARTIDO[partido.estado]}
            />
            {partido.outcomeFinal && (
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                {partido.outcomeFinal === "EMPATE"
                  ? "Empate"
                  : partido.outcomeFinal === "GANA_LOCAL"
                    ? `Gano ${partido.equipoLocal.nombre}`
                    : `Gano ${partido.equipoVisitante.nombre}`}
              </Text>
            )}
          </View>

          {partido.estado === "PACTADO" && esParteDelPacto && (
            <Tarjeta style={{ gap: espaciado.sm }}>
              <Boton onPress={() => router.push({ pathname: "/partido/firmar", params: { id } })}>
                Firmar en cancha
              </Boton>

              {!ventanaDesistimientoPaso ? (
                <Boton
                  variante="destructivo"
                  onPress={confirmarDesistir}
                  cargando={desistirMutacion.isPending}
                >
                  Desistir
                </Boton>
              ) : (
                <Boton
                  variante="destructivo"
                  onPress={confirmarNoShow}
                  cargando={noShowMutacion.isPending}
                >
                  El rival no aparecio
                </Boton>
              )}

              {desistirMutacion.isError && (
                <Text style={[tipografia.caption, { color: colores.error }]}>
                  {desistirMutacion.error.message}
                </Text>
              )}
              {noShowMutacion.isError && (
                <Text style={[tipografia.caption, { color: colores.error }]}>
                  {noShowMutacion.error.message}
                </Text>
              )}
            </Tarjeta>
          )}

          {puedeReportar && (
            <Tarjeta style={{ gap: espaciado.md }}>
              <View style={{ gap: espaciado.xs }}>
                <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                  Como salio para tu equipo?
                </Text>
                <SelectorChips
                  opciones={OPCIONES_RESULTADO}
                  valorSeleccionado={resultado}
                  onCambiar={setResultado}
                />
              </View>

              <View style={{ flexDirection: "row", gap: espaciado.md }}>
                <View style={{ flex: 1 }}>
                  <Campo
                    etiqueta="Goles propios"
                    keyboardType="number-pad"
                    value={golesPropios}
                    onChangeText={setGolesPropios}
                    style={{ textAlign: "center" }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Campo
                    etiqueta="Goles rival"
                    keyboardType="number-pad"
                    value={golesRival}
                    onChangeText={setGolesRival}
                    style={{ textAlign: "center" }}
                  />
                </View>
              </View>

              {reportarMutacion.isError && (
                <Text style={[tipografia.caption, { color: colores.error }]}>
                  {reportarMutacion.error.message}
                </Text>
              )}

              <Boton
                onPress={() => reportarMutacion.mutate()}
                cargando={reportarMutacion.isPending}
                deshabilitado={!resultado}
              >
                Reportar resultado
              </Boton>
            </Tarjeta>
          )}

          {!puedeReportar && yaReporte && !partido.outcomeFinal && (
            <Text style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}>
              Ya reportaste. Falta el rival.
            </Text>
          )}

          {partido.estado === "EN_DISPUTA" && (
            <Boton onPress={() => router.push({ pathname: "/disputa/[matchId]", params: { matchId: id } })}>
              Ver disputa
            </Boton>
          )}

          {(esLocal || esVisitante) && (
            <View style={{ gap: espaciado.sm }}>
              {!mostrarIncidente ? (
                <Boton variante="secundario" onPress={() => setMostrarIncidente(true)}>
                  Reportar incidente
                </Boton>
              ) : (
                <Tarjeta style={{ gap: espaciado.md }}>
                  <Text
                    style={[tipografia.cuerpo, { color: colores.textoSecundario }]}
                  >
                    No hace falta decir quien tuvo la culpa, solo reportar que paso algo.
                  </Text>
                  <Campo
                    placeholder="Descripcion (opcional)"
                    value={descripcionIncidente}
                    onChangeText={setDescripcionIncidente}
                    maxLength={280}
                  />
                  {incidenteMutacion.isError && (
                    <Text style={[tipografia.caption, { color: colores.error }]}>
                      {incidenteMutacion.error.message}
                    </Text>
                  )}
                  <Boton
                    onPress={() => incidenteMutacion.mutate()}
                    cargando={incidenteMutacion.isPending}
                  >
                    Enviar reporte
                  </Boton>
                </Tarjeta>
              )}
            </View>
          )}
        </>
      )}
    </Pantalla>
  );
}
