import { Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { UsuarioActual } from "../auth/jwt/usuario-actual.decorator";
import { CrearEquipoDto } from "./dto/crear-equipo.dto";
import { ProyectarDesafioQueryDto } from "./dto/proyectar-desafio-query.dto";
import { TeamsService } from "./teams.service";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async crear(@UsuarioActual() usuario: User, @Body() dto: CrearEquipoDto) {
    return this.teamsService.crear(usuario.id, dto.nombre, dto.categoria);
  }

  @UseGuards(JwtAuthGuard)
  @Get("mios")
  async mios(@UsuarioActual() usuario: User) {
    return this.teamsService.buscarMios(usuario.id);
  }

  @Get(":id")
  async obtener(@Param("id") id: string) {
    const equipo = await this.teamsService.buscarPorId(id);
    if (!equipo) {
      throw new NotFoundException("Equipo no encontrado");
    }
    return equipo;
  }

  @Get(":id/forma")
  async forma(@Param("id") id: string) {
    return this.teamsService.forma(id);
  }

  @Get(":id/proyectar-desafio")
  async proyectarDesafio(@Param("id") id: string, @Query() query: ProyectarDesafioQueryDto) {
    return this.teamsService.proyectarDesafio(id, query.rivalId);
  }
}
