import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { User } from "@prisma/client";
import { AdminGuard } from "../auth/jwt/admin.guard";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { UsuarioActual } from "../auth/jwt/usuario-actual.decorator";
import { ConfirmarFirmaDto } from "./dto/confirmar-firma.dto";
import { ConsumirHandshakeDto } from "./dto/consumir-handshake.dto";
import { FlaggearIncidenteDto } from "./dto/flaggear-incidente.dto";
import { GenerarHandshakeDto } from "./dto/generar-handshake.dto";
import { ReportarResultadoDto } from "./dto/reportar-resultado.dto";
import { ResolverDisputaDto } from "./dto/resolver-disputa.dto";
import { MatchesService } from "./matches.service";

@Controller("matches")
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @UseGuards(JwtAuthGuard)
  @Post("generar")
  async generar(@UsuarioActual() usuario: User, @Body() dto: GenerarHandshakeDto) {
    return this.matchesService.generar(usuario.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("consumir")
  async consumir(@UsuarioActual() usuario: User, @Body() dto: ConsumirHandshakeDto) {
    return this.matchesService.consumir(usuario.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("mios")
  async mios(@UsuarioActual() usuario: User) {
    return this.matchesService.buscarMios(usuario.id);
  }

  @Get(":id")
  async obtener(@Param("id") id: string) {
    const match = await this.matchesService.buscarPorId(id);
    if (!match) {
      throw new NotFoundException("Partido no encontrado");
    }
    return match;
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/desistir")
  @HttpCode(HttpStatus.NO_CONTENT)
  async desistir(@UsuarioActual() usuario: User, @Param("id") id: string): Promise<void> {
    await this.matchesService.desistir(usuario.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/firmar/generar")
  async generarCodigoFirma(@UsuarioActual() usuario: User, @Param("id") id: string) {
    return this.matchesService.generarCodigoFirma(usuario.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/firmar/confirmar")
  async confirmarFirma(
    @UsuarioActual() usuario: User,
    @Param("id") id: string,
    @Body() dto: ConfirmarFirmaDto,
  ) {
    return this.matchesService.confirmarFirma(usuario.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/reportar")
  async reportar(
    @UsuarioActual() usuario: User,
    @Param("id") id: string,
    @Body() dto: ReportarResultadoDto,
  ) {
    return this.matchesService.reportar(usuario.id, id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(":id/resolver-disputa")
  async resolverDisputa(
    @UsuarioActual() usuario: User,
    @Param("id") id: string,
    @Body() dto: ResolverDisputaDto,
  ) {
    return this.matchesService.resolverDisputa(usuario, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/incidente")
  @HttpCode(HttpStatus.NO_CONTENT)
  async flaggearIncidente(
    @UsuarioActual() usuario: User,
    @Param("id") id: string,
    @Body() dto: FlaggearIncidenteDto,
  ): Promise<void> {
    await this.matchesService.flaggearIncidente(usuario.id, id, dto.descripcion);
  }
}
