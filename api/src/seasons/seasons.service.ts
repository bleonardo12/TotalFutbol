import { Injectable } from "@nestjs/common";
import { Prisma, type Season } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Temporada = año calendario (concepto.md §6). No hace falta que un admin
   * "abra" la temporada a mano: se crea sola, lazy, la primera vez que se
   * necesita. `cliente` puede ser el PrismaService normal o un
   * Prisma.TransactionClient si quien llama ya esta dentro de una
   * transaccion (ej. asegurarEntrada).
   */
  async obtenerOCrearActual(cliente: Prisma.TransactionClient = this.prisma): Promise<Season> {
    const ahora = new Date();

    const existente = await cliente.season.findFirst({
      where: { fechaInicio: { lte: ahora }, fechaFin: { gte: ahora } },
    });
    if (existente) {
      return existente;
    }

    const anio = ahora.getUTCFullYear();
    try {
      return await cliente.season.create({
        data: {
          anio,
          fechaInicio: new Date(Date.UTC(anio, 0, 1)),
          fechaFin: new Date(Date.UTC(anio, 11, 31, 23, 59, 59, 999)),
        },
      });
    } catch (error) {
      // Carrera entre dos requests creando la misma temporada a la vez
      // (unique en `anio`): quien perdio simplemente la relee.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return cliente.season.findUniqueOrThrow({ where: { anio } });
      }
      throw error;
    }
  }

  /**
   * Un equipo nuevo siempre entra a su primera temporada en PROMOCIONAL —
   * no hay "temporada anterior" de la que promover (decision confirmada:
   * sin datos reales todavia para calibrar un reparto por percentil).
   * Debe correr dentro de la misma transaccion que crea el equipo.
   */
  async asegurarEntrada(tx: Prisma.TransactionClient, teamId: string): Promise<void> {
    const season = await this.obtenerOCrearActual(tx);

    const existente = await tx.seasonEntry.findUnique({
      where: { seasonId_teamId: { seasonId: season.id, teamId } },
    });
    if (existente) {
      return;
    }

    await tx.seasonEntry.create({
      data: { seasonId: season.id, teamId, division: "PROMOCIONAL" },
    });
  }
}
