import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RankingService } from "../ranking/ranking.service";

const INCLUIR_DETALLE = {
  capitan: { select: { id: true, telefono: true, nombre: true } },
  integrantes: {
    include: { user: { select: { id: true, telefono: true, nombre: true } } },
  },
} as const;

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
  ) {}

  /** Crea el equipo con el capitan como primer integrante del plantel (progresivo, concepto.md §4). */
  async crear(capitanId: string, nombre: string) {
    const equipo = await this.prisma.team.create({
      data: {
        nombre,
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
}
