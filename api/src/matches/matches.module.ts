import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RatingModule } from "../rating/rating.module";
import { MatchesController } from "./matches.controller";
import { MatchesService } from "./matches.service";

@Module({
  imports: [AuthModule, RatingModule],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
