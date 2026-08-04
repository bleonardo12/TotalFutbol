import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DisputesModule } from "../disputes/disputes.module";
import { FairPlayModule } from "../fair-play/fair-play.module";
import { RatingModule } from "../rating/rating.module";
import { COLA_VENCIMIENTO_NO_SHOW, COLA_VENCIMIENTO_REPORTE } from "./matches.constantes";
import { MatchesController } from "./matches.controller";
import { VencimientoNoShowProcessor, VencimientoReporteProcessor } from "./matches.processor";
import { MatchesService } from "./matches.service";

@Module({
  imports: [
    AuthModule,
    RatingModule,
    DisputesModule,
    FairPlayModule,
    BullModule.registerQueue(
      { name: COLA_VENCIMIENTO_REPORTE },
      { name: COLA_VENCIMIENTO_NO_SHOW },
    ),
  ],
  controllers: [MatchesController],
  providers: [MatchesService, VencimientoReporteProcessor, VencimientoNoShowProcessor],
  exports: [MatchesService],
})
export class MatchesModule {}
