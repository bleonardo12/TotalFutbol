import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma, type Season } from "@prisma/client";
import { ORDEN_DIVISIONES } from "@totalfutbol/core";
import { PrismaService } from "../prisma/prisma.service";
import { RankingService } from "../ranking/ranking.service";

@Injectable()
export class SeasonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
  ) {}

  /**
   * Temporada = año calendario (concepto.md §6). No hace falta que un admin
   * "abra" la temporada a mano: se crea sola, lazy, la primera vez que se
   * necesita. `cliente` puede ser el PrismaService normal o un
   * Prisma.TransactionClient si quien llama ya esta dentro de una
   * transaccion.
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
   * Cierre de temporada (concepto.md §6): NO reasigna nada -- la division
   * de cada equipo siempre fue en vivo. Solo registra en el palmares quien
   * es el n°1 de cada division hoy (Campeonato), con el de Elite marcado
   * como campeon del año. Irreversible: no se puede cerrar dos veces la
   * misma temporada.
   */
  async cerrar(): Promise<Season> {
    const season = await this.obtenerOCrearActual();
    if (season.cerrada) {
      throw new ConflictException("Esta temporada ya esta cerrada");
    }

    return this.prisma.$transaction(async (tx) => {
      for (const division of ORDEN_DIVISIONES) {
        const tabla = await this.rankingService.listar(1, 0, division);
        const campeon = tabla[0];
        if (!campeon) {
          continue;
        }
        await tx.campeonato.create({
          data: {
            seasonId: season.id,
            division,
            teamId: campeon.id,
            esCampeonDelAnio: division === "ELITE",
          },
        });
      }

      return tx.season.update({
        where: { id: season.id },
        data: { cerrada: true, cerradaEn: new Date() },
      });
    });
  }
}
