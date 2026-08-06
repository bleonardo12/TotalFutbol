import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CategoriaFutbol } from "@prisma/client";
import { sonNombresParecidos } from "@totalfutbol/core";
import { PrismaService } from "../prisma/prisma.service";
import { RankingService } from "../ranking/ranking.service";
import { RatingService } from "../rating/rating.service";

const INCLUIR_DETALLE = {
  capitan: { select: { id: true, telefono: true, nombre: true } },
  integrantes: {
    include: { user: { select: { id: true, telefono: true, nombre: true } } },
  },
} as const;

/** Hasta 10 barras en el mini-grafico de forma (docs Guapo §3.1, "TU FORMA"). */
const TOPE_BARRAS_FORMA = 10;

export interface FormaEquipo {
  gEP: { g: number; e: number; p: number };
  /** Upsets / partidos ganados, redondeado. 0 si nunca gano. */
  upsetPorcentaje: number;
  /** MAX(ratingResultante) del ledger, o el rating actual si nunca jugo. */
  pico: number;
  /** Hasta 10 valores normalizados 0-1, en orden cronologico. */
  barras: number[];
}

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
    private readonly ratingService: RatingService,
  ) {}

  /** Crea el equipo con el capitan como primer integrante del plantel (progresivo, concepto.md §4). */
  async crear(capitanId: string, nombre: string, categoria: CategoriaFutbol) {
    await this.verificarNombreDisponible(nombre, categoria);

    const equipo = await this.prisma.team.create({
      data: {
        nombre,
        categoria,
        capitanId,
        integrantes: { create: { userId: capitanId, rol: "CAPITAN" } },
      },
      include: INCLUIR_DETALLE,
    });
    return this.conDivision(equipo);
  }

  async buscarPorId(id: string) {
    const equipo = await this.prisma.team.findUnique({
      where: { id },
      include: INCLUIR_DETALLE,
    });
    return equipo ? this.conDivision(equipo) : null;
  }

  async buscarMios(usuarioId: string) {
    const equipos = await this.prisma.team.findMany({
      where: { integrantes: { some: { userId: usuarioId } } },
      include: INCLUIR_DETALLE,
      orderBy: { createdAt: "desc" },
    });
    return Promise.all(equipos.map((equipo) => this.conDivision(equipo)));
  }

  /** División en vivo (concepto.md §6): corte del ranking global, no un dato guardado. */
  private async conDivision<T extends { id: string }>(equipo: T) {
    const division = await this.rankingService.divisionDe(equipo.id);
    return { ...equipo, division };
  }

  /**
   * G-E-P, % de upsets y pico historico, para "TU FORMA" en Inicio (docs
   * Guapo §3.1, §5). Upset: para cada partido ganado, compara el rating
   * *anterior* propio (ratingResultante - delta en la fila del ledger de
   * ESE partido) contra el del rival en su propia fila del mismo partido
   * -- exacto, no aproximado, ambas filas ya existen por partido liquidado.
   */
  async forma(teamId: string): Promise<FormaEquipo> {
    const equipo = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }

    const partidos = await this.prisma.match.findMany({
      where: {
        estado: "LIQUIDADO",
        OR: [{ equipoLocalId: teamId }, { equipoVisitanteId: teamId }],
      },
      select: { id: true, equipoLocalId: true, equipoVisitanteId: true, outcomeFinal: true },
    });

    let g = 0;
    let e = 0;
    let p = 0;
    const idsGanados: string[] = [];
    for (const partido of partidos) {
      const esLocal = partido.equipoLocalId === teamId;
      if (partido.outcomeFinal === "EMPATE") {
        e += 1;
      } else if (
        (esLocal && partido.outcomeFinal === "GANA_LOCAL") ||
        (!esLocal && partido.outcomeFinal === "GANA_VISITANTE")
      ) {
        g += 1;
        idsGanados.push(partido.id);
      } else {
        p += 1;
      }
    }

    let upsets = 0;
    if (idsGanados.length > 0) {
      const asientos = await this.prisma.ratingLedger.findMany({
        where: { matchId: { in: idsGanados } },
        select: { matchId: true, teamId: true, delta: true, ratingResultante: true },
      });
      const porPartido = new Map<string, typeof asientos>();
      for (const asiento of asientos) {
        const lista = porPartido.get(asiento.matchId) ?? [];
        lista.push(asiento);
        porPartido.set(asiento.matchId, lista);
      }
      for (const lista of porPartido.values()) {
        const propio = lista.find((a) => a.teamId === teamId);
        const rival = lista.find((a) => a.teamId !== teamId);
        if (!propio || !rival) {
          continue;
        }
        const anteriorPropio = propio.ratingResultante - propio.delta;
        const anteriorRival = rival.ratingResultante - rival.delta;
        if (anteriorRival > anteriorPropio) {
          upsets += 1;
        }
      }
    }
    const upsetPorcentaje = g > 0 ? Math.round((upsets / g) * 100) : 0;

    const [picoResultado, ultimosAsientos] = await Promise.all([
      this.prisma.ratingLedger.aggregate({ where: { teamId }, _max: { ratingResultante: true } }),
      this.prisma.ratingLedger.findMany({
        where: { teamId },
        orderBy: { createdAt: "desc" },
        take: TOPE_BARRAS_FORMA,
        select: { ratingResultante: true },
      }),
    ]);
    const pico = picoResultado._max.ratingResultante ?? equipo.rating;
    const cronologico = ultimosAsientos.reverse();
    const minEnBarras = cronologico.length > 0 ? Math.min(...cronologico.map((a) => a.ratingResultante)) : 0;
    const rango = pico - minEnBarras;
    const barras = cronologico.map((a) =>
      rango > 0 ? (a.ratingResultante - minEnBarras) / rango : 1,
    );

    return { gEP: { g, e, p }, upsetPorcentaje, pico, barras };
  }

  /**
   * Deltas proyectados de un desafio hipotetico entre `teamId` y `rivalId`,
   * antes de que el desafio exista (docs Guapo §3.3, tarjeta de Proponer
   * desafio: "Si ganas +X / Si perdes Y"). Mismo patron que
   * `ChallengesService.misDesafios` y `MatchesService.buscarPorId`, con el
   * rating actual de ambos equipos -- sin persistir nada.
   */
  async proyectarDesafio(teamId: string, rivalId: string): Promise<{ siGano: number; siPierdo: number }> {
    const [equipo, rival] = await Promise.all([
      this.prisma.team.findUnique({ where: { id: teamId } }),
      this.prisma.team.findUnique({ where: { id: rivalId } }),
    ]);
    if (!equipo || !rival) {
      throw new NotFoundException("Equipo no encontrado");
    }

    const siGano = this.ratingService.proyectar(equipo, rival, "GANA_LOCAL");
    const siPierdo = this.ratingService.proyectar(equipo, rival, "GANA_VISITANTE");
    return { siGano: siGano.local, siPierdo: siPierdo.local };
  }

  /**
   * Anti-impersonacion (Hito 6c): nombres casi-identicos dentro de la misma
   * categoria quedan bloqueados (concepto.md §16, "Barcelona" vs "Barzelona"
   * vs "Barce"). Acotado a la categoria porque son pools de ranking
   * separados -- el mismo nombre en categorias distintas no genera
   * confusion real (nunca aparecen juntos en un ranking ni se pueden
   * desafiar entre si).
   */
  private async verificarNombreDisponible(
    nombre: string,
    categoria: CategoriaFutbol,
  ): Promise<void> {
    const existentes = await this.prisma.team.findMany({
      where: { categoria },
      select: { nombre: true },
    });
    const parecido = existentes.find((equipo) => sonNombresParecidos(equipo.nombre, nombre));
    if (parecido) {
      throw new ConflictException(
        `Ya existe un equipo con un nombre muy parecido en esta categoria: "${parecido.nombre}"`,
      );
    }
  }
}
