import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  type CapaDisputa,
  type Dispute,
  type OutcomePartido,
  Prisma,
  type RespuestaPoll,
  type User,
} from "@prisma/client";
import { transicionar } from "@totalfutbol/core";
import type { Queue } from "bullmq";
import { randomInt } from "node:crypto";
import { VENTANA_DISPUTA_HORAS } from "../matches/matches.constantes";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import {
  COLA_VENCIMIENTO_DISPUTA,
  EVIDENCIA_MIME_PERMITIDOS,
  NONCE_ALFABETO,
  NONCE_LONGITUD,
} from "./disputes.constantes";

interface ArchivoEvidencia {
  buffer: Buffer;
  mimetype: string;
}

interface DatosVencimientoCapa {
  disputeId: string;
  capaEsperada: CapaDisputa;
  /** Ausente en el job de C3: vencer ahi no avanza de capa, fuerza VOID. */
  siguienteCapa?: CapaDisputa;
}

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @InjectQueue(COLA_VENCIMIENTO_DISPUTA) private readonly colaVencimiento: Queue,
  ) {}

  /**
   * Abre la disputa cuando el segundo reporte discrepa del primero
   * (concepto.md §10, Capa C). Corre dentro de la misma transaccion que
   * el reporte que la dispara — quien llama es responsable de la
   * transicion de estado del Match (EN_DISPUTA) y de programar el
   * vencimiento de la capa C1 despues de que la transaccion cierre
   * (programarVencimientoCapa, fuera de la tx).
   */
  async abrir(tx: Prisma.TransactionClient, matchId: string): Promise<Dispute> {
    for (let intento = 0; intento < 5; intento++) {
      const nonce = this.generarNonce();
      try {
        return await tx.dispute.create({
          data: {
            matchId,
            capa: "C1_EVIDENCIA",
            nonce,
            capaExpiraEn: new Date(Date.now() + VENTANA_DISPUTA_HORAS * 60 * 60 * 1000),
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue; // colision de nonce (muy improbable): reintenta con uno nuevo
        }
        throw error;
      }
    }

    throw new Error("No se pudo generar un nonce de disputa unico");
  }

  /**
   * Encola el vencimiento de una capa. Se llama fuera de cualquier
   * transaccion Postgres. Sin `siguienteCapa` (caso C3_ADMIN) el job
   * fuerza VOID en vez de avanzar de capa.
   */
  async programarVencimientoCapa(
    disputeId: string,
    capaEsperada: CapaDisputa,
    siguienteCapa: CapaDisputa | undefined,
  ): Promise<void> {
    await this.colaVencimiento.add(
      "vencimiento-capa",
      { disputeId, capaEsperada, siguienteCapa } satisfies DatosVencimientoCapa,
      {
        delay: VENTANA_DISPUTA_HORAS * 60 * 60 * 1000,
        jobId: `${disputeId}-${capaEsperada}`,
      },
    );
  }

  /**
   * Handler del job de vencimiento (concepto.md §10: "cada capa con
   * reloj"). Si la disputa sigue en `capaEsperada` (nadie la resolvio ni
   * avanzo por otro lado), la mueve a `siguienteCapa` y reinicia el
   * vencimiento. Idempotente: si ya se resolvio o ya avanzo, no hace nada.
   *
   * Al llegar a una nueva capa por vencimiento, encadena el proximo
   * vencimiento: C1->C2 encadena C2->C3, y C2->C3 encadena el vencimiento
   * terminal de C3 (forzarVoidSiVence, sin `siguienteCapa` propio porque
   * no avanza de capa sino que fuerza VOID).
   */
  async avanzarCapaSiVence(
    disputeId: string,
    capaEsperada: CapaDisputa,
    siguienteCapa: CapaDisputa,
  ): Promise<void> {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute || dispute.resuelta || dispute.capa !== capaEsperada) {
      return;
    }

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        capa: siguienteCapa,
        capaExpiraEn: new Date(Date.now() + VENTANA_DISPUTA_HORAS * 60 * 60 * 1000),
      },
    });

    if (siguienteCapa === "C2_PLANTELES") {
      await this.programarVencimientoCapa(disputeId, "C2_PLANTELES", "C3_ADMIN");
    } else if (siguienteCapa === "C3_ADMIN") {
      await this.programarVencimientoCapa(disputeId, "C3_ADMIN", undefined);
    }
  }

  /**
   * Vencimiento terminal de C3 (concepto.md §10: "void si es
   * indeterminable"). Si nadie resolvio la disputa (ni el admin ni otro
   * camino) dentro de la ventana de C3, el partido queda VOID sin mover
   * el rating — igual que si el admin la hubiera anulado a mano
   * (MatchesService.resolverDisputa sin `resolucion`), salvo que aca
   * `resueltaPorId` queda null: nadie la resolvio, se vencio sola.
   * Idempotente, mismo criterio que avanzarCapaSiVence.
   */
  async forzarVoidSiVence(disputeId: string, capaEsperada: CapaDisputa): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.findUnique({ where: { id: disputeId } });
      if (!dispute || dispute.resuelta || dispute.capa !== capaEsperada) {
        return;
      }

      const match = await tx.match.findUnique({ where: { id: dispute.matchId } });
      if (!match || match.estado !== "EN_DISPUTA") {
        return;
      }

      const estadoVoid = transicionar("EN_DISPUTA", "VOID");

      await tx.match.update({ where: { id: match.id }, data: { estado: estadoVoid } });
      await tx.dispute.update({
        where: { id: disputeId },
        data: { resuelta: true, anulada: true, resueltaEn: new Date() },
      });
    });
  }

  /**
   * El admin ve todo, incluidas las respuestas del poll de plantel (C2).
   * Los equipos involucrados ven la disputa (evidencia de ambos lados
   * incluida) pero no las respuestas del poll — no es una votacion
   * publica, es señal para el admin (concepto.md §10).
   */
  async obtenerPorMatchId(matchId: string, usuario: User) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { equipoLocalId: true, equipoVisitanteId: true },
    });
    if (!match) {
      throw new NotFoundException("Partido no encontrado");
    }

    if (!(await this.puedeVer(usuario, match))) {
      throw new ForbiddenException("No podes ver esta disputa");
    }

    const dispute = await this.prisma.dispute.findUnique({
      where: { matchId },
      include: {
        evidencias: {
          include: {
            team: { select: { id: true, nombre: true } },
            subidoPor: { select: { id: true, telefono: true, nombre: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        resueltaPor: { select: { id: true, telefono: true, nombre: true } },
        respuestasPlantel:
          usuario.rol === "ADMIN"
            ? {
                include: {
                  integrante: { select: { id: true, telefono: true, nombre: true } },
                  team: { select: { id: true, nombre: true } },
                },
              }
            : false,
      },
    });

    if (!dispute) {
      throw new NotFoundException("Este partido no tiene una disputa abierta");
    }

    return dispute;
  }

  /**
   * C1 (concepto.md §9-10): foto con el nonce de la disputa visible.
   * Cualquier integrante de alguno de los dos equipos puede subir
   * evidencia — queda asociada a SU equipo, no al usuario en abstracto.
   */
  async subirEvidencia(
    matchId: string,
    usuario: User,
    archivo: ArchivoEvidencia | undefined,
    descripcion: string | undefined,
  ) {
    if (!archivo) {
      throw new BadRequestException("Falta el archivo de evidencia");
    }
    if (!EVIDENCIA_MIME_PERMITIDOS.includes(archivo.mimetype)) {
      throw new BadRequestException("Formato de imagen no soportado (usa jpg, png o webp)");
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { equipoLocalId: true, equipoVisitanteId: true },
    });
    if (!match) {
      throw new NotFoundException("Partido no encontrado");
    }

    const teamId = await this.equipoDelUsuario(usuario.id, match);
    if (!teamId) {
      throw new ForbiddenException("No sos integrante de ninguno de los dos equipos");
    }

    const dispute = await this.prisma.dispute.findUnique({ where: { matchId } });
    if (!dispute) {
      throw new NotFoundException("Este partido no tiene una disputa abierta");
    }
    if (dispute.resuelta) {
      throw new ConflictException("La disputa ya esta resuelta");
    }

    const url = await this.storageService.subir(archivo);

    return this.prisma.disputeEvidence.create({
      data: {
        disputeId: dispute.id,
        teamId,
        subidoPorId: usuario.id,
        url,
        descripcion,
      },
      include: {
        team: { select: { id: true, nombre: true } },
        subidoPor: { select: { id: true, telefono: true, nombre: true } },
      },
    });
  }

  /**
   * C3 (concepto.md §10): el admin decide, dentro de la misma transaccion
   * que la transicion de estado del Match (responsabilidad del llamador,
   * igual que en abrir()). Si `resolucion` viene indefinida, la disputa
   * se anula por indeterminable (VOID) — el admin no tiene por que poder
   * reconstruir la verdad siempre.
   */
  async resolver(
    tx: Prisma.TransactionClient,
    matchId: string,
    usuarioId: string,
    resolucion: OutcomePartido | undefined,
  ): Promise<Dispute> {
    const dispute = await tx.dispute.findUnique({ where: { matchId } });
    if (!dispute) {
      throw new NotFoundException("Este partido no tiene una disputa abierta");
    }
    if (dispute.resuelta) {
      throw new ConflictException("La disputa ya esta resuelta");
    }

    return tx.dispute.update({
      where: { id: dispute.id },
      data: {
        resuelta: true,
        resolucion: resolucion ?? null,
        anulada: !resolucion,
        resueltaPorId: usuarioId,
        resueltaEn: new Date(),
      },
    });
  }

  /**
   * C2 (concepto.md §9-10): cada integrante del plantel de ambos equipos
   * puede decir si confirma o contradice lo que reporto el capitan de SU
   * equipo. No es una votacion vinculante ni publica — es señal por
   * agregado para el admin (C3). Un integrante puede cambiar su respuesta
   * mientras la disputa siga abierta (upsert).
   */
  async responderPoll(
    matchId: string,
    usuario: User,
    dto: { respuesta: RespuestaPoll; comentario?: string },
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { equipoLocalId: true, equipoVisitanteId: true },
    });
    if (!match) {
      throw new NotFoundException("Partido no encontrado");
    }

    const teamId = await this.equipoDelUsuario(usuario.id, match);
    if (!teamId) {
      throw new ForbiddenException("No sos integrante de ninguno de los dos equipos");
    }

    const dispute = await this.prisma.dispute.findUnique({ where: { matchId } });
    if (!dispute) {
      throw new NotFoundException("Este partido no tiene una disputa abierta");
    }
    if (dispute.resuelta) {
      throw new ConflictException("La disputa ya esta resuelta");
    }

    return this.prisma.disputePollRespuesta.upsert({
      where: { disputeId_integranteId: { disputeId: dispute.id, integranteId: usuario.id } },
      create: {
        disputeId: dispute.id,
        teamId,
        integranteId: usuario.id,
        respuesta: dto.respuesta,
        comentario: dto.comentario,
      },
      update: {
        respuesta: dto.respuesta,
        comentario: dto.comentario,
      },
      include: {
        team: { select: { id: true, nombre: true } },
        integrante: { select: { id: true, telefono: true, nombre: true } },
      },
    });
  }

  private async puedeVer(
    usuario: User,
    match: { equipoLocalId: string; equipoVisitanteId: string },
  ): Promise<boolean> {
    if (usuario.rol === "ADMIN") {
      return true;
    }
    const esIntegrante = await this.prisma.teamMember.findFirst({
      where: { userId: usuario.id, teamId: { in: [match.equipoLocalId, match.equipoVisitanteId] } },
    });
    return esIntegrante !== null;
  }

  private async equipoDelUsuario(
    usuarioId: string,
    match: { equipoLocalId: string; equipoVisitanteId: string },
  ): Promise<string | null> {
    const integrante = await this.prisma.teamMember.findFirst({
      where: { userId: usuarioId, teamId: { in: [match.equipoLocalId, match.equipoVisitanteId] } },
      select: { teamId: true },
    });
    return integrante?.teamId ?? null;
  }

  private generarNonce(): string {
    let nonce = "";
    for (let i = 0; i < NONCE_LONGITUD; i++) {
      nonce += NONCE_ALFABETO[randomInt(NONCE_ALFABETO.length)];
    }
    return nonce;
  }
}
