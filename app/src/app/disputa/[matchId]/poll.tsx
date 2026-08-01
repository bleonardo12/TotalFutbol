import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { responderPoll, type RespuestaPoll } from "@/api/disputes";
import { useAuthStore } from "@/store/auth-store";

const OPCIONES: { valor: RespuestaPoll; etiqueta: string }[] = [
  { valor: "CONFIRMA_CAPITAN", etiqueta: "Confirmo lo que dijo mi capitan" },
  { valor: "CONTRADICE_CAPITAN", etiqueta: "No es lo que paso" },
];

export default function PollPlantel(): React.JSX.Element {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [respuesta, setRespuesta] = useState<RespuestaPoll | null>(null);
  const [comentario, setComentario] = useState("");

  const mutacion = useMutation({
    mutationFn: () => {
      if (!respuesta) {
        throw new Error("Elegi una opcion");
      }
      return responderPoll(accessToken as string, matchId, respuesta, comentario || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputas", matchId] });
      router.back();
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Consulta al plantel</Text>
      <Text style={styles.explicacion}>
        Esto no decide nada por si solo: es una señal mas para que el admin resuelva la disputa.
      </Text>

      <View style={styles.opciones}>
        {OPCIONES.map((opcion) => (
          <Pressable
            key={opcion.valor}
            style={[styles.opcion, respuesta === opcion.valor && styles.opcionSeleccionada]}
            onPress={() => setRespuesta(opcion.valor)}
          >
            <Text
              style={[
                styles.opcionTexto,
                respuesta === opcion.valor && styles.opcionTextoSeleccionado,
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.etiqueta}>Comentario (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Contanos que viste"
        value={comentario}
        onChangeText={setComentario}
        maxLength={280}
        multiline
      />

      {mutacion.isError && <Text style={styles.error}>{mutacion.error.message}</Text>}

      <Pressable
        style={[styles.boton, (mutacion.isPending || !respuesta) && styles.botonDeshabilitado]}
        disabled={mutacion.isPending || !respuesta}
        onPress={() => mutacion.mutate()}
      >
        {mutacion.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Enviar respuesta</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  explicacion: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    marginBottom: 8,
  },
  opciones: {
    gap: 8,
  },
  opcion: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 14,
  },
  opcionSeleccionada: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  opcionTexto: {
    color: "#333",
    fontSize: 15,
  },
  opcionTextoSeleccionado: {
    color: "#fff",
    fontWeight: "600",
  },
  etiqueta: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
  boton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
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
    textAlign: "center",
  },
});
