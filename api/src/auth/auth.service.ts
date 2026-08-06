import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { User } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { StorageService } from "../storage/storage.service";
import { PrismaService } from "../prisma/prisma.service";
import { FOTO_MIME_PERMITIDOS } from "./auth.constantes";
import { ActualizarPerfilDto } from "./dto/actualizar-perfil.dto";
import { TokensService, type ParDeTokens } from "./jwt/tokens.service";
import type { CanalOtp } from "./otp/otp-sender.interface";
import { OtpService } from "./otp/otp.service";
import { normalizarTelefono } from "./telefono.util";

interface ArchivoFoto {
  buffer: Buffer;
  mimetype: string;
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {}

  async solicitarOtp(telefono: string, canal: CanalOtp = "SMS"): Promise<void> {
    await this.otp.solicitar(normalizarTelefono(telefono), canal);
  }

  /**
   * Verifica el OTP y crea el usuario si es la primera vez (registro agil, concepto.md §4).
   * `telefono` se normaliza primero (telefono.util.ts) -- el mismo numero real, tipeado con o
   * sin +54/9, siempre tiene que resolver al mismo User.telefono (unique), nunca crear otro.
   */
  async verificarOtp(telefono: string, codigo: string): Promise<ParDeTokens> {
    const normalizado = normalizarTelefono(telefono);
    const valido = await this.otp.verificar(normalizado, codigo);
    if (!valido) {
      throw new UnauthorizedException("Codigo invalido o vencido");
    }

    const usuario = await this.prisma.user.upsert({
      where: { telefono: normalizado },
      update: {},
      create: { telefono: normalizado },
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

  /** Cliente perezoso: sin GOOGLE_CLIENT_ID seteado (dev sin credenciales), el resto de la app
   * sigue arrancando normal -- solo falla si de verdad se intenta usar Google. */
  private obtenerGoogleClient(): OAuth2Client {
    if (!this.googleClient) {
      this.googleClient = new OAuth2Client(this.config.getOrThrow<string>("GOOGLE_CLIENT_ID"));
    }
    return this.googleClient;
  }

  private async verificarIdTokenGoogle(idToken: string): Promise<{ googleId: string; email: string }> {
    const clientId = this.config.getOrThrow<string>("GOOGLE_CLIENT_ID");
    const ticket = await this.obtenerGoogleClient().verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException("Token de Google invalido");
    }
    return { googleId: payload.sub, email: payload.email };
  }

  /**
   * Vincula Google a una cuenta YA existente (requiere sesion iniciada por telefono) -- Google
   * Sign-In no crea cuentas por si solo, el telefono sigue siendo el ancla de identidad
   * obligatoria (decision de Leonardo, 2026-08-06). Mismo criterio de unicidad que ya rige
   * telefono: si el googleId/email ya esta en otra cuenta, se rechaza.
   */
  async vincularGoogle(usuarioId: string, idToken: string): Promise<User> {
    const { googleId, email } = await this.verificarIdTokenGoogle(idToken);

    const existente = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });
    if (existente && existente.id !== usuarioId) {
      throw new ConflictException("Esa cuenta de Google ya esta vinculada a otro usuario");
    }

    return this.prisma.user.update({ where: { id: usuarioId }, data: { googleId, email } });
  }

  /** Login rapido para una cuenta que ya vinculo Google antes -- nunca crea un usuario nuevo. */
  async loginGoogle(idToken: string): Promise<ParDeTokens> {
    const { googleId } = await this.verificarIdTokenGoogle(idToken);

    const usuario = await this.prisma.user.findUnique({ where: { googleId } });
    if (!usuario) {
      throw new UnauthorizedException(
        "Esta cuenta de Google no esta vinculada a ningun usuario. Inicia sesion con tu telefono y vinculala desde tu perfil.",
      );
    }

    return this.tokens.emitirPar(usuario.id, usuario.telefono);
  }
}
