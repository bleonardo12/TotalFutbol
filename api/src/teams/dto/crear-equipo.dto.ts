import { CategoriaFutbol } from "@prisma/client";
import { IsEnum, IsString, Length } from "class-validator";

export class CrearEquipoDto {
  @IsString()
  @Length(2, 60, { message: "el nombre debe tener entre 2 y 60 caracteres" })
  nombre!: string;

  /// Fija para siempre (Hito 6c): particiona el ranking, no se puede cambiar despues.
  @IsEnum(CategoriaFutbol)
  categoria!: CategoriaFutbol;
}
