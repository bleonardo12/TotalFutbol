import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { CapaDisputa } from "@prisma/client";
import type { Job } from "bullmq";
import { COLA_VENCIMIENTO_DISPUTA } from "./disputes.constantes";
import { DisputesService } from "./disputes.service";

interface DatosVencimientoCapa {
  disputeId: string;
  capaEsperada: CapaDisputa;
  /** Ausente en el job de C3: vencer ahi no avanza de capa, fuerza VOID. */
  siguienteCapa?: CapaDisputa;
}

@Processor(COLA_VENCIMIENTO_DISPUTA)
export class VencimientoCapaProcessor extends WorkerHost {
  constructor(private readonly disputesService: DisputesService) {
    super();
  }

  async process(job: Job<DatosVencimientoCapa>): Promise<void> {
    const { disputeId, capaEsperada, siguienteCapa } = job.data;
    if (siguienteCapa) {
      await this.disputesService.avanzarCapaSiVence(disputeId, capaEsperada, siguienteCapa);
    } else {
      await this.disputesService.forzarVoidSiVence(disputeId, capaEsperada);
    }
  }
}
