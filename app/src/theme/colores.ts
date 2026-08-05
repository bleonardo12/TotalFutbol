export interface Paleta {
  fondo: string;
  superficie: string;
  superficieElevada: string;
  /** Variante con tinte de acento para cards "hero" (equipo/rating) -- rompe la monotonia de grises. */
  superficieAcento: string;
  borde: string;
  bordeAcento: string;
  textoPrimario: string;
  textoSecundario: string;
  textoApagado: string;
  acento: string;
  acentoTexto: string;
  exito: string;
  error: string;
  alerta: string;
  /** Color de sombra/glow para el podio (top 3, Elite) -- nunca de fondo. */
  glowPodio: string;
}

// Direccion "cancha de noche" (docs/design.md): cesped nocturno verde-negro +
// ambar de los reflectores como acento, en vez del azul default de "app tech".
const oscura: Paleta = {
  fondo: "#0B1210",
  superficie: "#131C18",
  superficieElevada: "#1B2823",
  superficieAcento: "#1E241A",
  borde: "#26332C",
  bordeAcento: "#8A6A2A",
  textoPrimario: "#EEF2ED",
  textoSecundario: "#9EB0A6",
  textoApagado: "#63736A",
  acento: "#FFB020",
  acentoTexto: "#0B1210",
  exito: "#2FB877",
  error: "#E5484D",
  alerta: "#F2A93B",
  glowPodio: "#FFB020",
};

const clara: Paleta = {
  fondo: "#F4F7F2",
  superficie: "#FFFFFF",
  superficieElevada: "#E9F0E5",
  superficieAcento: "#FFF3DC",
  borde: "#DCE6D8",
  bordeAcento: "#F0C77A",
  textoPrimario: "#12201A",
  textoSecundario: "#4F6358",
  textoApagado: "#8B9A90",
  acento: "#D9860A",
  acentoTexto: "#FFFFFF",
  exito: "#1E9E62",
  error: "#C93B3F",
  alerta: "#C9860B",
  glowPodio: "#FFB020",
};

export const PALETAS = { dark: oscura, light: clara } as const;
