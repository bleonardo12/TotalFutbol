import { useMutation, useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { generarHandshake, type CantidadJugadores, type Superficie } from "@/api/matches";
import { misEquipos } from "@/api/teams";
import {
  crearVenue,
  obtenerVenues,
  obtenerVenuesCercanas,
  type Venue,
  type VenueCercana,
} from "@/api/venues";
import { Boton, Campo, EtiquetaSeccion, Pantalla, SelectorChips, Tarjeta } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

const OPCIONES_CANTIDAD: { valor: CantidadJugadores; etiqueta: string }[] = [
  { valor: "F5", etiqueta: "5" },
  { valor: "F6", etiqueta: "6" },
  { valor: "F7", etiqueta: "7" },
  { valor: "F8", etiqueta: "8" },
  { valor: "F11", etiqueta: "11" },
];

const OPCIONES_SUPERFICIE: { valor: Superficie; etiqueta: string }[] = [
  { valor: "SINTETICO", etiqueta: "Sintetico" },
  { valor: "SALON", etiqueta: "Salon" },
  { valor: "PASTO", etiqueta: "Pasto" },
  { valor: "TIERRA", etiqueta: "Tierra" },
];

function formatearVencimiento(expiraEnIso: string, ahoraMs: number): string {
  const restanteMs = new Date(expiraEnIso).getTime() - ahoraMs;
  if (restanteMs <= 0) {
    return "Vencido";
  }
  const minutos = Math.floor(restanteMs / 60_000);
  const segundos = Math.floor((restanteMs % 60_000) / 1000);
  return `Vence en ${minutos}:${String(segundos).padStart(2, "0")}`;
}

/** Cancha detectada por GPS (docs Guapo §3.2): permiso, ubicacion actual, la mas cercana en 1.5km. */
function useCanchaDetectada() {
  const [venue, setVenue] = useState<VenueCercana | Venue | null>(null);
  const [estado, setEstado] = useState<"buscando" | "encontrada" | "sin-resultado" | "sin-permiso">(
    "buscando",
  );

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        if (!cancelado) setEstado("sin-permiso");
        return;
      }
      try {
        const posicion = await Location.getCurrentPositionAsync({});
        const cercanas = await obtenerVenuesCercanas(
          posicion.coords.latitude,
          posicion.coords.longitude,
        );
        if (cancelado) return;
        if (cercanas.length > 0) {
          setVenue(cercanas[0] ?? null);
          setEstado("encontrada");
        } else {
          setEstado("sin-resultado");
        }
      } catch {
        if (!cancelado) setEstado("sin-resultado");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  return { venue, estado, elegirManualmente: setVenue };
}

export default function GenerarPartido(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const { colores, espaciado, radio, tipografia } = useTema();
  const [cantidadJugadores, setCantidadJugadores] = useState<CantidadJugadores>("F5");
  const [superficie, setSuperficie] = useState<Superficie>("SINTETICO");
  const [ahoraMs, setAhoraMs] = useState(() => Date.now());
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const { venue, estado: estadoCancha, elegirManualmente } = useCanchaDetectada();

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });
  const equipo = equiposQuery.data?.[0];

  const mutacion = useMutation({
    mutationFn: () =>
      generarHandshake(
        accessToken as string,
        (equipo as { id: string }).id,
        cantidadJugadores,
        superficie,
        venue?.id,
      ),
  });

  useEffect(() => {
    if (!mutacion.data) return;
    const intervalo = setInterval(() => setAhoraMs(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [mutacion.data]);

  return (
    <Pantalla centrado={equiposQuery.isLoading || !equipo}>
      <Stack.Screen options={{ title: "Generar partido" }} />

      {equiposQuery.isLoading ? null : !equipo ? (
        <View style={{ alignItems: "center", gap: espaciado.md }}>
          <Text style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}>
            Primero necesitas crear un equipo.
          </Text>
          <Boton onPress={() => router.push("/inicio")}>Ir a crear equipo</Boton>
        </View>
      ) : mutacion.data ? (
        <Tarjeta style={{ alignItems: "center", gap: espaciado.md }}>
          <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
            Codigo del partido
          </Text>
          {/* Unica superficie clara de toda la app a proposito -- el QR lo escanea otro
              celular, a veces al sol en la cancha; no vale arriesgar la lectura por estetica. */}
          <View
            style={{ backgroundColor: "#EEF4EC", borderRadius: radio.xxl, padding: espaciado.lg }}
          >
            <QRCode value={mutacion.data.codigo} size={250} />
          </View>
          <EtiquetaSeccion>O que tipeen</EtiquetaSeccion>
          <Text style={[tipografia.codigo, { color: colores.textoPrimario }]}>
            {mutacion.data.codigo}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: espaciado.xs,
              backgroundColor: colores.alertaFondo,
              borderWidth: 1,
              borderColor: colores.alertaBorde,
              borderRadius: radio.pill,
              paddingVertical: 6,
              paddingHorizontal: espaciado.md,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colores.alerta }} />
            <Text style={{ fontFamily: "JetBrainsMono_700Bold", fontSize: 12, color: colores.alerta }}>
              {formatearVencimiento(mutacion.data.expiraEn, ahoraMs)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: espaciado.xs }}>
            <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
              {`${cantidadJugadores.replace("F", "F")} · ${superficie}`}
              {venue ? ` · ${venue.nombre}` : ""}
            </Text>
          </View>
          <Boton onPress={() => router.replace("/partidos")}>Ver mis partidos</Boton>
        </Tarjeta>
      ) : (
        <ScrollView contentContainerStyle={{ gap: espaciado.lg }} showsVerticalScrollIndicator={false}>
          <Tarjeta style={{ gap: espaciado.lg }}>
            <Text style={[tipografia.subtitulo, { color: colores.textoPrimario, textAlign: "center" }]}>
              Generar partido para {equipo.nombre}
            </Text>

            <View style={{ gap: espaciado.xs }}>
              <EtiquetaSeccion>Cuantos son</EtiquetaSeccion>
              <SelectorChips
                opciones={OPCIONES_CANTIDAD}
                valorSeleccionado={cantidadJugadores}
                onCambiar={setCantidadJugadores}
                distribucion="flex"
                numerica
              />
            </View>

            <View style={{ gap: espaciado.xs }}>
              <EtiquetaSeccion>En que piso</EtiquetaSeccion>
              <SelectorChips
                opciones={OPCIONES_SUPERFICIE}
                valorSeleccionado={superficie}
                onCambiar={setSuperficie}
              />
            </View>

            {mutacion.isError && (
              <Text style={[tipografia.caption, { color: colores.error }]}>
                {mutacion.error.message}
              </Text>
            )}

            <Boton onPress={() => mutacion.mutate()} cargando={mutacion.isPending}>
              Generar codigo
            </Boton>
          </Tarjeta>

          <View style={{ gap: espaciado.xs }}>
            <EtiquetaSeccion>Cancha</EtiquetaSeccion>
            <Tarjeta
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                {estadoCancha === "buscando" && (
                  <Text style={[tipografia.cuerpo, { color: colores.textoSecundario }]}>
                    Buscando cancha cercana...
                  </Text>
                )}
                {estadoCancha === "sin-permiso" && (
                  <Text style={[tipografia.cuerpo, { color: colores.textoSecundario }]}>
                    Sin permiso de ubicacion -- elegi la cancha a mano.
                  </Text>
                )}
                {estadoCancha === "sin-resultado" && !venue && (
                  <Text style={[tipografia.cuerpo, { color: colores.textoSecundario }]}>
                    No detectamos una cancha cerca.
                  </Text>
                )}
                {venue && (
                  <>
                    <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                      {venue.nombre}
                    </Text>
                    <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                      Cancha detectada
                    </Text>
                  </>
                )}
              </View>
              <Pressable onPress={() => setPickerAbierto(true)}>
                <Text style={{ fontFamily: "Archivo_600SemiBold", fontSize: 12, color: colores.acento }}>
                  Cambiar
                </Text>
              </Pressable>
            </Tarjeta>
          </View>
        </ScrollView>
      )}

      <SelectorCancha
        visible={pickerAbierto}
        onCerrar={() => setPickerAbierto(false)}
        onElegir={(v) => {
          elegirManualmente(v);
          setPickerAbierto(false);
        }}
      />
    </Pantalla>
  );
}

