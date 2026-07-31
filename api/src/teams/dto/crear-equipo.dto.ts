import { IsString, Length } from "class-validator";

export class CrearEquipoDto {
  @IsString()
  @Length(2, 60, { message: "el nombre debe tener entre 2 y 60 caracteres" })
  nombre!: string;
}
