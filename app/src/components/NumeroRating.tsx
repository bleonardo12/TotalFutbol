import { Text, type TextStyle } from "react-native";
import { useTema } from "@/theme";

interface NumeroRatingProps {
  valor: number;
  /** Top 3 / Elite: numeral en acento con glow ambar (docs/design.md §1). */
  podio?: boolean;
  style?: TextStyle;
}

/** Numeral protagonista del rating -- tabular, Sora extra bold, con glow reservado al podio. */
export function NumeroRating({ valor, podio = false, style }: NumeroRatingProps): React.JSX.Element {
  const { colores, tipografia } = useTema();

  return (
    <Text
      style={[
        tipografia.numeroHero,
        {
          color: podio ? colores.acento : colores.textoPrimario,
          textShadowColor: podio ? colores.glowPodio : "transparent",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: podio ? 14 : 0,
        },
        style,
      ]}
    >
      {Math.round(valor)}
    </Text>
  );
}
