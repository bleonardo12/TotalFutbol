import { describe, expect, it } from "vitest";
import {
  FAIR_PLAY_INICIAL,
  FAIR_PLAY_UMBRAL_PRESUNCION,
  FAIR_PLAY_VENTANA_DECAY_DIAS,
} from "./constantes";
import { calcularFairPlay, haypresuncion } from "./fair-play";

const AHORA = new Date("2026-08-01T00:00:00Z");

function haceDias(dias: number): Date {
  return new Date(AHORA.getTime() - dias * 24 * 60 * 60 * 1000);
}

describe("calcularFairPlay", () => {
  it("sin eventos, devuelve el valor inicial", () => {
    expect(calcularFairPlay([], AHORA)).toBe(FAIR_PLAY_INICIAL);
  });

  it("un evento reciente (mismo instante) se aplica casi sin decay", () => {
    const resultado = calcularFairPlay([{ delta: -40, createdAt: AHORA }], AHORA);
    expect(resultado).toBeCloseTo(FAIR_PLAY_INICIAL - 40, 5);
  });

  it("un evento a la edad de la ventana de decay pesa la mitad (vida media)", () => {
    const resultado = calcularFairPlay(
      [{ delta: -100, createdAt: haceDias(FAIR_PLAY_VENTANA_DECAY_DIAS) }],
      AHORA,
    );
    expect(resultado).toBeCloseTo(FAIR_PLAY_INICIAL - 50, 5);
  });

  it("un evento a dos ventanas de antiguedad pesa un cuarto", () => {
    const resultado = calcularFairPlay(
      [{ delta: -100, createdAt: haceDias(FAIR_PLAY_VENTANA_DECAY_DIAS * 2) }],
      AHORA,
    );
    expect(resultado).toBeCloseTo(FAIR_PLAY_INICIAL - 25, 5);
  });

  it("acumula varios eventos con distinto peso segun su edad", () => {
    const resultado = calcularFairPlay(
      [
        { delta: 3, createdAt: haceDias(1) },
        { delta: 3, createdAt: haceDias(2) },
        { delta: -15, createdAt: haceDias(3) },
      ],
      AHORA,
    );
    expect(resultado).toBeCloseTo(FAIR_PLAY_INICIAL + 3 + 3 - 15, 0);
  });

  it("nunca baja de 0 (clamp inferior)", () => {
    const eventos = Array.from({ length: 20 }, () => ({ delta: -150, createdAt: AHORA }));
    expect(calcularFairPlay(eventos, AHORA)).toBe(0);
  });

  it("nunca supera 1000 (clamp superior)", () => {
    const eventos = Array.from({ length: 100 }, () => ({ delta: 3, createdAt: AHORA }));
    expect(calcularFairPlay(eventos, AHORA)).toBe(1000);
  });
});

describe("haypresuncion", () => {
  it("sin diferencial, no hay presuncion", () => {
    expect(haypresuncion(900, 900)).toBeNull();
  });

  it("diferencial por debajo del umbral, no hay presuncion", () => {
    expect(haypresuncion(900, 900 - (FAIR_PLAY_UMBRAL_PRESUNCION - 1))).toBeNull();
  });

  it("diferencial justo en el umbral, ya hay presuncion", () => {
    expect(haypresuncion(900, 900 - FAIR_PLAY_UMBRAL_PRESUNCION)).toBe("B");
  });

  it("presume contra el equipo de peor fair-play (A peor que B)", () => {
    expect(haypresuncion(900 - FAIR_PLAY_UMBRAL_PRESUNCION - 50, 900)).toBe("A");
  });

  it("presume contra el equipo de peor fair-play (B peor que A)", () => {
    expect(haypresuncion(900, 900 - FAIR_PLAY_UMBRAL_PRESUNCION - 50)).toBe("B");
  });

  it("acepta un umbral custom", () => {
    expect(haypresuncion(900, 850, 40)).toBe("B");
    expect(haypresuncion(900, 850, 60)).toBeNull();
  });
});
