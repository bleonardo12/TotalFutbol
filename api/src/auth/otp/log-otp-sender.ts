import { Injectable, Logger } from "@nestjs/common";
import type { CanalOtp, OtpSender } from "./otp-sender.interface";

@Injectable()
export class LogOtpSender implements OtpSender {
  private readonly logger = new Logger(LogOtpSender.name);

  async enviar(telefono: string, codigo: string, canal: CanalOtp): Promise<void> {
    this.logger.log(`Codigo OTP (${canal}) para ${telefono}: ${codigo}`);
  }
}
