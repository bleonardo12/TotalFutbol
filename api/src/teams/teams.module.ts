import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RankingModule } from "../ranking/ranking.module";
import { RatingModule } from "../rating/rating.module";
import { INVITACION_SENDER } from "./invitacion-sender.interface";
import { LogInvitacionSender } from "./log-invitacion-sender";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";

@Module({
  imports: [AuthModule, RankingModule, RatingModule],
  controllers: [TeamsController],
  providers: [TeamsService, { provide: INVITACION_SENDER, useClass: LogInvitacionSender }],
})
export class TeamsModule {}
