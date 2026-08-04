import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { verificarOtp } from "@/api/auth";
import { Boton, Campo, Pantalla } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

export default function Verificar(): React.JSX.Element {
  const { telefono } = useLocalSearchParams<{ telefono: string }>();
  const router = useRouter();
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const { colores, espaciado, tipografia } = useTema();
  const [codigo, setCodigo] = useState("");

  const mutacion = useMutation({
    mutationFn: () => verificarOtp(telefono, codigo),
    onSuccess: async (tokens) => {
      await iniciarSesion(tokens);
      router.replace("/equipo");
    },
  });

  return (
    <Pantalla centrado>
      <Animated.View entering={FadeInDown.duration(450).springify()} style={{ gap: espaciado.lg }}>
        <Text
          style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}
        >
          Verificar codigo
        </Text>
        <Text
          style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}
        >
          Te enviamos un codigo a {telefono}
        </Text>

        <Campo
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={6}
          value={codigo}
          onChangeText={setCodigo}
          style={{ textAlign: "center", letterSpacing: 6 }}
        />

        {mutacion.isError && (
          <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
            {mutacion.error.message}
          </Text>
        )}

        <Boton
          onPress={() => mutacion.mutate()}
          cargando={mutacion.isPending}
          deshabilitado={codigo.length !== 6}
        >
          Verificar
        </Boton>
      </Animated.View>
    </Pantalla>
  );
}
