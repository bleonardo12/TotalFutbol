import { useMutation, useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { proponerDesafio } from "@/api/challenges";
import type { CantidadJugadores, Superficie } from "@/api/matches";
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

export default function ProponerDesafio(): React.JSX.Element {
  const { equipoDesafiadoId, equipoDesafiadoNombre } = useLocalSearchParams<{
    equipoDesafiadoId: string;
    equipoDesafiadoNombre: string;
  }>();
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
        <Tarjeta style={{ gap: espaciado.md }}>
          <Text
            style={[tipografia.subtitulo, { color: colores.textoPrimario, textAlign: "center" }]}
          >
            {equipo.nombre} desafia a {equipoDesafiadoNombre}
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
            Enviar desafio
          </Boton>
        </Tarjeta>
      )}
    </Pantalla>
  );
}
