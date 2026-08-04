import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, Text } from "react-native";
import { useTema } from "@/theme";

type VarianteBoton = "primario" | "secundario" | "destructivo";

interface BotonProps {
  children: string;
  onPress: () => void;
  variante?: VarianteBoton;
  cargando?: boolean;
  deshabilitado?: boolean;
}

/** Feedback de escala al presionar (Animated de React Native -- sin dependencia nativa extra). */
export function Boton({
  children,
  onPress,
  variante = "primario",
  cargando = false,
  deshabilitado = false,
}: BotonProps): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();
  const escala = useRef(new Animated.Value(1)).current;
  const inactivo = cargando || deshabilitado;

  const colorFondo =
    variante === "primario" ? colores.acento : variante === "secundario" ? "transparent" : "transparent";
  const colorBorde =
    variante === "primario" ? colores.acento : variante === "secundario" ? colores.borde : colores.error;
  const colorTexto =
    variante === "primario" ? colores.acentoTexto : variante === "secundario" ? colores.textoPrimario : colores.error;

  function alPresionar(): void {
    Animated.timing(escala, { toValue: 0.97, duration: 80, useNativeDriver: true }).start();
  }

  function alSoltar(): void {
    Animated.timing(escala, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
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
