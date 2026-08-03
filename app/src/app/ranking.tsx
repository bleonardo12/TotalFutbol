import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { obtenerRanking } from "@/api/ranking";
import type { Division } from "@/api/teams";

const OPCIONES: { valor: Division | null; etiqueta: string }[] = [
  { valor: null, etiqueta: "Todos" },
  { valor: "ELITE", etiqueta: "Elite" },
  { valor: "ORO", etiqueta: "Oro" },
  { valor: "PLATA", etiqueta: "Plata" },
  { valor: "BRONCE", etiqueta: "Bronce" },
];

const ETIQUETA_DIVISION: Record<Division, string> = {
  ELITE: "Elite",
  ORO: "Oro",
  PLATA: "Plata",
  BRONCE: "Bronce",
};

export default function Ranking(): React.JSX.Element {
  const [division, setDivision] = useState<Division | null>(null);

  const rankingQuery = useQuery({
    queryKey: ["ranking", division],
    queryFn: () => obtenerRanking(division ?? undefined),
  });

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {OPCIONES.map((opcion) => (
          <Pressable
            key={opcion.etiqueta}
            style={[styles.tab, division === opcion.valor && styles.tabActivo]}
            onPress={() => setDivision(opcion.valor)}
          >
            <Text style={[styles.tabTexto, division === opcion.valor && styles.tabTextoActivo]}>
              {opcion.etiqueta}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={rankingQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          !rankingQuery.isLoading ? (
            <Text style={styles.vacio}>Todavia no hay equipos rankeados</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.fila}>
            <Text style={styles.posicion}>{item.posicion}</Text>
            <Text style={styles.nombre}>{item.nombre}</Text>
            <Text style={styles.division}>{ETIQUETA_DIVISION[item.division]}</Text>
            <Text style={styles.rating}>{Math.round(item.rating)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  tab: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  tabActivo: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  tabTexto: {
    color: "#333",
    fontSize: 13,
  },
  tabTextoActivo: {
    color: "#fff",
    fontWeight: "600",
  },
  lista: {
    gap: 4,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 12,
  },
  posicion: {
    width: 28,
    fontWeight: "700",
    color: "#888",
  },
  nombre: {
    flex: 1,
    fontSize: 16,
  },
  division: {
    fontSize: 12,
    fontWeight: "600",
    color: "#208AEF",
  },
  rating: {
    fontWeight: "700",
    fontSize: 16,
    width: 56,
    textAlign: "right",
  },
  vacio: {
    textAlign: "center",
    color: "#888",
    marginTop: 32,
  },
});
