// Rango Unicode de marcas diacriticas combinantes (U+0300-U+036F), construido
// desde codigos de caracter en vez de un literal en el regex para no depender
// de como el editor/terminal codifique acentos combinantes invisibles.
const MARCAS_DIACRITICAS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizar(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(MARCAS_DIACRITICAS, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz: number[][] = Array.from({ length: filas }, () => new Array<number>(columnas).fill(0));
  for (let i = 0; i < filas; i++) matriz[i]![0] = i;
  for (let j = 0; j < columnas; j++) matriz[0]![j] = j;

  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i]![j] = Math.min(
        matriz[i - 1]![j]! + 1,
        matriz[i]![j - 1]! + 1,
        matriz[i - 1]![j - 1]! + costo,
      );
    }
  }
  return matriz[filas - 1]![columnas - 1]!;
}

/**
 * Heuristica anti-impersonacion al crear un equipo (Hito 6c): bloquea nombres
 * casi-identicos al de un equipo ya existente en la misma categoria
 * ("Barcelona" vs "Barzelona" -- distancia de edicion chica -- o "Barce" --
 * prefijo del nombre largo). NO detecta apodos sin relacion textual directa
 * (ej. "Barca" como apodo de "Barcelona"): eso requeriria un diccionario de
 * alias curado a mano, que no existe todavia -- ver concepto.md §16.
 */
export function sonNombresParecidos(a: string, b: string): boolean {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (na.length === 0 || nb.length === 0) {
    return na === nb;
  }
  if (na === nb) {
    return true;
  }

  const corta = na.length <= nb.length ? na : nb;
  const larga = na.length <= nb.length ? nb : na;
  if (corta.length >= 4 && larga.startsWith(corta)) {
    return true;
  }

  if (larga.length >= 4) {
    const distanciaMaxima = Math.max(1, Math.round(corta.length * 0.2));
    if (distanciaLevenshtein(na, nb) <= distanciaMaxima) {
      return true;
    }
  }

  return false;
}
