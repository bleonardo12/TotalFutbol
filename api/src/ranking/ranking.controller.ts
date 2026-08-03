import { Controller, Get, Query } from "@nestjs/common";
import { RankingQueryDto } from "./dto/ranking-query.dto";
import { RankingService } from "./ranking.service";

@Controller("ranking")
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  async listar(@Query() query: RankingQueryDto) {
    return this.rankingService.listar(query.limit ?? 50, query.offset ?? 0, query.division);
  }
}
