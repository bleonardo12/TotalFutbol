import { Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { useTema } from "@/theme";

export interface OpcionTab<T> {
  valor: T;
  etiqueta: string;
}

interface TabsProps<T> {
  opciones: OpcionTab<T>[];
  valorActivo: T;
  onCambiar: (valor: T) => void;
  /**
   * "pildoras" (default): chips sueltos, scroll horizontal -- filtro de
   * division/categoria. "segmentado": contenedor unico con la pestaña
   * activa resaltada -- recibidos/enviados, escanear/tipear (docs Guapo §2).
   */
  variante?: "pildoras" | "segmentado";
  style?: ViewStyle;
}

/**
 * Componente unico de tabs para toda la app -- construido una sola vez
 * para que etiquetas largas ("Oro"/"Plata") no se corten nunca mas, en vez
 * de que cada pantalla reimplemente su propio patron de tabs.
 */
export function Tabs<T>({
  opciones,
  valorActivo,
  onCambiar,
  variante = "pildoras",
  style,
}: TabsProps<T>): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();

  if (variante === "segmentado") {
    return (
      <View
        style={[
          {
            flexDirection: "row",
            backgroundColor: colores.superficieHundida,
            borderWidth: 1,
            borderColor: colores.borde,
            borderRadius: radio.md,
            padding: 3,
          },
          style,
        ]}
      >
        {opciones.map((opcion) => {
          const activo = opcion.valor === valorActivo;
          return (
            <Pressable
              key={String(opcion.valor)}
              onPress={() => onCambiar(opcion.valor)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: activo ? colores.superficieElevada : "transparent",
                borderRadius: radio.sm,
                paddingVertical: espaciado.sm,
              }}
            >
              <Text
                style={{
                  fontFamily: "Archivo_800ExtraBold",
                  fontSize: 13,
                  color: activo ? colores.textoPrimario : colores.textoApagado,
                }}
              >
                {opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Alto explicito: un ScrollView horizontal sin altura fija puede medir 0 dentro de una
      // columna flex en Android, aunque su contenido se siga pintando -- el hermano siguiente
      // (la lista) queda superpuesto por encima. Alto = padding vertical del pill + su borde +
      // el lineHeight de `caption` (17).
      style={[{ flexGrow: 0, height: 35 }, style]}
      contentContainerStyle={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 7,
        paddingRight: espaciado.lg,
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
              borderColor: activo ? colores.acento : colores.bordeControl,
              backgroundColor: activo ? colores.acento : "transparent",
              borderRadius: radio.pill,
              paddingVertical: 6,
              paddingHorizontal: 14,
              alignItems: "center",
            }}
          >
            <Text
              style={[
                tipografia.caption,
                { color: activo ? colores.acentoTexto : colores.textoSecundario },
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
