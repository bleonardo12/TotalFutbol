import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import { ApiError } from "@/api/client";
import {
  desistirPartido,
  flaggearIncidente,
  flaggearNoShow,
  obtenerPartido,
  reportarResultado,
  ETIQUETA_ESTADO_PARTIDO,
  TONO_ESTADO_PARTIDO,
  type OutcomePartido,
  type PartidoDetalle,
} from "@/api/matches";
import { obtenerMiEntorno } from "@/api/ranking";
import { Boton, Campo, Chip, EtiquetaSeccion, Pantalla, Tarjeta } from "@/components";
import { useColaReportes } from "@/hooks/useColaReportes";
import { useEquipoActivo } from "@/hooks/useEquipoActivo";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

/** Mismo numero que VENTANA_DESISTIMIENTO_HORAS del backend (matches.constantes.ts) -- solo para mostrar u ocultar el boton, el backend es quien manda. */
const VENTANA_DESISTIMIENTO_HORAS = 24;
/** Idem VENTANA_DISPUTA_HORAS del backend -- ventana de silencio=asentimiento tras el primer reporte. */
const VENTANA_DISPUTA_HORAS = 24;

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

/** Delta proyectado para mi equipo si el resultado fuera `resultado` (docs Guapo §3.2: "esto es nuevo y es clave"). */
function deltaProyectadoPropio(
  proyeccion: NonNullable<PartidoDetalle["proyeccion"]>,
  resultado: ResultadoPropio,
  esLocal: boolean,
): number {
  if (resultado === "EMPATE") {
    return esLocal ? proyeccion.siEmpate.local : proyeccion.siEmpate.visitante;
  }
  if (resultado === "GANE") {
    return esLocal ? proyeccion.siGanaLocal.local : proyeccion.siGanaVisitante.visitante;
  }
  return esLocal ? proyeccion.siGanaVisitante.local : proyeccion.siGanaLocal.visitante;
}

/** Conteo animado 0 -> valorFinal en `duracionMs`, ease-out (docs Guapo §3.2: pantalla Liquidado). */
function useConteoAnimado(valorFinal: number, activo: boolean, duracionMs = 600): number {
  const [valor, setValor] = useState(0);
  const inicioRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activo) return;
    inicioRef.current = null;
    let frame: number;
    function tick(timestamp: number): void {
      if (inicioRef.current === null) inicioRef.current = timestamp;
      const progreso = Math.min(1, (timestamp - inicioRef.current) / duracionMs);
      const easeOut = 1 - (1 - progreso) ** 3;
      setValor(valorFinal * easeOut);
      if (progreso < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valorFinal, activo, duracionMs]);

  return valor;
}