function SelectorCancha({
  visible,
  onCerrar,
  onElegir,
}: {
  visible: boolean;
  onCerrar: () => void;
  onElegir: (venue: Venue) => void;
}): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { colores, espaciado, tipografia } = useTema();
  const [nombreNueva, setNombreNueva] = useState("");

  const venuesQuery = useQuery({
    queryKey: ["venues"],
    queryFn: () => obtenerVenues(),
    enabled: visible,
  });

  const crearMutacion = useMutation({
    mutationFn: async () => {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        throw new Error("Hace falta el permiso de ubicacion para cargar la cancha");
      }
      const posicion = await Location.getCurrentPositionAsync({});
      return crearVenue(
        accessToken as string,
        nombreNueva,
        posicion.coords.latitude,
        posicion.coords.longitude,
      );
    },
    onSuccess: (venue) => {
      setNombreNueva("");
      onElegir(venue);
    },
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        onPress={onCerrar}
      >
        <Pressable
          style={{
            backgroundColor: colores.superficie,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: espaciado.lg,
            gap: espaciado.md,
            maxHeight: "70%",
          }}
        >
          <Text style={[tipografia.subtitulo, { color: colores.textoPrimario }]}>Elegir cancha</Text>
          <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: espaciado.xs }}>
            {(venuesQuery.data ?? []).map((v) => (
              <Pressable
                key={v.id}
                onPress={() => onElegir(v)}
                style={{
                  paddingVertical: espaciado.md,
                  paddingHorizontal: espaciado.md,
                  backgroundColor: colores.superficieHundida,
                  borderRadius: 12,
                }}
              >
                <Text style={[tipografia.cuerpo, { color: colores.textoPrimario }]}>{v.nombre}</Text>
              </Pressable>
            ))}
            {venuesQuery.data?.length === 0 && (
              <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                Todavia no hay canchas cargadas.
              </Text>
            )}
          </ScrollView>

          <View style={{ gap: espaciado.sm, borderTopWidth: 1, borderTopColor: colores.bordeSutil, paddingTop: espaciado.md }}>
            <Campo
              placeholder="Nombre de la cancha donde estas"
              value={nombreNueva}
              onChangeText={setNombreNueva}
            />
            {crearMutacion.isError && (
              <Text style={[tipografia.caption, { color: colores.error }]}>
                {crearMutacion.error.message}
              </Text>
            )}
            <Boton
              variante="secundario"
              onPress={() => crearMutacion.mutate()}
              cargando={crearMutacion.isPending}
              deshabilitado={nombreNueva.length < 2}
            >
              Cargar esta cancha
            </Boton>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
