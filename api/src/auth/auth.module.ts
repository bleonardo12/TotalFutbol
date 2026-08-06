import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
import { TwilioOtpSender } from "./otp/twilio-otp-sender";

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
    LogOtpSender,
    TwilioOtpSender,
    {
      provide: OTP_SENDER,
      useFactory: (config: ConfigService, log: LogOtpSender, twilio: TwilioOtpSender) =>
        config.get<string>("OTP_PROVIDER") === "twilio" ? twilio : log,
      inject: [ConfigService, LogOtpSender, TwilioOtpSender],
    },
  ],
  exports: [JwtAuthGuard, AdminGuard],
})
export class AuthModule {}
