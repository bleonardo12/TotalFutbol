import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { confirmarFirma, generarCodigoFirma } from "@/api/matches";
import { useAuthStore } from "@/store/auth-store";

type Modo = "mostrar" | "escanear";

export default function FirmarEnCancha(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modo, setModo] = useState<Modo>("mostrar");
  const [codigo, setCodigo] = useState("");
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const escaneadoRef = useRef(false);

  const generarMutacion = useMutation({
    mutationFn: () => generarCodigoFirma(accessToken as string, id),
  });

  const confirmarMutacion = useMutation({
    mutationFn: (codigoAUsar: string) => confirmarFirma(accessToken as string, id, codigoAUsar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partidos", id] });
      router.replace({ pathname: "/partido/[id]", params: { id } });
    },
    onError: () => {
      escaneadoRef.current = false;
    },
  });

  function alEscanear(resultado: BarcodeScanningResult): void {
    if (escaneadoRef.current) {
      return;
    }
    escaneadoRef.current = true;
    setCodigo(resultado.data);
    confirmarMutacion.mutate(resultado.data);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Firmar en cancha" }} />
      <Text style={styles.aviso}>
        Los dos capitanes tienen que estar juntos en la cancha. Uno muestra el codigo, el otro lo
        confirma.
      </Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, modo === "mostrar" && styles.tabActivo]}
          onPress={() => setModo("mostrar")}
        >
          <Text style={[styles.tabTexto, modo === "mostrar" && styles.tabTextoActivo]}>
            Mostrar mi codigo
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, modo === "escanear" && styles.tabActivo]}
          onPress={() => setModo("escanear")}
        >
          <Text style={[styles.tabTexto, modo === "escanear" && styles.tabTextoActivo]}>
            Confirmar del rival
          </Text>
        </Pressable>
      </View>

      {modo === "mostrar" ? (
        generarMutacion.data ? (
          <View style={styles.qrContenedor}>
            <QRCode value={generarMutacion.data.codigo} size={200} />
            <Text style={styles.codigo}>{generarMutacion.data.codigo}</Text>
            <Text style={styles.aviso}>El otro capitan lo escanea o lo tipea. Vence en 10 minutos.</Text>
          </View>
        ) : (
          <Pressable
            style={[styles.boton, generarMutacion.isPending && styles.botonDeshabilitado]}
            disabled={generarMutacion.isPending}
            onPress={() => generarMutacion.mutate()}
          >
            {generarMutacion.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Generar codigo</Text>
            )}
          </Pressable>
        )
      ) : (
        <>
          <View style={styles.camaraContenedor}>
            {!permiso ? (
              <ActivityIndicator />
            ) : !permiso.granted ? (
              <View style={styles.permisoAviso}>
                <Text style={styles.aviso}>Necesitamos acceso a la camara para escanear el QR.</Text>
                <Pressable style={styles.boton} onPress={() => solicitarPermiso()}>
                  <Text style={styles.botonTexto}>Dar permiso</Text>
                </Pressable>
              </View>
            ) : (
              <CameraView
                style={styles.camara}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={confirmarMutacion.isPending ? undefined : alEscanear}
              />
            )}
          </View>

          <Text style={styles.etiqueta}>O el codigo a mano</Text>
          <TextInput
            style={styles.input}
            placeholder="7KM4P9X2"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            value={codigo}
            onChangeText={setCodigo}
          />
          <Pressable
            style={[
              styles.boton,
              (confirmarMutacion.isPending || codigo.length !== 8) && styles.botonDeshabilitado,
            ]}
            disabled={confirmarMutacion.isPending || codigo.length !== 8}
            onPress={() => confirmarMutacion.mutate(codigo)}
          >
            {confirmarMutacion.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Confirmar</Text>
            )}
          </Pressable>
        </>
      )}

      {generarMutacion.isError && <Text style={styles.error}>{generarMutacion.error.message}</Text>}
      {confirmarMutacion.isError && (
        <Text style={styles.error}>{confirmarMutacion.error.message}</Text>
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
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActivo: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  tabTexto: {
    color: "#333",
  },
  tabTextoActivo: {
    color: "#fff",
    fontWeight: "600",
  },
  camaraContenedor: {
    height: 260,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camara: {
    flex: 1,
  },
  permisoAviso: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  qrContenedor: {
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  codigo: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 4,
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
