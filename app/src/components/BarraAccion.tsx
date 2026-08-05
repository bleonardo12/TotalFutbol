import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { Boton } from "./Boton";
import { PADDING_PANTALLA, useTema } from "@/theme";

interface BarraAccionProps {
  etiqueta: string;
  onPress: () => void;
  onEscanear: () => void;
  cargando?: boolean;
}

/** Barra fija inferior: CTA principal + boton cuadrado de escanear (docs Guapo §3.1, punto 8). */
export function BarraAccion({
  etiqueta,
  onPress,
  onEscanear,
  cargando = false,
}: BarraAccionProps): React.JSX.Element {
  const { colores, espaciado, radio } = useTema();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: espaciado.sm,
        backgroundColor: colores.barra,
        borderTopWidth: 1,
        borderTopColor: colores.bordeSutil,
        paddingHorizontal: PADDING_PANTALLA,
        paddingVertical: espaciado.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Boton onPress={onPress} cargando={cargando}>
          {etiqueta}
        </Boton>
      </View>
      <Pressable
        onPress={onEscanear}
        style={{
          width: 58,
          height: 58,
          borderRadius: radio.lg,
          borderWidth: 1,
          borderColor: colores.bordeControl,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="qr-code-outline" size={24} color={colores.textoPrimario} />
      </Pressable>
    </View>
  );
}
