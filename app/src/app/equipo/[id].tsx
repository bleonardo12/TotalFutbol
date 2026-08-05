import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { obtenerEquipoPorId, type CategoriaFutbol, type Division } from "@/api/teams";
import { Boton, Chip, NumeroRating, Pantalla, Tarjeta } from "@/components";
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

/** Perfil minimo de equipo (docs/design.md §5): destino de la fila del ranking, antes iba directo a proponer desafio. */
export default function PerfilEquipo(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tema = useTema();
  const { colores, tipografia } = tema;
  const styles = crearEstilos(tema);

  const equipoQuery = useQuery({
    queryKey: ["equipo", id],
    queryFn: () => obtenerEquipoPorId(id as string),
    enabled: id !== undefined,
  });
  const equipo = equipoQuery.data;
  const esPodio = equipo?.division === "ELITE";

  return (
    <Pantalla>
      <Stack.Screen options={{ title: equipo?.nombre ?? "Equipo" }} />

      {equipoQuery.isLoading || !equipo ? null : (
        <>
          <Tarjeta destacada style={styles.tarjeta}>
            <Text style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}>
              {equipo.nombre}
            </Text>

            <View style={styles.filaChips}>
              <Chip
                texto={equipo.estado === "RANKEADO" ? "Rankeado" : "Provisional"}
                tono={equipo.estado === "RANKEADO" ? "elite" : "neutral"}
              />
              {equipo.division && (
                <Chip texto={ETIQUETA_DIVISION[equipo.division]} tono={TONO_DIVISION[equipo.division]} />
              )}
              <Chip texto={ETIQUETA_CATEGORIA[equipo.categoria]} tono="elite" />
            </View>

            <NumeroRating valor={equipo.rating} podio={esPodio} style={styles.rating} />
            <Text style={[tipografia.caption, styles.ratingEtiqueta]}>Rating</Text>

            <View style={styles.statFairPlay}>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoSecundario }]}>
                Fair-play
              </Text>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                {Math.round(equipo.fairPlay)}
              </Text>
            </View>
          </Tarjeta>

          <Boton
            onPress={() =>
              router.push({
                pathname: "/desafio/proponer",
                params: { equipoDesafiadoId: equipo.id, equipoDesafiadoNombre: equipo.nombre },
              })
            }
          >
            Desafiar
          </Boton>
        </>
      )}
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado }: Tema) {
  return {
    tarjeta: {
      alignItems: "center" as const,
      gap: espaciado.xs,
    },
    filaChips: {
      flexDirection: "row" as const,
      gap: espaciado.sm,
      marginBottom: espaciado.sm,
    },
    rating: {
      marginTop: espaciado.sm,
    },
    ratingEtiqueta: {
      color: colores.textoApagado,
      marginBottom: espaciado.sm,
    },
    statFairPlay: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      width: "100%" as const,
      paddingTop: espaciado.md,
      borderTopWidth: 1,
      borderTopColor: colores.borde,
    },
  };
}
