import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { User } from "@prisma/client";

/** Extrae el usuario autenticado (seteado por JwtStrategy) del request. */
export const UsuarioActual = createParamDecorator((_dato: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as User;
});
