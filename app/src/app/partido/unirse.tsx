import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { consumirHandshake } from "@/api/matches";
import { misEquipos } from "@/api/teams";
import { useAuthStore } from "@/store/auth-store";

export default function UnirsePartido(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });
  const equipo = equiposQuery.data?.[0];

  const mutacion = useMutation({
    mutationFn: () =>
      consumirHandshake(accessToken as string, codigo.toUpperCase(), (equipo as { id: string }).id),
    onSuccess: (partido) => {
      router.replace({ pathname: "/partido/[id]", params: { id: partido.id } });
    },
  });

  if (equiposQuery.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!equipo) {
    return (
      <View style={styles.container}>
        <Text style={styles.aviso}>Primero necesitas crear un equipo.</Text>
        <Pressable style={styles.boton} onPress={() => router.push("/equipo")}>
          <Text style={styles.botonTexto}>Ir a crear equipo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Unirme a un partido</Text>
      <Text style={styles.etiqueta}>Codigo que te paso el rival</Text>
      <TextInput
        style={styles.input}
        placeholder="7KM4P9X2"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        value={codigo}
        onChangeText={setCodigo}
      />
      {mutacion.isError && <Text style={styles.error}>{mutacion.error.message}</Text>}
      <Pressable
        style={[
          styles.boton,
          (mutacion.isPending || codigo.length !== 8) && styles.botonDeshabilitado,
        ]}
        disabled={mutacion.isPending || codigo.length !== 8}
        onPress={() => mutacion.mutate()}
      >
        {mutacion.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Unirme</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  etiqueta: {
    fontSize: 14,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 4,
  },
  boton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  botonTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  aviso: {
    textAlign: "center",
    color: "#666",
    marginBottom: 16,
  },
  error: {
    color: "#c0392b",
  },
});
