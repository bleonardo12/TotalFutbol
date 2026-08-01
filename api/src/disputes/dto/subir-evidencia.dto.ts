import { IsOptional, IsString, MaxLength } from "class-validator";

export class SubirEvidenciaDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  descripcion?: string;
}
