import { describe, expect, it } from "vitest";
import { PARTIDOS_MINIMOS_PARA_ELITE } from "./constantes";
import { asignarDivision } from "./temporadas";

const PARTIDOS_SOBRAN = PARTIDOS_MINIMOS_PARA_ELITE + 10;

describe("asignarDivision", () => {
  it("corta en cuartiles exactos con 4 equipos (uno por division)", () => {
    expect(asignarDivision(0, 4, PARTIDOS_SOBRAN)).toBe("ELITE");
    expect(asignarDivision(1, 4, PARTIDOS_SOBRAN)).toBe("ORO");
    expect(asignarDivision(2, 4, PARTIDOS_SOBRAN)).toBe("PLATA");
    expect(asignarDivision(3, 4, PARTIDOS_SOBRAN)).toBe("BRONCE");
  });

  it("corta en cuartiles exactos con 12 equipos (3 por division)", () => {
    const divisiones = Array.from({ length: 12 }, (_, posicion) =>
      asignarDivision(posicion, 12, PARTIDOS_SOBRAN),
    );
    expect(divisiones).toEqual([
      "ELITE",
      "ELITE",
      "ELITE",
      "ORO",
      "ORO",
      "ORO",
      "PLATA",
      "PLATA",
      "PLATA",
      "BRONCE",
      "BRONCE",
      "BRONCE",
    ]);
  });

  it("con un total no divisible exacto, ninguna division queda vacia (13 equipos)", () => {
    const conteo: Record<string, number> = { ELITE: 0, ORO: 0, PLATA: 0, BRONCE: 0 };
    for (let posicion = 0; posicion < 13; posicion++) {
      conteo[asignarDivision(posicion, 13, PARTIDOS_SOBRAN)] += 1;
    }
    expect(conteo.ELITE + conteo.ORO + conteo.PLATA + conteo.BRONCE).toBe(13);
    expect(Object.values(conteo).every((cantidad) => cantidad > 0)).toBe(true);
  });

  it("con un solo equipo, es Elite (si tiene partidos suficientes)", () => {
    expect(asignarDivision(0, 1, PARTIDOS_SOBRAN)).toBe("ELITE");
  });

  it("bloquea Elite por partidos insuficientes y cae a Oro", () => {
    expect(asignarDivision(0, 4, PARTIDOS_MINIMOS_PARA_ELITE - 1)).toBe("ORO");
  });

  it("con exactamente el minimo de partidos, entra a Elite", () => {
    expect(asignarDivision(0, 4, PARTIDOS_MINIMOS_PARA_ELITE)).toBe("ELITE");
  });

  it("el bloqueo de partidos no afecta a otras divisiones (no hace falta para Oro/Plata/Bronce)", () => {
    expect(asignarDivision(1, 4, 0)).toBe("ORO");
    expect(asignarDivision(2, 4, 0)).toBe("PLATA");
    expect(asignarDivision(3, 4, 0)).toBe("BRONCE");
  });
});
