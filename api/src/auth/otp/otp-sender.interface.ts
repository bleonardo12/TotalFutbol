export type CanalOtp = "SMS" | "WHATSAPP";

/**
 * Abstrae el envio real del codigo (SMS/WhatsApp AR, proveedor Twilio -- ver
 * docs/concepto.md §16). En dev usamos LogOtpSender; TwilioOtpSender es la implementacion real,
 * seleccionada por env var (OTP_PROVIDER, ver auth.module.ts) sin tocar OtpService ni AuthService.
 */
export interface OtpSender {
  enviar(telefono: string, codigo: string, canal: CanalOtp): Promise<void>;
}

export const OTP_SENDER = Symbol("OTP_SENDER");
