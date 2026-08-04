import { IsString } from "class-validator";

export class ConfirmarFirmaDto {
  @IsString()
  codigo!: string;
}
