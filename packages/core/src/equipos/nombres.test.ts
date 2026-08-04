import { describe, expect, it } from "vitest";
import { sonNombresParecidos } from "./nombres";

describe("sonNombresParecidos", () => {
  it("bloquea el mismo nombre normalizado (mayusculas/acentos/espacios)", () => {
    expect(sonNombresParecidos("Barcelona", "barcelona")).toBe(true);
    expect(sonNombresParecidos("Deportivo Río", "deportivo rio")).toBe(true);
    expect(sonNombresParecidos("Los  Pibes", "los pibes")).toBe(true);
  });

  it("bloquea un nombre corto que es prefijo de uno existente", () => {
    expect(sonNombresParecidos("Barcelona", "Barce")).toBe(true);
  });

  it("bloquea nombres con distancia de edicion chica", () => {
    expect(sonNombresParecidos("Barcelona", "Barzelona")).toBe(true);
  });

  it("no bloquea nombres claramente distintos", () => {
    expect(sonNombresParecidos("Barcelona", "River Plate")).toBe(false);
    expect(sonNombresParecidos("Lambo FC", "Real Madrid")).toBe(false);
  });

  it("no bloquea nombres cortos no relacionados", () => {
    expect(sonNombresParecidos("PSG", "FCB")).toBe(false);
  });
});
