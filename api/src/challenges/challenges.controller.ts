import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { UsuarioActual } from "../auth/jwt/usuario-actual.decorator";
import { ChallengesService } from "./challenges.service";
import { ProponerDesafioDto } from "./dto/proponer-desafio.dto";

@Controller("challenges")
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async proponer(@UsuarioActual() usuario: User, @Body() dto: ProponerDesafioDto) {
    return this.challengesService.proponer(usuario.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("mios")
  async mios(@UsuarioActual() usuario: User) {
    return this.challengesService.misDesafios(usuario.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/aceptar")
  async aceptar(@UsuarioActual() usuario: User, @Param("id") id: string) {
    return this.challengesService.aceptar(usuario.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/rechazar")
  async rechazar(@UsuarioActual() usuario: User, @Param("id") id: string) {
    return this.challengesService.rechazar(usuario.id, id);
  }
}
