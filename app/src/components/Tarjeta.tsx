import type { PropsWithChildren } from "react";
import { View, type ViewStyle } from "react-native";
import { useTema } from "@/theme";

export function Tarjeta({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>): React.JSX.Element {
  const { colores, espaciado, radio } = useTema();

  return (
    <View
      style={[
        {
          backgroundColor: colores.superficie,
          borderRadius: radio.lg,
          borderWidth: 1,
          borderColor: colores.borde,
          padding: espaciado.lg,
          gap: espaciado.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
