import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { User } from "@prisma/client";
import { StorageService } from "../storage/storage.service";
import { PrismaService } from "../prisma/prisma.service";
import { FOTO_MIME_PERMITIDOS } from "./auth.constantes";
import { ActualizarPerfilDto } from "./dto/actualizar-perfil.dto";
import { TokensService, type ParDeTokens } from "./jwt/tokens.service";
import { OtpService } from "./otp/otp.service";

interface ArchivoFoto {
  buffer: Buffer;
  mimetype: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
    private readonly storageService: StorageService,
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

  /**
   * Perfil personal (Hito 6b): nombre/apellido/fecha de nacimiento/genero,
   * separado del nombre del equipo (Team.nombre). Actualizacion parcial --
   * la pantalla de onboarding decide que campos son obligatorios para
   * avanzar, la API no fuerza que vengan todos juntos.
   */
  async actualizarPerfil(usuarioId: string, dto: ActualizarPerfilDto): Promise<User> {
    return this.prisma.user.update({
      where: { id: usuarioId },
      data: {
        nombre: dto.nombre,
        apellido: dto.apellido,
        fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : undefined,
        genero: dto.genero,
      },
    });
  }

  /** Foto de perfil (opcional, concepto.md no la menciona -- decision de Hito 6b). */
  async subirFoto(usuarioId: string, archivo: ArchivoFoto | undefined): Promise<User> {
    if (!archivo) {
      throw new BadRequestException("Falta el archivo de foto");
    }
    if (!FOTO_MIME_PERMITIDOS.includes(archivo.mimetype)) {
      throw new BadRequestException("Formato de imagen no soportado (usa jpg, png o webp)");
    }
    const fotoUrl = await this.storageService.subir(archivo);
    return this.prisma.user.update({ where: { id: usuarioId }, data: { fotoUrl } });
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
