import { InjectQueue } from "@nestjs/bullmq";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { type Challenge, type EstadoPartido, OutcomePartido, Prisma, type User } from "@prisma/client";
import { esEstadoInicialValido, FAIR_PLAY_DELTA, transicionar } from "@totalfutbol/core";
import type { Queue } from "bullmq";
import { randomInt } from "node:crypto";
import { DisputesService } from "../disputes/disputes.service";
import { FairPlayService } from "../fair-play/fair-play.service";
import { PrismaService } from "../prisma/prisma.service";
import { RatingService } from "../rating/rating.service";
import { ConfirmarFirmaDto } from "./dto/confirmar-firma.dto";
import { ConsumirHandshakeDto } from "./dto/consumir-handshake.dto";
import { GenerarHandshakeDto } from "./dto/generar-handshake.dto";
import { ReportarResultadoDto } from "./dto/reportar-resultado.dto";
import { ResolverDisputaDto } from "./dto/resolver-disputa.dto";
import {
  COLA_VENCIMIENTO_NO_SHOW,
  COLA_VENCIMIENTO_REPORTE,
  HANDSHAKE_ALFABETO,
  HANDSHAKE_CODIGO_LONGITUD,
  HANDSHAKE_TTL_MINUTOS,
  VENTANA_DESISTIMIENTO_HORAS,
  VENTANA_DISPUTA_HORAS,
} from "./matches.constantes";

export interface MatchProyeccion {
  siGanaLocal: { local: number; visitante: number };
  siGanaVisitante: { local: number; visitante: number };
  siEmpate: { local: number; visitante: number };
}

export interface MatchDeltas {
  local: number;
  visitante: number;
}

const INCLUIR_DETALLE = {
  equipoLocal: { select: { id: true, nombre: true, fairPlay: true } },
  equipoVisitante: { select: { id: true, nombre: true, fairPlay: true } },
  sede: true,
  reporterLocal: { select: { id: true, telefono: true, nombre: true } },
  reporterVisitante: { select: { id: true, telefono: true, nombre: true } },
} as const;

