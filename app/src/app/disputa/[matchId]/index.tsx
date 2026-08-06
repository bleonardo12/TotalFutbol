import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import { obtenerDisputa } from "@/api/disputes";
import {
  obtenerPartido,
  resolverDisputa,
  type OutcomePartido,
  type Partido,
  type TipoSancionFairPlay,
} from "@/api/matches";
import { Boton, Chip, Pantalla, SelectorChips, Tarjeta } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

const OPCIONES_SANCION: { valor: TipoSancionFairPlay; etiqueta: string }[] = [
  { valor: "REPORTE_FALSO_PROBADO", etiqueta: "Reporte falso probado" },
  { valor: "DISPUTA_FRIVOLA", etiqueta: "Disputa frivola" },
];

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function textoOutcome(outcome: OutcomePartido, partido: Partido): string {
  if (outcome === "EMPATE") {
    return "Empataron";
  }
  return outcome === "GANA_LOCAL"
    ? `Ganó ${partido.equipoLocal.nombre}`
    : `Ganó ${partido.equipoVisitante.nombre}`;
}

const PASOS_TIMELINE: { capa: "C1_EVIDENCIA" | "C2_PLANTELES" | "C3_ADMIN"; titulo: string; texto: string }[] = [
  { capa: "C1_EVIDENCIA", titulo: "Evidencia", texto: "Suban una foto que muestre el resultado, con el codigo visible." },
  { capa: "C2_PLANTELES", titulo: "Planteles", texto: "Le preguntamos a los dos planteles que vieron, sin que se vote." },
  { capa: "C3_ADMIN", titulo: "Admin", texto: "Un admin de la app decide con lo que haya -- se anula si es indeterminable." },
];

