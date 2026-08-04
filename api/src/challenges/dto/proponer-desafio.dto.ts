import { CantidadJugadores, Superficie } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class ProponerDesafioDto {
  @IsString()
  equipoDesafianteId!: string;

  @IsString()
  equipoDesafiadoId!: string;

  @IsEnum(CantidadJugadores)
  cantidadJugadores!: CantidadJugadores;

  @IsEnum(Superficie)
  superficie!: Superficie;

  @IsOptional()
  @IsString()
  sedeId?: string;

  @IsOptional()
  @IsDateString()
  fechaPropuesta?: string;
}
