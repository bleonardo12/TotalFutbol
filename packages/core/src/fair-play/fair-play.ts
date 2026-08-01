import {
  FAIR_PLAY_INICIAL,
  FAIR_PLAY_MAX,
  FAIR_PLAY_MIN,
  FAIR_PLAY_UMBRAL_PRESUNCION,
  FAIR_PLAY_VENTANA_DECAY_DIAS,
} from "./constantes";
import type { EventoFairPlay, LadoPresuncion } from "./tipos";

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/**
 * Recalcula el fair-play de un equipo desde su historial completo de
 * eventos, aplicando decay exponencial por edad (concepto.md §11: "una
 * mala noche no es perpetua"). Un evento de `ventanaDecayDias` de
 * antiguedad pesa la mitad de su delta original (vida media). Nada se
 * sobreescribe: esto se llama de nuevo desde cero cada vez que se agrega
 * un evento, sobre el ledger completo — igual que el rating se reconstruye
 * desde rating_ledger (arquitectura.md: "ledger append-only... auditable
 * y reconstruible").
 */
export function calcularFairPlay(
  eventos: readonly EventoFairPlay[],
  ahora: Date,
  opciones: { base?: number; ventanaDecayDias?: number } = {},
): number {
  const base = opciones.base ?? FAIR_PLAY_INICIAL;
  const ventanaDecayDias = opciones.ventanaDecayDias ?? FAIR_PLAY_VENTANA_DECAY_DIAS;

  const sumaPonderada = eventos.reduce((acumulado, evento) => {
    const diasTranscurridos = (ahora.getTime() - evento.createdAt.getTime()) / MS_POR_DIA;
    const peso = Math.pow(0.5, diasTranscurridos / ventanaDecayDias);
    return acumulado + evento.delta * peso;
  }, 0);

  return Math.min(FAIR_PLAY_MAX, Math.max(FAIR_PLAY_MIN, base + sumaPonderada));
}

/**
 * Presuncion en C3 (concepto.md §11): en empate probatorio genuino, si el
 * diferencial de fair-play entre los dos equipos supera el umbral, la
 * disputa se presume contra el de peor historial. Rebatible, y nunca
 * auto-resuelve — es un input mas para la decision del admin.
 */
export function haypresuncion(
  fairPlayA: number,
  fairPlayB: number,
  umbral: number = FAIR_PLAY_UMBRAL_PRESUNCION,
): LadoPresuncion | null {
  const diferencial = fairPlayA - fairPlayB;
  if (Math.abs(diferencial) < umbral) {
    return null;
  }
  return diferencial < 0 ? "A" : "B";
}
