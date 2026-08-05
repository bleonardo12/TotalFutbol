import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { responderPoll, type RespuestaPoll } from "@/api/disputes";
import { Boton, Campo, Pantalla } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

const OPCIONES: { valor: RespuestaPoll; etiqueta: string }[] = [
  { valor: "CONFIRMA_CAPITAN", etiqueta: "Confirmo lo que dijo mi capitan" },
  { valor: "CONTRADICE_CAPITAN", etiqueta: "No es lo que paso" },
];

export default function PollPlantel(): React.JSX.Element {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);
  const [respuesta, setRespuesta] = useState<RespuestaPoll | null>(null);
  const [comentario, setComentario] = useState("");

  const mutacion = useMutation({
    mutationFn: () => {
      if (!respuesta) {
        throw new Error("Elegi una opcion");
      }
      return responderPoll(accessToken as string, matchId, respuesta, comentario || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disputas", matchId] });
      router.back();
    },
  });

  return (
    <Pantalla>
      <Stack.Screen options={{ title: "Consulta al plantel" }} />
      <Text style={[tipografia.titulo, { color: colores.textoPrimario, textAlign: "center" }]}>
        Consulta al plantel
      </Text>
      <Text
        style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}
      >
        Esto no decide nada por si solo: es una señal mas para que el admin resuelva la disputa.
      </Text>

      <View style={{ gap: espaciado.sm }}>
        {OPCIONES.map((opcion) => {
          const activo = respuesta === opcion.valor;
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => setRespuesta(opcion.valor)}
              style={[styles.opcion, activo && styles.opcionActiva]}
            >
              <Text
                style={[
                  tipografia.cuerpoDestacado,
                  { color: activo ? colores.acentoTexto : colores.textoPrimario },
                ]}
              >
                {opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Campo
        etiqueta="Comentario (opcional)"
        placeholder="Contanos que viste"
        value={comentario}
        onChangeText={setComentario}
        maxLength={280}
        multiline
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />

      {mutacion.isError && (
        <Text style={[tipografia.caption, { color: colores.error, textAlign: "center" }]}>
          {mutacion.error.message}
        </Text>
      )}

      <Boton
        onPress={() => mutacion.mutate()}
        cargando={mutacion.isPending}
        deshabilitado={!respuesta}
      >
        Enviar respuesta
      </Boton>
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    opcion: {
      borderWidth: 1,
      borderColor: colores.borde,
      borderRadius: radio.md,
      padding: espaciado.md,
    },
    opcionActiva: {
      backgroundColor: colores.acento,
      borderColor: colores.acento,
    },
  };
}
