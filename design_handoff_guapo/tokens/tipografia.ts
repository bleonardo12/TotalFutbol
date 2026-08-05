import type { TextStyle } from "react-native";

type EstiloTexto = Pick<TextStyle, "fontSize" | "fontFamily" | "lineHeight" | "letterSpacing">;

/**
 * Tipografia Guapo. Reemplaza app/src/theme/tipografia.ts
 *
 * Archivo para todo lo que se lee; JetBrains Mono para todo lo que es un DATO numerico
 * (rating, posicion, marcador, codigo, tiempo, delta). Esa separacion es la que le da
 * a la app el aire de tablero deportivo -- no mezclar.
 *
 * Paquetes: @expo-google-fonts/archivo y @expo-google-fonts/jetbrains-mono.
 * Cargar en app/src/app/_layout.tsx:
 *
 *   useFonts({
 *     Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold,
 *     Archivo_800ExtraBold, Archivo_900Black,
 *     JetBrainsMono_500Medium, JetBrainsMono_700Bold, JetBrainsMono_800ExtraBold,
 *   })
 *
 * En RN cada peso es una familia distinta: no usar fontWeight sobre estas familias.
 */
export const TIPOGRAFIA: Record<
  | "display"
  | "titulo"
  | "subtitulo"
  | "cuerpo"
  | "cuerpoDestacado"
  | "etiqueta"
  | "caption"
  | "boton"
  | "numeroHeroe"
  | "numeroGrande"
  | "numero"
  | "numeroChico"
  | "codigo",
  EstiloTexto
> = {
  /** Titulos de pantallas de celebracion y de estado vacio. */
  display: { fontSize: 34, fontFamily: "Archivo_900Black", lineHeight: 35, letterSpacing: -1.4 },
  /** Titulo de tab: La escalera, Desafios, Perfil. */
  titulo: { fontSize: 26, fontFamily: "Archivo_900Black", lineHeight: 28, letterSpacing: -0.8 },
  /** Nombre de equipo en header y en cards. */
  subtitulo: { fontSize: 17, fontFamily: "Archivo_800ExtraBold", lineHeight: 19, letterSpacing: -0.3 },
  cuerpo: { fontSize: 14, fontFamily: "Archivo_500Medium", lineHeight: 21 },
  /** Filas de lista e items de menu. */
  cuerpoDestacado: { fontSize: 15, fontFamily: "Archivo_700Bold", lineHeight: 20 },
  /** Labels de seccion. SIEMPRE renderizar en mayuscula. */
  etiqueta: { fontSize: 12, fontFamily: "Archivo_800ExtraBold", lineHeight: 14, letterSpacing: 1.6 },
  caption: { fontSize: 12, fontFamily: "Archivo_500Medium", lineHeight: 17 },
  boton: { fontSize: 16, fontFamily: "Archivo_900Black", lineHeight: 18, letterSpacing: -0.2 },

  /** Delta de rating en la pantalla de liquidacion. */
  numeroHeroe: { fontSize: 88, fontFamily: "JetBrainsMono_800ExtraBold", lineHeight: 88, letterSpacing: -4 },
  /** Rating en el perfil del equipo. */
  numeroGrande: { fontSize: 52, fontFamily: "JetBrainsMono_800ExtraBold", lineHeight: 52, letterSpacing: -2 },
  /** Rating en el header y en filas del ranking. */
  numero: { fontSize: 22, fontFamily: "JetBrainsMono_800ExtraBold", lineHeight: 22 },
  /** Posicion, tiempos, deltas dentro de una fila. */
  numeroChico: { fontSize: 13, fontFamily: "JetBrainsMono_700Bold", lineHeight: 16 },
  /** Codigo de handshake. */
  codigo: { fontSize: 40, fontFamily: "JetBrainsMono_800ExtraBold", lineHeight: 40, letterSpacing: 6 },
};
