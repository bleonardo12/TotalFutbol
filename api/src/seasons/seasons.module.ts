import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RankingModule } from "../ranking/ranking.module";
import { SeasonsController } from "./seasons.controller";
import { SeasonsService } from "./seasons.service";

@Module({
  imports: [AuthModule, RankingModule],
  controllers: [SeasonsController],
  providers: [SeasonsService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
