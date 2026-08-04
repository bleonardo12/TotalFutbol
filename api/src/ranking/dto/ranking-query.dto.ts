import { CategoriaFutbol, Division } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

export class RankingQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  /// Sin default: no existe un ranking "todas las categorias mezcladas" (Hito 6c).
  @IsEnum(CategoriaFutbol)
  categoria!: CategoriaFutbol;

  @IsOptional()
  @IsEnum(Division)
  division?: Division;
}
