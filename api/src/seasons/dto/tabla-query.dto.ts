import { Division } from "@prisma/client";
import { IsEnum } from "class-validator";

export class TablaQueryDto {
  @IsEnum(Division)
  division!: Division;
}
