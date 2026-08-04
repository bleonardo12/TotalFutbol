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
}

const oscura: Paleta = {
  fondo: "#080A0D",
  superficie: "#171D26",
  superficieElevada: "#212A35",
  superficieAcento: "#16233A",
  borde: "#28323E",
  bordeAcento: "#2D5C94",
  textoPrimario: "#F7F9FC",
  textoSecundario: "#AEB9C6",
  textoApagado: "#6B7684",
  acento: "#4FACFF",
  acentoTexto: "#08131F",
  exito: "#34C759",
  error: "#FF5A52",
  alerta: "#F5A623",
};

const clara: Paleta = {
  fondo: "#F2F5FA",
  superficie: "#FFFFFF",
  superficieElevada: "#E7EDF6",
  superficieAcento: "#E8F2FF",
  borde: "#DCE3EC",
  bordeAcento: "#AFD4FF",
  textoPrimario: "#141A22",
  textoSecundario: "#535E6C",
  textoApagado: "#8B95A1",
  acento: "#1878D6",
  acentoTexto: "#FFFFFF",
  exito: "#22A745",
  error: "#DC3545",
  alerta: "#D9891A",
};

export const PALETAS = { dark: oscura, light: clara } as const;