export default function DetallePartido(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);
  const [resultado, setResultado] = useState<ResultadoPropio | null>(null);
  const [golesPropios, setGolesPropios] = useState("");
  const [golesRival, setGolesRival] = useState("");
  const [mostrarIncidente, setMostrarIncidente] = useState(false);
  const [descripcionIncidente, setDescripcionIncidente] = useState("");
  const [ahoraMs, setAhoraMs] = useState(() => Date.now());
  const { cola, reintentarTodo, encolarReporte } = useColaReportes();

  const usuarioQuery = useQuery({
    queryKey: ["usuario", "actual"],
    queryFn: () => obtenerUsuarioActual(accessToken as string),
    enabled: accessToken !== null,
  });

  const { equipo: miEquipo } = useEquipoActivo();
  const miEquipoId = miEquipo?.id;

  const partidoQuery = useQuery({
    queryKey: ["partidos", id],
    queryFn: () => obtenerPartido(accessToken as string, id),
    enabled: accessToken !== null && !!id,
  });
  const partido = partidoQuery.data;

  const miEntornoQuery = useQuery({
    queryKey: ["ranking", "mi-entorno", miEquipoId],
    queryFn: () => obtenerMiEntorno(miEquipoId as string),
    enabled: !!miEquipoId && partido?.estado === "LIQUIDADO",
  });

  useEffect(() => {
    if (!partido || partido.estado !== "REPORTADO") return;
    const intervalo = setInterval(() => setAhoraMs(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [partido?.estado]);

  const soyLocalLiquidado = !!partido && miEquipoId === partido.equipoLocalId;
  const miDeltaLiquidado = partido?.deltas
    ? soyLocalLiquidado
      ? partido.deltas.local
      : partido.deltas.visitante
    : 0;
  // Hook incondicional (regla de hooks) aunque solo se usa en la rama LIQUIDADO, mas abajo.
  const conteoDelta = useConteoAnimado(miDeltaLiquidado, partido?.estado === "LIQUIDADO");

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

  function payloadReporte(): { outcome: OutcomePartido; golesLocal?: number; golesVisita?: number } {
    if (!resultado || !partidoQuery.data) {
      throw new Error("Elegi un resultado");
    }
    const esLocal = partidoQuery.data.reporterLocalId === usuarioQuery.data?.id;
    const outcome = mapearResultadoPropio(resultado, esLocal);
    const propios = golesPropios ? Number(golesPropios) : undefined;
    const rival = golesRival ? Number(golesRival) : undefined;
    return {
      outcome,
      golesLocal: esLocal ? propios : rival,
      golesVisita: esLocal ? rival : propios,
    };
  }

  const reportarMutacion = useMutation({
    mutationFn: () => {
      const { outcome, golesLocal, golesVisita } = payloadReporte();
      return reportarResultado(accessToken as string, id, outcome, golesLocal, golesVisita);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partidos", id] });
      queryClient.invalidateQueries({ queryKey: ["equipos", "mios"] });
    },
    onError: (error) => {
      // Sin respuesta del servidor (no ApiError) = sin señal, no un error de negocio -- se
      // encola en vez de mostrarlo como fallo (docs Guapo §3.4/§4, "Sin señal").
      if (!(error instanceof ApiError) && resultado) {
        const { outcome, golesLocal, golesVisita } = payloadReporte();
        encolarReporte({ matchId: id, outcome, golesLocal, golesVisita });
      }
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

  if (cargando || !partido || !usuario) {
    return (
      <Pantalla centrado>
        <Stack.Screen options={{ title: "Partido" }} />
      </Pantalla>
    );
  }

  // Liquidado: pantalla de premio propia, reemplaza el resto del arbol (docs Guapo §3.2).
  if (partido.estado === "LIQUIDADO" && miEquipoId) {
    const soyLocal = miEquipoId === partido.equipoLocalId;
    const miDelta = partido.deltas ? (soyLocal ? partido.deltas.local : partido.deltas.visitante) : 0;
    const ratingAnterior = miEquipoId
      ? (soyLocal ? partido.equipoLocal.rating : partido.equipoVisitante.rating) - miDelta
      : 0;
    const ratingNuevo = ratingAnterior + miDelta;
    const gane =
      (soyLocal && partido.outcomeFinal === "GANA_LOCAL") ||
      (!soyLocal && partido.outcomeFinal === "GANA_VISITANTE");
    const empate = partido.outcomeFinal === "EMPATE";
    const rival = soyLocal ? partido.equipoVisitante.nombre : partido.equipoLocal.nombre;
    const posicion = miEntornoQuery.data?.posicion ?? null;

    return (
      <Pantalla>
        <Stack.Screen options={{ title: "Liquidado" }} />
        <LinearGradient
          colors={["rgba(184,240,60,0.13)", "transparent"]}
          locations={[0, 0.6]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", top: 0, left: -80, right: -80, height: 320 }}
        />
        <View style={{ alignItems: "center", gap: espaciado.sm }}>
          <Chip texto="Confirmado" tono="elite" />
          <Text style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}>
            {empate ? `Empataste con ${rival}` : gane ? `Le ganaste a ${rival}` : `Perdiste con ${rival}`}
          </Text>
          <Text
            style={{
              fontFamily: "JetBrainsMono_800ExtraBold",
              fontSize: 88,
              letterSpacing: -4,
              color: miDelta >= 0 ? colores.acento : colores.error,
            }}
          >
            {`${miDelta >= 0 ? "+" : ""}${Math.round(conteoDelta)}`}
          </Text>
          <Text style={{ fontFamily: "JetBrainsMono_700Bold", fontSize: 24, color: colores.textoSecundario }}>
            {`${Math.round(ratingAnterior)} → ${Math.round(ratingNuevo)}`}
          </Text>
        </View>

        <Tarjeta destacada style={{ alignItems: "center", gap: espaciado.xs }}>
          <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
            {posicion !== null ? `Ahora sos #${posicion} de ${miEntornoQuery.data?.total}` : "Todavia no tenes puesto"}
          </Text>
          {posicion !== null && (
            <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
              {posicion > 10 ? `Faltan ${posicion - 10} para el top 10` : "Ya estas en el top 10"}
            </Text>
          )}
        </Tarjeta>

        <View style={{ flexDirection: "row", gap: espaciado.sm }}>
          <View style={{ flex: 1 }}>
            <Boton onPress={() => router.replace("/inicio")}>Volver a Inicio</Boton>
          </View>
          <View style={{ flex: 1 }}>
            <Boton variante="secundario" onPress={() => router.push("/ranking")}>
              Ver la escalera
            </Boton>
          </View>
        </View>
      </Pantalla>
    );
  }

  // Esperando al rival: ya reporte, todavia no hay outcome final (docs Guapo §3.2).
  if (partido.estado === "REPORTADO" && yaReporte && !partido.outcomeFinal) {
    const miReporte = partido.reportes.find((r) => r.reporterId === usuario.id);
    const reportadoEn = miReporte ? new Date(miReporte.createdAt).getTime() : Date.now();
    const limiteMs = reportadoEn + VENTANA_DISPUTA_HORAS * 60 * 60 * 1000;
    const restanteMs = Math.max(0, limiteMs - ahoraMs);
    const horasRestantes = Math.ceil(restanteMs / (60 * 60 * 1000));
    const progreso = Math.min(1, (ahoraMs - reportadoEn) / (VENTANA_DISPUTA_HORAS * 60 * 60 * 1000));
    const localReporto = partido.reportes.some((r) => r.teamId === partido.equipoLocalId);
    const visitanteReporto = partido.reportes.some((r) => r.teamId === partido.equipoVisitanteId);

    return (
      <Pantalla centrado>
        <Stack.Screen options={{ title: "Esperando al rival" }} />
        <View
          style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 3,
            borderColor: colores.borde,
            borderTopColor: colores.acento,
            borderRightColor: colores.acento,
            transform: [{ rotate: "-30deg" }],
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "JetBrainsMono_800ExtraBold",
              fontSize: 22,
              color: colores.textoPrimario,
              transform: [{ rotate: "30deg" }],
            }}
          >
            {miReporte?.golesLocal !== null && miReporte?.golesVisita !== null && miReporte
              ? `${miReporte.golesLocal}–${miReporte.golesVisita}`
              : "—"}
          </Text>
        </View>

        <Text style={[tipografia.subtitulo, { color: colores.textoPrimario, textAlign: "center" }]}>
          Ya reportaste
        </Text>
        <Text
          style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center", maxWidth: 300 }]}
        >
          Si el rival no dice nada, se liquida con tu resultado a las {VENTANA_DISPUTA_HORAS}hs de
          que reportaste (silencio = asentimiento). Si dice otra cosa, se abre disputa.
        </Text>

        <View style={{ gap: espaciado.xs }}>
          <View style={styles.barraProgresoFondo}>
            <View style={[styles.barraProgresoRelleno, { width: `${progreso * 100}%` }]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
              {`reportado ${new Date(reportadoEn).getHours()}:${String(new Date(reportadoEn).getMinutes()).padStart(2, "0")}`}
            </Text>
            <Text style={{ fontFamily: "JetBrainsMono_700Bold", fontSize: 12, color: colores.alerta }}>
              {`quedan ${horasRestantes} h`}
            </Text>
          </View>
        </View>

        <Tarjeta style={{ flexDirection: "row", justifyContent: "space-around" }}>
          <EstadoLado nombre={partido.equipoLocal.nombre} listo={localReporto} />
          <EstadoLado nombre={partido.equipoVisitante.nombre} listo={visitanteReporto} />
        </Tarjeta>
      </Pantalla>
    );
  }

  return (
    <Pantalla centrado={false} style={{ padding: 0 }}>
      <Stack.Screen
        options={{ title: `${partido.equipoLocal.nombre} vs ${partido.equipoVisitante.nombre}` }}
      />

      {cola.length > 0 && <BandaOffline cantidad={cola.length} onReintentar={reintentarTodo} />}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.md }}>
      <View style={{ alignItems: "center", gap: espaciado.xs }}>
        <Text style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}>
          {partido.equipoLocal.nombre} vs {partido.equipoVisitante.nombre}
        </Text>
        <Chip texto={ETIQUETA_ESTADO_PARTIDO[partido.estado]} tono={TONO_ESTADO_PARTIDO[partido.estado]} />
      </View>

      {cola.filter((r) => r.matchId === id).length > 0 && (
        <Tarjeta style={{ gap: espaciado.sm, borderColor: colores.alertaBorde }}>
          <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
            Guardado local, se manda solo
          </Text>
          {cola
            .filter((r) => r.matchId === id)
            .map((item) => (
              <Text key={item.id} style={[tipografia.caption, { color: colores.textoSecundario }]}>
                {`Reportaste ${new Date(item.creadoEn).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} — se manda cuando vuelva la señal.`}
              </Text>
            ))}
          <Boton variante="secundario" onPress={() => reintentarTodo()}>
            Reintentar ahora
          </Boton>
        </Tarjeta>
      )}

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
        <View style={{ gap: espaciado.md }}>
          <Text style={[tipografia.display, { color: colores.textoPrimario, textAlign: "center" }]}>
            ¿Cómo salió?
          </Text>

          <View style={{ gap: espaciado.sm }}>
            {OPCIONES_RESULTADO.map((opcion) => {
              const activo = resultado === opcion.valor;
              const delta = partido.proyeccion
                ? deltaProyectadoPropio(partido.proyeccion, opcion.valor, esLocal)
                : null;
              return (
                <Pressable
                  key={opcion.valor}
                  onPress={() => setResultado(opcion.valor)}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: espaciado.lg,
                    paddingHorizontal: espaciado.lg,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: activo ? colores.acento : colores.borde,
                    backgroundColor: activo ? colores.acento : colores.superficie,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Archivo_900Black",
                      fontSize: 16,
                      color: activo ? colores.acentoTexto : colores.textoPrimario,
                    }}
                  >
                    {opcion.etiqueta}
                  </Text>
                  {delta !== null && (
                    <Text
                      style={{
                        fontFamily: "JetBrainsMono_800ExtraBold",
                        fontSize: 15,
                        color: activo ? colores.acentoTexto : delta >= 0 ? colores.acento : colores.textoApagado,
                      }}
                    >
                      {`${delta >= 0 ? "+" : ""}${Math.round(delta)}`}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: espaciado.xs }}>
            <EtiquetaSeccion>Marcador (opcional)</EtiquetaSeccion>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: espaciado.md }}>
              <CajaMarcador valor={golesPropios} onCambiar={setGolesPropios} />
              <Text style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: 24, color: colores.textoApagado }}>
                –
              </Text>
              <CajaMarcador valor={golesRival} onCambiar={setGolesRival} />
            </View>
            <Text style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}>
              El rating lo mueve quien gano, no por cuanto.
            </Text>
          </View>

          {reportarMutacion.isError && reportarMutacion.error instanceof ApiError && (
            <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
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
        </View>
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
              Pasó algo feo en el partido
            </Boton>
          ) : (
            <Tarjeta style={{ gap: espaciado.md }}>
              <Text style={[tipografia.cuerpo, { color: colores.textoSecundario }]}>
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
              <Boton onPress={() => incidenteMutacion.mutate()} cargando={incidenteMutacion.isPending}>
                Enviar reporte
              </Boton>
            </Tarjeta>
          )}
        </View>
      )}
      </ScrollView>
    </Pantalla>
  );
}