const INCLUIR_DETALLE_CON_RATING = {
  equipoLocal: {
    select: { id: true, nombre: true, fairPlay: true, rating: true, rd: true, volatilidad: true },
  },
  equipoVisitante: {
    select: { id: true, nombre: true, fairPlay: true, rating: true, rd: true, volatilidad: true },
  },
  sede: true,
  reporterLocal: { select: { id: true, telefono: true, nombre: true } },
  reporterVisitante: { select: { id: true, telefono: true, nombre: true } },
  reportes: true,
} as const;

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ratingService: RatingService,
    private readonly disputesService: DisputesService,
    private readonly fairPlayService: FairPlayService,
    @InjectQueue(COLA_VENCIMIENTO_REPORTE) private readonly colaVencimiento: Queue,
    @InjectQueue(COLA_VENCIMIENTO_NO_SHOW) private readonly colaVencimientoNoShow: Queue,
  ) {}

  async generar(
    usuarioId: string,
    dto: GenerarHandshakeDto,
  ): Promise<{ codigo: string; expiraEn: Date }> {
    await this.verificarPertenencia(usuarioId, dto.equipoLocalId);

    const expiraEn = new Date(Date.now() + HANDSHAKE_TTL_MINUTOS * 60_000);

    for (let intento = 0; intento < 5; intento++) {
      const codigo = this.generarCodigo();
      try {
        const handshake = await this.prisma.matchHandshake.create({
          data: {
            codigo,
            equipoLocalId: dto.equipoLocalId,
            generadoPorId: usuarioId,
            cantidadJugadores: dto.cantidadJugadores,
            superficie: dto.superficie,
            sedeId: dto.sedeId,
            expiraEn,
          },
        });
        return { codigo: handshake.codigo, expiraEn: handshake.expiraEn };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue; // colision de codigo (muy improbable): reintenta con uno nuevo
        }
        throw error;
      }
    }

    throw new Error("No se pudo generar un codigo de partido unico");
  }

  async consumir(usuarioId: string, dto: ConsumirHandshakeDto) {
    const handshake = await this.prisma.matchHandshake.findFirst({
      where: { codigo: dto.codigo, consumidoEn: null, expiraEn: { gt: new Date() } },
    });

    if (!handshake) {
      throw new NotFoundException("Codigo invalido, vencido o ya usado");
    }

    if (handshake.equipoLocalId === dto.equipoVisitanteId) {
      throw new ConflictException("Un equipo no puede jugar contra si mismo");
    }

    await this.verificarPertenencia(usuarioId, dto.equipoVisitanteId);

    // Marca de consumo atomica: si otro request ya lo uso en el medio, count da 0.
    const marcado = await this.prisma.matchHandshake.updateMany({
      where: { id: handshake.id, consumidoEn: null },
      data: { consumidoEn: new Date() },
    });
    if (marcado.count === 0) {
      throw new ConflictException("El codigo ya fue usado");
    }

    if (!esEstadoInicialValido("FIRMADO")) {
      throw new Error("FIRMADO dejo de ser un estado inicial valido");
    }
    const estadoDeArranque = transicionar("FIRMADO", "EN_JUEGO");

    return this.prisma.match.create({
      data: {
        equipoLocalId: handshake.equipoLocalId,
        equipoVisitanteId: dto.equipoVisitanteId,
        cantidadJugadores: handshake.cantidadJugadores,
        superficie: handshake.superficie,
        sedeId: handshake.sedeId,
        codigoHandshake: handshake.codigo,
        estado: estadoDeArranque,
        reporterLocalId: handshake.generadoPorId,
        reporterVisitanteId: usuarioId,
      },
      include: INCLUIR_DETALLE,
    });
  }

  /**
   * Nace un Match en PACTADO a partir de un Challenge recien ACEPTADO
   * (Hito 5a, concepto.md §2 Etapa 2). Sin codigoHandshake ni reporters
   * todavia -- eso recien se fija al firmar en cancha (generarCodigoFirma/
   * confirmarFirma), porque el contrato vinculante se firma SOLO por QR en
   * persona (CLAUDE.md), nunca a distancia por mas que ya se haya pactado.
   */
  async crearDesdeChallenge(tx: Prisma.TransactionClient, challenge: Challenge) {
    const estadoDeArranque = esEstadoInicialValido("PACTADO") ? "PACTADO" : undefined;
    if (!estadoDeArranque) {
      throw new Error("PACTADO dejo de ser un estado inicial valido");
    }

    return tx.match.create({
      data: {
        challengeId: challenge.id,
        equipoLocalId: challenge.desafianteId,
        equipoVisitanteId: challenge.desafiadoId,
        cantidadJugadores: challenge.cantidadJugadores,
        superficie: challenge.superficie,
        sedeId: challenge.sedeId,
        estado: estadoDeArranque,
      },
      include: INCLUIR_DETALLE,
    });
  }

  /**
   * Desistimiento de un pacto a distancia (concepto.md §8/§12): dentro de
   * VENTANA_DESISTIMIENTO_HORAS desde que se creo el Match (Challenge
   * aceptado), cualquiera de los dos equipos se puede bajar. Nunca produce
   * resultado de rating -- VOID directo. Cuenta para la cuota mensual de
   * bajas junto con los rechazos de desafio (FairPlayService.
   * registrarDeclinacionSiCorresponde) -- sin esto, aceptar y desistir
   * gratis seria un atajo para esquivar la penalidad de rechazar
   * directamente.
   */
  async desistir(usuarioId: string, matchId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) {
        throw new NotFoundException("Partido no encontrado");
      }
      if (match.estado !== "PACTADO") {
        throw new ConflictException("Este partido no esta en un pacto pendiente de firmar");
      }
      const lado = await this.ladoDelUsuario(usuarioId, match);
      if (!lado) {
        throw new ForbiddenException("No sos integrante de ninguno de los dos equipos");
      }

      const limite = new Date(
        match.createdAt.getTime() + VENTANA_DESISTIMIENTO_HORAS * 60 * 60 * 1000,
      );
      if (new Date() > limite) {
        throw new ConflictException("La ventana de desistimiento gratuito ya paso");
      }

      const equipoQueDesiste = lado === "LOCAL" ? match.equipoLocalId : match.equipoVisitanteId;
      const estadoVoid = transicionar("PACTADO", "VOID");
      await tx.match.update({ where: { id: matchId }, data: { estado: estadoVoid } });
      await this.fairPlayService.registrarDeclinacionSiCorresponde(
        tx,
        equipoQueDesiste,
        "DESISTIMIENTO",
        { matchId },
      );
    });
  }

  /**
   * Firmar en cancha un partido pactado a distancia (concepto.md §8,
   * CLAUDE.md: "el contrato vinculante se firma SOLO por QR en persona").
   * Un capitan abre esta pantalla en la cancha y genera el codigo/QR
   * (mismo alfabeto/TTL que el handshake presencial); queda fijado como
   * reporter de su propio lado. El capitan del otro equipo lo confirma con
   * confirmarFirma.
   */
  async generarCodigoFirma(
    usuarioId: string,
    matchId: string,
  ): Promise<{ codigo: string; expiraEn: Date }> {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException("Partido no encontrado");
    }
    if (match.estado !== "PACTADO") {
      throw new ConflictException("Este partido no esta en un pacto pendiente de firmar");
    }
    const lado = await this.ladoDelUsuario(usuarioId, match);
    if (!lado) {
      throw new ForbiddenException("No sos integrante de ninguno de los dos equipos");
    }

    const codigo = this.generarCodigo();
    const expiraEn = new Date(Date.now() + HANDSHAKE_TTL_MINUTOS * 60_000);

    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        codigoHandshake: codigo,
        codigoHandshakeExpiraEn: expiraEn,
        ...(lado === "LOCAL" ? { reporterLocalId: usuarioId } : { reporterVisitanteId: usuarioId }),
      },
    });

    return { codigo, expiraEn };
  }

  /**
   * El capitan del otro equipo confirma el codigo mostrado en persona.
   * Fija el reporter del segundo lado y recien ahi transiciona
   * PACTADO -> FIRMADO -> EN_JUEGO (mismo estadoDeArranque que consumir()).
   */
  async confirmarFirma(usuarioId: string, matchId: string, dto: ConfirmarFirmaDto) {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) {
        throw new NotFoundException("Partido no encontrado");
      }
      if (match.estado !== "PACTADO") {
        throw new ConflictException("Este partido no esta en un pacto pendiente de firmar");
      }
      if (
        !match.codigoHandshake ||
        match.codigoHandshake !== dto.codigo ||
        !match.codigoHandshakeExpiraEn ||
        match.codigoHandshakeExpiraEn < new Date()
      ) {
        throw new NotFoundException("Codigo invalido o vencido");
      }

      const lado = await this.ladoDelUsuario(usuarioId, match);
      if (!lado) {
        throw new ForbiddenException("No sos integrante de ninguno de los dos equipos");
      }
      const yaFijado = lado === "LOCAL" ? match.reporterLocalId : match.reporterVisitanteId;
      if (yaFijado) {
        throw new ConflictException("Tu equipo ya genero este codigo, esperando al otro equipo");
      }

      const firmado = transicionar("PACTADO", "FIRMADO");
      const estadoDeArranque = transicionar(firmado, "EN_JUEGO");

      return tx.match.update({
        where: { id: matchId },
        data: {
          estado: estadoDeArranque,
          ...(lado === "LOCAL" ? { reporterLocalId: usuarioId } : { reporterVisitanteId: usuarioId }),
        },
        include: INCLUIR_DETALLE,
      });
    });
  }

  /**
   * "El rival no aparecio" (concepto.md §12). Solo despues de que paso la
   * ventana de desistimiento gratuito -- antes de eso, lo que corresponde
   * es desistir, no acusar. NO transiciona a VOID todavia si es el primer
   * flag: el partido sigue PACTADO para que (a) el equipo marcado pueda
   * todavia aparecer y firmar (lo que vuelve el flag discutible sin efecto,
   * ver confirmarFirma) o (b) el otro equipo pueda flaggear tambien
   * (mutuo = ambiguo, se resuelve ya mismo sin penalidad para nadie). Si
   * nadie contradice en VENTANA_DISPUTA_HORAS, el job
   * (resolverNoShowSiVence) recien ahi aplica el -80 y pasa a VOID --
   * mismo patron de "silencio=asentimiento" que ya existe para disputas.
   */
  async flaggearNoShow(usuarioId: string, matchId: string): Promise<void> {
    let esPrimerFlag = false;

    await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) {
        throw new NotFoundException("Partido no encontrado");
      }
      if (match.estado !== "PACTADO") {
        throw new ConflictException("Este partido no esta en un pacto pendiente de firmar");
      }

      const lado = await this.ladoDelUsuario(usuarioId, match);
      if (!lado) {
        throw new ForbiddenException("No sos integrante de ninguno de los dos equipos");
      }

      const limite = new Date(
        match.createdAt.getTime() + VENTANA_DESISTIMIENTO_HORAS * 60 * 60 * 1000,
      );
      if (new Date() <= limite) {
        throw new ConflictException(
          "Todavia estas en la ventana de desistimiento, no hace falta marcar no-show",
        );
      }

      const teamId = lado === "LOCAL" ? match.equipoLocalId : match.equipoVisitanteId;
      try {
        await tx.matchNoShowFlag.create({
          data: { matchId, flaggeadoPorTeamId: teamId, flaggeadoPorUserId: usuarioId },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("Tu equipo ya marco que el rival no aparecio");
        }
        throw error;
      }

      const totalFlags = await tx.matchNoShowFlag.count({ where: { matchId } });
      esPrimerFlag = totalFlags === 1;

      if (totalFlags === 2) {
        // Mutuo: ambos se acusan, es ambiguo -- se anula sin penalidad para nadie.
        const estadoVoid = transicionar("PACTADO", "VOID");
        await tx.match.update({ where: { id: matchId }, data: { estado: estadoVoid } });
      }
    });

    if (esPrimerFlag) {
      await this.colaVencimientoNoShow.add(
        "vencimiento",
        { matchId },
        { delay: VENTANA_DISPUTA_HORAS * 60 * 60 * 1000, jobId: matchId },
      );
    }
  }

  /**
   * Handler del job de vencimiento del flag de no-show. Si sigue habiendo
   * un solo flag sin contradecir y el partido sigue PACTADO (nadie
   * apareció a firmar mientras tanto, nadie flaggeo de vuelta), aplica el
   * -80 al equipo marcado y recien ahi pasa a VOID. Idempotente: si ya se
   * firmo o ya se resolvio como mutuo por otro lado, no hace nada.
   */
  async resolverNoShowSiVence(matchId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const flags = await tx.matchNoShowFlag.findMany({ where: { matchId } });
      if (flags.length !== 1) {
        return;
      }

      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match || match.estado !== "PACTADO") {
        return;
      }

      const estadoVoid = transicionar("PACTADO", "VOID");
      await tx.match.update({ where: { id: matchId }, data: { estado: estadoVoid } });

      const flag = flags[0]!;
      const equipoMarcado =
        flag.flaggeadoPorTeamId === match.equipoLocalId
          ? match.equipoVisitanteId
          : match.equipoLocalId;

      await this.fairPlayService.aplicar(
        tx,
        equipoMarcado,
        matchId,
        "NO_SHOW",
        FAIR_PLAY_DELTA.NO_SHOW,
      );
    });
  }

  /**
   * `proyeccion` (partido no decidido) y `deltas` (partido LIQUIDADO) -- misma
   * logica que `ChallengesService.misDesafios` pero para un partido puntual
   * (docs Guapo §3.2: celda "EN JUEGO" de Firmar, delta por opcion en
   * Reportar, delta real en la pantalla Liquidado).
   */
  async buscarPorId(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: INCLUIR_DETALLE_CON_RATING,
    });
    if (!match) {
      return null;
    }

    let proyeccion: MatchProyeccion | undefined;
    if (!match.outcomeFinal) {
      proyeccion = {
        siGanaLocal: this.ratingService.proyectar(match.equipoLocal, match.equipoVisitante, "GANA_LOCAL"),
        siGanaVisitante: this.ratingService.proyectar(
          match.equipoLocal,
          match.equipoVisitante,
          "GANA_VISITANTE",
        ),
        siEmpate: this.ratingService.proyectar(match.equipoLocal, match.equipoVisitante, "EMPATE"),
      };
    }

    let deltas: MatchDeltas | undefined;
    if (match.estado === "LIQUIDADO") {
      const ledger = await this.prisma.ratingLedger.findMany({ where: { matchId: id } });
      const local = ledger.find((asiento) => asiento.teamId === match.equipoLocalId);
      const visitante = ledger.find((asiento) => asiento.teamId === match.equipoVisitanteId);
      if (local && visitante) {
        deltas = { local: local.delta, visitante: visitante.delta };
      }
    }

    return { ...match, proyeccion, deltas };
  }

  /** Partidos donde el usuario es uno de los dos reporters fijados. */
  async buscarMios(usuarioId: string) {
    return this.prisma.match.findMany({
      where: { OR: [{ reporterLocalId: usuarioId }, { reporterVisitanteId: usuarioId }] },
      orderBy: { createdAt: "desc" },
      include: INCLUIR_DETALLE,
    });
  }

  /**
   * Doble reporte independiente (concepto.md §9). Un reporte mueve
   * EN_JUEGO -> REPORTADO y programa el vencimiento de silencio=asentimiento
   * (Capa B, §10) a VENTANA_DISPUTA_HORAS. El segundo reporte, si coincide
   * en outcome con el primero, mueve REPORTADO -> CONFIRMADO y liquida en
   * el acto (CONFIRMADO -> LIQUIDADO) dentro de la misma transaccion. Si
   * discrepan, abre disputa (REPORTADO -> EN_DISPUTA, Capa C) en la misma
   * transaccion — el arbol C1/C2/C3 lo resuelve el modulo disputes.
   */
  async reportar(usuarioId: string, matchId: string, dto: ReportarResultadoDto) {
    let esPrimerReporte = false;
    let disputaAbiertaId: string | undefined;

    const resultado = await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) {
        throw new NotFoundException("Partido no encontrado");
      }

      let teamId: string;
      if (match.reporterLocalId === usuarioId) {
        teamId = match.equipoLocalId;
      } else if (match.reporterVisitanteId === usuarioId) {
        teamId = match.equipoVisitanteId;
      } else {
        throw new ForbiddenException("No sos el reporter fijado para este partido");
      }

      if (match.estado !== "EN_JUEGO" && match.estado !== "REPORTADO") {
        throw new ConflictException("Este partido ya no admite reportes");
      }

      try {
        await tx.matchReport.create({
          data: {
            matchId,
            teamId,
            reporterId: usuarioId,
            outcome: dto.outcome,
            golesLocal: dto.golesLocal,
            golesVisita: dto.golesVisita,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("Ya reportaste el resultado de este partido");
        }
        throw error;
      }

      let estadoActual: EstadoPartido = match.estado;
      if (estadoActual === "EN_JUEGO") {
        estadoActual = transicionar("EN_JUEGO", "REPORTADO");
        esPrimerReporte = true;
      }

      const reportes = await tx.matchReport.findMany({ where: { matchId } });
      let outcomeFinal: OutcomePartido | undefined;

      if (reportes.length >= 2) {
        const primero = reportes[0];
        if (primero && reportes.every((r) => r.outcome === primero.outcome)) {
          estadoActual = transicionar("REPORTADO", "CONFIRMADO");
          outcomeFinal = primero.outcome;
        } else {
          estadoActual = transicionar("REPORTADO", "EN_DISPUTA");
          const disputa = await this.disputesService.abrir(tx, matchId);
          disputaAbiertaId = disputa.id;
        }
      }

      if (estadoActual === "CONFIRMADO" && outcomeFinal) {
        await this.ratingService.liquidar(
          tx,
          matchId,
          match.equipoLocalId,
          match.equipoVisitanteId,
          outcomeFinal,
        );
        // Doble reporte coincidente = conducta limpia para ambos (concepto.md §11).
        await this.fairPlayService.aplicar(
          tx,
          match.equipoLocalId,
          matchId,
          "PARTIDO_LIMPIO",
          FAIR_PLAY_DELTA.PARTIDO_LIMPIO,
        );
        await this.fairPlayService.aplicar(
          tx,
          match.equipoVisitanteId,
          matchId,
          "PARTIDO_LIMPIO",
          FAIR_PLAY_DELTA.PARTIDO_LIMPIO,
        );
        estadoActual = transicionar("CONFIRMADO", "LIQUIDADO");
      }

      return tx.match.update({
        where: { id: matchId },
        data: { estado: estadoActual, outcomeFinal },
        include: INCLUIR_DETALLE,
      });
    });

    if (esPrimerReporte) {
      await this.colaVencimiento.add(
        "vencimiento",
        { matchId },
        { delay: VENTANA_DISPUTA_HORAS * 60 * 60 * 1000, jobId: matchId },
      );
    }

    if (disputaAbiertaId) {
      await this.disputesService.programarVencimientoCapa(
        disputaAbiertaId,
        "C1_EVIDENCIA",
        "C2_PLANTELES",
      );
    }

    return resultado;
  }

  /**
   * Capa B (concepto.md §10): si nadie mas reporto dentro de la ventana,
   * el unico reporte que hay se toma como aceptado tacitamente y liquida
   * igual que si hubiera coincidido con un segundo reporte. Si el partido
   * ya avanzo por otro camino (segundo reporte, disputa), no hace nada —
   * es idempotente a proposito, porque el job puede llegar a correr
   * despues de que el estado ya cambio por otro lado.
   */
  async aplicarSilencioAsentimiento(matchId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match || match.estado !== "REPORTADO") {
        return;
      }

      const reportes = await tx.matchReport.findMany({ where: { matchId } });
      const unico = reportes[0];
      if (!unico) {
        return;
      }

      const estadoConfirmado = transicionar("REPORTADO", "CONFIRMADO");
      await this.ratingService.liquidar(
        tx,
        matchId,
        match.equipoLocalId,
        match.equipoVisitanteId,
        unico.outcome,
      );

      // El que reporto de buena fe y espero la ventana entera tambien es
      // conducta limpia; el que nunca confirmo se marca por ghosting
      // (concepto.md §11).
      const equipoQueGhosteo =
        unico.teamId === match.equipoLocalId ? match.equipoVisitanteId : match.equipoLocalId;
      await this.fairPlayService.aplicar(
        tx,
        unico.teamId,
        matchId,
        "PARTIDO_LIMPIO",
        FAIR_PLAY_DELTA.PARTIDO_LIMPIO,
      );
      await this.fairPlayService.aplicar(
        tx,
        equipoQueGhosteo,
        matchId,
        "GHOSTING",
        FAIR_PLAY_DELTA.GHOSTING,
      );

      const estadoLiquidado = transicionar(estadoConfirmado, "LIQUIDADO");

      await tx.match.update({
        where: { id: matchId },
        data: { estado: estadoLiquidado, outcomeFinal: unico.outcome },
      });
    });
  }

  /**
   * C3 (concepto.md §10): el admin es el ultimo decisor. Si manda una
   * `resolucion` (GANA_LOCAL/GANA_VISITANTE/EMPATE), el partido se
   * confirma y liquida con ese outcome, igual que si hubiera coincidido
   * en un doble reporte. Si no manda resolucion, es indeterminable: el
   * partido queda VOID (sin mover el rating, concepto.md: "suspendido o
   * abandonado = void").
   */
  async resolverDisputa(usuario: User, matchId: string, dto: ResolverDisputaDto) {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) {
        throw new NotFoundException("Partido no encontrado");
      }
      if (match.estado !== "EN_DISPUTA") {
        throw new ConflictException("Este partido no tiene una disputa activa para resolver");
      }

      await this.disputesService.resolver(tx, matchId, usuario.id, dto.resolucion);

      let estadoActual: EstadoPartido = transicionar(
        "EN_DISPUTA",
        dto.resolucion ? "CONFIRMADO" : "VOID",
      );

      if (dto.resolucion) {
        await this.ratingService.liquidar(
          tx,
          matchId,
          match.equipoLocalId,
          match.equipoVisitanteId,
          dto.resolucion,
        );
        estadoActual = transicionar(estadoActual, "LIQUIDADO");
      }

      // Independiente de la resolucion: el admin puede anular por
      // indeterminable y ademas sancionar si le queda claro que un lado
      // mintio (concepto.md §11).
      if (dto.sancion) {
        if (
          dto.sancion.equipoSancionadoId !== match.equipoLocalId &&
          dto.sancion.equipoSancionadoId !== match.equipoVisitanteId
        ) {
          throw new BadRequestException("El equipo sancionado no pertenece a este partido");
        }
        await this.fairPlayService.aplicar(
          tx,
          dto.sancion.equipoSancionadoId,
          matchId,
          dto.sancion.tipo,
          FAIR_PLAY_DELTA[dto.sancion.tipo],
        );
      }

      return tx.match.update({
        where: { id: matchId },
        data: { estado: estadoActual, outcomeFinal: dto.resolucion },
        include: INCLUIR_DETALLE,
      });
    });
  }

  /**
   * Incidentes / agresiones (concepto.md §11): NO adjudica quien tuvo la
   * culpa, se pega al partido. Delta simetrico a ambos equipos -- no hay
   * nada que ganar contra-denunciando, la señal confiable sale del
   * agregado de flags de rivales DISTINTOS en el tiempo, no de un
   * incidente aislado. Un flag por equipo por partido (@@unique lo
   * garantiza). Sin restriccion de estado del partido: una agresion
   * puede pasar en cualquier momento, incluso antes de reportar
   * resultado.
   */
  async flaggearIncidente(
    usuarioId: string,
    matchId: string,
    descripcion: string | undefined,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({ where: { id: matchId } });
      if (!match) {
        throw new NotFoundException("Partido no encontrado");
      }

      const teamId = await this.equipoDelUsuario(usuarioId, match);
      if (!teamId) {
        throw new ForbiddenException("No sos integrante de ninguno de los dos equipos");
      }

      try {
        await tx.matchIncidentFlag.create({
          data: {
            matchId,
            flaggeadoPorTeamId: teamId,
            flaggeadoPorUserId: usuarioId,
            descripcion,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ConflictException("Tu equipo ya reporto un incidente en este partido");
        }
        throw error;
      }

      await this.fairPlayService.aplicar(
        tx,
        match.equipoLocalId,
        matchId,
        "INCIDENTE_FLAG",
        FAIR_PLAY_DELTA.INCIDENTE_FLAG,
      );
      await this.fairPlayService.aplicar(
        tx,
        match.equipoVisitanteId,
        matchId,
        "INCIDENTE_FLAG",
        FAIR_PLAY_DELTA.INCIDENTE_FLAG,
      );
    });
  }

  /** De que lado del partido esta el usuario (o null si no es integrante de ninguno). */
  private async ladoDelUsuario(
    usuarioId: string,
    match: { equipoLocalId: string; equipoVisitanteId: string },
  ): Promise<"LOCAL" | "VISITANTE" | null> {
    const integrante = await this.prisma.teamMember.findFirst({
      where: { userId: usuarioId, teamId: { in: [match.equipoLocalId, match.equipoVisitanteId] } },
      select: { teamId: true },
    });
    if (!integrante) {
      return null;
    }
    return integrante.teamId === match.equipoLocalId ? "LOCAL" : "VISITANTE";
  }

  private async verificarPertenencia(usuarioId: string, teamId: string): Promise<void> {
    const esIntegrante = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: usuarioId } },
    });
    if (!esIntegrante) {
      throw new ForbiddenException("No sos integrante de ese equipo");
    }
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

  private generarCodigo(): string {
    let codigo = "";
    for (let i = 0; i < HANDSHAKE_CODIGO_LONGITUD; i++) {
      codigo += HANDSHAKE_ALFABETO[randomInt(HANDSHAKE_ALFABETO.length)];
    }
    return codigo;
  }
}
