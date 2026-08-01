import { Module } from "@nestjs/common";
import { FairPlayService } from "./fair-play.service";

@Module({
  providers: [FairPlayService],
  exports: [FairPlayService],
})
export class FairPlayModule {}
