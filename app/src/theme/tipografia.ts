import type { TextStyle } from "react-native";

type EstiloTexto = Pick<TextStyle, "fontSize" | "fontFamily" | "lineHeight" | "letterSpacing">;

/**
 * Sora para titulares/nombres/botones (geometrica, con caracter -- rompe el aire
 * "de terminal" de la fuente del sistema); Inter para texto de lectura (cuerpo,
 * muy probada en legibilidad a tamanos chicos). Con fuentes custom en RN no hay
 * fontWeight variable por CSS: cada peso es un archivo/familia distinta, por eso
 * cada nivel apunta a la familia exacta en vez de fontWeight + fontFamily base.
 */
export const TIPOGRAFIA: Record<
  "display" | "titulo" | "subtitulo" | "cuerpo" | "cuerpoDestacado" | "caption" | "boton",
  EstiloTexto
> = {
  display: { fontSize: 40, fontFamily: "Sora_800ExtraBold", lineHeight: 46, letterSpacing: -0.6 },
  titulo: { fontSize: 28, fontFamily: "Sora_700Bold", lineHeight: 34, letterSpacing: -0.4 },
  subtitulo: { fontSize: 20, fontFamily: "Sora_600SemiBold", lineHeight: 26, letterSpacing: -0.2 },
  cuerpo: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 23 },
  cuerpoDestacado: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 23 },
  caption: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18, letterSpacing: 0.2 },
  boton: { fontSize: 17, fontFamily: "Sora_700Bold", lineHeight: 21, letterSpacing: 0.1 },
};
