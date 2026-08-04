import { Pressable, ScrollView, Text, type ViewStyle } from "react-native";
import { useTema } from "@/theme";

export interface OpcionTab<T> {
  valor: T;
  etiqueta: string;
}

interface TabsProps<T> {
  opciones: OpcionTab<T>[];
  valorActivo: T;
  onCambiar: (valor: T) => void;
  style?: ViewStyle;
}

/**
 * Componente unico de tabs para toda la app. ScrollView horizontal +
 * ancho de contenido (nunca flex:1) + padding generoso -- construido una
 * sola vez para que etiquetas largas ("Oro"/"Plata") no se corten nunca
 * mas, en vez de que cada pantalla reimplemente su propio patron de tabs
 * (la causa raiz del bug que se repitio varias veces en Hito 5a).
 */
export function Tabs<T>({
  opciones,
  valorActivo,
  onCambiar,
  style,
}: TabsProps<T>): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ flexGrow: 0 }, style]}
      contentContainerStyle={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: espaciado.sm,
      }}
    >
      {opciones.map((opcion) => {
        const activo = opcion.valor === valorActivo;
        return (
          <Pressable
            key={String(opcion.valor)}
            onPress={() => onCambiar(opcion.valor)}
            style={{
              borderWidth: 1,
              borderColor: activo ? colores.acento : colores.borde,
              backgroundColor: activo ? colores.acento : "transparent",
              borderRadius: radio.pill,
              paddingVertical: espaciado.sm,
              paddingHorizontal: espaciado.lg,
              alignItems: "center",
            }}
          >
            <Text
              style={[
                tipografia.caption,
                {
                  color: activo ? colores.acentoTexto : colores.textoSecundario,
                  fontWeight: "700",
                },
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
