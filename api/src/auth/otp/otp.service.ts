import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomInt } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { OTP_INTENTOS_MAXIMOS, OTP_LONGITUD, OTP_TTL_MINUTOS } from "./otp.constantes";
import { OTP_SENDER, type CanalOtp, type OtpSender } from "./otp-sender.interface";

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(OTP_SENDER) private readonly otpSender: OtpSender,
  ) {}

  async solicitar(telefono: string, canal: CanalOtp): Promise<void> {
    const codigo = this.generarCodigo();

    // Invalida cualquier codigo vigente anterior: solo hay un codigo activo por telefono.
    await this.prisma.otpCode.updateMany({
      where: { telefono, usado: false },
      data: { usado: true },
    });

    await this.prisma.otpCode.create({
      data: {
        telefono,
        codigoHash: this.hashear(telefono, codigo),
        expiraEn: new Date(Date.now() + OTP_TTL_MINUTOS * 60_000),
      },
    });

    await this.otpSender.enviar(telefono, codigo, canal);
  }

  async verificar(telefono: string, codigo: string): Promise<boolean> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { telefono, usado: false, expiraEn: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!otp || otp.intentos >= OTP_INTENTOS_MAXIMOS) {
      if (otp) {
        await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usado: true } });
      }
      return false;
    }

    if (otp.codigoHash !== this.hashear(telefono, codigo)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { intentos: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usado: true } });
    return true;
  }

  private generarCodigo(): string {
    const min = 10 ** (OTP_LONGITUD - 1);
    const max = 10 ** OTP_LONGITUD - 1;
    return randomInt(min, max + 1).toString();
  }

  private hashear(telefono: string, codigo: string): string {
    const secreto = this.config.getOrThrow<string>("OTP_HASH_SECRET");
    return createHmac("sha256", secreto).update(`${telefono}:${codigo}`).digest("hex");
  }
}
