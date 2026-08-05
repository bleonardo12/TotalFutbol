import { useMutation, useQuery } from "@tanstack/react-query";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { consumirHandshake } from "@/api/matches";
import { misEquipos } from "@/api/teams";
import { Boton, Campo, Pantalla, Tabs, type OpcionTab } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

type Modo = "escanear" | "escribir";

const OPCIONES_MODO: OpcionTab<Modo>[] = [
  { valor: "escanear", etiqueta: "Escanear QR" },
  { valor: "escribir", etiqueta: "Escribir codigo" },
];

export default function UnirsePartido(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const { colores, espaciado, radio, tipografia } = useTema();
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

  return (
    <Pantalla centrado={equiposQuery.isLoading || !equipo}>
      <Stack.Screen options={{ title: "Unirme a un partido" }} />

      {equiposQuery.isLoading ? null : !equipo ? (
        <View style={{ alignItems: "center", gap: espaciado.md }}>
          <Text
            style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}
          >
            Primero necesitas crear un equipo.
          </Text>
          <Boton onPress={() => router.push("/inicio")}>Ir a crear equipo</Boton>
        </View>
      ) : (
        <>
          <Tabs opciones={OPCIONES_MODO} valorActivo={modo} onCambiar={setModo} />

          {modo === "escanear" ? (
            <View
              style={{
                height: 320,
                borderRadius: radio.lg,
                overflow: "hidden",
                backgroundColor: "#000",
              }}
            >
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
                    Necesitamos acceso a la camara para escanear el QR.
                  </Text>
                  <Boton onPress={() => solicitarPermiso()}>Dar permiso</Boton>
                </View>
              ) : (
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={mutacion.isPending ? undefined : alEscanear}
                />
              )}
            </View>
          ) : (
            <>
              <Campo
                etiqueta="Codigo que te paso el rival"
                placeholder="7KM4P9X2"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                value={codigo}
                onChangeText={setCodigo}
                style={{ textAlign: "center", letterSpacing: 4 }}
              />
              <Boton
                onPress={() => mutacion.mutate(codigo)}
                cargando={mutacion.isPending}
                deshabilitado={codigo.length !== 8}
              >
                Unirme
              </Boton>
            </>
          )}

          {mutacion.isError && (
            <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
              {mutacion.error.message}
            </Text>
          )}
        </>
      )}
    </Pantalla>
  );
}
