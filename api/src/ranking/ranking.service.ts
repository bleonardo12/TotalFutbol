import { Injectable } from "@nestjs/common";
import type { CategoriaFutbol, Division } from "@prisma/client";
import { asignarDivision } from "@totalfutbol/core";
import { PrismaService } from "../prisma/prisma.service";

export interface EntradaRanking {
  posicion: number;
  id: string;
  nombre: string;
  rating: number;
  rd: number;
  volatilidad: number;
  division: Division;
}

interface EquipoBase {
  id: string;
  nombre: string;
  rating: number;
  rd: number;
  volatilidad: number;
}

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ranking unico por equipo dentro de su categoria (concepto.md §6, Hito 6c).
   * Masculino/Femenino/Mixto son pools completamente separados: `categoria`
   * es obligatoria, no existe una vista "todas mezcladas" porque falsearia
   * el ranking. Los PROVISIONAL no rankean todavia. `division` es un corte
   * por percentil del ranking de esa categoria, no un dato guardado — se
   * recalcula siempre. Con filtro de division se escanea todo el ranking de
   * la categoria (liviano por ahora, sin optimizar prematuramente); sin
   * filtro, pagina como siempre y calcula la division de cada fila contra
   * el total de la categoria.
   */
  async listar(
    limit: number,
    offset: number,
    categoria: CategoriaFutbol,
    division?: Division,
  ): Promise<EntradaRanking[]> {
    if (division) {
      return this.listarPorDivision(categoria, division);
    }

    const [total, equipos] = await Promise.all([
      this.prisma.team.count({ where: { estado: "RANKEADO", categoria } }),
      this.prisma.team.findMany({
        where: { estado: "RANKEADO", categoria },
        orderBy: { rating: "desc" },
        skip: offset,
        take: limit,
        select: { id: true, nombre: true, rating: true, rd: true, volatilidad: true },
      }),
    ]);

    return Promise.all(
      equipos.map(async (equipo, indice) => {
        const posicion = offset + indice;
        return {
          posicion: posicion + 1,
          ...equipo,
          division: await this.calcularDivision(equipo, posicion, total),
        };
      }),
    );
  }

  /** Division en vivo de un equipo puntual, acotada a su propia categoria; null si todavia es PROVISIONAL. */
  async divisionDe(teamId: string): Promise<Division | null> {
    const equipo = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!equipo || equipo.estado !== "RANKEADO") {
      return null;
    }

    const [posicion, total] = await Promise.all([
      this.prisma.team.count({
        where: { estado: "RANKEADO", categoria: equipo.categoria, rating: { gt: equipo.rating } },
      }),
      this.prisma.team.count({ where: { estado: "RANKEADO", categoria: equipo.categoria } }),
    ]);

    return this.calcularDivision(equipo, posicion, total);
  }

  private async listarPorDivision(
    categoria: CategoriaFutbol,
    division: Division,
  ): Promise<EntradaRanking[]> {
    const equipos = await this.prisma.team.findMany({
      where: { estado: "RANKEADO", categoria },
      orderBy: { rating: "desc" },
      select: { id: true, nombre: true, rating: true, rd: true, volatilidad: true },
    });
    const total = equipos.length;

    const resultado: EntradaRanking[] = [];
    for (let indice = 0; indice < equipos.length; indice++) {
      const equipo = equipos[indice] as EquipoBase;
      const divisionDelEquipo = await this.calcularDivision(equipo, indice, total);
      if (divisionDelEquipo === division) {
        resultado.push({ posicion: indice + 1, ...equipo, division: divisionDelEquipo });
      }
    }
    return resultado;
  }

  /**
   * Solo consulta partidos liquidados cuando el corte por rating ya daria
   * Elite — el bloqueo por confianza (concepto.md §6) no aplica a las
   * demas divisiones, no hace falta la consulta ahi.
   */
  private async calcularDivision(
    equipo: EquipoBase,
    posicion: number,
    total: number,
  ): Promise<Division> {
    const bandaPorRating = asignarDivision(posicion, total, Number.POSITIVE_INFINITY);
    if (bandaPorRating !== "ELITE") {
      return bandaPorRating;
    }
    const partidosLiquidados = await this.contarPartidosLiquidados(equipo.id);
    return asignarDivision(posicion, total, partidosLiquidados);
  }

  private async contarPartidosLiquidados(teamId: string): Promise<number> {
    return this.prisma.match.count({
      where: {
        estado: "LIQUIDADO",
        OR: [{ equipoLocalId: teamId }, { equipoVisitanteId: teamId }],
      },
    });
  }
}
