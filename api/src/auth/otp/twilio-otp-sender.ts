import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Twilio } from "twilio";
import type { CanalOtp, OtpSender } from "./otp-sender.interface";

/**
 * Sender real (produccion). Seleccionado por OTP_PROVIDER=twilio en auth.module.ts. El cliente se
 * arma recien al primer envio (no en el constructor): este provider se instancia siempre (para
 * que el factory de OTP_SENDER lo pueda inyectar), aunque no este seleccionado -- en dev, sin las
 * TWILIO_* env vars, no tiene que romper el arranque de la app.
 */
@Injectable()
export class TwilioOtpSender implements OtpSender {
  private client: Twilio | undefined;

  constructor(private readonly config: ConfigService) {}

  private obtenerCliente(): Twilio {
    if (!this.client) {
      this.client = new Twilio(
        this.config.getOrThrow<string>("TWILIO_ACCOUNT_SID"),
        this.config.getOrThrow<string>("TWILIO_AUTH_TOKEN"),
      );
    }
    return this.client;
  }

  async enviar(telefono: string, codigo: string, canal: CanalOtp): Promise<void> {
    const body = `Tu codigo Cabra: ${codigo}`;
    const cliente = this.obtenerCliente();
    if (canal === "WHATSAPP") {
      await cliente.messages.create({
        to: `whatsapp:${telefono}`,
        from: `whatsapp:${this.config.getOrThrow<string>("TWILIO_WHATSAPP_FROM")}`,
        body,
      });
      return;
    }
    await cliente.messages.create({
      to: telefono,
      from: this.config.getOrThrow<string>("TWILIO_SMS_FROM"),
      body,
    });
  }
}
