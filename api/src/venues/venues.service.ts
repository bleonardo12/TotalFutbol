import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { ActualizarVenueDto } from "./dto/actualizar-venue.dto";
import type { CrearVenueDto } from "./dto/crear-venue.dto";

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearVenueDto) {
    return this.prisma.venue.create({ data: dto });
  }

  async listar() {
    return this.prisma.venue.findMany({ orderBy: { nombre: "asc" } });
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
