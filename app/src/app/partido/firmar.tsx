import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { confirmarFirma, generarCodigoFirma, obtenerPartido } from "@/api/matches";
import { obtenerEquipoPorId, type Division } from "@/api/teams";
import { Boton, Campo, EtiquetaSeccion, Pantalla, Tabs, Tarjeta, type OpcionTab } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

type Modo = "mostrar" | "escanear";

const OPCIONES_MODO: OpcionTab<Modo>[] = [
  { valor: "mostrar", etiqueta: "Mostrar mi codigo" },
  { valor: "escanear", etiqueta: "Confirmar del rival" },
];

const ETIQUETA_DIVISION: Record<Division, string> = {
  ELITE: "Elite",
  ORO: "Oro",
  PLATA: "Plata",
  BRONCE: "Bronce",
};

function iniciales(nombre: string): string {
  return nombre.trim().slice(0, 2).toUpperCase();
}

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

  const partidoQuery = useQuery({
    queryKey: ["partidos", id],
    queryFn: () => obtenerPartido(accessToken as string, id),
    enabled: accessToken !== null && !!id,
  });
  const partido = partidoQuery.data;

  const equipoLocalQuery = useQuery({
    queryKey: ["equipo", partido?.equipoLocalId],
    queryFn: () => obtenerEquipoPorId(partido!.equipoLocalId),
    enabled: !!partido,
  });
  const equipoVisitanteQuery = useQuery({
    queryKey: ["equipo", partido?.equipoVisitanteId],
    queryFn: () => obtenerEquipoPorId(partido!.equipoVisitanteId),
    enabled: !!partido,
  });

  const generarMutacion = useMutation({
    mutationFn: () => generarCodigoFirma(accessToken as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partidos", id] });
    },
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

  if (partidoQuery.isLoading || !partido) {
    return (
      <Pantalla centrado>
        <Stack.Screen options={{ title: "Firmar en cancha" }} />
      </Pantalla>
    );
  }

  const codigoMostrado = partido.codigoHandshake ?? generarMutacion.data?.codigo;

  return (
    <Pantalla>
      <Stack.Screen options={{ title: "Firmar en cancha" }} />

      <View style={{ alignItems: "center", gap: espaciado.xs }}>
        <Text style={[tipografia.display, { color: colores.textoPrimario, textAlign: "center" }]}>
          Esto ya es serio
        </Text>
      </View>

      <Tarjeta destacada style={{ gap: espaciado.md }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <FilaEquipoFirma
            nombre={partido.equipoLocal.nombre}
            rating={partido.equipoLocal.rating}
            division={equipoLocalQuery.data?.division ?? null}
            reporta={partido.reporterLocal?.nombre ?? partido.reporterLocal?.telefono ?? null}
            firmado={!!partido.reporterLocalId}
          />
          <View style={{ alignItems: "center", paddingHorizontal: espaciado.sm }}>
            <View style={{ width: 1, height: 16, backgroundColor: colores.bordeAcento }} />
            <Text style={[tipografia.caption, { color: colores.textoApagado, marginVertical: 2 }]}>
              VS
            </Text>
            <View style={{ width: 1, height: 16, backgroundColor: colores.bordeAcento }} />
          </View>
          <FilaEquipoFirma
            nombre={partido.equipoVisitante.nombre}
            rating={partido.equipoVisitante.rating}
            division={equipoVisitanteQuery.data?.division ?? null}
            reporta={partido.reporterVisitante?.nombre ?? partido.reporterVisitante?.telefono ?? null}
            firmado={!!partido.reporterVisitanteId}
            alRevesado
          />
        </View>

        <View style={{ flexDirection: "row", gap: espaciado.sm }}>
          <CeldaFirma etiqueta="Formato" valor={`${partido.cantidadJugadores.replace("F", "")} · ${partido.superficie}`} />
          <CeldaFirma
            etiqueta="En juego"
            valor={
              partido.proyeccion
                ? `+${Math.round(partido.proyeccion.siGanaLocal.local)} / +${Math.round(partido.proyeccion.siGanaVisitante.visitante)}`
                : "—"
            }
            acento
          />
          <CeldaFirma etiqueta="Nonce" valor={partido.codigoHandshake ?? "—"} />
        </View>

        <Text style={[tipografia.caption, { color: colores.textoSecundario, textAlign: "center" }]}>
          {`${partido.reporterLocal?.nombre ?? "El capitan local"} y ${partido.reporterVisitante?.nombre ?? "el capitan visitante"} son los dos reporters de este partido.`}
        </Text>
      </Tarjeta>

      <Tabs opciones={OPCIONES_MODO} valorActivo={modo} onCambiar={setModo} variante="segmentado" />

      {modo === "mostrar" ? (
        codigoMostrado ? (
          <Tarjeta style={{ alignItems: "center", gap: espaciado.md }}>
            <View style={{ backgroundColor: "#EEF4EC", borderRadius: radio.xxl, padding: espaciado.lg }}>
              <QRCode value={codigoMostrado} size={200} />
            </View>
            <EtiquetaSeccion>O que lo tipeen</EtiquetaSeccion>
            <Text style={[tipografia.codigo, { color: colores.textoPrimario }]}>{codigoMostrado}</Text>
            <Text style={[tipografia.caption, { color: colores.textoSecundario, textAlign: "center" }]}>
              El otro capitan lo escanea o lo tipea. Vence en 10 minutos.
            </Text>
          </Tarjeta>
        ) : (
          <Boton onPress={() => generarMutacion.mutate()} cargando={generarMutacion.isPending}>
            Firmar y a jugar
          </Boton>
        )
      ) : (
        <>
          <View
            style={{
              height: 260,
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

function FilaEquipoFirma({
  nombre,
  rating,
  division,
  reporta,
  firmado,
  alRevesado = false,
}: {
  nombre: string;
  rating: number;
  division: Division | null;
  reporta: string | null;
  firmado: boolean;
  alRevesado?: boolean;
}): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();

  return (
    <View style={{ flex: 1, alignItems: alRevesado ? "flex-end" : "flex-start", gap: espaciado.xs }}>
      <View style={{ flexDirection: alRevesado ? "row-reverse" : "row", alignItems: "center", gap: espaciado.xs }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radio.md,
            backgroundColor: colores.superficieElevada,
            borderWidth: 1,
            borderColor: colores.borde,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: "Archivo_900Black", fontSize: 14, color: colores.acento }}>
            {iniciales(nombre)}
          </Text>
        </View>
        <View
          style={{
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: firmado ? colores.acento : "transparent",
            borderWidth: firmado ? 0 : 1.5,
            borderColor: colores.bordeControl,
          }}
        />
      </View>
      <Text
        style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}
        numberOfLines={1}
      >
        {nombre}
      </Text>
      <Text
        style={[tipografia.caption, { color: colores.textoApagado, textAlign: alRevesado ? "right" : "left" }]}
      >
        {`${Math.round(rating)} · ${division ? ETIQUETA_DIVISION[division] : "sin rankear"}`}
        {reporta ? `\nreporta ${reporta}` : ""}
      </Text>
    </View>
  );
}

function CeldaFirma({
  etiqueta,
  valor,
  acento = false,
}: {
  etiqueta: string;
  valor: string;
  acento?: boolean;
}): React.JSX.Element {
  const { colores, espaciado, radio } = useTema();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colores.superficieHundida,
        borderRadius: radio.md,
        paddingVertical: espaciado.sm,
        alignItems: "center",
        gap: 3,
      }}
    >
      <Text
        style={{
          fontFamily: "JetBrainsMono_800ExtraBold",
          fontSize: 13,
          color: acento ? colores.acento : colores.textoPrimario,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {valor}
      </Text>
      <EtiquetaSeccion>{etiqueta}</EtiquetaSeccion>
    </View>
  );
}
