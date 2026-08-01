import { Controller, Get, Query } from "@nestjs/common";
import { TablaQueryDto } from "./dto/tabla-query.dto";
import { SeasonsService } from "./seasons.service";

@Controller("seasons")
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get("actual")
  async actual() {
    return this.seasonsService.obtenerOCrearActual();
  }

  @Get("actual/tabla")
  async tabla(@Query() query: TablaQueryDto) {
    const season = await this.seasonsService.obtenerOCrearActual();
    return this.seasonsService.obtenerTabla(season.id, query.division);
  }
}
