import type { PropsWithChildren } from "react";
import { View, type ViewStyle } from "react-native";
import { useTema } from "@/theme";

interface TarjetaProps extends PropsWithChildren {
  style?: ViewStyle;
  /** Variante con tinte de acento para la card protagonista de la pantalla (ej. equipo/rating). */
  destacada?: boolean;
}

export function Tarjeta({ children, style, destacada = false }: TarjetaProps): React.JSX.Element {
  const { colores, espaciado, radio } = useTema();

  return (
    <View
      style={[
        {
          backgroundColor: destacada ? colores.superficieAcento : colores.superficie,
          borderRadius: radio.lg,
          borderWidth: 1,
          borderColor: destacada ? colores.bordeAcento : colores.borde,
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
