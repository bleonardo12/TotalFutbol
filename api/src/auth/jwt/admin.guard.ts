import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { User } from "@prisma/client";

/** Se usa junto a JwtAuthGuard: solo deja pasar si el usuario autenticado es ADMIN. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const usuario = request.user as User | undefined;
    if (usuario?.rol !== "ADMIN") {
      throw new ForbiddenException("Requiere rol de administrador");
    }
    return true;
  }
}
