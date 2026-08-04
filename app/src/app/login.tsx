import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { solicitarOtp } from "@/api/auth";
import { Boton, Campo, MarcaHero, Pantalla } from "@/components";
import { useTema } from "@/theme";

export default function Login(): React.JSX.Element {
  const router = useRouter();
  const { colores, espaciado, tipografia } = useTema();
  const [telefono, setTelefono] = useState("");

  const mutacion = useMutation({
    mutationFn: () => solicitarOtp(telefono),
    onSuccess: () => {
      router.push({ pathname: "/verificar", params: { telefono } });
    },
  });

  return (
    <Pantalla centrado>
      <Animated.View entering={FadeInDown.duration(500).springify()}>
        <MarcaHero />
      </Animated.View>
      <Animated.View
        entering={FadeInUp.delay(150).duration(500).springify()}
        style={{ gap: espaciado.lg }}
      >
        <Campo
          etiqueta="Telefono (con codigo de pais)"
          placeholder="+5491122334455"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={telefono}
          onChangeText={setTelefono}
        />
        {mutacion.isError && (
          <Text style={[tipografia.caption, { color: colores.error }]}>
            {mutacion.error.message}
          </Text>
        )}
        <Boton
          onPress={() => mutacion.mutate()}
          cargando={mutacion.isPending}
          deshabilitado={telefono.length < 8}
        >
          Enviar codigo
        </Boton>
      </Animated.View>
    </Pantalla>
  );
}
