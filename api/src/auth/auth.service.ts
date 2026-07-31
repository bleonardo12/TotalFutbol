import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TokensService, type ParDeTokens } from "./jwt/tokens.service";
import { OtpService } from "./otp/otp.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
  ) {}

  async solicitarOtp(telefono: string): Promise<void> {
    await this.otp.solicitar(telefono);
  }

  /** Verifica el OTP y crea el usuario si es la primera vez (registro agil, concepto.md §4). */
  async verificarOtp(telefono: string, codigo: string): Promise<ParDeTokens> {
    const valido = await this.otp.verificar(telefono, codigo);
    if (!valido) {
      throw new UnauthorizedException("Codigo invalido o vencido");
    }

    const usuario = await this.prisma.user.upsert({
      where: { telefono },
      update: {},
      create: { telefono },
    });

    return this.tokens.emitirPar(usuario.id, usuario.telefono);
  }

  async refrescar(refreshToken: string): Promise<ParDeTokens> {
    const payload = this.tokens.verificarRefresh(refreshToken);

    const usuario = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!usuario) {
      throw new UnauthorizedException("Usuario no encontrado");
    }

    return this.tokens.emitirPar(usuario.id, usuario.telefono);
  }
}
