import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CantidadJugadores, CategoriaFutbol, Division, Superficie } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { sonNombresParecidos } from "@totalfutbol/core";
import { randomInt } from "node:crypto";
import { normalizarTelefono } from "../auth/telefono.util";
import { PrismaService } from "../prisma/prisma.service";
import { RankingService } from "../ranking/ranking.service";
import { RatingService } from "../rating/rating.service";
import { ConsumirInvitacionDto } from "./dto/consumir-invitacion.dto";
import { InvitarJugadorDto } from "./dto/invitar-jugador.dto";
import { INVITACION_SENDER, type InvitacionSender } from "./invitacion-sender.interface";
import { INVITACION_ALFABETO, INVITACION_CODIGO_LONGITUD, INVITACION_TTL_DIAS } from "./teams.constantes";

const INCLUIR_DETALLE = {
  capitan: { select: { id: true, telefono: true, nombre: true } },
  integrantes: {
    include: { user: { select: { id: true, telefono: true, nombre: true } } },
  },
} as const;

/** Hasta 10 barras en el mini-grafico de forma (docs Guapo §3.1, "TU FORMA"). */
const TOPE_BARRAS_FORMA = 10;

/** Umbrales de la senal de colusion (patronesSospechosos) -- arbitrarios pero razonables, a calibrar con datos reales. */
const MIN_PARTIDOS_PATRON = 3;
const UMBRAL_CONCENTRACION_RIVAL = 50;

export interface FormaEquipo {
  gEP: { g: number; e: number; p: number };
  /** Upsets / partidos ganados, redondeado. 0 si nunca gano. */
  upsetPorcentaje: number;
  /** MAX(ratingResultante) del ledger, o el rating actual si nunca jugo. */
  pico: number;
  /** Hasta 10 valores normalizados 0-1, en orden cronologico. */
  barras: number[];
}

export interface FormatoEquipo {
  cantidadJugadores: CantidadJugadores;
  superficie: Superficie;
  partidos: number;
  victorias: number;
  porcentaje: number;
}

export interface PalmaresItem {
  anio: number;
  division: Division;
  esCampeonDelAnio: boolean;
}

export interface PatronSospechoso {
  equipoId: string;
  equipoNombre: string;
  categoria: CategoriaFutbol;
  rivalId: string;
  rivalNombre: string;
  partidos: number;
  porcentaje: number;
}

export interface IntegranteEquipo {
  id: string;
  rol: string;
  nombre: string;
}

