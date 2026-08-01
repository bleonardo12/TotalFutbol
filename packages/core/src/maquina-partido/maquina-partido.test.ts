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

describe("arbol de disputa (concepto.md §10)", () => {
  it("REPORTADO -> EN_DISPUTA cuando los reportes discrepan", () => {
    expect(puedeTransicionar("REPORTADO", "EN_DISPUTA")).toBe(true);
    expect(transicionar("REPORTADO", "EN_DISPUTA")).toBe("EN_DISPUTA");
  });

  it("EN_DISPUTA se resuelve con un outcome (-> CONFIRMADO, sigue camino feliz hasta LIQUIDADO) o se anula (-> VOID)", () => {
    expect(puedeTransicionar("EN_DISPUTA", "CONFIRMADO")).toBe(true);
    expect(transicionar("EN_DISPUTA", "CONFIRMADO")).toBe("CONFIRMADO");
    expect(puedeTransicionar("CONFIRMADO", "LIQUIDADO")).toBe(true);

    expect(puedeTransicionar("EN_DISPUTA", "VOID")).toBe(true);
    expect(transicionar("EN_DISPUTA", "VOID")).toBe("VOID");
  });

  it("EN_DISPUTA no admite otra cosa que CONFIRMADO o VOID (no vuelve a REPORTADO ni salta a LIQUIDADO directo)", () => {
    expect(puedeTransicionar("EN_DISPUTA", "REPORTADO")).toBe(false);
    expect(puedeTransicionar("EN_DISPUTA", "LIQUIDADO")).toBe(false);
  });

  it("VOID es terminal (sin cambio de rating)", () => {
    expect(esEstadoTerminal("VOID")).toBe(true);
  });
});

describe("SUSPENDIDO (pendiente hasta el hito de fair-play/incidentes)", () => {
  it("no tiene transiciones cableadas todavia", () => {
    expect(puedeTransicionar("EN_JUEGO", "SUSPENDIDO")).toBe(false);
    expect(esEstadoTerminal("SUSPENDIDO")).toBe(true);
  });
});
