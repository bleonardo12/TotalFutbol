import { Injectable } from "@nestjs/common";
import { type Division, Prisma, type Season } from "@prisma/client";
import { calcularTabla, type PartidoDeTemporada } from "@totalfutbol/core";
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

  /**
   * Tabla de posiciones de una division dentro de una temporada
   * (concepto.md §6). Se calcula on-the-fly desde los partidos LIQUIDADO
   * de la temporada — no hay una tabla de puntos materializada. Incluye a
   * todos los equipos de la division aunque no hayan jugado (0 puntos: "si
   * no competis, no puntuas y descendes"). Desempate por rating perpetuo
   * (el marcador no es fuente de verdad confiable, concepto.md §6:
   * outcome-only).
   */
  async obtenerTabla(seasonId: string, division: Division) {
    const season = await this.prisma.season.findUniqueOrThrow({ where: { id: seasonId } });
    const entradas = await this.prisma.seasonEntry.findMany({
      where: { seasonId, division },
      include: { team: { select: { id: true, nombre: true, rating: true } } },
    });

    const teamIds = entradas.map((entrada) => entrada.teamId);
    const resultados = await this.calcularResultados(this.prisma, season, teamIds);
    const filasPorEquipo = new Map(calcularTabla(resultados).map((fila) => [fila.equipoId, fila]));

    return entradas
      .map((entrada) => {
        const fila = filasPorEquipo.get(entrada.teamId) ?? {
          equipoId: entrada.teamId,
          pj: 0,
          pg: 0,
          pe: 0,
          pp: 0,
          puntos: 0,
        };
        return { ...fila, nombre: entrada.team.nombre, rating: entrada.team.rating };
      })
      .sort((a, b) => b.puntos - a.puntos || b.rating - a.rating);
  }

  /**
   * Resultados G/E/P de cada equipo de `teamIds` en sus partidos LIQUIDADO
   * dentro del rango de fechas de la temporada, sin importar la division
   * del rival (jugar cruzado no está restringido, concepto.md §6).
   */
  private async calcularResultados(
    cliente: Prisma.TransactionClient,
    season: Season,
    teamIds: string[],
  ): Promise<PartidoDeTemporada[]> {
    if (teamIds.length === 0) {
      return [];
    }

    const partidos = await cliente.match.findMany({
      where: {
        estado: "LIQUIDADO",
        createdAt: { gte: season.fechaInicio, lte: season.fechaFin },
        OR: [{ equipoLocalId: { in: teamIds } }, { equipoVisitanteId: { in: teamIds } }],
      },
      select: { equipoLocalId: true, equipoVisitanteId: true, outcomeFinal: true },
    });

    const idsSet = new Set(teamIds);
    const resultados: PartidoDeTemporada[] = [];

    for (const partido of partidos) {
      if (!partido.outcomeFinal) {
        continue;
      }
      if (idsSet.has(partido.equipoLocalId)) {
        resultados.push({
          equipoId: partido.equipoLocalId,
          resultado:
            partido.outcomeFinal === "GANA_LOCAL"
              ? "G"
              : partido.outcomeFinal === "EMPATE"
                ? "E"
                : "P",
        });
      }
      if (idsSet.has(partido.equipoVisitanteId)) {
        resultados.push({
          equipoId: partido.equipoVisitanteId,
          resultado:
            partido.outcomeFinal === "GANA_VISITANTE"
              ? "G"
              : partido.outcomeFinal === "EMPATE"
                ? "E"
                : "P",
        });
      }
    }

    return resultados;
  }
}
