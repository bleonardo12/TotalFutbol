import { Text, View, type ViewStyle } from "react-native";
import { useTema } from "@/theme";

interface EmptyStateProps {
  titulo: string;
  descripcion?: string;
  style?: ViewStyle;
}

/** Reemplaza el texto gris suelto de "todavia no hay X" por una invitacion con jerarquia (docs/design.md §6). */
export function EmptyState({ titulo, descripcion, style }: EmptyStateProps): React.JSX.Element {
  const { colores, espaciado, tipografia } = useTema();

  return (
    <View
      style={[
        { alignItems: "center", paddingVertical: espaciado.xxl, gap: espaciado.xs },
        style,
      ]}
    >
      <Text style={[tipografia.subtitulo, { color: colores.textoPrimario, textAlign: "center" }]}>
        {titulo}
      </Text>
      {descripcion && (
        <Text
          style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}
        >
          {descripcion}
        </Text>
      )}
    </View>
  );
}
