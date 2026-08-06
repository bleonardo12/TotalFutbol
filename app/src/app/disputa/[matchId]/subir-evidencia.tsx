import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { obtenerDisputa, subirEvidencia } from "@/api/disputes";
import { Boton, Campo, Pantalla } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

export default function SubirEvidencia(): React.JSX.Element {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);
  const camaraRef = useRef<CameraView>(null);
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");

  const disputaQuery = useQuery({
    queryKey: ["disputas", matchId],
    queryFn: () => obtenerDisputa(accessToken as string, matchId),
    enabled: accessToken !== null && !!matchId,
  });

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
    <Pantalla>
      <Stack.Screen options={{ title: "Subir evidencia" }} />
      <Text style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}>
        Subir evidencia
      </Text>

      {!fotoUri ? (
        <View style={styles.camaraContenedor}>
          {!permiso ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={colores.acento} />
            </View>
          ) : !permiso.granted ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: espaciado.md,
                padding: espaciado.lg,
              }}
            >
              <Text
                style={[
                  tipografia.cuerpo,
                  { color: colores.textoSecundario, textAlign: "center" },
                ]}
              >
                Necesitamos acceso a la camara para la foto.
              </Text>
              <Boton onPress={() => solicitarPermiso()}>Dar permiso</Boton>
            </View>
          ) : (
            <>
              <CameraView ref={camaraRef} style={{ flex: 1 }} facing="back" />
              {disputaQuery.data && (
                <View style={styles.nonceOverlay} pointerEvents="none">
                  <Text style={[tipografia.codigo, { color: "#EEF4EC", fontSize: 28, letterSpacing: 3 }]}>
                    {disputaQuery.data.nonce}
                  </Text>
                  <Text style={[tipografia.caption, { color: "#EEF4EC", textAlign: "center" }]}>
                    Escribilo a mano y que se vea en la foto
                  </Text>
                </View>
              )}
              <Pressable style={styles.botonCaptura} onPress={tomarFoto} />
            </>
          )}
        </View>
      ) : (
        <>
          <Image source={{ uri: fotoUri }} style={styles.previsualizacion} />
          <Pressable onPress={() => setFotoUri(null)}>
            <Text style={[tipografia.cuerpoDestacado, { color: colores.acento, textAlign: "center" }]}>
              Sacar de nuevo
            </Text>
          </Pressable>

          <Campo
            etiqueta="Descripcion (opcional)"
            placeholder="Ej: marcador visible al final del partido"
            value={descripcion}
            onChangeText={setDescripcion}
            maxLength={280}
          />

          {mutacion.isError && (
            <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
              {mutacion.error.message}
            </Text>
          )}

          <Boton onPress={() => mutacion.mutate()} cargando={mutacion.isPending}>
            Subir evidencia
          </Boton>
        </>
      )}
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    camaraContenedor: {
      height: 400,
      borderRadius: radio.lg,
      overflow: "hidden" as const,
      backgroundColor: "#000",
    },
    nonceOverlay: {
      position: "absolute" as const,
      top: espaciado.lg,
      left: espaciado.lg,
      right: espaciado.lg,
      alignItems: "center" as const,
      gap: 4,
    },
    botonCaptura: {
      position: "absolute" as const,
      bottom: 20,
      alignSelf: "center" as const,
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#fff",
      borderWidth: 4,
      borderColor: colores.acento,
    },
    previsualizacion: {
      height: 300,
      borderRadius: radio.lg,
      backgroundColor: colores.superficieElevada,
    },
  };
}
