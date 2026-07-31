import { IsString } from "class-validator";

export class RefrescarTokenDto {
  @IsString()
  refreshToken!: string;
}