/** Banda superior de "sin señal" (docs Guapo §3.4/§4): aparece mientras haya reportes encolados. */
function BandaOffline({
  cantidad,
  onReintentar,
}: {
  cantidad: number;
  onReintentar: () => void;
}): React.JSX.Element {
  const { colores, espaciado, tipografia } = useTema();
  return (
    <Pressable
      onPress={onReintentar}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: espaciado.xs,
        backgroundColor: colores.alertaFondo,
        borderBottomWidth: 1,
        borderBottomColor: colores.alertaBorde,
        paddingVertical: espaciado.sm,
        paddingHorizontal: espaciado.lg,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colores.alerta }} />
      <Text style={[tipografia.caption, { color: colores.alerta, flex: 1 }]}>
        {`Sin conexión — guardando local (${cantidad})`}
      </Text>
      <Text style={[tipografia.caption, { color: colores.alerta, textDecorationLine: "underline" }]}>
        Reintentar
      </Text>
    </Pressable>
  );
}

function EstadoLado({ nombre, listo }: { nombre: string; listo: boolean }): React.JSX.Element {
  const { colores, espaciado, tipografia } = useTema();
  return (
    <View style={{ alignItems: "center", gap: espaciado.xs }}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: listo ? colores.acento : "transparent",
          borderWidth: listo ? 0 : 1.5,
          borderColor: colores.bordeControl,
        }}
      />
      <Text style={[tipografia.caption, { color: colores.textoSecundario }]} numberOfLines={1}>
        {nombre}
      </Text>
    </View>
  );
}

function CajaMarcador({
  valor,
  onCambiar,
}: {
  valor: string;
  onCambiar: (v: string) => void;
}): React.JSX.Element {
  const { colores, radio } = useTema();
  return (
    <View
      style={{
        width: 88,
        height: 80,
        borderRadius: radio.lg,
        borderWidth: 1,
        borderColor: colores.borde,
        backgroundColor: colores.superficie,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Campo
        keyboardType="number-pad"
        value={valor}
        onChangeText={onCambiar}
        maxLength={2}
        style={{
          borderWidth: 0,
          backgroundColor: "transparent",
          fontFamily: "JetBrainsMono_800ExtraBold",
          fontSize: 36,
          textAlign: "center",
          paddingVertical: 0,
          paddingHorizontal: 0,
        }}
      />
    </View>
  );
}

function crearEstilos({ colores }: Tema) {
  return {
    barraProgresoFondo: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colores.superficieHundida,
      overflow: "hidden" as const,
    },
    barraProgresoRelleno: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colores.acento,
    },
  };
}
