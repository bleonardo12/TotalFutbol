export interface Paleta {
  fondo: string;
  superficie: string;
  superficieElevada: string;
  borde: string;
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
  fondo: "#0B0F14",
  superficie: "#151A21",
  superficieElevada: "#1E252E",
  borde: "#2A323C",
  textoPrimario: "#F5F7FA",
  textoSecundario: "#A8B3BF",
  textoApagado: "#6B7684",
  acento: "#3B9EFF",
  acentoTexto: "#FFFFFF",
  exito: "#34C759",
  error: "#FF5A52",
  alerta: "#F5A623",
};

const clara: Paleta = {
  fondo: "#F7F9FC",
  superficie: "#FFFFFF",
  superficieElevada: "#EDF1F7",
  borde: "#DCE3EC",
  textoPrimario: "#1A1F26",
  textoSecundario: "#5B6572",
  textoApagado: "#8B95A1",
  acento: "#208AEF",
  acentoTexto: "#FFFFFF",
  exito: "#22A745",
  error: "#DC3545",
  alerta: "#D9891A",
};

export const PALETAS = { dark: oscura, light: clara } as const;
