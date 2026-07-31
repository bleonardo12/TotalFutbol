/**
 * Abstrae el envio real del codigo (SMS/WhatsApp AR, proveedor a definir —
 * ver docs/concepto.md §16). En dev usamos LogOtpSender; la implementacion
 * real se cablea despues sin tocar OtpService ni AuthService.
 */
export interface OtpSender {
  enviar(telefono: string, codigo: string): Promise<void>;
}

export const OTP_SENDER = Symbol("OTP_SENDER");
