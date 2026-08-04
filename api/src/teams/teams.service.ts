import { ConflictException, Injectable } from "@nestjs/common";
import type { CategoriaFutbol } from "@prisma/client";
import { sonNombresParecidos } from "@totalfutbol/core";
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
