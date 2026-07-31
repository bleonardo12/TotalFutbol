import { Matches } from "class-validator";

/** Formato E.164-ish; el proveedor OTP definitivo (SMS/WhatsApp AR) esta pendiente (concepto.md §16). */
export const TELEFONO_REGEX = /^\+?[0-9]{8,15}$/;

export class SolicitarOtpDto {
  @Matches(TELEFONO_REGEX, { message: "telefono invalido (ej: +5491122334455)" })
  telefono!: string;
}
