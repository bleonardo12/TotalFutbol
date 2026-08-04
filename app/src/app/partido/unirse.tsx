import { useMutation, useQuery } from "@tanstack/react-query";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { consumirHandshake } from "@/api/matches";
import { misEquipos } from "@/api/teams";
import { useAuthStore } from "@/store/auth-store";

type Modo = "escanear" | "escribir";

export default function UnirsePartido(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("escanear");
  const [codigo, setCodigo] = useState("");
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const escaneadoRef = useRef(false);

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });
  const equipo = equiposQuery.data?.[0];

  const mutacion = useMutation({
    mutationFn: (codigoAUsar: string) =>
      consumirHandshake(
        accessToken as string,
        codigoAUsar.toUpperCase(),
        (equipo as { id: string }).id,
      ),
    onSuccess: (partido) => {
      router.replace({ pathname: "/partido/[id]", params: { id: partido.id } });
    },
    onError: () => {
      // Permite reintentar escaneando de nuevo (codigo vencido, equipo invalido, etc.).
      escaneadoRef.current = false;
    },
  });

  function alEscanear(resultado: BarcodeScanningResult): void {
    if (escaneadoRef.current) {
      return;
    }
    escaneadoRef.current = true;
    setCodigo(resultado.data);
    mutacion.mutate(resultado.data);
  }

  if (equiposQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Unirme a un partido" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (!equipo) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Unirme a un partido" }} />
        <Text style={styles.aviso}>Primero necesitas crear un equipo.</Text>
        <Pressable style={styles.boton} onPress={() => router.push("/inicio")}>
          <Text style={styles.botonTexto}>Ir a crear equipo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Unirme a un partido" }} />
      <Text style={styles.titulo}>Unirme a un partido</Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, modo === "escanear" && styles.tabActivo]}
          onPress={() => setModo("escanear")}
        >
          <Text style={[styles.tabTexto, modo === "escanear" && styles.tabTextoActivo]}>
            Escanear QR
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, modo === "escribir" && styles.tabActivo]}
          onPress={() => setModo("escribir")}
        >
          <Text style={[styles.tabTexto, modo === "escribir" && styles.tabTextoActivo]}>
            Escribir codigo
          </Text>
        </Pressable>
      </View>

      {modo === "escanear" ? (
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
              onBarcodeScanned={mutacion.isPending ? undefined : alEscanear}
            />
          )}
        </View>
      ) : (
        <>
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
          <Pressable
            style={[
              styles.boton,
              (mutacion.isPending || codigo.length !== 8) && styles.botonDeshabilitado,
            ]}
            disabled={mutacion.isPending || codigo.length !== 8}
            onPress={() => mutacion.mutate(codigo)}
          >
            {mutacion.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Unirme</Text>
            )}
          </Pressable>
        </>
      )}

      {mutacion.isError && <Text style={styles.error}>{mutacion.error.message}</Text>}
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
    height: 320,
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
