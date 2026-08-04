export type {
  AsientoRating,
  ConfiguracionGlicko2,
  EstadoGlicko,
  ResultadoOutcome,
  ResultadoRival,
} from "./glicko2/tipos";
export { RATING_INICIAL, TAU_POR_DEFECTO } from "./glicko2/constantes";
export { actualizarRating, liquidarPartido } from "./glicko2/glicko2";

export type { EstadoPartido } from "./maquina-partido/maquina-partido";
export {
  ESTADOS_INICIALES_VALIDOS,
  esEstadoInicialValido,
  esEstadoTerminal,
  puedeTransicionar,
  transicionar,
  TransicionInvalidaError,
} from "./maquina-partido/maquina-partido";

export type { EventoFairPlay, LadoPresuncion } from "./fair-play/tipos";
export {
  BAJAS_GRATIS_POR_MES,
  FAIR_PLAY_DELTA,
  FAIR_PLAY_INICIAL,
  FAIR_PLAY_MAX,
  FAIR_PLAY_MIN,
  FAIR_PLAY_UMBRAL_PRESUNCION,
  FAIR_PLAY_VENTANA_DECAY_DIAS,
} from "./fair-play/constantes";
export { calcularFairPlay, debePenalizarBaja, haypresuncion } from "./fair-play/fair-play";

export { sonNombresParecidos } from "./equipos/nombres";

export type { CategoriaFutbol, Division } from "./temporadas/tipos";
export {
  ORDEN_CATEGORIAS,
  ORDEN_DIVISIONES,
  PARTIDOS_MINIMOS_PARA_ELITE,
} from "./temporadas/constantes";
export { asignarDivision } from "./temporadas/temporadas";
