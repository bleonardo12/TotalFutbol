import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { crearEquipo, misEquipos, type CategoriaFutbol, type Division } from "@/api/teams";
import { Boton, Campo, Chip, NumeroRating, Pantalla, SelectorChips, Tarjeta } from "@/components";
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

const OPCIONES_CATEGORIA: { valor: CategoriaFutbol; etiqueta: string }[] = [
  { valor: "MASCULINO", etiqueta: "Masculino" },
  { valor: "FEMENINO", etiqueta: "Femenino" },
  { valor: "MIXTO", etiqueta: "Mixto" },
];

const ETIQUETA_CATEGORIA: Record<CategoriaFutbol, string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  MIXTO: "Mixto",
};

export default function Inicio(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<CategoriaFutbol | null>(null);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [anim]);
  const estiloAnimado = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });

  const crearMutacion = useMutation({
    mutationFn: () => crearEquipo(accessToken as string, nombre, categoria as CategoriaFutbol),
    onSuccess: () => {
      setNombre("");
      setCategoria(null);
      queryClient.invalidateQueries({ queryKey: ["equipos", "mios"] });
    },
  });

  if (equiposQuery.isLoading) {
    return <Pantalla centrado />;
  }

  const equipo = equiposQuery.data?.[0];

  return (
    <Pantalla>
      <Animated.View style={[estiloAnimado, { gap: espaciado.lg }]}>
        {equipo ? (
          <Tarjeta destacada style={styles.tarjetaEquipo}>
            <Text style={[tipografia.titulo, { color: colores.textoPrimario }]}>
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
              <Chip texto={ETIQUETA_CATEGORIA[equipo.categoria]} tono="acento" />
            </View>

            <NumeroRating
              valor={equipo.rating}
              podio={equipo.division === "ELITE"}
              style={styles.rating}
            />
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
        ) : (
          <Tarjeta style={{ gap: espaciado.md }}>
            <Text
              style={[tipografia.subtitulo, { color: colores.textoPrimario, textAlign: "center" }]}
            >
              Crear equipo
            </Text>
            <Campo placeholder="Nombre del equipo" value={nombre} onChangeText={setNombre} />

            <View style={{ gap: espaciado.xs }}>
              <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                Categoria (fija, no se puede cambiar despues)
              </Text>
              <SelectorChips
                opciones={OPCIONES_CATEGORIA}
                valorSeleccionado={categoria}
                onCambiar={setCategoria}
              />
            </View>

            {crearMutacion.isError && (
              <Text style={[tipografia.caption, { color: colores.error }]}>
                {crearMutacion.error.message}
              </Text>
            )}
            <Boton
              onPress={() => crearMutacion.mutate()}
              cargando={crearMutacion.isPending}
              deshabilitado={nombre.length < 2 || categoria === null}
            >
              Crear
            </Boton>
          </Tarjeta>
        )}
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
