import { PartialType } from "@nestjs/mapped-types";
import { CrearVenueDto } from "./crear-venue.dto";

export class ActualizarVenueDto extends PartialType(CrearVenueDto) {}
