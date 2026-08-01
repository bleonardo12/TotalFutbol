import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SeasonsService } from "../seasons/seasons.service";

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
    private readonly seasonsService: SeasonsService,
  ) {}

  /**
   * Crea el equipo con el capitan como primer integrante del plantel
   * (progresivo, concepto.md §4), y lo entra a la temporada actual en
   * PROMOCIONAL (Hito 4, concepto.md §6) en la misma transaccion.
   */
  async crear(capitanId: string, nombre: string) {
    return this.prisma.$transaction(async (tx) => {
      const equipo = await tx.team.create({
        data: {
          nombre,
          capitanId,
          integrantes: { create: { userId: capitanId, rol: "CAPITAN" } },
        },
        include: INCLUIR_DETALLE,
      });
      await this.seasonsService.asegurarEntrada(tx, equipo.id);
      return equipo;
    });
  }

  async buscarPorId(id: string) {
    return this.prisma.team.findUnique({
      where: { id },
      include: INCLUIR_DETALLE,
    });
  }

  async buscarMios(usuarioId: string) {
    return this.prisma.team.findMany({
      where: { integrantes: { some: { userId: usuarioId } } },
      include: INCLUIR_DETALLE,
      orderBy: { createdAt: "desc" },
    });
  }
}
