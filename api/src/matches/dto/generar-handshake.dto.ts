import { CantidadJugadores, Superficie } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class GenerarHandshakeDto {
  @IsString()
  equipoLocalId!: string;

  @IsEnum(CantidadJugadores)
  cantidadJugadores!: CantidadJugadores;

  @IsEnum(Superficie)
  superficie!: Superficie;

  @IsOptional()
  @IsString()
  sedeId?: string;
}
