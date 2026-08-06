import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { obtenerTemporadaActual } from "@/api/seasons";
import {
  obtenerEquipoPorId,
  obtenerForma,
  obtenerPalmares,
  obtenerPorFormato,
  type CategoriaFutbol,
  type Division,
} from "@/api/teams";
import { Boton, Chip, EtiquetaSeccion, NumeroRating, Pantalla, Tarjeta } from "@/components";
import { useTema, type Tema } from "@/theme";

const ETIQUETA_DIVISION: Record<Division, string> = {
  ELITE: "Elite",
  ORO: "Oro",
  PLATA: "Plata",
  BRONCE: "Bronce",
};

const TONO_DIVISION: Record<Division, "elite" | "oro" | "neutral"> = {
  ELITE: "elite",
  ORO: "oro",
  PLATA: "neutral",
  BRONCE: "neutral",
};

const ETIQUETA_CATEGORIA: Record<CategoriaFutbol, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  MIXTO: "Mixto",
};

function iniciales(nombre: string): string {
  return nombre.trim().slice(0, 2).toUpperCase();
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

/** Perfil de equipo (docs Guapo §3.5): hero + forma + donde son buenos + palmares. */
export default function PerfilEquipo(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);

  const equipoQuery = useQuery({
    queryKey: ["equipo", id],
    queryFn: () => obtenerEquipoPorId(id as string),
    enabled: id !== undefined,
  });
  const equipo = equipoQuery.data;

  const formaQuery = useQuery({
    queryKey: ["equipos", "forma", id],
    queryFn: () => obtenerForma(id as string),
    enabled: id !== undefined,
  });
  const forma = formaQuery.data;

  const formatoQuery = useQuery({
    queryKey: ["equipos", "formato", id],
    queryFn: () => obtenerPorFormato(id as string),
    enabled: id !== undefined,
  });

  const palmaresQuery = useQuery({
    queryKey: ["equipos", "palmares", id],
    queryFn: () => obtenerPalmares(id as string),
    enabled: id !== undefined,
  });

  const temporadaQuery = useQuery({
    queryKey: ["temporada", "actual"],
    queryFn: obtenerTemporadaActual,
    enabled: (palmaresQuery.data?.length ?? 1) === 0,
  });

  const esPodio = equipo?.division === "ELITE";

  return (
    <Pantalla>
      <Stack.Screen options={{ title: equipo?.nombre ?? "Equipo" }} />

      {equipoQuery.isLoading || !equipo ? null : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: espaciado.lg }}>
          <Tarjeta destacada style={styles.hero}>
            <View style={styles.escudo}>
              <Text style={styles.escudoTexto}>{iniciales(equipo.nombre)}</Text>
            </View>
            <Text style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}>
              {equipo.nombre}
            </Text>

            <View style={styles.filaChips}>
              <Chip
                texto={equipo.estado === "RANKEADO" ? "Rankeado" : "Provisional"}
                tono={equipo.estado === "RANKEADO" ? "elite" : "neutral"}
              />
              {equipo.division && (
                <Chip
                  texto={equipo.division === "ELITE" ? `${ETIQUETA_DIVISION[equipo.division]} 🐐` : ETIQUETA_DIVISION[equipo.division]}
                  tono={TONO_DIVISION[equipo.division]}
                />
              )}
              <Chip texto={ETIQUETA_CATEGORIA[equipo.categoria]} tono="neutral" />
            </View>

            <NumeroRating valor={equipo.rating} podio={esPodio} style={styles.rating} />
            {forma && (
              <Text style={[tipografia.numeroChico, { color: colores.textoApagado }]}>
                {`pico ${Math.round(forma.pico)}`}
              </Text>
            )}

            <View style={styles.statFairPlay}>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoSecundario }]}>
                Fair-play
              </Text>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                {Math.round(equipo.fairPlay)}
              </Text>
            </View>
          </Tarjeta>

          {forma && (
            <View style={{ gap: espaciado.sm }}>
              <EtiquetaSeccion>Tu forma</EtiquetaSeccion>
              <Tarjeta style={{ gap: espaciado.md }}>
                {forma.barras.length > 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: espaciado.xs, height: 56 }}>
                    {forma.barras.map((valor, indice) => {
                      const desdeElFinal = forma.barras.length - indice;
                      const color =
                        desdeElFinal <= 3
                          ? colores.acento
                          : desdeElFinal <= 6
                            ? colores.bordeControl
                            : colores.borde;
                      return (
                        <View
                          key={indice}
                          style={{
                            flex: 1,
                            height: `${Math.max(6, valor * 100)}%`,
                            backgroundColor: color,
                            borderRadius: 3,
                          }}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}>
                    Sin partidos todavía…
                  </Text>
                )}
                <View style={{ flexDirection: "row", gap: espaciado.sm }}>
                  <View style={styles.celdaStat}>
                    <Text style={styles.celdaStatValor}>
                      {`${forma.gEP.g}-${forma.gEP.e}-${forma.gEP.p}`}
                    </Text>
                    <EtiquetaSeccion>G-E-P</EtiquetaSeccion>
                  </View>
                  <View style={styles.celdaStat}>
                    <Text style={[styles.celdaStatValor, { color: colores.acento }]}>
                      {`${forma.upsetPorcentaje}%`}
                    </Text>
                    <EtiquetaSeccion>Upset</EtiquetaSeccion>
                  </View>
                  <View style={styles.celdaStat}>
                    <Text style={styles.celdaStatValor}>{Math.round(equipo.fairPlay)}</Text>
                    <EtiquetaSeccion>Fair-play</EtiquetaSeccion>
                  </View>
                </View>
              </Tarjeta>
            </View>
          )}

          <View style={{ gap: espaciado.sm }}>
            <EtiquetaSeccion>Dónde son buenos</EtiquetaSeccion>
            <Tarjeta style={{ gap: espaciado.md }}>
              {formatoQuery.data && formatoQuery.data.length > 0 ? (
                formatoQuery.data.map((item, indice) => (
                  <View key={`${item.cantidadJugadores}-${item.superficie}`} style={{ gap: espaciado.xs }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={[tipografia.cuerpo, { color: colores.textoPrimario }]}>
                        {`${item.cantidadJugadores.replace("F", "")} · ${item.superficie}`}
                      </Text>
                      <Text style={[tipografia.numeroChico, { color: colores.textoSecundario }]}>
                        {`${item.porcentaje}%`}
                      </Text>
                    </View>
                    <View style={styles.barraFondo}>
                      <View
                        style={[
                          styles.barraRelleno,
                          {
                            width: `${item.porcentaje}%`,
                            backgroundColor: indice === 0 ? colores.acento : colores.bordeControl,
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}>
                  Todavía no jugaron ningún partido liquidado.
                </Text>
              )}
            </Tarjeta>
          </View>

          <View style={{ gap: espaciado.sm }}>
            <EtiquetaSeccion>Palmarés</EtiquetaSeccion>
            {palmaresQuery.data && palmaresQuery.data.length > 0 ? (
              <View style={{ gap: espaciado.xs }}>
                {palmaresQuery.data.map((item) => (
                  <Tarjeta
                    key={`${item.anio}-${item.division}`}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                      {item.esCampeonDelAnio ? `Campeón del año ${item.anio} 🐐` : `Campeón ${item.anio}`}
                    </Text>
                    <Chip texto={ETIQUETA_DIVISION[item.division]} tono={TONO_DIVISION[item.division]} />
                  </Tarjeta>
                ))}
              </View>
            ) : (
              <View style={styles.palmaresVacio}>
                <Text style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}>
                  Todavía no ganaron una temporada.
                </Text>
                {temporadaQuery.data && (
                  <Text style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}>
                    {`La temporada ${temporadaQuery.data.anio} cierra el ${formatearFecha(temporadaQuery.data.fechaFin)}.`}
                  </Text>
                )}
              </View>
            )}
          </View>

          <Boton
            onPress={() =>
              router.push({
                pathname: "/desafio/proponer",
                params: { equipoDesafiadoId: equipo.id, equipoDesafiadoNombre: equipo.nombre },
              })
            }
          >
            Desafiar 👊
          </Boton>
        </ScrollView>
      )}
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    hero: {
      alignItems: "center" as const,
      gap: espaciado.xs,
    },
    escudo: {
      width: 64,
      height: 64,
      borderRadius: radio.lg,
      backgroundColor: colores.superficieElevada,
      borderWidth: 2,
      borderColor: colores.acento,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: espaciado.xs,
    },
    escudoTexto: {
      fontFamily: "Archivo_900Black",
      fontSize: 22,
      color: colores.acento,
    },
    filaChips: {
      flexDirection: "row" as const,
      gap: espaciado.sm,
      marginBottom: espaciado.sm,
    },
    rating: {
      marginTop: espaciado.sm,
    },
    statFairPlay: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      width: "100%" as const,
      paddingTop: espaciado.md,
      marginTop: espaciado.sm,
      borderTopWidth: 1,
      borderTopColor: colores.borde,
    },
    celdaStat: {
      flex: 1,
      backgroundColor: colores.superficieHundida,
      borderRadius: radio.md,
      paddingVertical: espaciado.sm,
      alignItems: "center" as const,
      gap: 3,
    },
    celdaStatValor: {
      fontFamily: "JetBrainsMono_800ExtraBold",
      fontSize: 16,
      color: colores.textoPrimario,
    },
    barraFondo: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colores.superficieHundida,
      overflow: "hidden" as const,
    },
    barraRelleno: {
      height: 6,
      borderRadius: 3,
    },
    palmaresVacio: {
      borderWidth: 1,
      borderColor: colores.borde,
      borderStyle: "dashed" as const,
      borderRadius: radio.lg,
      padding: espaciado.lg,
      gap: espaciado.xs,
    },
  };
}
