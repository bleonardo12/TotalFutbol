import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { subirEvidencia } from "@/api/disputes";
import { useAuthStore } from "@/store/auth-store";

export default function SubirEvidencia(): React.JSX.Element {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const camaraRef = useRef<CameraView>(null);
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");

  const mutacion = useMutation({
    mutationFn: () => {
      if (!fotoUri) {
        throw new Error("Saca una foto primero");
      }
      return subirEvidencia(
        accessToken as string,
        matchId,
        { uri: fotoUri, nombre: "evidencia.jpg", tipo: "image/jpeg" },
        descripcion || undefined,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputas", matchId] });
      router.back();
    },
  });

  async function tomarFoto(): Promise<void> {
    const resultado = await camaraRef.current?.takePictureAsync({ quality: 0.6 });
    if (resultado) {
      setFotoUri(resultado.uri);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Subir evidencia</Text>

      {!fotoUri ? (
        <View style={styles.camaraContenedor}>
          {!permiso ? (
            <ActivityIndicator />
          ) : !permiso.granted ? (
            <View style={styles.permisoAviso}>
              <Text style={styles.aviso}>Necesitamos acceso a la camara para la foto.</Text>
              <Pressable style={styles.boton} onPress={() => solicitarPermiso()}>
                <Text style={styles.botonTexto}>Dar permiso</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CameraView ref={camaraRef} style={styles.camara} facing="back" />
              <Pressable style={styles.botonCaptura} onPress={tomarFoto} />
            </>
          )}
        </View>
      ) : (
        <>
          <Image source={{ uri: fotoUri }} style={styles.previsualizacion} />
          <Pressable onPress={() => setFotoUri(null)}>
            <Text style={styles.link}>Sacar de nuevo</Text>
          </Pressable>

          <Text style={styles.etiqueta}>Descripcion (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: marcador visible al final del partido"
            value={descripcion}
            onChangeText={setDescripcion}
            maxLength={280}
          />

          {mutacion.isError && <Text style={styles.error}>{mutacion.error.message}</Text>}

          <Pressable
            style={[styles.boton, mutacion.isPending && styles.botonDeshabilitado]}
            disabled={mutacion.isPending}
            onPress={() => mutacion.mutate()}
          >
            {mutacion.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Subir evidencia</Text>
            )}
          </Pressable>
        </>
      )}
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
    marginBottom: 4,
  },
  camaraContenedor: {
    height: 400,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camara: {
    flex: 1,
  },
  botonCaptura: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#ccc",
  },
  permisoAviso: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  previsualizacion: {
    height: 300,
    borderRadius: 12,
    backgroundColor: "#f2f2f2",
  },
  link: {
    color: "#208AEF",
    textAlign: "center",
    fontWeight: "600",
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
  },
  boton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
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
  },
  error: {
    color: "#c0392b",
    textAlign: "center",
  },
});
