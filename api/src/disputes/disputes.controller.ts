import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { User } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { UsuarioActual } from "../auth/jwt/usuario-actual.decorator";
import { EVIDENCIA_TAMANO_MAXIMO_BYTES } from "./disputes.constantes";
import { DisputesService } from "./disputes.service";
import { SubirEvidenciaDto } from "./dto/subir-evidencia.dto";

@Controller("disputes")
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @UseGuards(JwtAuthGuard)
  @Get(":matchId")
  async obtener(@UsuarioActual() usuario: User, @Param("matchId") matchId: string) {
    return this.disputesService.obtenerPorMatchId(matchId, usuario);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":matchId/evidencia")
  @UseInterceptors(
    FileInterceptor("archivo", { limits: { fileSize: EVIDENCIA_TAMANO_MAXIMO_BYTES } }),
  )
  async subirEvidencia(
    @UsuarioActual() usuario: User,
    @Param("matchId") matchId: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body() dto: SubirEvidenciaDto,
  ) {
    return this.disputesService.subirEvidencia(matchId, usuario, archivo, dto.descripcion);
  }
}
