import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RatingModule } from "../rating/rating.module";
import { COLA_VENCIMIENTO_REPORTE } from "./matches.constantes";
import { MatchesController } from "./matches.controller";
import { VencimientoReporteProcessor } from "./matches.processor";
import { MatchesService } from "./matches.service";

@Module({
  imports: [AuthModule, RatingModule, BullModule.registerQueue({ name: COLA_VENCIMIENTO_REPORTE })],
  controllers: [MatchesController],
  providers: [MatchesService, VencimientoReporteProcessor],
})
export class MatchesModule {}
