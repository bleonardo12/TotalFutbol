import type { ReactNode } from "react";
import { Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HojaInferiorProps {
  visible: boolean;
  onCerrar: () => void;
  children: ReactNode;
}

/** Bottom sheet reutilizable. SIEMPRE suma el area segura inferior al padding -- sin esto el
 * contenido queda debajo de la barra de navegacion del sistema en Android y no se puede tocar
 * (bug real, encontrado dos veces: el selector de equipo y el modal de "Como funciona"). */
export function HojaInferior({ visible, onCerrar, children }: HojaInferiorProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        onPress={onCerrar}
      >
        <Pressable style={{ padding: 20, paddingBottom: 20 + insets.bottom }}>{children}</Pressable>
      </Pressable>
    </Modal>
  );
}
