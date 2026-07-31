import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

export interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PayloadAcceso {
  sub: string;
  telefono: string;
}

interface PayloadRefresco {
  sub: string;
  type: "refresh";
}

const TTL_ACCESS = "15m";
const TTL_REFRESH = "30d";

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  emitirPar(usuarioId: string, telefono: string): ParDeTokens {
    const accessToken = this.jwt.sign({ sub: usuarioId, telefono } satisfies PayloadAcceso, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: TTL_ACCESS,
    });
    const refreshToken = this.jwt.sign(
      { sub: usuarioId, type: "refresh" } satisfies PayloadRefresco,
      { secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"), expiresIn: TTL_REFRESH },
    );

    return { accessToken, refreshToken };
  }

  verificarRefresh(token: string): PayloadRefresco {
    try {
      const payload = this.jwt.verify<PayloadRefresco>(token, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
      if (payload.type !== "refresh") {
        throw new UnauthorizedException("Token invalido");
      }
      return payload;
    } catch {
      throw new UnauthorizedException("Refresh token invalido o vencido");
    }
  }
}
