import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

/**
 * Registra la conexion a Redis para BullMQ. Las colas concretas (vencimiento
 * de reporte, vencimiento de capas de disputa) se registran en los modulos
 * que las usan via BullModule.registerQueue().
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("REDIS_HOST", "localhost"),
          port: config.get<number>("REDIS_PORT", 6379),
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class JobsModule {}
