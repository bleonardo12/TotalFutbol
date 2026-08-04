import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import { crearEquipo, misEquipos, type Division } from "@/api/teams";
import { Boton, Campo, Chip, Pantalla, Tarjeta } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

const ETIQUETA_DIVISION: Record<Division, string> = {
  ELITE: "Elite",
  ORO: "Oro",
  PLATA: "Plata",
  BRONCE: "Bronce",
};

const TONO_DIVISION: Record<Division, "exito" | "alerta" | "neutral"> = {
  ELITE: "exito",
  ORO: "alerta",
  PLATA: "neutral",
  BRONCE: "neutral",
};

export default function Equipo(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const [nombre, setNombre] = useState("");

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [anim]);
  const estiloAnimado = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  const usuarioQuery = useQuery({
    queryKey: ["usuario", "actual"],
    queryFn: () => obtenerUsuarioActual(accessToken as string),
    enabled: accessToken !== null,
  });

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });

  const crearMutacion = useMutation({
    mutationFn: () => crearEquipo(accessToken as string, nombre),
    onSuccess: () => {
      setNombre("");
      queryClient.invalidateQueries({ queryKey: ["equipos", "mios"] });
    },
  });

  async function salir(): Promise<void> {
    await cerrarSesion();
    router.replace("/login");
  }

  const styles = crearEstilos(tema);

  if (equiposQuery.isLoading) {
    return <Pantalla centrado />;
  }

  const equipo = equiposQuery.data?.[0];

  return (
    <Pantalla>
      <Animated.View style={[estiloAnimado, { gap: espaciado.lg }]}>
        {equipo ? (
          <>
            <Tarjeta style={styles.tarjetaEquipo}>
              <Text style={[tipografia.subtitulo, { color: colores.textoPrimario }]}>
                {equipo.nombre}
              </Text>
              <View style={styles.filaChips}>
                <Chip
                  texto={equipo.estado === "RANKEADO" ? "Rankeado" : "Provisional"}
                  tono={equipo.estado === "RANKEADO" ? "exito" : "neutral"}
                />
                {equipo.division && (
                  <Chip
                    texto={ETIQUETA_DIVISION[equipo.division]}
                    tono={TONO_DIVISION[equipo.division]}
                  />
                )}
              </View>

              <Text style={[tipografia.display, styles.rating]}>{Math.round(equipo.rating)}</Text>
              <Text style={[tipografia.caption, styles.ratingEtiqueta]}>Rating</Text>

              <View style={styles.statFairPlay}>
                <Text style={[tipografia.cuerpoDestacado, { color: colores.textoSecundario }]}>
                  Fair-play
                </Text>
                <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                  {Math.round(equipo.fairPlay)}
                </Text>
              </View>
            </Tarjeta>

            <View style={{ gap: espaciado.sm }}>
              <Link href="/partido" asChild>
                <Boton variante="secundario" onPress={() => {}}>
                  Ver mis partidos
                </Boton>
              </Link>
              <Link href="/desafio" asChild>
                <Boton variante="secundario" onPress={() => {}}>
                  Ver mis desafios
                </Boton>
              </Link>
              <Link href="/ranking" asChild>
                <Boton variante="secundario" onPress={() => {}}>
                  Ver ranking
                </Boton>
              </Link>
            </View>
          </>
        ) : (
          <Tarjeta style={{ gap: espaciado.md }}>
            <Text style={[tipografia.subtitulo, { color: colores.textoPrimario, textAlign: "center" }]}>
              Crear equipo
            </Text>
            <Campo placeholder="Nombre del equipo" value={nombre} onChangeText={setNombre} />
            {crearMutacion.isError && (
              <Text style={[tipografia.caption, { color: colores.error }]}>
                {crearMutacion.error.message}
              </Text>
            )}
            <Boton
              onPress={() => crearMutacion.mutate()}
              cargando={crearMutacion.isPending}
              deshabilitado={nombre.length < 2}
            >
              Crear
            </Boton>
          </Tarjeta>
        )}

        {usuarioQuery.data?.rol === "ADMIN" && (
          <Link href="/admin" asChild>
            <Boton variante="secundario" onPress={() => {}}>
              Panel de admin
            </Boton>
          </Link>
        )}

        <Boton variante="destructivo" onPress={salir}>
          Cerrar sesion
        </Boton>
      </Animated.View>
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado }: Tema) {
  return {
    tarjetaEquipo: {
      alignItems: "center" as const,
      gap: espaciado.xs,
    },
    filaChips: {
      flexDirection: "row" as const,
      gap: espaciado.sm,
      marginBottom: espaciado.sm,
    },
    rating: {
      color: colores.acento,
      marginTop: espaciado.sm,
    },
    ratingEtiqueta: {
      color: colores.textoApagado,
      marginBottom: espaciado.sm,
    },
    statFairPlay: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      width: "100%" as const,
      paddingTop: espaciado.md,
      borderTopWidth: 1,
      borderTopColor: colores.borde,
    },
  };
}
