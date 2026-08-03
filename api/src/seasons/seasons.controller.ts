import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/jwt/admin.guard";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { SeasonsService } from "./seasons.service";

@Controller("seasons")
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get("actual")
  async actual() {
    return this.seasonsService.obtenerOCrearActual();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post("cerrar")
  @HttpCode(HttpStatus.OK)
  async cerrar() {
    return this.seasonsService.cerrar();
  }
}
