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
import { AdminGuard } from "../auth/jwt/admin.guard";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { UsuarioActual } from "../auth/jwt/usuario-actual.decorator";
import { EVIDENCIA_TAMANO_MAXIMO_BYTES } from "./disputes.constantes";
import { DisputesService } from "./disputes.service";
import { ResponderPollDto } from "./dto/responder-poll.dto";
import { SubirEvidenciaDto } from "./dto/subir-evidencia.dto";

@Controller("disputes")
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  /** Cola del admin: todas las disputas todavia sin resolver, en cualquier capa. */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async listarPendientes() {
    return this.disputesService.listarPendientes();
  }

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

  @UseGuards(JwtAuthGuard)
  @Post(":matchId/poll")
  async responderPoll(
    @UsuarioActual() usuario: User,
    @Param("matchId") matchId: string,
    @Body() dto: ResponderPollDto,
  ) {
    return this.disputesService.responderPoll(matchId, usuario, dto);
  }
}
