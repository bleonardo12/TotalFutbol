import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTema } from "@/theme";

/** Hero de las pantallas de arranque (login/verificar). Placeholder geometrico hasta sumar ilustracion generada. */
export function MarcaHero(): React.JSX.Element {
  const { colores, espaciado, tipografia } = useTema();

  return (
    <View style={{ alignItems: "center", marginBottom: espaciado.xl }}>
      <View
        style={{
          width: 120,
          height: 120,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: espaciado.lg,
        }}
      >
        <Svg width={120} height={120} style={{ position: "absolute" }}>
          <Circle
            cx={60}
            cy={60}
            r={54}
            stroke={colores.acento}
            strokeWidth={2}
            strokeDasharray="6 8"
            fill="none"
            opacity={0.5}
          />
          <Circle cx={60} cy={60} r={36} fill={colores.acento} opacity={0.15} />
        </Svg>
        <Text style={{ fontSize: 44 }}>⚽</Text>
      </View>
      <Text style={[tipografia.display, { color: colores.textoPrimario }]}>TotalFutbol</Text>
      <Text
        style={[
          tipografia.cuerpo,
          { color: colores.textoSecundario, marginTop: espaciado.xs, textAlign: "center" },
        ]}
      >
        El ranking de tu equipo, partido a partido.
      </Text>
    </View>
  );
}
