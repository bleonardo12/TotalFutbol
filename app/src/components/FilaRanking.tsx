import * as Haptics from "expo-haptics";
import { Pressable, Text } from "react-native";
import Animated, { FadeInDown, LinearTransition, useReducedMotion } from "react-native-reanimated";
import { useTema, type Paleta } from "@/theme";

export type ZonaFila = "ascenso" | "descenso" | "neutral";

/** Tope de items con stagger visible -- listas largas no arrastran una cola de delay interminable. */
const TOPE_STAGGER = 8;

interface FilaRankingProps {
  posicion: number;
  nombre: string;
  rating: number;
  /** Top 3 (Elite): numeral con glow ambar. */
  podio?: boolean;
  /** Ambar si esta por ascender de division, rojo si esta por descender (docs/design.md §6). */
  zona?: ZonaFila;
  /** Resalta la fila del equipo propio del usuario. */
  destacada?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** Indice dentro de la lista, para el stagger de entrada -- lo calcula quien la renderea. */
  indice?: number;
}

const COLOR_ZONA: Record<ZonaFila, keyof Paleta | null> = {
  ascenso: "acento",
  descenso: "error",
  neutral: null,
};

export function FilaRanking({
  posicion,
  nombre,
  rating,
  podio = false,
  zona = "neutral",
  destacada = false,
  disabled = false,
  onPress,
  indice = 0,
}: FilaRankingProps): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();
  const reducirMovimiento = useReducedMotion();
  const claveColorZona = COLOR_ZONA[zona];
  const colorZona = claveColorZona ? colores[claveColorZona] : "transparent";

  function alTocar(): void {
    Haptics.selectionAsync().catch(() => {});
    onPress?.();
  }

  const entrando = reducirMovimiento
    ? undefined
    : FadeInDown.delay(Math.min(indice, TOPE_STAGGER) * 40).duration(300);

  return (
    <Animated.View
      entering={entrando}
      layout={reducirMovimiento ? undefined : LinearTransition.springify()}
    >
      <Pressable
        onPress={disabled ? undefined : alTocar}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: espaciado.md,
          paddingHorizontal: espaciado.md,
          backgroundColor: destacada ? colores.superficieAcento : colores.superficie,
          borderRadius: radio.md,
          borderLeftWidth: 3,
          borderLeftColor: colorZona,
          gap: espaciado.md,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Text style={[tipografia.cuerpoDestacado, { width: 24, color: colores.textoApagado }]}>
          {posicion}
        </Text>
        <Text
          style={[tipografia.cuerpo, { flex: 1, color: colores.textoPrimario }]}
          numberOfLines={1}
        >
          {nombre}
        </Text>
        <Text
          style={[
            tipografia.cuerpoDestacado,
            {
              width: 60,
              textAlign: "right",
              color: podio ? colores.acento : colores.textoPrimario,
              textShadowColor: podio ? colores.glowPodio : "transparent",
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: podio ? 8 : 0,
            },
          ]}
        >
          {Math.round(rating)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
