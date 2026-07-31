import { IsString, Length } from "class-validator";
import { HANDSHAKE_CODIGO_LONGITUD } from "../matches.constantes";

export class ConsumirHandshakeDto {
  @Length(HANDSHAKE_CODIGO_LONGITUD, HANDSHAKE_CODIGO_LONGITUD, {
    message: `codigo invalido (deben ser ${HANDSHAKE_CODIGO_LONGITUD} caracteres)`,
  })
  codigo!: string;

  @IsString()
  equipoVisitanteId!: string;
}
