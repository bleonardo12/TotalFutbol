import { View } from "react-native";
import { useTema } from "@/theme";

/** Tono secundario propio del skeleton (docs Guapo §3.4) -- no se usa en ningun otro lado de la paleta. */
const TONO_SECUNDARIO = "#131E19";

interface SkeletonProps {
  ancho?: number | `${number}%`;
  alto?: number;
  variante?: "principal" | "secundaria";
  radio?: number;
}

/**
 * Bloque de carga (docs Guapo §3.4): reemplaza la pantalla en blanco mientras cargan las queries.
 * A proposito sin animacion de shimmer -- "en oscuro queda ruidoso".
 */
export function Skeleton({
  ancho = "100%",
  alto = 16,
  variante = "principal",
  radio = 6,
}: SkeletonProps): React.JSX.Element {
  const { colores } = useTema();
  return (
    <View
      style={{
        width: ancho,
        height: alto,
        borderRadius: radio,
        backgroundColor: variante === "principal" ? colores.superficieElevada : TONO_SECUNDARIO,
      }}
    />
  );
}
