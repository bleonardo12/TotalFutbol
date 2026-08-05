import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
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

export interface VecinoEscalera {
  id: string;
  nombre: string;
  rating: number;
  posicion: number;
  esPropio: boolean;
}

export interface MiEntorno {
  posicion: number;
  total: number;
  /** Hasta 2 arriba y 2 abajo, incluye al propio equipo. */
  vecinos: VecinoEscalera[];
  /** null si el equipo nunca liquido un partido (no deberia pasar si esta RANKEADO). */
  diasInactivo: number | null;
  /** Vecino de arriba con el partido mas reciente -- aproximacion de "quien te paso", no tracking historico real. */
  pasadoPor: { id: string; nombre: string } | null;
  /** Suma de RatingLedger.delta de los ultimos 30 dias. */
  deltaDelMes: number;
}

const TREINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

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

  /**
   * Vecinos de escalera (±2), dias sin jugar, y quien te paso mientras
   * tanto (docs Guapo §5, Inicio §3.1). "Quien te paso" es una
   * aproximacion honesta -- no hay tracking historico de posiciones dia a
   * dia, asi que se toma el vecino de arriba con el partido mas reciente,
   * no el que "efectivamente" cruzo de posicion.
   */
  async miEntorno(teamId: string): Promise<MiEntorno> {
    const equipo = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }
    if (equipo.estado !== "RANKEADO") {
      throw new ConflictException("El equipo todavia no esta rankeado");
    }

    const [posicionIndice, total] = await Promise.all([
      this.prisma.team.count({
        where: { estado: "RANKEADO", categoria: equipo.categoria, rating: { gt: equipo.rating } },
      }),
      this.prisma.team.count({ where: { estado: "RANKEADO", categoria: equipo.categoria } }),
    ]);
    const posicion = posicionIndice + 1;

    const skip = Math.max(0, posicionIndice - 2);
    const equiposVentana = await this.prisma.team.findMany({
      where: { estado: "RANKEADO", categoria: equipo.categoria },
      orderBy: { rating: "desc" },
      skip,
      take: 5,
      select: { id: true, nombre: true, rating: true },
    });
    const vecinos: VecinoEscalera[] = equiposVentana.map((vecino, indice) => ({
      id: vecino.id,
      nombre: vecino.nombre,
      rating: vecino.rating,
      posicion: skip + indice + 1,
      esPropio: vecino.id === teamId,
    }));

    const [ultimoPropio, deltaDelMesResultado] = await Promise.all([
      this.ultimoPartidoLiquidado(teamId),
      this.prisma.ratingLedger.aggregate({
        where: { teamId, createdAt: { gte: new Date(Date.now() - TREINTA_DIAS_MS) } },
        _sum: { delta: true },
      }),
    ]);
    const diasInactivo = ultimoPropio
      ? Math.floor((Date.now() - ultimoPropio.getTime()) / UN_DIA_MS)
      : null;

    let pasadoPor: { id: string; nombre: string } | null = null;
    let mejorFecha: Date | null = null;
    for (const vecino of vecinos.filter((v) => v.posicion < posicion)) {
      const ultimoVecino = await this.ultimoPartidoLiquidado(vecino.id);
      if (!ultimoVecino) {
        continue;
      }
      const pasoAlPropio = !ultimoPropio || ultimoVecino > ultimoPropio;
      if (pasoAlPropio && (!mejorFecha || ultimoVecino > mejorFecha)) {
        mejorFecha = ultimoVecino;
        pasadoPor = { id: vecino.id, nombre: vecino.nombre };
      }
    }

    return {
      posicion,
      total,
      vecinos,
      diasInactivo,
      pasadoPor,
      deltaDelMes: deltaDelMesResultado._sum.delta ?? 0,
    };
  }

  private async ultimoPartidoLiquidado(teamId: string): Promise<Date | null> {
    const partido = await this.prisma.match.findFirst({
      where: {
        estado: "LIQUIDADO",
        OR: [{ equipoLocalId: teamId }, { equipoVisitanteId: teamId }],
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return partido?.updatedAt ?? null;
  }
}
