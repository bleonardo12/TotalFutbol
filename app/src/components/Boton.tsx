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

/** Feedback de escala con Reanimated + haptic al presionar (docs Guapo §2). Sin sombras -- el unico glow de la app es la linea del escaner QR. */
export function Boton({
  children,
  onPress,
  variante = "primario",
  cargando = false,
  deshabilitado = false,
}: BotonProps): React.JSX.Element {
  const { colores, radio, tipografia } = useTema();
  const escala = useSharedValue(1);
  const reducirMovimiento = useReducedMotion();
  const inactivo = cargando || deshabilitado;

  const colorFondo = deshabilitado
    ? colores.superficieElevada
    : variante === "primario"
      ? colores.acento
      : "transparent";
  const colorBorde =
    variante === "primario" ? colores.acento : variante === "secundario" ? colores.bordeControl : colores.errorBorde;
  const colorTexto = deshabilitado
    ? colores.textoApagado
    : variante === "primario"
      ? colores.acentoTexto
      : variante === "secundario"
        ? colores.textoPrimario
        : colores.error;

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
          borderWidth: variante === "primario" ? 0 : 1,
          borderColor: colorBorde,
          borderRadius: radio.lg,
          paddingVertical: 17,
          alignItems: "center",
          justifyContent: "center",
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
