import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import type { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { UsuarioActual } from "../auth/jwt/usuario-actual.decorator";
import { DisputesService } from "./disputes.service";

@Controller("disputes")
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @UseGuards(JwtAuthGuard)
  @Get(":matchId")
  async obtener(@UsuarioActual() usuario: User, @Param("matchId") matchId: string) {
    return this.disputesService.obtenerPorMatchId(matchId, usuario);
  }
}
