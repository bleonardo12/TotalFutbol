import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminGuard } from "./jwt/admin.guard";
import { JwtAuthGuard } from "./jwt/jwt-auth.guard";
import { JwtStrategy } from "./jwt/jwt.strategy";
import { TokensService } from "./jwt/tokens.service";
import { LogOtpSender } from "./otp/log-otp-sender";
import { OTP_SENDER } from "./otp/otp-sender.interface";
import { OtpService } from "./otp/otp.service";

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokensService,
    JwtStrategy,
    JwtAuthGuard,
    AdminGuard,
    { provide: OTP_SENDER, useClass: LogOtpSender },
  ],
  exports: [JwtAuthGuard, AdminGuard],
})
export class AuthModule {}
