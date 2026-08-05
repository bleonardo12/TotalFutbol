import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { obtenerRanking, type EntradaRanking } from "@/api/ranking";
import { misEquipos, type CategoriaFutbol, type Division } from "@/api/teams";
import { EmptyState, FilaRanking, NumeroRating, Pantalla, Tabs, type OpcionTab, type ZonaFila } from "@/components";
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

/**
 * Zona de ascenso/descenso (docs/design.md §6): solo tiene sentido viendo
 * "Todos" -- con un filtro de division activo no se ve el borde entre
 * bandas, asi que no hay zona que marcar. "Ascenso" = primera fila de una
 * banda que no sea ya Elite (la mejor de su division, mas cerca de la de
 * arriba); "descenso" = ultima fila de una banda que no sea ya Bronce.
 */
function calcularZona(lista: EntradaRanking[], indice: number, filtroDivision: Division | null): ZonaFila {
  if (filtroDivision !== null) {
    return "neutral";
  }
  const actual = lista[indice];
  if (!actual) {
    return "neutral";
  }
  const anterior = lista[indice - 1];
  const siguiente = lista[indice + 1];
  const esPrimeraDeLaBanda = !anterior || anterior.division !== actual.division;
  const esUltimaDeLaBanda = !siguiente || siguiente.division !== actual.division;

  if (esPrimeraDeLaBanda && actual.division !== "ELITE") {
    return "ascenso";
  }
  if (esUltimaDeLaBanda && actual.division !== "BRONCE") {
    return "descenso";
  }
  return "neutral";
}

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
  const lista = rankingQuery.data ?? [];
  const miFilaEnLista = lista.find((item) => item.id === miEquipoId);

  return (
    <Pantalla>
      {miEquipo && (
        <View style={styles.hero}>
          <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
            {miEquipo.nombre}
          </Text>
          <NumeroRating valor={miEquipo.rating} podio={miEquipo.division === "ELITE"} />
          <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
            {miFilaEnLista ? `Puesto #${miFilaEnLista.posicion}` : "Rating"}
          </Text>
        </View>
      )}

      <Tabs opciones={OPCIONES_CATEGORIA} valorActivo={categoriaActiva} onCambiar={setCategoria} />
      <Tabs opciones={OPCIONES_DIVISION} valorActivo={division} onCambiar={setDivision} />

      <FlatList
        style={{ flex: 1 }}
        data={lista}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: espaciado.xs }}
        refreshControl={
          <RefreshControl
            refreshing={rankingQuery.isFetching}
            onRefresh={() => rankingQuery.refetch()}
            tintColor={colores.acento}
          />
        }
        ListEmptyComponent={
          !rankingQuery.isLoading ? (
            <EmptyState
              titulo="Todavia no hay equipos rankeados"
              descripcion="En cuanto se confirme el primer partido en esta categoria, va a aparecer aca."
            />
          ) : null
        }
        renderItem={({ item, index }) => {
          const esMiEquipo = item.id === miEquipoId;
          return (
            <FilaRanking
              posicion={item.posicion}
              nombre={item.nombre}
              rating={item.rating}
              podio={item.division === "ELITE"}
              zona={calcularZona(lista, index, division)}
              destacada={esMiEquipo}
              disabled={esMiEquipo}
              indice={index}
              onPress={() => router.push({ pathname: "/equipo/[id]", params: { id: item.id } })}
            />
          );
        }}
      />
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    hero: {
      alignItems: "center" as const,
      backgroundColor: colores.superficieAcento,
      borderRadius: radio.lg,
      borderWidth: 1,
      borderColor: colores.bordeAcento,
      paddingVertical: espaciado.lg,
      gap: espaciado.xs / 2,
    },
  };
}
