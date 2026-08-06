import { BadRequestException } from "@nestjs/common";
import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Normaliza a un E.164 canonico fijo para Argentina movil (+549 + 10 digitos), sea cual sea el
 * formato en que el usuario lo haya tipeado (con o sin +54, con o sin el 9 movil) -- el mismo
 * numero real siempre tiene que resolver al mismo `User.telefono` (unique), sino cada variante de
 * formato crea una cuenta distinta. Solo AR por ahora (concepto.md §16, unico mercado del producto).
 */
export function normalizarTelefono(crudo: string): string {
  const soloDigitos = crudo.replace(/[^0-9]/g, "");

  let local = soloDigitos;
  if (local.startsWith("549")) {
    local = local.slice(3);
  } else if (local.startsWith("54")) {
    local = local.slice(2);
  } else if (local.startsWith("9") && local.length === 11) {
    local = local.slice(1);
  }

  if (local.length !== 10) {
    throw new BadRequestException("Numero de telefono invalido");
  }

  const normalizado = `+549${local}`;
  const parseado = parsePhoneNumberFromString(normalizado);
  if (!parseado || !parseado.isValid()) {
    throw new BadRequestException("Numero de telefono invalido");
  }
  return normalizado;
}
