import { Length } from "class-validator";
import { INVITACION_CODIGO_LONGITUD } from "../teams.constantes";

export class ConsumirInvitacionDto {
  @Length(INVITACION_CODIGO_LONGITUD, INVITACION_CODIGO_LONGITUD, {
    message: `codigo invalido (deben ser ${INVITACION_CODIGO_LONGITUD} caracteres)`,
  })
  codigo!: string;
}
