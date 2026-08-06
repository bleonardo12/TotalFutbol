import { useMutation, useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { proponerDesafio } from "@/api/challenges";
import type { CantidadJugadores, Superficie } from "@/api/matches";
import { obtenerMiEntorno } from "@/api/ranking";
import { obtenerProyeccionDesafio } from "@/api/teams";
import { Boton, EtiquetaSeccion, Pantalla, SelectorChips, Tarjeta } from "@/components";
import { useEquipoActivo } from "@/hooks/useEquipoActivo";
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

export default function ProponerDesafio(): React.JSX.Element {
  const { equipoDesafiadoId, equipoDesafiadoNombre, equipoDesafiadoPosicion } = useLocalSearchParams<{
    equipoDesafiadoId: string;
    equipoDesafiadoNombre: string;
    equipoDesafiadoPosicion?: string;
  }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const { colores, espaciado, tipografia } = useTema();
  const [cantidadJugadores, setCantidadJugadores] = useState<CantidadJugadores>("F5");
  const [superficie, setSuperficie] = useState<Superficie>("SINTETICO");

  const { equiposQuery, equipo } = useEquipoActivo();

  const miEntornoQuery = useQuery({
    queryKey: ["ranking", "mi-entorno", equipo?.id],
    queryFn: () => obtenerMiEntorno((equipo as { id: string }).id),
    enabled: !!equipo,
  });

  const proyeccionQuery = useQuery({
    queryKey: ["teams", "proyectar-desafio", equipo?.id, equipoDesafiadoId],
    queryFn: () => obtenerProyeccionDesafio((equipo as { id: string }).id, equipoDesafiadoId),
    enabled: !!equipo && !!equipoDesafiadoId,
  });

  const mutacion = useMutation({
    mutationFn: () =>
      proponerDesafio(
        accessToken as string,
        (equipo as { id: string }).id,
        equipoDesafiadoId,
        cantidadJugadores,
        superficie,
      ),
    onSuccess: () => {
      router.replace("/desafios");
    },
  });

  const miPosicion = miEntornoQuery.data?.posicion ?? null;
  const posicionRival = equipoDesafiadoPosicion ? Number(equipoDesafiadoPosicion) : null;
  const distancia = miPosicion !== null && posicionRival !== null ? miPosicion - posicionRival : null;

  return (
    <Pantalla centrado={equiposQuery.isLoading || !equipo}>
      <Stack.Screen options={{ title: "Proponer desafio" }} />

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
        <ScrollView contentContainerStyle={{ gap: espaciado.lg }} showsVerticalScrollIndicator={false}>
          <Tarjeta destacada style={{ gap: espaciado.xs, alignItems: "center" }}>
            <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario, textAlign: "center" }]}>
              {equipo.nombre}
            </Text>
            <EtiquetaSeccion>Desafía a</EtiquetaSeccion>
            <Text style={[tipografia.subtitulo, { color: colores.acento, textAlign: "center" }]}>
              {equipoDesafiadoNombre}
            </Text>
            {distancia !== null && (
              <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                {distancia > 0
                  ? `${distancia} puestos arriba tuyo`
                  : distancia < 0
                    ? `${Math.abs(distancia)} puestos abajo tuyo`
                    : "Mismo puesto"}
              </Text>
            )}
          </Tarjeta>

          <Tarjeta style={{ gap: espaciado.md }}>
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
          </Tarjeta>

          {proyeccionQuery.data && (
            <Tarjeta style={{ flexDirection: "row", gap: espaciado.sm }}>
              <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
                <Text style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: 20, color: colores.acento }}>
                  {`+${Math.round(proyeccionQuery.data.siGano)}`}
                </Text>
                <EtiquetaSeccion>Si ganás</EtiquetaSeccion>
              </View>
              <View style={{ width: 1, backgroundColor: colores.bordeSutil }} />
              <View style={{ flex: 1, alignItems: "center", gap: 3 }}>
                <Text
                  style={{ fontFamily: "JetBrainsMono_800ExtraBold", fontSize: 20, color: colores.textoSecundario }}
                >
                  {Math.round(proyeccionQuery.data.siPierdo)}
                </Text>
                <EtiquetaSeccion>Si perdés</EtiquetaSeccion>
              </View>
            </Tarjeta>
          )}

          <Text
            style={[tipografia.caption, { color: colores.textoSecundario, textAlign: "center" }]}
          >
            El rival tiene 48 horas para responder. Si acepta, se pacta el partido pero el rating
            solo se mueve una vez que lo firmen en la cancha con el QR.
          </Text>

          {mutacion.isError && (
            <Text style={[tipografia.caption, { color: colores.error }]}>
              {mutacion.error.message}
            </Text>
          )}

          <Boton onPress={() => mutacion.mutate()} cargando={mutacion.isPending}>
            Mandar el desafío
          </Boton>
        </ScrollView>
      )}
    </Pantalla>
  );
}
