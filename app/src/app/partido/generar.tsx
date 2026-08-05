import { useMutation, useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { generarHandshake, type CantidadJugadores, type Superficie } from "@/api/matches";
import { misEquipos } from "@/api/teams";
import { Boton, Pantalla, SelectorChips, Tarjeta } from "@/components";
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

export default function GenerarPartido(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const { colores, espaciado, tipografia } = useTema();
  const [cantidadJugadores, setCantidadJugadores] = useState<CantidadJugadores>("F5");
  const [superficie, setSuperficie] = useState<Superficie>("SINTETICO");

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
      ),
  });

  return (
    <Pantalla centrado={equiposQuery.isLoading || !equipo}>
      <Stack.Screen options={{ title: "Generar partido" }} />

      {equiposQuery.isLoading ? null : !equipo ? (
        <View style={{ alignItems: "center", gap: espaciado.md }}>
          <Text
            style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}
          >
            Primero necesitas crear un equipo.
          </Text>
          <Boton onPress={() => router.push("/inicio")}>Ir a crear equipo</Boton>
        </View>
      ) : mutacion.data ? (
        <Tarjeta style={{ alignItems: "center", gap: espaciado.md }}>
          <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
            Codigo del partido
          </Text>
          {/* El QR se deja negro-sobre-blanco (default) a proposito -- lo escanea otro
              celular, a veces al sol en la cancha; no vale arriesgar la lectura por
              estetica. Lo que se tematiza es el marco (la Tarjeta), no los pixeles. */}
          <QRCode value={mutacion.data.codigo} size={200} />
          <Text
            style={[tipografia.titulo, { color: colores.textoPrimario, letterSpacing: 4 }]}
          >
            {mutacion.data.codigo}
          </Text>
          <Text
            style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}
          >
            El rival escanea el QR (o ingresa el codigo a mano). Vence en 10 minutos.
          </Text>
          <Boton onPress={() => router.replace("/partidos")}>Ver mis partidos</Boton>
        </Tarjeta>
      ) : (
        <Tarjeta style={{ gap: espaciado.md }}>
          <Text
            style={[tipografia.subtitulo, { color: colores.textoPrimario, textAlign: "center" }]}
          >
            Generar partido para {equipo.nombre}
          </Text>

          <View style={{ gap: espaciado.xs }}>
            <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
              Cantidad de jugadores
            </Text>
            <SelectorChips
              opciones={OPCIONES_CANTIDAD}
              valorSeleccionado={cantidadJugadores}
              onCambiar={setCantidadJugadores}
            />
          </View>

          <View style={{ gap: espaciado.xs }}>
            <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
              Superficie
            </Text>
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
      )}
    </Pantalla>
  );
}
