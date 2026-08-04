import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useTema } from "@/theme";

interface CampoProps extends TextInputProps {
  etiqueta?: string;
  error?: string;
}

export function Campo({ etiqueta, error, style, ...resto }: CampoProps): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();

  return (
    <View style={{ gap: espaciado.xs }}>
      {etiqueta && (
        <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>{etiqueta}</Text>
      )}
      <TextInput
        placeholderTextColor={colores.textoApagado}
        style={[
          tipografia.cuerpo,
          {
            color: colores.textoPrimario,
            backgroundColor: colores.superficie,
            borderWidth: 1,
            borderColor: error ? colores.error : colores.borde,
            borderRadius: radio.md,
            paddingVertical: espaciado.md,
            paddingHorizontal: espaciado.lg,
          },
          style,
        ]}
        {...resto}
      />
      {error && <Text style={[tipografia.caption, { color: colores.error }]}>{error}</Text>}
    </View>
  );
}
