export type {
  AsientoRating,
  ConfiguracionGlicko2,
  EstadoGlicko,
  ResultadoOutcome,
  ResultadoRival,
} from "./glicko2/tipos";
export { RATING_INICIAL, TAU_POR_DEFECTO } from "./glicko2/constantes";
export { actualizarRating, liquidarPartido } from "./glicko2/glicko2";
