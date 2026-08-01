import { useQuery } from "@tanstack/react-query";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { obtenerRanking } from "@/api/ranking";

export default function Ranking(): React.JSX.Element {
  const rankingQuery = useQuery({
    queryKey: ["ranking"],
    queryFn: obtenerRanking,
  });

  return (
    <View style={styles.container}>
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
  rating: {
    fontWeight: "700",
    fontSize: 16,
  },
  vacio: {
    textAlign: "center",
    color: "#888",
    marginTop: 32,
  },
});
