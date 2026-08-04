import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import { obtenerUsuarioActual, verificarOtp } from "@/api/auth";
import { Boton, Campo, Pantalla } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

export default function Verificar(): React.JSX.Element {
  const { telefono } = useLocalSearchParams<{ telefono: string }>();
  const router = useRouter();
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const { colores, espaciado, tipografia } = useTema();
  const [codigo, setCodigo] = useState("");

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [anim]);
  const estiloAnimado = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  const mutacion = useMutation({
    mutationFn: () => verificarOtp(telefono, codigo),
    onSuccess: async (tokens) => {
      await iniciarSesion(tokens);
      const usuario = await obtenerUsuarioActual(tokens.accessToken);
      router.replace(usuario.apellido ? "/inicio" : "/completar-perfil");
    },
  });

  return (
    <Pantalla centrado>
      <Animated.View style={[estiloAnimado, { gap: espaciado.lg }]}>
        <Text style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}>
          Verificar codigo
        </Text>
        <Text style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}>
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
