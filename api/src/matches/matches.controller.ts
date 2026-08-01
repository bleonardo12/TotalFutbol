import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import type { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { UsuarioActual } from "../auth/jwt/usuario-actual.decorator";
import { ConsumirHandshakeDto } from "./dto/consumir-handshake.dto";
import { GenerarHandshakeDto } from "./dto/generar-handshake.dto";
import { ReportarResultadoDto } from "./dto/reportar-resultado.dto";
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
  @Post(":id/reportar")
  async reportar(
    @UsuarioActual() usuario: User,
    @Param("id") id: string,
    @Body() dto: ReportarResultadoDto,
  ) {
    return this.matchesService.reportar(usuario.id, id, dto);
  }
}
