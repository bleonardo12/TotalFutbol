import { Controller, Get } from "@nestjs/common";
import { SeasonsService } from "./seasons.service";

@Controller("seasons")
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Get("actual")
  async actual() {
    return this.seasonsService.obtenerOCrearActual();
  }
}
