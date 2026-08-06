import { useMutation } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { consumirInvitacion } from "@/api/teams";
import { Boton, Campo, Pantalla } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema } from "@/theme";

const LONGITUD_CODIGO = 8;

/** El codigo llega por SMS/WhatsApp -- se tipea, igual que el OTP (no hay QR para esto). */
export default function UnirseEquipo(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const { colores, espaciado, tipografia } = useTema();
  const [codigo, setCodigo] = useState("");

  const mutacion = useMutation({
    mutationFn: () => consumirInvitacion(accessToken as string, codigo.toUpperCase()),
    onSuccess: (equipo) => {
      router.replace({ pathname: "/equipo/[id]", params: { id: equipo.id } });
    },
  });

  return (
    <Pantalla centrado>
      <Stack.Screen options={{ title: "Unirme a un equipo" }} />
      <View style={{ gap: espaciado.lg }}>
        <Text style={[tipografia.display, { color: colores.textoPrimario, textAlign: "center" }]}>
          El código que te mandaron
        </Text>
        <Text style={[tipografia.cuerpo, { color: colores.textoSecundario, textAlign: "center" }]}>
          Te lo mandó el capitán por SMS o WhatsApp.
        </Text>

        <Campo
          placeholder="7KM4P9X2"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={LONGITUD_CODIGO}
          value={codigo}
          onChangeText={setCodigo}
          style={{ textAlign: "center", letterSpacing: 4 }}
        />

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
          Unirme al equipo
        </Boton>
      </View>
    </Pantalla>
  );
}
