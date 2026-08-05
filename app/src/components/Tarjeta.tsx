import type { PropsWithChildren } from "react";
import { View, type ViewStyle } from "react-native";
import { PADDING_CARD, useTema } from "@/theme";

type VarianteTarjeta = "normal" | "destacada" | "peligro";

interface TarjetaProps extends PropsWithChildren {
  style?: ViewStyle;
  /** Card protagonista de la pantalla (hero de rating, fila propia del ranking). */
  destacada?: boolean;
  /** Card de estado de error (ej. disputa). */
  peligro?: boolean;
}

/** Sin sombras (docs Guapo §1) -- la jerarquia sale del color de superficie y del borde. */
export function Tarjeta({
  children,
  style,
  destacada = false,
  peligro = false,
}: TarjetaProps): React.JSX.Element {
  const { colores, espaciado, radio } = useTema();
  const variante: VarianteTarjeta = peligro ? "peligro" : destacada ? "destacada" : "normal";

  const porVariante: Record<VarianteTarjeta, { fondo: string; borde: string; radio: number; padding: number }> = {
    normal: { fondo: colores.superficie, borde: colores.borde, radio: radio.xl, padding: PADDING_CARD.normal },
    destacada: {
      fondo: colores.superficieAcento,
      borde: colores.bordeAcento,
      radio: radio.xxl,
      padding: PADDING_CARD.hero,
    },
    peligro: { fondo: colores.errorFondo, borde: colores.errorBorde, radio: radio.xl, padding: PADDING_CARD.normal },
  };
  const { fondo, borde, radio: radioCard, padding } = porVariante[variante];

  return (
    <View
      style={[
        {
          backgroundColor: fondo,
          borderRadius: radioCard,
          borderWidth: 1,
          borderColor: borde,
          padding,
          gap: espaciado.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
