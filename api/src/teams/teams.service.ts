import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const INCLUIR_DETALLE = {
  capitan: { select: { id: true, telefono: true, nombre: true } },
  integrantes: {
    include: { user: { select: { id: true, telefono: true, nombre: true } } },
  },
} as const;

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Crea el equipo con el capitan como primer integrante del plantel (progresivo, concepto.md §4). */
  async crear(capitanId: string, nombre: string) {
    return this.prisma.team.create({
      data: {
        nombre,
        capitanId,
        integrantes: { create: { userId: capitanId, rol: "CAPITAN" } },
      },
      include: INCLUIR_DETALLE,
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