export interface InvitacionPendiente {
  id: string;
  telefono: string;
  expiraEn: Date;
}

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
    private readonly ratingService: RatingService,
    @Inject(INVITACION_SENDER) private readonly invitacionSender: InvitacionSender,
  ) {}

  /** Crea el equipo con el capitan como primer integrante del plantel (progresivo, concepto.md §4). */
  async crear(capitanId: string, nombre: string, categoria: CategoriaFutbol) {
    await this.verificarLimiteCapitan(capitanId, categoria);
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
   * Partidos liquidados agrupados por formato (cantidad de jugadores x
   * superficie, concepto.md §5), con el % de victorias de cada uno --
   * "DONDE SON BUENOS" del perfil de equipo (docs Guapo §3.5). Solo formatos
   * donde el equipo jugo al menos un partido, ordenado de mejor a peor %.
   */
  async porFormato(teamId: string): Promise<FormatoEquipo[]> {
    const equipo = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }

    const partidos = await this.prisma.match.findMany({
      where: {
        estado: "LIQUIDADO",
        OR: [{ equipoLocalId: teamId }, { equipoVisitanteId: teamId }],
      },
      select: {
        cantidadJugadores: true,
        superficie: true,
        equipoLocalId: true,
        outcomeFinal: true,
      },
    });

    const porFormato = new Map<
      string,
      { cantidadJugadores: CantidadJugadores; superficie: Superficie; partidos: number; victorias: number }
    >();
    for (const partido of partidos) {
      const clave = `${partido.cantidadJugadores}|${partido.superficie}`;
      const actual = porFormato.get(clave) ?? {
        cantidadJugadores: partido.cantidadJugadores,
        superficie: partido.superficie,
        partidos: 0,
        victorias: 0,
      };
      actual.partidos += 1;
      const esLocal = partido.equipoLocalId === teamId;
      const gano =
        (esLocal && partido.outcomeFinal === "GANA_LOCAL") ||
        (!esLocal && partido.outcomeFinal === "GANA_VISITANTE");
      if (gano) {
        actual.victorias += 1;
      }
      porFormato.set(clave, actual);
    }

    return Array.from(porFormato.values())
      .map((formato) => ({
        ...formato,
        porcentaje: Math.round((formato.victorias / formato.partidos) * 100),
      }))
      .sort((a, b) => b.porcentaje - a.porcentaje);
  }

  /** Campeonatos del equipo, uno por division x temporada en la que salio 1° (concepto.md §6). */
  async palmares(teamId: string): Promise<PalmaresItem[]> {
    const equipo = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }

    const campeonatos = await this.prisma.campeonato.findMany({
      where: { teamId },
      include: { season: { select: { anio: true } } },
      orderBy: { season: { anio: "desc" } },
    });

    return campeonatos.map((c) => ({
      anio: c.season.anio,
      division: c.division,
      esCampeonDelAnio: c.esCampeonDelAnio,
    }));
  }

  /**
   * Senal de colusion para el admin (equipos fantasma, concepto.md §16): un equipo que jugo la
   * gran mayoria de sus partidos contra el mismo rival es sospechoso de goleadas arregladas para
   * inflar el rating. NO bloquea ni sanciona nada solo -- "la app no arbitra, el admin decide"
   * (CLAUDE.md). Umbrales arbitrarios pero razonables, a calibrar con datos reales (mismo criterio
   * que el rating inicial): minimo 3 partidos liquidados, 50%+ contra el mismo rival.
   */
  async patronesSospechosos(): Promise<PatronSospechoso[]> {
    const partidos = await this.prisma.match.findMany({
      where: { estado: "LIQUIDADO" },
      select: { equipoLocalId: true, equipoVisitanteId: true },
    });

    const porEquipo = new Map<string, Map<string, number>>();
    const sumarRival = (equipoId: string, rivalId: string) => {
      const rivales = porEquipo.get(equipoId) ?? new Map<string, number>();
      rivales.set(rivalId, (rivales.get(rivalId) ?? 0) + 1);
      porEquipo.set(equipoId, rivales);
    };
    for (const partido of partidos) {
      sumarRival(partido.equipoLocalId, partido.equipoVisitanteId);
      sumarRival(partido.equipoVisitanteId, partido.equipoLocalId);
    }

    const candidatos: { equipoId: string; rivalId: string; partidos: number; porcentaje: number }[] = [];
    for (const [equipoId, rivales] of porEquipo) {
      const total = Array.from(rivales.values()).reduce((suma, n) => suma + n, 0);
      if (total < MIN_PARTIDOS_PATRON) {
        continue;
      }
      const [rivalId, cantidad] = Array.from(rivales.entries()).sort((a, b) => b[1] - a[1])[0] as [string, number];
      const porcentaje = Math.round((cantidad / total) * 100);
      if (porcentaje >= UMBRAL_CONCENTRACION_RIVAL) {
        candidatos.push({ equipoId, rivalId, partidos: total, porcentaje });
      }
    }

    if (candidatos.length === 0) {
      return [];
    }

    const idsEquipos = Array.from(
      new Set(candidatos.flatMap((c) => [c.equipoId, c.rivalId])),
    );
    const equipos = await this.prisma.team.findMany({
      where: { id: { in: idsEquipos } },
      select: { id: true, nombre: true, categoria: true },
    });
    const nombrePorId = new Map(equipos.map((e) => [e.id, e]));

    return candidatos
      .map((c) => ({
        equipoId: c.equipoId,
        equipoNombre: nombrePorId.get(c.equipoId)?.nombre ?? "?",
        categoria: nombrePorId.get(c.equipoId)?.categoria as CategoriaFutbol,
        rivalId: c.rivalId,
        rivalNombre: nombrePorId.get(c.rivalId)?.nombre ?? "?",
        partidos: c.partidos,
        porcentaje: c.porcentaje,
      }))
      .sort((a, b) => b.porcentaje - a.porcentaje);
  }

  /**
   * Antifraude (Hito 3, decision de Leonardo 2026-08-06): un capitan no puede
   * "lavar" el mal historial (rating/fair-play bajo) de un equipo creando
   * uno nuevo en la misma categoria -- limite de 1 equipo por capitan por
   * categoria, de por vida (no hay forma de dar de baja un equipo ni de
   * transferir la capitania, asi que "equipos donde soy capitan" es
   * simplemente "equipos que cree"). Distintas categorias si se permiten:
   * son pools de ranking separados, capitanear un equipo masculino y otro
   * mixto no tiene el mismo problema.
   */
  private async verificarLimiteCapitan(capitanId: string, categoria: CategoriaFutbol): Promise<void> {
    const yaTiene = await this.prisma.team.count({ where: { capitanId, categoria } });
    if (yaTiene > 0) {
      throw new ConflictException("Ya sos capitan de un equipo en esta categoria");
    }
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

  /**
   * Plantel progresivo (concepto.md §4): el capitan invita por telefono, el invitado se une con
   * su propia cuenta al consumir el codigo (consumirInvitacion). Solo el capitan invita -- mismo
   * actor que ya es el unico que puede crear el equipo y fijar la categoria.
   */
  async invitarJugador(capitanId: string, teamId: string, dto: InvitarJugadorDto): Promise<void> {
    const equipo = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }
    if (equipo.capitanId !== capitanId) {
      throw new ForbiddenException("Solo el capitan puede invitar jugadores");
    }

    const telefono = normalizarTelefono(dto.telefono);

    const usuarioExistente = await this.prisma.user.findUnique({ where: { telefono } });
    if (usuarioExistente) {
      const yaEsIntegrante = await this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: usuarioExistente.id } },
      });
      if (yaEsIntegrante) {
        throw new ConflictException("Ese telefono ya es parte del plantel");
      }
    }

    const expiraEn = new Date(Date.now() + INVITACION_TTL_DIAS * 24 * 60 * 60_000);
    for (let intento = 0; intento < 5; intento++) {
      const codigo = this.generarCodigoInvitacion();
      try {
        await this.prisma.teamInvitation.create({
          data: { teamId, invitadoPorId: capitanId, telefono, codigo, expiraEn },
        });
        await this.invitacionSender.enviar(telefono, codigo, equipo.nombre);
        return;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue; // colision de codigo (muy improbable): reintenta con uno nuevo
        }
        throw error;
      }
    }
    throw new Error("No se pudo generar un codigo de invitacion unico");
  }

  async listarInvitaciones(capitanId: string, teamId: string): Promise<InvitacionPendiente[]> {
    const equipo = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }
    if (equipo.capitanId !== capitanId) {
      throw new ForbiddenException("Solo el capitan puede ver las invitaciones");
    }

    const invitaciones = await this.prisma.teamInvitation.findMany({
      where: { teamId, consumidoEn: null, expiraEn: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    return invitaciones.map((i) => ({ id: i.id, telefono: i.telefono, expiraEn: i.expiraEn }));
  }

  /** El invitado consume su propio codigo, logueado con su propia cuenta (concepto.md §4). */
  async consumirInvitacion(usuarioId: string, dto: ConsumirInvitacionDto) {
    const invitacion = await this.prisma.teamInvitation.findFirst({
      where: { codigo: dto.codigo, consumidoEn: null, expiraEn: { gt: new Date() } },
    });
    if (!invitacion) {
      throw new NotFoundException("Codigo invalido o vencido");
    }

    const yaEsIntegrante = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: invitacion.teamId, userId: usuarioId } },
    });
    if (yaEsIntegrante) {
      throw new ConflictException("Ya sos parte de este plantel");
    }

    // Marca de consumo atomica: si otro request ya lo uso en el medio, count da 0.
    const marcado = await this.prisma.teamInvitation.updateMany({
      where: { id: invitacion.id, consumidoEn: null },
      data: { consumidoEn: new Date(), consumidoPorId: usuarioId },
    });
    if (marcado.count === 0) {
      throw new ConflictException("El codigo ya fue usado");
    }

    await this.prisma.teamMember.create({
      data: { teamId: invitacion.teamId, userId: usuarioId, rol: "JUGADOR" },
    });
    return this.buscarPorId(invitacion.teamId);
  }

  async integrantes(teamId: string): Promise<IntegranteEquipo[]> {
    const equipo = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }

    const integrantes = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: { select: { nombre: true, apellido: true, telefono: true } } },
      orderBy: { createdAt: "asc" },
    });
    return integrantes.map((i) => ({
      id: i.id,
      rol: i.rol,
      nombre: i.user.nombre ? `${i.user.nombre} ${i.user.apellido ?? ""}`.trim() : i.user.telefono,
    }));
  }

  private generarCodigoInvitacion(): string {
    let codigo = "";
    for (let i = 0; i < INVITACION_CODIGO_LONGITUD; i++) {
      codigo += INVITACION_ALFABETO[randomInt(INVITACION_ALFABETO.length)];
    }
    return codigo;
  }
}
