import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { obtenerRanking, type EntradaRanking } from "@/api/ranking";
import { type CategoriaFutbol, type Division } from "@/api/teams";
import { Boton, FilaEscalera, NumeroRating, Pantalla, Tabs, type OpcionTab } from "@/components";
import { useEquipoActivo } from "@/hooks/useEquipoActivo";
import { DIVISION_COLOR, useTema, type Tema } from "@/theme";

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

type ItemLista =
  | { tipo: "banda"; division: Division }
  | { tipo: "fila"; entrada: EntradaRanking };

/**
 * Agrupa por division consecutiva con un encabezado de banda antes de cada grupo (docs Guapo
 * §3.3). Solo tiene sentido viendo "Todos" -- con un filtro de division activo la lista ya es
 * homogenea, no hay banda que mostrar (mismo criterio que ya tenia calcularZona antes).
 */
function conBandas(lista: EntradaRanking[], filtroDivision: Division | null): ItemLista[] {
  if (filtroDivision !== null) {
    return lista.map((entrada) => ({ tipo: "fila", entrada }));
  }
  const resultado: ItemLista[] = [];
  let divisionAnterior: Division | null = null;
  for (const entrada of lista) {
    if (entrada.division !== divisionAnterior) {
      resultado.push({ tipo: "banda", division: entrada.division });
      divisionAnterior = entrada.division;
    }
    resultado.push({ tipo: "fila", entrada });
  }
  return resultado;
}

export default function Ranking(): React.JSX.Element {
  const [division, setDivision] = useState<Division | null>(null);
  const [categoria, setCategoria] = useState<CategoriaFutbol | null>(null);
  const router = useRouter();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);

  const { equipo: miEquipo } = useEquipoActivo();

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
  const itemsConBandas = conBandas(lista, division);

  return (
    <Pantalla style={{ padding: 0 }}>
      <View style={{ padding: espaciado.lg, gap: espaciado.lg }}>
        <Text style={[tipografia.titulo, { color: colores.textoPrimario }]}>La escalera</Text>

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
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={itemsConBandas}
        keyExtractor={(item, indice) => (item.tipo === "banda" ? `banda-${item.division}-${indice}` : item.entrada.id)}
        contentContainerStyle={{ paddingHorizontal: espaciado.lg, paddingBottom: espaciado.lg, gap: espaciado.xs }}
        refreshControl={
          <RefreshControl
            refreshing={rankingQuery.isFetching}
            onRefresh={() => rankingQuery.refetch()}
            tintColor={colores.acento}
          />
        }
        ListEmptyComponent={!rankingQuery.isLoading ? <RankingVacio /> : null}
        renderItem={({ item }) => {
          if (item.tipo === "banda") {
            const color = DIVISION_COLOR[item.division].texto;
            return (
              <View style={styles.banda}>
                <View style={[styles.bandaBarra, { backgroundColor: color }]} />
                <Text style={[styles.bandaTexto, { color }]}>{ETIQUETA_DIVISION[item.division]}</Text>
              </View>
            );
          }
          const { entrada } = item;
          const esMiEquipo = entrada.id === miEquipoId;
          return (
            <FilaEscalera
              posicion={entrada.posicion}
              nombre={esMiEquipo ? "VOS" : entrada.nombre}
              rating={entrada.rating}
              esMio={esMiEquipo}
              escudo
              onPress={() => router.push({ pathname: "/equipo/[id]", params: { id: entrada.id } })}
              accion={
                !esMiEquipo
                  ? {
                      etiqueta: "RETAR",
                      onPress: () =>
                        router.push({
                          pathname: "/desafio/proponer",
                          params: {
                            equipoDesafiadoId: entrada.id,
                            equipoDesafiadoNombre: entrada.nombre,
                            equipoDesafiadoPosicion: String(entrada.posicion),
                          },
                        }),
                    }
                  : undefined
              }
            />
          );
        }}
      />
    </Pantalla>
  );
}

function RankingVacio(): React.JSX.Element {
  const router = useRouter();
  const { colores, espaciado, tipografia } = useTema();

  return (
    <View style={{ alignItems: "center", gap: espaciado.lg, paddingVertical: espaciado.xxl }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: espaciado.xs, height: 40 }}>
        {[16, 26, 36].map((alto, indice) => (
          <View
            key={alto}
            style={{
              width: 20,
              height: alto,
              borderRadius: 4,
              backgroundColor: indice === 2 ? "transparent" : colores.bordeControl,
              borderWidth: indice === 2 ? 1.5 : 0,
              borderColor: colores.bordeControl,
              borderStyle: indice === 2 ? "dashed" : "solid",
            }}
          />
        ))}
      </View>
      <View style={{ gap: espaciado.xs, alignItems: "center" }}>
        <Text style={[tipografia.subtitulo, { color: colores.textoPrimario, textAlign: "center" }]}>
          Todavía no hay nadie arriba
        </Text>
        <Text
          style={[
            tipografia.cuerpo,
            { color: colores.textoSecundario, textAlign: "center", maxWidth: 280 },
          ]}
        >
          Arreglen un picadito y suban el resultado juntos -- el primer partido confirmado arranca
          la escalera.
        </Text>
      </View>
      <Boton onPress={() => router.push("/partido/generar")}>Generar código</Boton>
    </View>
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
    banda: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: espaciado.xs,
      paddingVertical: espaciado.xs,
      marginTop: espaciado.xs,
    },
    bandaBarra: {
      width: 6,
      height: 16,
      borderRadius: 3,
    },
    bandaTexto: {
      fontFamily: "Archivo_800ExtraBold",
      fontSize: 12,
      letterSpacing: 1.2,
    },
  };
}
