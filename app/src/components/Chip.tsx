import { Text, View } from "react-native";
import { useTema } from "@/theme";

export type TonoChip = "elite" | "oro" | "neutral" | "alerta" | "error";

interface ChipProps {
  texto: string;
  tono?: TonoChip;
}

/** Insignia de division/estado -- pares fondo/borde explicitos, siempre en mayuscula (docs Guapo §2). */
export function Chip({ texto, tono = "neutral" }: ChipProps): React.JSX.Element {
  const { colores, radio } = useTema();

  const porTono: Record<TonoChip, { fondo: string; borde: string; texto: string }> = {
    elite: { fondo: colores.superficieAcento, borde: colores.bordeAcento, texto: colores.acento },
    oro: { fondo: colores.alertaFondo, borde: colores.alertaBorde, texto: colores.oro },
    neutral: { fondo: "transparent", borde: colores.bordeControl, texto: colores.textoSecundario },
    alerta: { fondo: colores.alertaFondo, borde: colores.alertaBorde, texto: colores.alerta },
    error: { fondo: colores.errorFondo, borde: colores.errorBorde, texto: colores.error },
  };
  const { fondo, borde, texto: colorTexto } = porTono[tono];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: fondo,
        borderWidth: 1,
        borderColor: borde,
        borderRadius: radio.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontFamily: "Archivo_800ExtraBold",
          fontSize: 10,
          letterSpacing: 0.6,
          color: colorTexto,
          textTransform: "uppercase",
        }}
      >
        {texto}
      </Text>
    </View>
  );
}
