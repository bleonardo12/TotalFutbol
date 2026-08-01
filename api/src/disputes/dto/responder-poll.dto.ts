import { RespuestaPoll } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class ResponderPollDto {
  @IsEnum(RespuestaPoll)
  respuesta!: RespuestaPoll;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  comentario?: string;
}
