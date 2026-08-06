import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RankingModule } from "../ranking/ranking.module";
import { RatingModule } from "../rating/rating.module";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

@Module({
  imports: [AuthModule, RankingModule, RatingModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
