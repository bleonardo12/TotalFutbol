import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, TextInput, View } from "react-native";
import { obtenerUsuarioActual, solicitarOtp, verificarOtp, type CanalOtp } from "@/api/auth";
import { Boton, Pantalla } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

const LONGITUD_CODIGO = 6;
const REENVIO_SEGUNDOS = 30;

export default function Verificar(): React.JSX.Element {
  const { telefono, canal } = useLocalSearchParams<{ telefono: string; canal: CanalOtp }>();
  const router = useRouter();
  const iniciarSesion = useAuthStore((s) => s.iniciarSesion);
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);
  const [codigo, setCodigo] = useState("");
  const [segundosParaReenviar, setSegundosParaReenviar] = useState(REENVIO_SEGUNDOS);
  const inputRef = useRef<TextInput>(null);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [anim]);
  const estiloAnimado = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  useEffect(() => {
    if (segundosParaReenviar <= 0) return;
    const intervalo = setInterval(() => setSegundosParaReenviar((s) => s - 1), 1000);
    return () => clearInterval(intervalo);
  }, [segundosParaReenviar]);

  const mutacion = useMutation({
    mutationFn: () => verificarOtp(telefono, codigo),
    onSuccess: async (tokens) => {
      await iniciarSesion(tokens);
      const usuario = await obtenerUsuarioActual(tokens.accessToken);
      router.replace(usuario.apellido ? "/inicio" : "/completar-perfil");
    },
  });

  /**
   * En Android, si el usuario cierra el teclado a mano (boton atras, swipe), el TextInput queda
   * "enfocado" en el estado interno de RN aunque el teclado del sistema ya se escondio -- llamar
   * .focus() de nuevo no hace nada porque RN cree que ya lo esta. Forzar blur antes reinicia ese
   * estado y el focus() del siguiente frame si vuelve a abrir el teclado.
   */
  function reenfocarCodigo(): void {
    inputRef.current?.blur();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const reenviarMutacion = useMutation({
    mutationFn: () => solicitarOtp(telefono, canal),
    onSuccess: () => {
      setCodigo("");
      setSegundosParaReenviar(REENVIO_SEGUNDOS);
      reenfocarCodigo();
    },
  });

  return (
    <Pantalla centrado>
      <Animated.View style={[estiloAnimado, { gap: espaciado.lg }]}>
        <Text style={[tipografia.display, { color: colores.textoPrimario, textAlign: "center" }]}>
          Los 6 dígitos que te llegaron
        </Text>
        <Text style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}>
          Te enviamos un código a {telefono}
        </Text>

        <View style={styles.cajasContenedor}>
          <View style={styles.cajasFila} pointerEvents="none">
            {Array.from({ length: LONGITUD_CODIGO }).map((_, indice) => {
              const caracter = codigo[indice];
              const activa = indice === codigo.length;
              return (
                <View
                  key={indice}
                  style={[
                    styles.caja,
                    caracter ? styles.cajaLlena : undefined,
                    activa ? styles.cajaActiva : undefined,
                  ]}
                >
                  {caracter ? (
                    <Text style={[tipografia.titulo, { color: colores.textoPrimario }]}>{caracter}</Text>
                  ) : activa ? (
                    <View style={styles.cursor} />
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* Tapar directo esto (no un Pressable + .focus() imperativo) es lo que hace que el
              toque siempre abra el teclado nativo, incluso despues de cerrarlo a mano. */}
          <TextInput
            ref={inputRef}
            value={codigo}
            onChangeText={(texto) => setCodigo(texto.replace(/[^0-9]/g, "").slice(0, LONGITUD_CODIGO))}
            keyboardType="number-pad"
            maxLength={LONGITUD_CODIGO}
            autoFocus
            style={styles.inputOculto}
          />
        </View>

        {mutacion.isError && (
          <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
            {mutacion.error.message}
          </Text>
        )}

        <Boton
          onPress={() => mutacion.mutate()}
          cargando={mutacion.isPending}
          deshabilitado={codigo.length !== LONGITUD_CODIGO}
        >
          Verificar
        </Boton>

        {segundosParaReenviar > 0 ? (
          <Text style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}>
            {`⏳ Reenviar código en 0:${String(segundosParaReenviar).padStart(2, "0")}`}
          </Text>
        ) : (
          <>
            <Pressable onPress={() => reenviarMutacion.mutate()} disabled={reenviarMutacion.isPending}>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.acento, textAlign: "center" }]}>
                Reenviar código
              </Text>
            </Pressable>
            {reenviarMutacion.isError && (
              <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
                {reenviarMutacion.error.message}
              </Text>
            )}
          </>
        )}
      </Animated.View>
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    cajasContenedor: {
      position: "relative" as const,
    },
    cajasFila: {
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      gap: espaciado.sm,
    },
    caja: {
      width: 48,
      height: 62,
      borderRadius: radio.md,
      borderWidth: 1,
      borderColor: colores.borde,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    cajaLlena: {
      borderColor: colores.bordeAcento,
    },
    cajaActiva: {
      borderWidth: 2,
      borderColor: colores.acento,
    },
    cursor: {
      width: 2,
      height: 26,
      backgroundColor: colores.acento,
    },
    inputOculto: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0,
    },
  };
}
