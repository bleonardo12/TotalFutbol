import { Matches } from "class-validator";
import { OTP_LONGITUD } from "../otp/otp.constantes";
import { TELEFONO_REGEX } from "./solicitar-otp.dto";

export class VerificarOtpDto {
  @Matches(TELEFONO_REGEX, { message: "telefono invalido (ej: +5491122334455)" })
  telefono!: string;

  @Matches(new RegExp(`^[0-9]{${OTP_LONGITUD}}$`), {
    message: `codigo invalido (deben ser ${OTP_LONGITUD} digitos)`,
  })
  codigo!: string;
}
