import { ESCALA_GLICKO2, EPSILON_CONVERGENCIA, RATING_BASE, TAU_POR_DEFECTO } from "./constantes";
import type {
  AsientoRating,
  ConfiguracionGlicko2,
  EstadoGlicko,
  ResultadoOutcome,
  ResultadoRival,
} from "./tipos";

function puntajeDe(resultado: ResultadoOutcome): number {
  switch (resultado) {
    case "G":
      return 1;
    case "E":
      return 0.5;
    case "P":
      return 0;
  }
}

function outcomeInverso(resultado: ResultadoOutcome): ResultadoOutcome {
  switch (resultado) {
    case "G":
      return "P";
    case "P":
      return "G";
    case "E":
      return "E";
  }
}

function aEscalaGlicko2(estado: EstadoGlicko): { mu: number; phi: number } {
  return {
    mu: (estado.rating - RATING_BASE) / ESCALA_GLICKO2,
    phi: estado.rd / ESCALA_GLICKO2,
  };
}

/** Impacto del RD del rival en la incertidumbre del resultado esperado. */
function g(phiRival: number): number {
  return 1 / Math.sqrt(1 + (3 * phiRival * phiRival) / (Math.PI * Math.PI));
}

/** Resultado esperado (probabilidad de ganar) contra un rival dado. */
function E(mu: number, muRival: number, phiRival: number): number {
  return 1 / (1 + Math.exp(-g(phiRival) * (mu - muRival)));
}

interface RivalEnEscala {
  mu: number;
  phi: number;
  puntaje: number;
}

function calcularVarianza(mu: number, rivales: RivalEnEscala[]): number {
  const sumaInversa = rivales.reduce((acc, rival) => {
    const ej = E(mu, rival.mu, rival.phi);
    const gj = g(rival.phi);
    return acc + gj * gj * ej * (1 - ej);
  }, 0);
  return 1 / sumaInversa;
}

function calcularDelta(mu: number, varianza: number, rivales: RivalEnEscala[]): number {
  const suma = rivales.reduce((acc, rival) => {
    const ej = E(mu, rival.mu, rival.phi);
    return acc + g(rival.phi) * (rival.puntaje - ej);
  }, 0);
  return varianza * suma;
}

/** Algoritmo de Illinois (regula falsi) para resolver la nueva volatilidad. */
function calcularNuevaVolatilidad(
  volatilidadActual: number,
  phi: number,
  varianza: number,
  delta: number,
  tau: number,
): number {
  const a = Math.log(volatilidadActual * volatilidadActual);
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const numerador = ex * (delta * delta - phi * phi - varianza - ex);
    const denominador = 2 * (phi * phi + varianza + ex) ** 2;
    return numerador / denominador - (x - a) / (tau * tau);
  };

  let A = a;
  let B: number;
  if (delta * delta > phi * phi + varianza) {
    B = Math.log(delta * delta - phi * phi - varianza);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) {
      k += 1;
    }
    B = a - k * tau;
  }

  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > EPSILON_CONVERGENCIA) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB < 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

/**
 * Actualiza el estado Glicko-2 de un equipo con los resultados de un
 * periodo (uno o mas rivales). Si no jugo ningun partido, el RD crece
 * (menos confianza en el numero) y rating/volatilidad no cambian.
 */
export function actualizarRating(
  equipo: EstadoGlicko,
  resultados: ResultadoRival[],
  config: Partial<ConfiguracionGlicko2> = {},
): EstadoGlicko {
  const tau = config.tau ?? TAU_POR_DEFECTO;
  const { mu, phi } = aEscalaGlicko2(equipo);

  if (resultados.length === 0) {
    const phiInflado = Math.sqrt(phi * phi + equipo.volatilidad * equipo.volatilidad);
    return {
      rating: equipo.rating,
      rd: phiInflado * ESCALA_GLICKO2,
      volatilidad: equipo.volatilidad,
    };
  }

  const rivales: RivalEnEscala[] = resultados.map((r) => ({
    ...aEscalaGlicko2(r.rival),
    puntaje: puntajeDe(r.resultado),
  }));

  const varianza = calcularVarianza(mu, rivales);
  const delta = calcularDelta(mu, varianza, rivales);
  const nuevaVolatilidad = calcularNuevaVolatilidad(equipo.volatilidad, phi, varianza, delta, tau);

  const phiEstrella = Math.sqrt(phi * phi + nuevaVolatilidad * nuevaVolatilidad);
  const nuevoPhi = 1 / Math.sqrt(1 / (phiEstrella * phiEstrella) + 1 / varianza);
  const nuevoMu = mu + (nuevoPhi * nuevoPhi * delta) / varianza;

  return {
    rating: ESCALA_GLICKO2 * nuevoMu + RATING_BASE,
    rd: ESCALA_GLICKO2 * nuevoPhi,
    volatilidad: nuevaVolatilidad,
  };
}

/**
 * Liquida un partido 1v1 (el caso real del dominio: un partido a la vez,
 * no un lote por periodo). Devuelve el asiento de cada lado, listo para
 * escribir en rating_ledger.
 */
export function liquidarPartido(
  local: EstadoGlicko,
  visitante: EstadoGlicko,
  outcomeLocal: ResultadoOutcome,
  config: Partial<ConfiguracionGlicko2> = {},
): { local: AsientoRating; visitante: AsientoRating } {
  const resultanteLocal = actualizarRating(
    local,
    [{ rival: visitante, resultado: outcomeLocal }],
    config,
  );
  const resultanteVisitante = actualizarRating(
    visitante,
    [{ rival: local, resultado: outcomeInverso(outcomeLocal) }],
    config,
  );

  return {
    local: {
      anterior: local,
      resultante: resultanteLocal,
      delta: resultanteLocal.rating - local.rating,
    },
    visitante: {
      anterior: visitante,
      resultante: resultanteVisitante,
      delta: resultanteVisitante.rating - visitante.rating,
    },
  };
}
