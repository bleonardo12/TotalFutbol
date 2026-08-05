/**
 * Paleta Guapo -- "cancha nocturna". Reemplaza app/src/theme/colores.ts
 *
 * Un solo acento (lima de reflector). Todo lo demas es verde-negro y grises verdosos.
 * Solo tema oscuro: el uso real es de noche, en la cancha. La paleta clara apunta a la
 * oscura para no romper `useTema`, pero no hay diseno claro.
 */

export interface Paleta {
  fondo: string;
  superficie: string;
  superficieElevada: string;
  /** Tinte de acento para la card protagonista (hero de rating, fila propia del ranking). */
  superficieAcento: string;
  /** Mas oscura que la superficie: encabezados de seccion dentro de una card, celdas de stat. */
  superficieHundida: string;
  /** Tab bar y barra de accion inferior. */
  barra: string;

  borde: string;
  /** Separadores y linea bajo el header. */
  bordeSutil: string;
  /** Borde de boton secundario y de chip inactivo. */
  bordeControl: string;
  bordeAcento: string;

  textoPrimario: string;
  textoSecundario: string;
  textoApagado: string;
  /** Chevrons, placeholders, numero de version. */
  textoFantasma: string;

  acento: string;
  acentoTexto: string;

  alerta: string;
  alertaFondo: string;
  alertaBorde: string;

  error: string;
  errorFondo: string;
  errorBorde: string;

  /** Divisiones. Elite usa `acento`. */
  oro: string;
  plata: string;
  bronce: string;
}

const oscura: Paleta = {
  fondo: "#08110D",
  superficie: "#0F1B15",
  superficieElevada: "#16241D",
  superficieAcento: "#131F0C",
  superficieHundida: "#0C1712",
  barra: "#0A1410",

  borde: "#1F3128",
  bordeSutil: "#17261E",
  bordeControl: "#2A3E34",
  bordeAcento: "#2F4A26",

  textoPrimario: "#EEF4EC",
  textoSecundario: "#93A79B",
  textoApagado: "#5E7268",
  textoFantasma: "#3A4A42",

  acento: "#B8F03C",
  acentoTexto: "#0A1A05",

  alerta: "#F2B33D",
  alertaFondo: "#2A2110",
  alertaBorde: "#4A3A15",

  error: "#FF6146",
  errorFondo: "#1A0F0C",
  errorBorde: "#4A2A22",

  oro: "#E6B450",
  plata: "#AEBDB6",
  bronce: "#C08552",
};

export const PALETAS = { dark: oscura, light: oscura } as const;

/** Color y fondo por division, para chips y encabezados de grupo en el ranking. */
export const DIVISION_COLOR = {
  ELITE: { texto: oscura.acento, fondo: oscura.superficieAcento, borde: oscura.bordeAcento },
  ORO: { texto: oscura.oro, fondo: oscura.alertaFondo, borde: oscura.alertaBorde },
  PLATA: { texto: oscura.plata, fondo: oscura.superficieElevada, borde: oscura.bordeControl },
  BRONCE: { texto: oscura.bronce, fondo: oscura.superficieElevada, borde: oscura.bordeControl },
} as const;
