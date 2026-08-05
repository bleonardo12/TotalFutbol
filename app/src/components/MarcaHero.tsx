import { Text, View } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";
import { useTema } from "@/theme";

/** Hero de las pantallas de arranque (login/verificar). Pelota estilizada en ambar sobre pitch (docs/design.md §6). */
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
        <Svg width={120} height={120}>
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
          <Circle
            cx={60}
            cy={60}
            r={36}
            fill={colores.superficieAcento}
            stroke={colores.bordeAcento}
            strokeWidth={1.5}
          />
          {/* Pelota estilizada: pentagono central + puntas, motivo de la costura clasica. */}
          <Polygon points="60,42 71,50 67,63 53,63 49,50" fill={colores.acento} />
          <Line x1={60} y1={42} x2={60} y2={30} stroke={colores.acento} strokeWidth={2} strokeLinecap="round" />
          <Line x1={71} y1={50} x2={82} y2={44} stroke={colores.acento} strokeWidth={2} strokeLinecap="round" />
          <Line x1={67} y1={63} x2={75} y2={75} stroke={colores.acento} strokeWidth={2} strokeLinecap="round" />
          <Line x1={53} y1={63} x2={45} y2={75} stroke={colores.acento} strokeWidth={2} strokeLinecap="round" />
          <Line x1={49} y1={50} x2={38} y2={44} stroke={colores.acento} strokeWidth={2} strokeLinecap="round" />
        </Svg>
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
