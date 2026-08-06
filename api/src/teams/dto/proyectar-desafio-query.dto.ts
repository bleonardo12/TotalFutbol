import { IsString } from "class-validator";

export class ProyectarDesafioQueryDto {
  @IsString()
  rivalId!: string;
}
