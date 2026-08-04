import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { ChallengesService } from "./challenges.service";
import { COLA_VENCIMIENTO_DESAFIO } from "./challenges.constantes";

interface DatosVencimientoDesafio {
  challengeId: string;
}

@Processor(COLA_VENCIMIENTO_DESAFIO)
export class VencimientoDesafioProcessor extends WorkerHost {
  constructor(private readonly challengesService: ChallengesService) {
    super();
  }

  async process(job: Job<DatosVencimientoDesafio>): Promise<void> {
    await this.challengesService.expirarSiVence(job.data.challengeId);
  }
}
