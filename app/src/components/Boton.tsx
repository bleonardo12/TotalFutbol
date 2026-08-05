import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useTema } from "@/theme";

type VarianteBoton = "primario" | "secundario" | "destructivo";

interface BotonProps {
  children: string;
  onPress: () => void;
  variante?: VarianteBoton;
  cargando?: boolean;
  deshabilitado?: boolean;
}

/** Feedback de escala con Reanimated + haptic al presionar; primario suma glow ambar (docs/design.md §5-6). */
export function Boton({
  children,
  onPress,
  variante = "primario",
  cargando = false,
  deshabilitado = false,
}: BotonProps): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();
  const escala = useSharedValue(1);
  const reducirMovimiento = useReducedMotion();
  const inactivo = cargando || deshabilitado;

  const colorFondo = variante === "primario" ? colores.acento : "transparent";
  const colorBorde =
    variante === "primario" ? colores.acento : variante === "secundario" ? colores.borde : colores.error;
  const colorTexto =
    variante === "primario" ? colores.acentoTexto : variante === "secundario" ? colores.textoPrimario : colores.error;

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: escala.value }],
  }));

  function alPresionar(): void {
    escala.value = withTiming(0.97, { duration: reducirMovimiento ? 0 : 80 });
    if (!inactivo) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }

  function alSoltar(): void {
    escala.value = withTiming(1, { duration: reducirMovimiento ? 0 : 120 });
  }

  return (
    <Animated.View style={estiloAnimado}>
      <Pressable
        onPress={inactivo ? undefined : onPress}
        onPressIn={alPresionar}
        onPressOut={alSoltar}
        style={{
          backgroundColor: colorFondo,
          borderWidth: 1,
          borderColor: colorBorde,
          borderRadius: radio.md,
          paddingVertical: espaciado.md,
          alignItems: "center",
          justifyContent: "center",
          opacity: inactivo ? 0.5 : 1,
          ...(variante === "primario" && !inactivo
            ? {
                shadowColor: colores.glowPodio,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              }
            : null),
        }}
      >
        {cargando ? (
          <ActivityIndicator color={colorTexto} />
        ) : (
          <Text style={[tipografia.boton, { color: colorTexto }]}>{children}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}
