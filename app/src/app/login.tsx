import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, TextInput, View } from "react-native";
import { solicitarOtp } from "@/api/auth";
import { Boton, MarcaHero, Pantalla } from "@/components";
import { useTema, type Tema } from "@/theme";

const PREFIJO = "+54 9";

export default function Login(): React.JSX.Element {
  const router = useRouter();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);
  const [resto, setResto] = useState("");

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

  const telefono = `${PREFIJO.replace(" ", "")}${resto}`;

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
        <View style={{ gap: espaciado.xs }}>
          <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>Teléfono</Text>
          <View style={styles.campoTelefono}>
            <Text style={[tipografia.cuerpo, { color: colores.textoApagado }]}>{PREFIJO}</Text>
            <TextInput
              style={[tipografia.cuerpo, { flex: 1, color: colores.textoPrimario }]}
              placeholder="11 2233 4455"
              placeholderTextColor={colores.textoApagado}
              keyboardType="phone-pad"
              autoComplete="tel"
              value={resto}
              onChangeText={setResto}
            />
          </View>
        </View>

        {mutacion.isError && (
          <Text style={[tipografia.caption, { color: colores.error }]}>
            {mutacion.error.message}
          </Text>
        )}

        <Boton
          onPress={() => mutacion.mutate()}
          cargando={mutacion.isPending}
          deshabilitado={resto.length < 8}
        >
          Mandame el código
        </Boton>

        <Text style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}>
          Un teléfono, un capitán. Es lo que hace que el ranking no sea un chiste.
        </Text>
      </Animated.View>
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    campoTelefono: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: espaciado.sm,
      backgroundColor: colores.superficie,
      borderWidth: 1,
      borderColor: colores.borde,
      borderRadius: radio.md,
      paddingVertical: espaciado.md,
      paddingHorizontal: espaciado.lg,
    },
  };
}
