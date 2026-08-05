import { IsString } from "class-validator";

export class MiEntornoQueryDto {
  @IsString()
  teamId!: string;
}
