import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { ActualizarVenueDto } from "./dto/actualizar-venue.dto";
import type { CrearVenueDto } from "./dto/crear-venue.dto";

const RADIO_TIERRA_KM = 6371;
const RADIO_CERCANAS_KM_DEFAULT = 1.5;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/** Distancia entre dos puntos geograficos (formula del haversine), en km. */
function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = aRadianes(lat2 - lat1);
  const dLng = aRadianes(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.sin(dLng / 2) ** 2;
  return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearVenueDto) {
    return this.prisma.venue.create({ data: dto });
  }

  async listar() {
    return this.prisma.venue.findMany({ orderBy: { nombre: "asc" } });
  }

  /**
   * Canchas dentro de `radioKm` de un punto, ordenadas por distancia ascendente
   * (docs Guapo §3.2: tarjeta de "cancha detectada" en Generar codigo). La tabla
   * es chica -- se calcula la distancia en memoria (haversine) en vez de PostGIS.
   */
  async cercanas(lat: number, lng: number, radioKm: number = RADIO_CERCANAS_KM_DEFAULT) {
    const todas = await this.prisma.venue.findMany();
    return todas
      .map((venue) => ({ ...venue, distanciaKm: distanciaKm(lat, lng, venue.lat, venue.lng) }))
      .filter((venue) => venue.distanciaKm <= radioKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm);
  }

  async buscarPorId(id: string) {
    return this.prisma.venue.findUnique({ where: { id } });
  }

  async actualizar(id: string, dto: ActualizarVenueDto) {
    try {
      return await this.prisma.venue.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Cancha no encontrada");
      }
      throw error;
    }
  }

  async eliminar(id: string): Promise<void> {
    try {
      await this.prisma.venue.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new NotFoundException("Cancha no encontrada");
        }
        if (error.code === "P2003") {
          throw new ConflictException(
            "No se puede borrar: hay desafios o partidos que usan esta cancha",
          );
        }
      }
      throw error;
    }
  }
}
