import { useEffect, useRef, useState } from "react";
import { Text, type TextStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useTema } from "@/theme";

const DURACION_COUNT_UP_MS = 700;

/**
 * Anima el numero mostrado desde el valor anterior al nuevo cuando
 * `valorObjetivo` cambia (docs/design.md §5, "momento estrella") -- nunca
 * en el primer render, solo cuando React Query refetchea y el rating de
 * verdad cambio (partido liquidado). Cuenta en el JS thread a proposito:
 * mutar texto es una operacion de render, no de estilo, asi que no hay
 * ganancia real en llevarlo al UI thread de Reanimated.
 */
function useCountUp(valorObjetivo: number, reducirMovimiento: boolean): number {
  const [mostrado, setMostrado] = useState(valorObjetivo);
  const anteriorRef = useRef(valorObjetivo);
  const montadoRef = useRef(false);

  useEffect(() => {
    if (!montadoRef.current) {
      montadoRef.current = true;
      anteriorRef.current = valorObjetivo;
      return;
    }
    const desde = anteriorRef.current;
    const hasta = valorObjetivo;
    anteriorRef.current = hasta;
    if (desde === hasta || reducirMovimiento) {
      setMostrado(hasta);
      return;
    }

    const inicio = Date.now();
    let frame: number;
    function tick(): void {
      const progreso = Math.min(1, (Date.now() - inicio) / DURACION_COUNT_UP_MS);
      const suavizado = 1 - (1 - progreso) ** 3; // ease-out cubico
      setMostrado(Math.round(desde + (hasta - desde) * suavizado));
      if (progreso < 1) {
        frame = requestAnimationFrame(tick);
      }
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valorObjetivo, reducirMovimiento]);

  return mostrado;
}

interface NumeroRatingProps {
  valor: number;
  /** Top 3 / Elite: numeral en acento (docs Guapo §1, sin sombras -- unico glow es el escaner QR). */
  podio?: boolean;
  style?: TextStyle;
}

/** Numeral protagonista del rating -- JetBrains Mono, con count-up. */
export function NumeroRating({ valor, podio = false, style }: NumeroRatingProps): React.JSX.Element {
  const { colores, tipografia } = useTema();
  const reducirMovimiento = useReducedMotion();
  const mostrado = useCountUp(Math.round(valor), reducirMovimiento);

  return (
    <Text
      style={[
        tipografia.numeroGrande,
        { color: podio ? colores.acento : colores.textoPrimario },
        style,
      ]}
    >
      {mostrado}
    </Text>
  );
}
