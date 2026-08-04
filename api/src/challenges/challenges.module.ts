import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MatchesModule } from "../matches/matches.module";
import { COLA_VENCIMIENTO_DESAFIO } from "./challenges.constantes";
import { ChallengesController } from "./challenges.controller";
import { VencimientoDesafioProcessor } from "./challenges.processor";
import { ChallengesService } from "./challenges.service";

@Module({
  imports: [
    AuthModule,
    MatchesModule,
    BullModule.registerQueue({ name: COLA_VENCIMIENTO_DESAFIO }),
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService, VencimientoDesafioProcessor],
})
export class ChallengesModule {}
