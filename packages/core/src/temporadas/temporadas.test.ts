import { describe, expect, it } from "vitest";
import { calcularTabla, divisionAnterior, divisionSiguiente } from "./temporadas";

describe("divisionSiguiente", () => {
  it("avanza un escalon", () => {
    expect(divisionSiguiente("PROMOCIONAL")).toBe("ASCENSO");
    expect(divisionSiguiente("ASCENSO")).toBe("PRIMERA");
    expect(divisionSiguiente("PRIMERA")).toBe("ELITE");
  });

  it("ELITE no tiene siguiente (clamp)", () => {
    expect(divisionSiguiente("ELITE")).toBe("ELITE");
  });
});

describe("divisionAnterior", () => {
  it("retrocede un escalon", () => {
    expect(divisionAnterior("ELITE")).toBe("PRIMERA");
    expect(divisionAnterior("PRIMERA")).toBe("ASCENSO");
    expect(divisionAnterior("ASCENSO")).toBe("PROMOCIONAL");
  });

  it("PROMOCIONAL no tiene anterior (clamp)", () => {
    expect(divisionAnterior("PROMOCIONAL")).toBe("PROMOCIONAL");
  });
});

describe("calcularTabla", () => {
  it("sin partidos, tabla vacia", () => {
    expect(calcularTabla([])).toEqual([]);
  });

  it("calcula puntos AFA-style (3-1-0)", () => {
    const tabla = calcularTabla([
      { equipoId: "a", resultado: "G" },
      { equipoId: "a", resultado: "G" },
      { equipoId: "a", resultado: "E" },
      { equipoId: "a", resultado: "P" },
    ]);
    expect(tabla).toEqual([{ equipoId: "a", pj: 4, pg: 2, pe: 1, pp: 1, puntos: 7 }]);
  });

  it("agrupa varios equipos por separado", () => {
    const tabla = calcularTabla([
      { equipoId: "a", resultado: "G" },
      { equipoId: "b", resultado: "P" },
      { equipoId: "b", resultado: "E" },
    ]);
    const porEquipo = new Map(tabla.map((fila) => [fila.equipoId, fila]));
    expect(porEquipo.get("a")).toEqual({ equipoId: "a", pj: 1, pg: 1, pe: 0, pp: 0, puntos: 3 });
    expect(porEquipo.get("b")).toEqual({ equipoId: "b", pj: 2, pg: 0, pe: 1, pp: 1, puntos: 1 });
  });

  it("empates en puntos no rompen el calculo (el desempate lo resuelve quien llama)", () => {
    const tabla = calcularTabla([
      { equipoId: "a", resultado: "G" },
      { equipoId: "b", resultado: "G" },
    ]);
    expect(tabla.every((fila) => fila.puntos === 3)).toBe(true);
    expect(tabla).toHaveLength(2);
  });
});
