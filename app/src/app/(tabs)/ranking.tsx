import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text } from "react-native";
import { obtenerRanking } from "@/api/ranking";
import { misEquipos, type CategoriaFutbol, type Division } from "@/api/teams";
import { Chip, Pantalla, Tabs, type OpcionTab } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

const OPCIONES_DIVISION: OpcionTab<Division | null>[] = [
  { valor: null, etiqueta: "Todos" },
  { valor: "ELITE", etiqueta: "Elite" },
  { valor: "ORO", etiqueta: "Oro" },
  { valor: "PLATA", etiqueta: "Plata" },
  { valor: "BRONCE", etiqueta: "Bronce" },
];

const OPCIONES_CATEGORIA: OpcionTab<CategoriaFutbol>[] = [
  { valor: "MASCULINO", etiqueta: "Masculino" },
  { valor: "FEMENINO", etiqueta: "Femenino" },
  { valor: "MIXTO", etiqueta: "Mixto" },
];

const ETIQUETA_DIVISION: Record<Division, string> = {
  ELITE: "Elite",
  ORO: "Oro",
  PLATA: "Plata",
  BRONCE: "Bronce",
};

const TONO_DIVISION: Record<Division, "exito" | "alerta" | "neutral"> = {
  ELITE: "exito",
  ORO: "alerta",
  PLATA: "neutral",
  BRONCE: "neutral",
};

export default function Ranking(): React.JSX.Element {
  const [division, setDivision] = useState<Division | null>(null);
  const [categoria, setCategoria] = useState<CategoriaFutbol | null>(null);
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });
  const miEquipo = equiposQuery.data?.[0];

  // Por defecto arranca en la categoria del equipo propio -- si todavia no cargo o no tiene equipo, Masculino.
  useEffect(() => {
    if (categoria === null && miEquipo) {
      setCategoria(miEquipo.categoria);
    }
  }, [categoria, miEquipo]);
  const categoriaActiva = categoria ?? miEquipo?.categoria ?? "MASCULINO";

  const rankingQuery = useQuery({
    queryKey: ["ranking", categoriaActiva, division],
    queryFn: () => obtenerRanking(categoriaActiva, division ?? undefined),
  });
  const miEquipoId = miEquipo?.id;

  return (
    <Pantalla>
      <Tabs opciones={OPCIONES_CATEGORIA} valorActivo={categoriaActiva} onCambiar={setCategoria} />
      <Tabs opciones={OPCIONES_DIVISION} valorActivo={division} onCambiar={setDivision} />

      <FlatList
        data={rankingQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: espaciado.xs }}
        ListEmptyComponent={
          !rankingQuery.isLoading ? (
            <Text style={[tipografia.cuerpo, { color: colores.textoApagado, textAlign: "center", marginTop: espaciado.xxl }]}>
              Todavia no hay equipos rankeados
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const esMiEquipo = item.id === miEquipoId;
          return (
            <Pressable
              style={styles.fila}
              disabled={esMiEquipo || !miEquipoId}
              onPress={() =>
                router.push({
                  pathname: "/desafio/proponer",
                  params: { equipoDesafiadoId: item.id, equipoDesafiadoNombre: item.nombre },
                })
              }
            >
              <Text style={[tipografia.cuerpoDestacado, styles.posicion]}>{item.posicion}</Text>
              <Text style={[tipografia.cuerpo, styles.nombre]} numberOfLines={1}>
                {item.nombre}
              </Text>
              <Chip texto={ETIQUETA_DIVISION[item.division]} tono={TONO_DIVISION[item.division]} />
              <Text style={[tipografia.cuerpoDestacado, styles.rating]}>
                {Math.round(item.rating)}
              </Text>
            </Pressable>
          );
        }}
      />
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    fila: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingVertical: espaciado.md,
      paddingHorizontal: espaciado.md,
      backgroundColor: colores.superficie,
      borderRadius: radio.md,
      gap: espaciado.md,
    },
    posicion: {
      width: 24,
      color: colores.textoApagado,
    },
    nombre: {
      flex: 1,
      color: colores.textoPrimario,
    },
    rating: {
      color: colores.textoPrimario,
      width: 52,
      textAlign: "right" as const,
    },
  };
}
