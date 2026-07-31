import { OutcomePartido } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";

export class ReportarResultadoDto {
  @IsEnum(OutcomePartido)
  outcome!: OutcomePartido;

  @IsOptional()
  @IsInt()
  @Min(0)
  golesLocal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  golesVisita?: number;
}
