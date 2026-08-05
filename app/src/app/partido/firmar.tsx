import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { confirmarFirma, generarCodigoFirma } from "@/api/matches";
import { Boton, Campo, Pantalla, Tabs, Tarjeta, type OpcionTab } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

type Modo = "mostrar" | "escanear";

const OPCIONES_MODO: OpcionTab<Modo>[] = [
  { valor: "mostrar", etiqueta: "Mostrar mi codigo" },
  { valor: "escanear", etiqueta: "Confirmar del rival" },
];

export default function FirmarEnCancha(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colores, espaciado, radio, tipografia } = useTema();
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
    <Pantalla>
      <Stack.Screen options={{ title: "Firmar en cancha" }} />
      <Text style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}>
        Los dos capitanes tienen que estar juntos en la cancha. Uno muestra el codigo, el otro lo
        confirma.
      </Text>

      <Tabs opciones={OPCIONES_MODO} valorActivo={modo} onCambiar={setModo} />

      {modo === "mostrar" ? (
        generarMutacion.data ? (
          <Tarjeta style={{ alignItems: "center", gap: espaciado.md }}>
            {/* QR negro-sobre-blanco a proposito, ver nota en partido/generar.tsx. */}
            <QRCode value={generarMutacion.data.codigo} size={200} />
            <Text style={[tipografia.titulo, { color: colores.textoPrimario, letterSpacing: 4 }]}>
              {generarMutacion.data.codigo}
            </Text>
            <Text
              style={[
                tipografia.cuerpo,
                { color: colores.textoSecundario, textAlign: "center" },
              ]}
            >
              El otro capitan lo escanea o lo tipea. Vence en 10 minutos.
            </Text>
          </Tarjeta>
        ) : (
          <Boton onPress={() => generarMutacion.mutate()} cargando={generarMutacion.isPending}>
            Generar codigo
          </Boton>
        )
      ) : (
        <>
          <View
            style={{
              height: 260,
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
                onBarcodeScanned={confirmarMutacion.isPending ? undefined : alEscanear}
              />
            )}
          </View>

          <Campo
            etiqueta="O el codigo a mano"
            placeholder="7KM4P9X2"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            value={codigo}
            onChangeText={setCodigo}
            style={{ textAlign: "center", letterSpacing: 4 }}
          />
          <Boton
            onPress={() => confirmarMutacion.mutate(codigo)}
            cargando={confirmarMutacion.isPending}
            deshabilitado={codigo.length !== 8}
          >
            Confirmar
          </Boton>
        </>
      )}

      {generarMutacion.isError && (
        <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
          {generarMutacion.error.message}
        </Text>
      )}
      {confirmarMutacion.isError && (
        <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
          {confirmarMutacion.error.message}
        </Text>
      )}
    </Pantalla>
  );
}
