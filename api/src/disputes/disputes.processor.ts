import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { CapaDisputa } from "@prisma/client";
import type { Job } from "bullmq";
import { COLA_VENCIMIENTO_DISPUTA } from "./disputes.constantes";
import { DisputesService } from "./disputes.service";

interface DatosVencimientoCapa {
  disputeId: string;
  capaEsperada: CapaDisputa;
  siguienteCapa: CapaDisputa;
}

@Processor(COLA_VENCIMIENTO_DISPUTA)
export class VencimientoCapaProcessor extends WorkerHost {
  constructor(private readonly disputesService: DisputesService) {
    super();
  }

  async process(job: Job<DatosVencimientoCapa>): Promise<void> {
    await this.disputesService.avanzarCapaSiVence(
      job.data.disputeId,
      job.data.capaEsperada,
      job.data.siguienteCapa,
    );
  }
}
