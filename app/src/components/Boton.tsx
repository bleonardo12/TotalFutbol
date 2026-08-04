import { ActivityIndicator, Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTema } from "@/theme";

type VarianteBoton = "primario" | "secundario" | "destructivo";

interface BotonProps {
  children: string;
  onPress: () => void;
  variante?: VarianteBoton;
  cargando?: boolean;
  deshabilitado?: boolean;
}

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

/** Feedback de escala al presionar (Reanimated, corre en el hilo de UI). */
export function Boton({
  children,
  onPress,
  variante = "primario",
  cargando = false,
  deshabilitado = false,
}: BotonProps): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();
  const escala = useSharedValue(1);
  const estiloAnimado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const inactivo = cargando || deshabilitado;

  const colorFondo =
    variante === "primario" ? colores.acento : variante === "secundario" ? "transparent" : "transparent";
  const colorBorde =
    variante === "primario" ? colores.acento : variante === "secundario" ? colores.borde : colores.error;
  const colorTexto =
    variante === "primario" ? colores.acentoTexto : variante === "secundario" ? colores.textoPrimario : colores.error;

  return (
    <PressableAnimado
      onPress={inactivo ? undefined : onPress}
      onPressIn={() => {
        escala.value = withTiming(0.97, { duration: 80 });
      }}
      onPressOut={() => {
        escala.value = withTiming(1, { duration: 120 });
      }}
      style={[
        estiloAnimado,
        {
          backgroundColor: colorFondo,
          borderWidth: 1,
          borderColor: colorBorde,
          borderRadius: radio.md,
          paddingVertical: espaciado.md,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          opacity: inactivo ? 0.5 : 1,
        },
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <Text style={[tipografia.boton, { color: colorTexto }]}>{children}</Text>
      )}
    </PressableAnimado>
  );
}
