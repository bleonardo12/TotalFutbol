import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { verificarOtp } from "@/api/auth";
import { useAuthStore } from "@/store/auth-store";

export default function Verificar(): React.JSX.Element {
  const { telefono } = useLocalSearchParams<{ telefono: string }>();
  const router = useRouter();
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const [codigo, setCodigo] = useState("");

  const mutacion = useMutation({
    mutationFn: () => verificarOtp(telefono, codigo),
    onSuccess: async (tokens) => {
      await iniciarSesion(tokens);
      router.replace("/equipo");
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Verificar codigo</Text>
      <Text style={styles.etiqueta}>Te enviamos un codigo a {telefono}</Text>
      <TextInput
        style={styles.input}
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        value={codigo}
        onChangeText={setCodigo}
      />
      {mutacion.isError && <Text style={styles.error}>{mutacion.error.message}</Text>}
      <Pressable
        style={[
          styles.boton,
          (mutacion.isPending || codigo.length !== 6) && styles.botonDeshabilitado,
        ]}
        disabled={mutacion.isPending || codigo.length !== 6}
        onPress={() => mutacion.mutate()}
      >
        {mutacion.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Verificar</Text>
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
    marginBottom: 8,
    textAlign: "center",
  },
  etiqueta: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  error: {
    color: "#c0392b",
  },
});
