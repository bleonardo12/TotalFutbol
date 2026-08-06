import { IsIn, IsOptional, Matches } from "class-validator";
import type { CanalOtp } from "../otp/otp-sender.interface";

/** Formato E.164-ish; el proveedor OTP real es Twilio (SMS o WhatsApp, ver auth.module.ts). */
export const TELEFONO_REGEX = /^\+?[0-9]{8,15}$/;

export class SolicitarOtpDto {
  @Matches(TELEFONO_REGEX, { message: "telefono invalido (ej: +5491122334455)" })
  telefono!: string;

  /** El usuario elige el canal en login.tsx; default SMS si no viene. */
  @IsOptional()
  @IsIn(["SMS", "WHATSAPP"])
  canal?: CanalOtp;
}
