import { Pressable, Text, View, type ViewStyle } from "react-native";
import { useTema } from "@/theme";

export interface OpcionChip<T> {
  valor: T;
  etiqueta: string;
}

interface SelectorChipsProps<T> {
  opciones: OpcionChip<T>[];
  valorSeleccionado: T | null;
  onCambiar: (valor: T) => void;
  /** "wrap" (default): pills sueltas, se acomodan solas. "flex": todas el mismo ancho, ocupan la fila entera -- ej. "CUANTOS SON" en Generar codigo (docs Guapo §3.2). */
  distribucion?: "wrap" | "flex";
  /** Texto en JetBrains Mono -- para opciones que son numeros (cantidad de jugadores). */
  numerica?: boolean;
  style?: ViewStyle;
}

/**
 * Fila de pills de una sola seleccion para un campo de formulario (cantidad de
 * jugadores, superficie, respuesta de poll, etc.) -- este patron se copiaba a
 * mano en cada pantalla; se extrae aca una sola vez.
 */
export function SelectorChips<T>({
  opciones,
  valorSeleccionado,
  onCambiar,
  distribucion = "wrap",
  numerica = false,
  style,
}: SelectorChipsProps<T>): React.JSX.Element {
  const { colores, espaciado, radio, tipografia } = useTema();

  return (
    <View
      style={[
        { flexDirection: "row", flexWrap: distribucion === "wrap" ? "wrap" : "nowrap", gap: espaciado.sm },
        style,
      ]}
    >
      {opciones.map((opcion, indice) => {
        const activo = opcion.valor === valorSeleccionado;
        return (
          <Pressable
            key={typeof opcion.valor === "string" || typeof opcion.valor === "number" ? opcion.valor : indice}
            onPress={() => onCambiar(opcion.valor)}
            style={{
              flex: distribucion === "flex" ? 1 : undefined,
              alignItems: "center",
              borderWidth: 1,
              borderColor: activo ? colores.acento : colores.borde,
              backgroundColor: activo ? colores.acento : "transparent",
              borderRadius: radio.pill,
              paddingVertical: espaciado.sm,
              paddingHorizontal: espaciado.md,
            }}
          >
            <Text
              style={[
                numerica
                  ? { fontFamily: "JetBrainsMono_700Bold", fontSize: 17 }
                  : tipografia.caption,
                { color: activo ? colores.acentoTexto : colores.textoSecundario },
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
