import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { COLA_VENCIMIENTO_DISPUTA } from "./disputes.constantes";
import { DisputesController } from "./disputes.controller";
import { VencimientoCapaProcessor } from "./disputes.processor";
import { DisputesService } from "./disputes.service";

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: COLA_VENCIMIENTO_DISPUTA })],
  controllers: [DisputesController],
  providers: [DisputesService, VencimientoCapaProcessor],
  exports: [DisputesService],
})
export class DisputesModule {}
