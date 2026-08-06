import { Text, View } from "react-native";
import { useTema } from "@/theme";
import { EtiquetaSeccion } from "./EtiquetaSeccion";
import { Tarjeta } from "./Tarjeta";

const PASOS_COMO_FUNCIONA = [
  "Se juntan en la cancha y escanean el QR. Eso firma el contrato.",
  "Juegan. Cada capitán carga quién ganó.",
  "Si coinciden, listo: entrás al ranking.",
];

/** Instructivo de arranque -- Inicio lo muestra siempre que el equipo no rankea todavia; Perfil
 * lo deja accesible en todo momento (equipos ya rankeados tambien quieren volver a verlo). */
export function ComoFunciona(): React.JSX.Element {
  const { colores, espaciado, tipografia } = useTema();

  return (
    <Tarjeta style={{ gap: espaciado.md }}>
      <EtiquetaSeccion>Cómo funciona</EtiquetaSeccion>
      {PASOS_COMO_FUNCIONA.map((paso, indice) => (
        <View key={paso} style={{ flexDirection: "row", gap: espaciado.md, alignItems: "flex-start" }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              backgroundColor: indice === 0 ? colores.acento : "transparent",
              borderWidth: indice === 0 ? 0 : 1.5,
              borderColor: colores.bordeControl,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "JetBrainsMono_800ExtraBold",
                fontSize: 12,
                color: indice === 0 ? colores.acentoTexto : colores.textoSecundario,
              }}
            >
              {indice + 1}
            </Text>
          </View>
          <Text style={[tipografia.cuerpo, { flex: 1, color: colores.textoSecundario }]}>{paso}</Text>
        </View>
      ))}
    </Tarjeta>
  );
}
