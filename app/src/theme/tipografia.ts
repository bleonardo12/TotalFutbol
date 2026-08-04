import type { TextStyle } from "react-native";

type EstiloTexto = Pick<TextStyle, "fontSize" | "fontWeight" | "lineHeight">;

/** Escala tipografica unica para toda la app -- sin esto, cada pantalla elegia su propio fontSize suelto. */
export const TIPOGRAFIA: Record<
  "display" | "titulo" | "subtitulo" | "cuerpo" | "cuerpoDestacado" | "caption" | "boton",
  EstiloTexto
> = {
  display: { fontSize: 32, fontWeight: "800", lineHeight: 38 },
  titulo: { fontSize: 24, fontWeight: "700", lineHeight: 30 },
  subtitulo: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
  cuerpo: { fontSize: 15, fontWeight: "400", lineHeight: 21 },
  cuerpoDestacado: { fontSize: 15, fontWeight: "600", lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: "500", lineHeight: 18 },
  boton: { fontSize: 16, fontWeight: "700", lineHeight: 20 },
};
