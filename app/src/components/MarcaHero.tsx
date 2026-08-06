import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { useTema } from "@/theme";

/** Hero de las pantallas de arranque (login/verificar): wordmark CABRA. */
export function MarcaHero(): React.JSX.Element {
  const { colores, espaciado } = useTema();

  return (
    <View style={{ alignItems: "center", marginBottom: espaciado.xl }}>
      <LinearGradient
        colors={["rgba(184,240,60,0.11)", "transparent"]}
        locations={[0, 0.6]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: -80,
          right: -80,
          height: 260,
        }}
      />

      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 6,
          borderColor: colores.acento,
          marginBottom: espaciado.lg,
        }}
      />

      <Text
        style={{
          fontFamily: "Archivo_900Black",
          fontSize: 62,
          letterSpacing: -3,
          color: colores.textoPrimario,
        }}
      >
        CABRA
      </Text>
      <Text
        style={{
          fontFamily: "Archivo_600SemiBold",
          fontSize: 16,
          color: colores.textoSecundario,
          textAlign: "center",
          maxWidth: 250,
          marginTop: espaciado.xs,
        }}
      >
        Que se sepa quién es la cabra. 🐐
      </Text>
    </View>
  );
}
