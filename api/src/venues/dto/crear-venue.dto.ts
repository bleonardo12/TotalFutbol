import { IsLatitude, IsLongitude, Length } from "class-validator";

export class CrearVenueDto {
  @Length(2, 80, { message: "el nombre debe tener entre 2 y 80 caracteres" })
  nombre!: string;

  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;
}
