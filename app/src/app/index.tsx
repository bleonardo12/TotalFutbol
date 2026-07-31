import { StyleSheet, Text, View } from "react-native";

export default function Home(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TotalFutbol</Text>
      <Text>Ranking de equipos de futbol amateur.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
});
