import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { ActualizarVenueDto } from "./dto/actualizar-venue.dto";
import { CrearVenueDto } from "./dto/crear-venue.dto";
import { VenuesCercanasQueryDto } from "./dto/venues-cercanas-query.dto";
import { VenuesService } from "./venues.service";

@Controller("venues")
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  async listar() {
    return this.venuesService.listar();
  }

  // Antes de ":id" -- si no, "cercanas" se interpreta como un id de cancha.
  @Get("cercanas")
  async cercanas(@Query() query: VenuesCercanasQueryDto) {
    return this.venuesService.cercanas(query.lat, query.lng, query.radioKm);
  }

  @Get(":id")
  async obtener(@Param("id") id: string) {
    const venue = await this.venuesService.buscarPorId(id);
    if (!venue) {
      throw new NotFoundException("Cancha no encontrada");
    }
    return venue;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async crear(@Body() dto: CrearVenueDto) {
    return this.venuesService.crear(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async actualizar(@Param("id") id: string, @Body() dto: ActualizarVenueDto) {
    return this.venuesService.actualizar(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(@Param("id") id: string): Promise<void> {
    await this.venuesService.eliminar(id);
  }
}
