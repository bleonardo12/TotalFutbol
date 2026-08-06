import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  invitarJugador,
  obtenerIntegrantes,
  obtenerInvitacionesPendientes,
} from "@/api/teams";
import { Boton, Campo, Chip, EtiquetaSeccion, Pantalla, Tarjeta } from "@/components";
import { useEquipoActivo } from "@/hooks/useEquipoActivo";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

function formatearVencimiento(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

/** Gestion de plantel para el capitan (concepto.md §4: "progresivo, se completa despues"). */
export default function Plantel(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const { colores, espaciado, tipografia } = useTema();
  const { equipo } = useEquipoActivo();
  const [telefono, setTelefono] = useState("");

  const integrantesQuery = useQuery({
    queryKey: ["equipos", "integrantes", equipo?.id],
    queryFn: () => obtenerIntegrantes(equipo!.id),
    enabled: !!equipo,
  });

  const invitacionesQuery = useQuery({
    queryKey: ["equipos", "invitaciones", equipo?.id],
    queryFn: () => obtenerInvitacionesPendientes(accessToken as string, equipo!.id),
    enabled: !!equipo && accessToken !== null,
  });

  const invitarMutacion = useMutation({
    mutationFn: () => invitarJugador(accessToken as string, equipo!.id, telefono),
    onSuccess: () => {
      setTelefono("");
      queryClient.invalidateQueries({ queryKey: ["equipos", "invitaciones", equipo?.id] });
    },
  });

  return (
    <Pantalla style={{ padding: 0 }}>
      <Stack.Screen options={{ title: "Plantel" }} />
      <ScrollView contentContainerStyle={{ padding: espaciado.lg, gap: espaciado.lg }}>
        <View style={{ gap: espaciado.sm }}>
          <EtiquetaSeccion>Integrantes</EtiquetaSeccion>
          <Tarjeta style={{ gap: espaciado.sm }}>
            {(integrantesQuery.data ?? []).map((i) => (
              <View
                key={i.id}
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
              >
                <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                  {i.nombre}
                </Text>
                <Chip texto={i.rol === "CAPITAN" ? "Capitán" : "Jugador"} tono={i.rol === "CAPITAN" ? "elite" : "neutral"} />
              </View>
            ))}
          </Tarjeta>
        </View>

        <View style={{ gap: espaciado.sm }}>
          <EtiquetaSeccion>Invitar por teléfono</EtiquetaSeccion>
          <Tarjeta style={{ gap: espaciado.md }}>
            <Campo
              placeholder="11 2233 4455"
              keyboardType="phone-pad"
              autoComplete="tel"
              value={telefono}
              onChangeText={setTelefono}
            />
            <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
              Le mandamos un código por SMS/WhatsApp. Lo usa para sumarse con su propia cuenta.
            </Text>
            {invitarMutacion.isError && (
              <Text style={[tipografia.caption, { color: colores.error }]}>
                {invitarMutacion.error.message}
              </Text>
            )}
            <Boton
              onPress={() => invitarMutacion.mutate()}
              cargando={invitarMutacion.isPending}
              deshabilitado={telefono.length < 8}
            >
              Invitar 👊
            </Boton>
          </Tarjeta>
        </View>

        {invitacionesQuery.data && invitacionesQuery.data.length > 0 && (
          <View style={{ gap: espaciado.sm }}>
            <EtiquetaSeccion>Invitaciones pendientes</EtiquetaSeccion>
            <View style={{ gap: espaciado.xs }}>
              {invitacionesQuery.data.map((inv) => (
                <Tarjeta
                  key={inv.id}
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Text style={[tipografia.cuerpo, { color: colores.textoPrimario }]}>{inv.telefono}</Text>
                  <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                    {`⏳ vence ${formatearVencimiento(inv.expiraEn)}`}
                  </Text>
                </Tarjeta>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Pantalla>
  );
}
