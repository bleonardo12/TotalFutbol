import { describe, expect, it } from "vitest";
import {
  ESTADOS_INICIALES_VALIDOS,
  esEstadoInicialValido,
  esEstadoTerminal,
  puedeTransicionar,
  transicionar,
  TransicionInvalidaError,
  type EstadoPartido,
} from "./maquina-partido";

const CAMINO_FELIZ: EstadoPartido[] = [
  "PACTADO",
  "FIRMADO",
  "EN_JUEGO",
  "REPORTADO",
  "CONFIRMADO",
  "LIQUIDADO",
];

describe("camino feliz", () => {
  it("recorre PACTADO -> FIRMADO -> EN_JUEGO -> REPORTADO -> CONFIRMADO -> LIQUIDADO", () => {
    let estado = CAMINO_FELIZ[0]!;
    for (const siguiente of CAMINO_FELIZ.slice(1)) {
      estado = transicionar(estado, siguiente);
    }
    expect(estado).toBe("LIQUIDADO");
  });

  it("etapa 1 (presencial) puede nacer directo en FIRMADO, sin pasar por PACTADO", () => {
    expect(esEstadoInicialValido("FIRMADO")).toBe(true);
    expect(esEstadoInicialValido("PACTADO")).toBe(true);
    expect(ESTADOS_INICIALES_VALIDOS).not.toContain("EN_JUEGO");
  });

  it("LIQUIDADO es terminal", () => {
    expect(esEstadoTerminal("LIQUIDADO")).toBe(true);
    expect(esEstadoTerminal("FIRMADO")).toBe(false);
  });
});

describe("transiciones invalidas", () => {
  it("no permite saltear pasos (FIRMADO -> CONFIRMADO)", () => {
    expect(puedeTransicionar("FIRMADO", "CONFIRMADO")).toBe(false);
    expect(() => transicionar("FIRMADO", "CONFIRMADO")).toThrow(TransicionInvalidaError);
  });

  it("no permite retroceder (REPORTADO -> EN_JUEGO)", () => {
    expect(puedeTransicionar("REPORTADO", "EN_JUEGO")).toBe(false);
  });

  it("no permite transicionar desde un estado terminal", () => {
    expect(puedeTransicionar("LIQUIDADO", "EN_JUEGO")).toBe(false);
  });
});

describe("estados de disputa (pendientes hasta el hito de disputas)", () => {
  it("EN_DISPUTA, SUSPENDIDO y VOID no tienen transiciones cableadas todavia", () => {
    expect(puedeTransicionar("REPORTADO", "EN_DISPUTA")).toBe(false);
    expect(puedeTransicionar("EN_DISPUTA", "LIQUIDADO")).toBe(false);
    expect(puedeTransicionar("EN_JUEGO", "SUSPENDIDO")).toBe(false);
    expect(esEstadoTerminal("EN_DISPUTA")).toBe(true);
    expect(esEstadoTerminal("SUSPENDIDO")).toBe(true);
    expect(esEstadoTerminal("VOID")).toBe(true);
  });
});
