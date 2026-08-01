import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { solicitarOtp } from "@/api/auth";

export default function Login(): React.JSX.Element {
  const router = useRouter();
  const [telefono, setTelefono] = useState("");

  const mutacion = useMutation({
    mutationFn: () => solicitarOtp(telefono),
    onSuccess: () => {
      router.push({ pathname: "/verificar", params: { telefono } });
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>TotalFutbol</Text>
      <Text style={styles.etiqueta}>Telefono (con codigo de pais)</Text>
      <TextInput
        style={styles.input}
        placeholder="+5491122334455"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={telefono}
        onChangeText={setTelefono}
      />
      {mutacion.isError && <Text style={styles.error}>{mutacion.error.message}</Text>}
      <Pressable
        style={[
          styles.boton,
          (mutacion.isPending || telefono.length < 8) && styles.botonDeshabilitado,
        ]}
        disabled={mutacion.isPending || telefono.length < 8}
        onPress={() => mutacion.mutate()}
      >
        {mutacion.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Enviar codigo</Text>
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
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
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
    fontSize: 16,
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
