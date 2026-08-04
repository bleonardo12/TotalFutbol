import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Text } from "react-native";
import { solicitarOtp } from "@/api/auth";
import { Boton, Campo, MarcaHero, Pantalla } from "@/components";
import { useTema } from "@/theme";

export default function Login(): React.JSX.Element {
  const router = useRouter();
  const { colores, espaciado, tipografia } = useTema();
  const [telefono, setTelefono] = useState("");

  const heroAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(heroAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [heroAnim, formAnim]);

  const estiloHero = {
    opacity: heroAnim,
    transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };
  const estiloForm = {
    opacity: formAnim,
    transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  const mutacion = useMutation({
    mutationFn: () => solicitarOtp(telefono),
    onSuccess: () => {
      router.push({ pathname: "/verificar", params: { telefono } });
    },
  });

  return (
    <Pantalla centrado>
      <Animated.View style={estiloHero}>
        <MarcaHero />
      </Animated.View>
      <Animated.View style={[estiloForm, { gap: espaciado.lg }]}>
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
