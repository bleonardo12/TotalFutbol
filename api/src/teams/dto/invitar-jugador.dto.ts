import { IsString } from "class-validator";

export class InvitarJugadorDto {
  @IsString()
  telefono!: string;
}
