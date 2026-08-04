import { useColorScheme } from "react-native";
import { PALETAS, type Paleta } from "./colores";
import { ESPACIADO, RADIO } from "./espaciado";
import { TIPOGRAFIA } from "./tipografia";

export interface Tema {
  colores: Paleta;
  espaciado: typeof ESPACIADO;
  radio: typeof RADIO;
  tipografia: typeof TIPOGRAFIA;
  esOscuro: boolean;
}

/** Sin Provider: cada componente que lo llama relee el esquema del SO (userInterfaceStyle: automatic en app.json). */
export function useTema(): Tema {
  const esquema = useColorScheme();
  const esOscuro = esquema !== "light";

  return {
    colores: PALETAS[esOscuro ? "dark" : "light"],
    espaciado: ESPACIADO,
    radio: RADIO,
    tipografia: TIPOGRAFIA,
    esOscuro,
  };
}
