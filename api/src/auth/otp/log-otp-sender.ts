import { Injectable, Logger } from "@nestjs/common";
import type { OtpSender } from "./otp-sender.interface";

@Injectable()
export class LogOtpSender implements OtpSender {
  private readonly logger = new Logger(LogOtpSender.name);

  async enviar(telefono: string, codigo: string): Promise<void> {
    this.logger.log(`Codigo OTP para ${telefono}: ${codigo}`);
  }
}
