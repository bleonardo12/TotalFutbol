import { Text, type TextProps } from "react-native";
import { useTema } from "@/theme";

interface EtiquetaSeccionProps {
  children: string;
  style?: TextProps["style"];
}

/** Label de seccion en mayuscula -- "TU ESCALERA", "TU FORMA", "LO ULTIMO" (docs Guapo §2). */
export function EtiquetaSeccion({ children, style }: EtiquetaSeccionProps): React.JSX.Element {
  const { colores, tipografia } = useTema();

  return (
    <Text
      style={[
        tipografia.etiqueta,
        { color: colores.textoApagado, textTransform: "uppercase" },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
