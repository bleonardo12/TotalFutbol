import { OutcomePartido } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";

/**
 * Solo estos dos: las sanciones son juicio deliberado del admin sobre
 * conducta/honestidad (concepto.md §11). PARTIDO_LIMPIO/GHOSTING/
 * INCIDENTE_FLAG son automaticos, no algo que el admin elija a mano.
 */
const TIPOS_SANCION = ["REPORTE_FALSO_PROBADO", "DISPUTA_FRIVOLA"] as const;
export type TipoSancionFairPlay = (typeof TIPOS_SANCION)[number];

class SancionFairPlayDto {
  @IsIn(TIPOS_SANCION)
  tipo!: TipoSancionFairPlay;

  @IsString()
  equipoSancionadoId!: string;
}

export class ResolverDisputaDto {
  /** Si se omite, la disputa se anula (VOID) por ser indeterminable (concepto.md §10, C3). */
  @IsOptional()
  @IsEnum(OutcomePartido)
  resolucion?: OutcomePartido;

  /**
   * Opcional e independiente de `resolucion`: el admin puede anular por
   * indeterminable y ademas sancionar si le queda claro que un lado
   * mintio, aunque el resultado real no se pueda establecer.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => SancionFairPlayDto)
  sancion?: SancionFairPlayDto;
}