export default function EstadoDisputa(): React.JSX.Element {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);
  const [sancionTipo, setSancionTipo] = useState<TipoSancionFairPlay | null>(null);
  const [sancionEquipoId, setSancionEquipoId] = useState<string | null>(null);

  const usuarioQuery = useQuery({
    queryKey: ["usuario", "actual"],
    queryFn: () => obtenerUsuarioActual(accessToken as string),
    enabled: accessToken !== null,
  });

  const partidoQuery = useQuery({
    queryKey: ["partidos", matchId],
    queryFn: () => obtenerPartido(accessToken as string, matchId),
    enabled: accessToken !== null && !!matchId,
  });

  const disputaQuery = useQuery({
    queryKey: ["disputas", matchId],
    queryFn: () => obtenerDisputa(accessToken as string, matchId),
    enabled: accessToken !== null && !!matchId,
  });

  const resolverMutacion = useMutation({
    mutationFn: (resolucion?: OutcomePartido) => {
      const sancion =
        sancionTipo && sancionEquipoId
          ? { tipo: sancionTipo, equipoSancionadoId: sancionEquipoId }
          : undefined;
      return resolverDisputa(accessToken as string, matchId, resolucion, sancion);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputas", matchId] });
      queryClient.invalidateQueries({ queryKey: ["partidos", matchId] });
      queryClient.invalidateQueries({ queryKey: ["disputas", "pendientes"] });
    },
  });

  const partido = partidoQuery.data;
  const disputa = disputaQuery.data;
  const cargando = partidoQuery.isLoading || disputaQuery.isLoading;

  return (
    <Pantalla centrado={cargando || !partido || !disputa}>
      <Stack.Screen options={{ title: "Disputa" }} />

      {cargando ? null : !partido || !disputa ? (
        <Text style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}>
          No se pudo cargar la disputa.
        </Text>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: espaciado.md }}>
          <View style={{ alignItems: "center", gap: espaciado.xs }}>
            <Text
              style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}
            >
              {partido.equipoLocal.nombre} vs {partido.equipoVisitante.nombre}
            </Text>
            {!disputa.resuelta && <Chip texto="En disputa" tono="error" />}
          </View>

          {!disputa.resuelta && (
            <Tarjeta peligro style={{ gap: espaciado.sm }}>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                Los dos dicen que ganaron
              </Text>
              {partido.reportes.map((reporte) => {
                const equipo =
                  reporte.teamId === partido.equipoLocal.id
                    ? partido.equipoLocal
                    : partido.equipoVisitante;
                return (
                  <View key={reporte.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                      {equipo.nombre}
                    </Text>
                    <Text style={[tipografia.cuerpoDestacado, { color: colores.error }]}>
                      {textoOutcome(reporte.outcome, partido)}
                    </Text>
                  </View>
                );
              })}
            </Tarjeta>
          )}

          {disputa.resuelta ? (
            <Tarjeta style={{ gap: espaciado.xs }}>
              <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                Disputa resuelta
              </Text>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                {disputa.anulada
                  ? "Anulada (VOID) — resultado indeterminable"
                  : disputa.resolucion === "EMPATE"
                    ? "Empate"
                    : disputa.resolucion === "GANA_LOCAL"
                      ? `Gano ${partido.equipoLocal.nombre}`
                      : `Gano ${partido.equipoVisitante.nombre}`}
              </Text>
              <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                {disputa.resueltaPor
                  ? `Resuelta por el admin el ${formatearFecha(disputa.resueltaEn as string)}`
                  : `Vencio sin resolucion el ${formatearFecha(disputa.resueltaEn as string)}`}
              </Text>
            </Tarjeta>
          ) : (
            <Tarjeta style={{ gap: espaciado.md }}>
              {PASOS_TIMELINE.map((paso, indice) => {
                const indiceActual = PASOS_TIMELINE.findIndex((p) => p.capa === disputa.capa);
                const completado = indice <= indiceActual;
                const esUltimo = indice === PASOS_TIMELINE.length - 1;
                return (
                  <View key={paso.capa} style={{ flexDirection: "row", gap: espaciado.md }}>
                    <View style={{ alignItems: "center" }}>
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: completado ? colores.acento : "transparent",
                          borderWidth: completado ? 0 : 2,
                          borderColor: colores.bordeControl,
                        }}
                      />
                      {!esUltimo && (
                        <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: colores.borde }} />
                      )}
                    </View>
                    <View style={{ flex: 1, paddingBottom: esUltimo ? 0 : espaciado.sm }}>
                      <Text
                        style={[
                          tipografia.cuerpoDestacado,
                          { color: indice === indiceActual ? colores.textoPrimario : colores.textoSecundario },
                        ]}
                      >
                        {paso.titulo}
                      </Text>
                      <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                        {paso.texto}
                      </Text>
                      {indice === indiceActual && (
                        <Text style={[tipografia.caption, { color: colores.alerta, marginTop: 2 }]}>
                          {`Vence el ${formatearFecha(disputa.capaExpiraEn)}`}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Tarjeta>
          )}

          {disputa.capa === "C1_EVIDENCIA" && !disputa.resuelta && (
            <Tarjeta style={{ gap: espaciado.xs }}>
              <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                Codigo para la foto de evidencia
              </Text>
              <Text
                style={[
                  tipografia.titulo,
                  { color: colores.textoPrimario, letterSpacing: 4, fontVariant: ["tabular-nums"] },
                ]}
              >
                {disputa.nonce}
              </Text>
              <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                Escribilo a mano y visible en la foto que subas como evidencia.
              </Text>
            </Tarjeta>
          )}

          {!disputa.resuelta && (
            <View style={{ gap: espaciado.sm }}>
              <Boton
                onPress={() =>
                  router.push({ pathname: "/disputa/[matchId]/subir-evidencia", params: { matchId } })
                }
              >
                Subir evidencia
              </Boton>
              <Boton
                variante="secundario"
                onPress={() => router.push({ pathname: "/disputa/[matchId]/poll", params: { matchId } })}
              >
                Responder consulta al plantel
              </Boton>
            </View>
          )}

          {usuarioQuery.data?.rol === "ADMIN" && !disputa.resuelta && (
            <Tarjeta style={{ gap: espaciado.md }}>
              <Text style={[tipografia.subtitulo, { color: colores.textoPrimario }]}>
                Resolver (admin)
              </Text>

              {disputa.presuncionContraEquipoId && (
                <Text style={[tipografia.caption, styles.presuncion]}>
                  Presuncion por diferencial de fair-play contra{" "}
                  {disputa.presuncionContraEquipoId === partido.equipoLocal.id
                    ? partido.equipoLocal.nombre
                    : partido.equipoVisitante.nombre}
                  . No decide nada por si sola.
                </Text>
              )}

              <View style={{ gap: espaciado.xs }}>
                <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                  Sancionar (opcional)
                </Text>
                <SelectorChips
                  opciones={OPCIONES_SANCION}
                  valorSeleccionado={sancionTipo}
                  onCambiar={(valor) =>
                    setSancionTipo((actual) => (actual === valor ? null : valor))
                  }
                />
              </View>

              {sancionTipo && (
                <SelectorChips
                  opciones={[
                    { valor: partido.equipoLocal.id, etiqueta: partido.equipoLocal.nombre },
                    { valor: partido.equipoVisitante.id, etiqueta: partido.equipoVisitante.nombre },
                  ]}
                  valorSeleccionado={sancionEquipoId}
                  onCambiar={setSancionEquipoId}
                />
              )}

              {resolverMutacion.isError && (
                <Text style={[tipografia.caption, { color: colores.error }]}>
                  {resolverMutacion.error.message}
                </Text>
              )}

              <Boton
                onPress={() => resolverMutacion.mutate("GANA_LOCAL")}
                cargando={resolverMutacion.isPending}
              >
                {`Gano ${partido.equipoLocal.nombre}`}
              </Boton>
              <Boton
                onPress={() => resolverMutacion.mutate("EMPATE")}
                cargando={resolverMutacion.isPending}
              >
                Empate
              </Boton>
              <Boton
                onPress={() => resolverMutacion.mutate("GANA_VISITANTE")}
                cargando={resolverMutacion.isPending}
              >
                {`Gano ${partido.equipoVisitante.nombre}`}
              </Boton>
              <Boton
                variante="secundario"
                onPress={() => resolverMutacion.mutate(undefined)}
                cargando={resolverMutacion.isPending}
              >
                Anular (indeterminable)
              </Boton>
            </Tarjeta>
          )}

          <View style={{ gap: espaciado.sm }}>
            <Text style={[tipografia.subtitulo, { color: colores.textoPrimario }]}>
              Evidencia subida
            </Text>
            {disputa.evidencias.length === 0 ? (
              <Text style={[tipografia.cuerpo, { color: colores.textoApagado }]}>
                Todavia no se subio evidencia.
              </Text>
            ) : (
              disputa.evidencias.map((evidencia) => (
                <Tarjeta key={evidencia.id} style={{ flexDirection: "row", gap: espaciado.md }}>
                  <Image source={{ uri: evidencia.url }} style={styles.miniatura} />
                  <View style={{ flex: 1, gap: 2, justifyContent: "center" }}>
                    <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                      {evidencia.team.nombre}
                    </Text>
                    {evidencia.descripcion && (
                      <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                        {evidencia.descripcion}
                      </Text>
                    )}
                    <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                      {formatearFecha(evidencia.createdAt)}
                    </Text>
                  </View>
                </Tarjeta>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Pantalla>
  );
}

function crearEstilos({ colores, radio }: Tema) {
  return {
    miniatura: {
      width: 64,
      height: 64,
      borderRadius: radio.sm,
      backgroundColor: colores.superficieElevada,
    },
    presuncion: {
      color: colores.alerta,
      backgroundColor: `${colores.alerta}26`,
      padding: 8,
      borderRadius: radio.sm,
    },
  };
}
