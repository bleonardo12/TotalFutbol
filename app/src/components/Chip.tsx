import { Text, View } from "react-native";
import { useTema } from "@/theme";

type TonoChip = "neutral" | "acento" | "exito" | "error" | "alerta";

interface ChipProps {
  texto: string;
  tono?: TonoChip;
}

/** Insignia para division/estado. El fondo es el color del tono al ~15% de opacidad (sufijo hex). */
export function Chip({ texto, tono = "neutral" }: ChipProps): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();

  const colorPorTono: Record<TonoChip, string> = {
    neutral: colores.textoSecundario,
    acento: colores.acento,
    exito: colores.exito,
    error: colores.error,
    alerta: colores.alerta,
  };
  const color = colorPorTono[tono];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: `${color}26`,
        borderRadius: radio.pill,
        paddingHorizontal: espaciado.md,
        paddingVertical: espaciado.xs,
      }}
    >
      <Text style={[tipografia.caption, { color, fontWeight: "700" }]}>{texto}</Text>
    </View>
  );
}
