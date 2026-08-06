import { useMutation } from "@tanstack/react-query";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { consumirHandshake } from "@/api/matches";
import { Boton, Campo, Pantalla, Tabs, type OpcionTab } from "@/components";
import { useEquipoActivo } from "@/hooks/useEquipoActivo";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

type Modo = "escanear" | "escribir";

const OPCIONES_MODO: OpcionTab<Modo>[] = [
  { valor: "escanear", etiqueta: "Escanear QR" },
  { valor: "escribir", etiqueta: "Tipear codigo" },
];

const ALTO_VISOR = 330;
const MARGEN_LINEA = 24;

/** Linea horizontal con glow que recorre el visor, ida y vuelta (docs Guapo §3.2: loop 2s ease-in-out). */
function LineaEscaneo(): React.JSX.Element {
  const { colores } = useTema();
  const y = useSharedValue(MARGEN_LINEA);

  useEffect(() => {
    y.value = withRepeat(
      withTiming(ALTO_VISOR - MARGEN_LINEA, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [y]);

  const estiloAnimado = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: 16,
          right: 16,
          height: 2,
          borderRadius: 1,
          backgroundColor: colores.acento,
          shadowColor: colores.acento,
          shadowRadius: 14,
          shadowOpacity: 0.6,
          shadowOffset: { width: 0, height: 0 },
        },
        estiloAnimado,
      ]}
    />
  );
}

/** Marco de 4 esquinas del visor (docs Guapo §3.2: bordes 44px, radio 14 en la esquina externa). */
function MarcoVisor(): React.JSX.Element {
  const { colores } = useTema();
  const base = { position: "absolute" as const, width: 44, height: 44, borderColor: colores.acento };
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <View
        style={[base, { top: 16, left: 16, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 14 }]}
      />
      <View
        style={[
          base,
          { top: 16, right: 16, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 14 },
        ]}
      />
      <View
        style={[
          base,
          { bottom: 16, left: 16, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 14 },
        ]}
      />
      <View
        style={[
          base,
          {
            bottom: 16,
            right: 16,
            borderBottomWidth: 4,
            borderRightWidth: 4,
            borderBottomRightRadius: 14,
          },
        ]}
      />
      <LineaEscaneo />
    </View>
  );
}

export default function UnirsePartido(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const { colores, espaciado, radio, tipografia } = useTema();
  const [modo, setModo] = useState<Modo>("escanear");
  const [codigo, setCodigo] = useState("");
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const escaneadoRef = useRef(false);

  const { equiposQuery, equipo } = useEquipoActivo();

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
          <Tabs opciones={OPCIONES_MODO} valorActivo={modo} onCambiar={setModo} variante="segmentado" />

          {modo === "escanear" ? (
            <View
              style={{
                height: ALTO_VISOR,
                borderRadius: radio.xxl,
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
                  <MarcoVisor />
                  <Text
                    style={[
                      tipografia.cuerpo,
                      { color: colores.textoSecundario, textAlign: "center" },
                    ]}
                  >
                    Necesitamos acceso a la camara para escanear el QR. Los dos capitanes tienen que
                    estar presentes para que el partido cuente.
                  </Text>
                  <Boton onPress={() => solicitarPermiso()}>Dar permiso</Boton>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={mutacion.isPending ? undefined : alEscanear}
                  />
                  <MarcoVisor />
                  <View
                    style={{
                      position: "absolute",
                      bottom: espaciado.lg,
                      left: espaciado.lg,
                      right: espaciado.lg,
                    }}
                  >
                    <Text
                      style={[
                        tipografia.caption,
                        { color: "#EEF4EC", textAlign: "center" },
                      ]}
                    >
                      Apunta al codigo del rival
                    </Text>
                  </View>
                </View>
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
