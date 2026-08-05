import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsOptional, IsPositive, IsNumber } from "class-validator";

export class VenuesCercanasQueryDto {
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  /** Km. Default 1.5 -- "cancha detectada" es una sugerencia de barrio, no un radio amplio. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  radioKm?: number;
}
