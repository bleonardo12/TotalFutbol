import { IsOptional, IsString, MaxLength } from "class-validator";

export class FlaggearIncidenteDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  descripcion?: string;
}
