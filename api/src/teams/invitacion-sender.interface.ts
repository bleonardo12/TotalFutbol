/**
 * Abstrae el envio real de la invitacion al plantel (SMS/WhatsApp AR, proveedor a definir -- ver
 * docs/concepto.md §16). Interfaz propia, separada de OtpSender: mismo patron, pero un mensaje
 * distinto (invitacion a un equipo, no un codigo de login). En dev usamos LogInvitacionSender; la
 * implementacion real se cablea despues sin tocar TeamsService.
 */
export interface InvitacionSender {
  enviar(telefono: string, codigo: string, equipoNombre: string): Promise<void>;
}

export const INVITACION_SENDER = Symbol("INVITACION_SENDER");
