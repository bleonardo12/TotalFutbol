import { OutcomePartido } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class ResolverDisputaDto {
  /** Si se omite, la disputa se anula (VOID) por ser indeterminable (concepto.md §10, C3). */
  @IsOptional()
  @IsEnum(OutcomePartido)
  resolucion?: OutcomePartido;
}
