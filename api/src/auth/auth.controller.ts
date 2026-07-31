import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RefrescarTokenDto } from "./dto/refrescar-token.dto";
import { SolicitarOtpDto } from "./dto/solicitar-otp.dto";
import { VerificarOtpDto } from "./dto/verificar-otp.dto";
import type { ParDeTokens } from "./jwt/tokens.service";

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
}
