import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { User } from "@prisma/client";
import { AuthService } from "./auth.service";
import { FOTO_TAMANO_MAXIMO_BYTES } from "./auth.constantes";
import { ActualizarPerfilDto } from "./dto/actualizar-perfil.dto";
import { RefrescarTokenDto } from "./dto/refrescar-token.dto";
import { SolicitarOtpDto } from "./dto/solicitar-otp.dto";
import { VerificarOtpDto } from "./dto/verificar-otp.dto";
import { JwtAuthGuard } from "./jwt/jwt-auth.guard";
import type { ParDeTokens } from "./jwt/tokens.service";
import { UsuarioActual } from "./jwt/usuario-actual.decorator";

const CAMPOS_PERFIL = [
  "id",
  "telefono",
  "nombre",
  "apellido",
  "fechaNacimiento",
  "genero",
  "fotoUrl",
  "rol",
] as const;

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("otp/solicitar")
  @HttpCode(HttpStatus.NO_CONTENT)
  async solicitarOtp(@Body() dto: SolicitarOtpDto): Promise<void> {
    await this.authService.solicitarOtp(dto.telefono);
  }

  @Post("otp/verificar")
  @HttpCode(HttpStatus.OK)
  async verificarOtp(@Body() dto: VerificarOtpDto): Promise<ParDeTokens> {
    return this.authService.verificarOtp(dto.telefono, dto.codigo);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refrescar(@Body() dto: RefrescarTokenDto): Promise<ParDeTokens> {
    return this.authService.refrescar(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  yo(@UsuarioActual() usuario: User): Pick<User, (typeof CAMPOS_PERFIL)[number]> {
    return Object.fromEntries(CAMPOS_PERFIL.map((campo) => [campo, usuario[campo]])) as Pick<
      User,
      (typeof CAMPOS_PERFIL)[number]
    >;
  }

  @UseGuards(JwtAuthGuard)
  @Patch("me")
  async actualizarPerfil(@UsuarioActual() usuario: User, @Body() dto: ActualizarPerfilDto) {
    return this.authService.actualizarPerfil(usuario.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("me/foto")
  @UseInterceptors(FileInterceptor("foto", { limits: { fileSize: FOTO_TAMANO_MAXIMO_BYTES } }))
  async subirFoto(
    @UsuarioActual() usuario: User,
    @UploadedFile() archivo: Express.Multer.File | undefined,
  ) {
    return this.authService.subirFoto(usuario.id, archivo);
  }
}
