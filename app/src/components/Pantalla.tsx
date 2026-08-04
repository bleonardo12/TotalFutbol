import type { PropsWithChildren } from "react";
import { View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTema } from "@/theme";

interface PantallaProps extends PropsWithChildren {
  style?: ViewStyle;
  centrado?: boolean;
}

/** Reemplaza el <View style={styles.container}> repetido en cada pantalla: safe-area + fondo tematico + padding. */
export function Pantalla({ children, style, centrado }: PantallaProps): React.JSX.Element {
  const { colores, espaciado } = useTema();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }}>
      <View
        style={[
          { flex: 1, padding: espaciado.lg, gap: espaciado.md },
          centrado ? { justifyContent: "center" as const } : null,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
