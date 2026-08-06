import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, TextInput, View } from "react-native";
import { loginConGoogle, obtenerUsuarioActual, solicitarOtp, type CanalOtp } from "@/api/auth";
import { Boton, MarcaHero, Pantalla } from "@/components";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

const PREFIJO = "+54 9";

export default function Login(): React.JSX.Element {
  const router = useRouter();
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);
  const [resto, setResto] = useState("");
  // Default en true: SMS_FROM todavia no esta cargado (falta comprar el numero), asi que por
  // ahora WhatsApp es el unico canal que realmente funciona.
  const [porWhatsApp, setPorWhatsApp] = useState(true);

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
    mutationFn: () => solicitarOtp(telefono, (porWhatsApp ? "WHATSAPP" : "SMS") as CanalOtp),
    onSuccess: () => {
      router.push({ pathname: "/verificar", params: { telefono } });
    },
  });

  const googleMutacion = useMutation({
    mutationFn: (idToken: string) => loginConGoogle(idToken),
    onSuccess: async (tokens) => {
      await iniciarSesion(tokens);
      const usuario = await obtenerUsuarioActual(tokens.accessToken);
      router.replace(usuario.apellido ? "/inicio" : "/completar-perfil");
    },
  });

  const google = useGoogleAuth((idToken) => googleMutacion.mutate(idToken));

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

        <Pressable
          onPress={() => setPorWhatsApp((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: espaciado.sm }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: porWhatsApp ? colores.acento : colores.bordeControl,
              backgroundColor: porWhatsApp ? colores.acento : "transparent",
            }}
          />
          <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
            Enviar por WhatsApp
          </Text>
        </Pressable>

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

        {google.disponible && (
          <>
            <Text style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}>
              o
            </Text>
            {googleMutacion.isError && (
              <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
                {googleMutacion.error.message}
              </Text>
            )}
            <Boton
              variante="secundario"
              onPress={() => google.iniciar()}
              cargando={googleMutacion.isPending}
            >
              Continuar con Google
            </Boton>
          </>
        )}

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
