import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface EntradaRanking {
  posicion: number;
  id: string;
  nombre: string;
  rating: number;
  rd: number;
  volatilidad: number;
}

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ranking unico por equipo (concepto.md §6). Los PROVISIONAL no rankean todavia. */
  async listar(limit: number, offset: number): Promise<EntradaRanking[]> {
    const equipos = await this.prisma.team.findMany({
      where: { estado: "RANKEADO" },
      orderBy: { rating: "desc" },
      skip: offset,
      take: limit,
      select: { id: true, nombre: true, rating: true, rd: true, volatilidad: true },
    });

    return equipos.map((equipo, indice) => ({
      posicion: offset + indice + 1,
      ...equipo,
    }));
  }
}
