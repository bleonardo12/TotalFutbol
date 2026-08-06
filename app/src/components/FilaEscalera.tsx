import { Pressable, Text, View } from "react-native";
import { useTema } from "@/theme";

interface AccionFilaEscalera {
  etiqueta: string;
  onPress: () => void;
}

interface FilaEscaleraProps {
  /** "—" para la fila propia cuando el equipo todavia no tiene posicion (sin rankear). */
  posicion: number | string;
  nombre: string;
  rating: number;
  /** Resalta la fila del equipo propio: fondo y borde en acento. */
  esMio?: boolean;
  /** Escudo 32x32 con iniciales antes del nombre -- Ranking lo usa, la escalera condensada de Inicio no (docs Guapo §3.3). */
  escudo?: boolean;
  /** Metadato opcional bajo el nombre, ej. "W7 · 44 partidos". */
  metadato?: string;
  /** Boton chico "RETAR" -- solo si el equipo es desafiable. */
  accion?: AccionFilaEscalera;
  onPress?: () => void;
}

/** Fila de la escalera (ranking) -- version condensada en Inicio, reutilizable en Ranking (docs Guapo §2, §3.1, §3.3). */
function iniciales(nombre: string): string {
  return nombre.trim().slice(0, 2).toUpperCase();
}

export function FilaEscalera({
  posicion,
  nombre,
  rating,
  esMio = false,
  escudo = false,
  metadato,
  accion,
  onPress,
}: FilaEscaleraProps): React.JSX.Element {
  const { colores, espaciado } = useTema();

  const contenido = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        paddingHorizontal: 15,
        backgroundColor: esMio ? colores.superficieAcento : "transparent",
        borderRadius: 13,
        borderWidth: esMio ? 1 : 0,
        borderColor: colores.bordeAcento,
        gap: espaciado.md,
      }}
    >
      <Text
        style={{
          fontFamily: "JetBrainsMono_700Bold",
          fontSize: 15,
          width: 24,
          color: esMio ? colores.acento : colores.textoApagado,
        }}
      >
        {posicion}
      </Text>

      {escudo && (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            backgroundColor: colores.superficieElevada,
            borderWidth: 1,
            borderColor: colores.borde,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: "Archivo_900Black", fontSize: 12, color: colores.acento }}>
            {iniciales(nombre)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Archivo_700Bold",
            fontSize: 15,
            color: esMio ? colores.acento : colores.textoPrimario,
          }}
          numberOfLines={1}
        >
          {nombre}
        </Text>
        {metadato && (
          <Text style={{ fontFamily: "Archivo_500Medium", fontSize: 12, color: colores.textoApagado }}>
            {metadato}
          </Text>
        )}
      </View>

      <Text
        style={{
          fontFamily: "JetBrainsMono_700Bold",
          fontSize: 15,
          color: esMio ? colores.acento : colores.textoPrimario,
        }}
      >
        {Math.round(rating)}
      </Text>

      {accion && (
        <Pressable
          onPress={accion.onPress}
          style={{
            backgroundColor: colores.acento,
            borderRadius: 999,
            paddingVertical: 5,
            paddingHorizontal: 12,
            marginLeft: espaciado.xs,
          }}
        >
          <Text style={{ fontFamily: "Archivo_800ExtraBold", fontSize: 11, color: colores.acentoTexto }}>
            {accion.etiqueta}
          </Text>
        </Pressable>
      )}
    </View>
  );

  return onPress ? <Pressable onPress={onPress}>{contenido}</Pressable> : contenido;
}
