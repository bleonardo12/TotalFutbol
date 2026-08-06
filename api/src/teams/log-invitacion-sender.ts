import { Injectable, Logger } from "@nestjs/common";
import type { InvitacionSender } from "./invitacion-sender.interface";

@Injectable()
export class LogInvitacionSender implements InvitacionSender {
  private readonly logger = new Logger(LogInvitacionSender.name);

  async enviar(telefono: string, codigo: string, equipoNombre: string): Promise<void> {
    this.logger.log(`Invitacion a ${equipoNombre} para ${telefono}: codigo ${codigo}`);
  }
}
