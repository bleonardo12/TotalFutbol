import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import type { User } from "@prisma/client";
import { AuthService } from "./auth.service";
import { RefrescarTokenDto } from "./dto/refrescar-token.dto";
import { SolicitarOtpDto } from "./dto/solicitar-otp.dto";
import { VerificarOtpDto } from "./dto/verificar-otp.dto";
import { JwtAuthGuard } from "./jwt/jwt-auth.guard";
import type { ParDeTokens } from "./jwt/tokens.service";
import { UsuarioActual } from "./jwt/usuario-actual.decorator";

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
  yo(@UsuarioActual() usuario: User): Pick<User, "id" | "telefono" | "nombre" | "rol"> {
    return { id: usuario.id, telefono: usuario.telefono, nombre: usuario.nombre, rol: usuario.rol };
  }
}
