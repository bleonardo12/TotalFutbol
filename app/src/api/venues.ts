import { apiRequest } from "./client";

export interface Venue {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  verificada: boolean;
}

export interface VenueCercana extends Venue {
  distanciaKm: number;
}

/** Todas las canchas, orden alfabetico -- lista completa para el picker "Cambiar" de Generar codigo. */
export function obtenerVenues(): Promise<Venue[]> {
  return apiRequest("/venues");
}

/** Canchas dentro de `radioKm` (default 1.5, el mismo que el backend) de un punto, por distancia. */
export function obtenerVenuesCercanas(
  lat: number,
  lng: number,
  radioKm?: number,
): Promise<VenueCercana[]> {
  const query = radioKm ? `&radioKm=${radioKm}` : "";
  return apiRequest(`/venues/cercanas?lat=${lat}&lng=${lng}${query}`);
}

/** Autoservicio: cualquier usuario autenticado puede cargar una cancha que no estaba en la lista. */
export function crearVenue(token: string, nombre: string, lat: number, lng: number): Promise<Venue> {
  return apiRequest("/venues", { method: "POST", token, body: { nombre, lat, lng } });
}
