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
