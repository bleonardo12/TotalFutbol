import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { MatchesService } from "./matches.service";
import { COLA_VENCIMIENTO_REPORTE } from "./matches.constantes";

interface DatosVencimientoReporte {
  matchId: string;
}

@Processor(COLA_VENCIMIENTO_REPORTE)
export class VencimientoReporteProcessor extends WorkerHost {
  constructor(private readonly matchesService: MatchesService) {
    super();
  }

  async process(job: Job<DatosVencimientoReporte>): Promise<void> {
    await this.matchesService.aplicarSilencioAsentimiento(job.data.matchId);
  }
}
