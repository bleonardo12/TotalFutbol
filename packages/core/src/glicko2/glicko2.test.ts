import { describe, expect, it } from "vitest";
import { RATING_INICIAL } from "./constantes";
import { actualizarRating, liquidarPartido } from "./glicko2";
import type { EstadoGlicko } from "./tipos";

describe("actualizarRating", () => {
  it("reproduce el ejemplo de referencia del paper de Glickman (Glicko-2)", () => {
    // http://www.glicko.net/glicko/glicko2.pdf, seccion "Example calculation".
    const equipo: EstadoGlicko = { rating: 1500, rd: 200, volatilidad: 0.06 };

    const resultado = actualizarRating(
      equipo,
      [
        { rival: { rating: 1400, rd: 30, volatilidad: 0.06 }, resultado: "G" },
        { rival: { rating: 1550, rd: 100, volatilidad: 0.06 }, resultado: "P" },
        { rival: { rating: 1700, rd: 300, volatilidad: 0.06 }, resultado: "P" },
      ],
      { tau: 0.5 },
    );

    expect(resultado.rating).toBeCloseTo(1464.06, 1);
    expect(resultado.rd).toBeCloseTo(151.52, 1);
    expect(resultado.volatilidad).toBeCloseTo(0.05999, 4);
  });

  it("si el equipo no juega en el periodo, el RD crece y rating/volatilidad no cambian", () => {
    const equipo: EstadoGlicko = { rating: 1600, rd: 80, volatilidad: 0.06 };

    const resultado = actualizarRating(equipo, []);

    expect(resultado.rating).toBe(equipo.rating);
    expect(resultado.volatilidad).toBe(equipo.volatilidad);
    expect(resultado.rd).toBeGreaterThan(equipo.rd);
  });

  it("un batacazo (David gana) sube mucho al que gano y hunde al favorito", () => {
    const favorito: EstadoGlicko = { rating: 1900, rd: 60, volatilidad: 0.06 };
    const under: EstadoGlicko = { rating: 1300, rd: 60, volatilidad: 0.06 };

    const favoritoPierde = actualizarRating(favorito, [{ rival: under, resultado: "P" }]);
    const underGana = actualizarRating(under, [{ rival: favorito, resultado: "G" }]);

    const favoritoGanaEsperado = actualizarRating(favorito, [{ rival: under, resultado: "G" }]);

    expect(favorito.rating - favoritoPierde.rating).toBeGreaterThan(
      favoritoGanaEsperado.rating - favorito.rating,
    );
    expect(underGana.rating - under.rating).toBeGreaterThan(
      favoritoGanaEsperado.rating - favorito.rating,
    );
  });
});

describe("liquidarPartido", () => {
  it("con equipos identicos, lo que gana uno es exactamente lo que pierde el otro", () => {
    const equipoA: EstadoGlicko = { rating: 1500, rd: 100, volatilidad: 0.06 };
    const equipoB: EstadoGlicko = { rating: 1500, rd: 100, volatilidad: 0.06 };

    const { local, visitante } = liquidarPartido(equipoA, equipoB, "G");

    expect(local.delta).toBeGreaterThan(0);
    expect(visitante.delta).toBeCloseTo(-local.delta, 9);
    expect(visitante.resultante.rd).toBeCloseTo(local.resultante.rd, 9);
  });

  it("un empate entre equipos identicos no mueve el rating", () => {
    const equipoA: EstadoGlicko = { rating: 1500, rd: 100, volatilidad: 0.06 };
    const equipoB: EstadoGlicko = { rating: 1500, rd: 100, volatilidad: 0.06 };

    const { local, visitante } = liquidarPartido(equipoA, equipoB, "E");

    expect(local.delta).toBeCloseTo(0, 9);
    expect(visitante.delta).toBeCloseTo(0, 9);
  });

  it("devuelve asientos consistentes con delta = resultante - anterior, listos para el ledger", () => {
    const local: EstadoGlicko = RATING_INICIAL;
    const visitante: EstadoGlicko = RATING_INICIAL;

    const resultado = liquidarPartido(local, visitante, "G");

    expect(resultado.local.delta).toBeCloseTo(
      resultado.local.resultante.rating - resultado.local.anterior.rating,
      9,
    );
    expect(resultado.visitante.delta).toBeCloseTo(
      resultado.visitante.resultante.rating - resultado.visitante.anterior.rating,
      9,
    );
  });
});
