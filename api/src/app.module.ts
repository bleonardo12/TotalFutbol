import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { DisputesModule } from "./disputes/disputes.module";
import { HealthController } from "./health/health.controller";
import { JobsModule } from "./jobs/jobs.module";
import { MatchesModule } from "./matches/matches.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RankingModule } from "./ranking/ranking.module";
import { StorageModule } from "./storage/storage.module";
import { TeamsModule } from "./teams/teams.module";
import { VenuesModule } from "./venues/venues.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    JobsModule,
    StorageModule,
    AuthModule,
    TeamsModule,
    VenuesModule,
    MatchesModule,
    DisputesModule,
    RankingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
