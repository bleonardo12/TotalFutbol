import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList, Text, View } from "react-native";
import {
  aceptarDesafio,
  misDesafios,
  rechazarDesafio,
  ETIQUETA_ESTADO_DESAFIO,
  TONO_ESTADO_DESAFIO,
} from "@/api/challenges";
import { misEquipos } from "@/api/teams";
import { Boton, Chip, EmptyState, Pantalla, Tarjeta } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

export default function MisDesafios(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });
  const miEquipoId = equiposQuery.data?.[0]?.id;

  const desafiosQuery = useQuery({
    queryKey: ["desafios", "mios"],
    queryFn: () => misDesafios(accessToken as string),
    enabled: accessToken !== null,
  });

  const aceptarMutacion = useMutation({
    mutationFn: (id: string) => aceptarDesafio(accessToken as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["desafios", "mios"] });
      queryClient.invalidateQueries({ queryKey: ["partidos", "mios"] });
    },
  });

  const rechazarMutacion = useMutation({
    mutationFn: (id: string) => rechazarDesafio(accessToken as string, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["desafios", "mios"] });
    },
  });

  const pendiente = aceptarMutacion.isPending || rechazarMutacion.isPending;

  return (
    <Pantalla>
      <FlatList
        data={desafiosQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: espaciado.xs }}
        ListEmptyComponent={
          !desafiosQuery.isLoading ? <EmptyState titulo="Todavia no tenes desafios" /> : null
        }
        renderItem={({ item }) => {
          const puedoResponder = item.estado === "PROPUESTO" && item.desafiadoId === miEquipoId;

          return (
            <Tarjeta style={styles.item}>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                {item.desafiante.nombre} vs {item.desafiado.nombre}
              </Text>
              <Chip texto={ETIQUETA_ESTADO_DESAFIO[item.estado]} tono={TONO_ESTADO_DESAFIO[item.estado]} />

              {puedoResponder && (
                <View style={{ flexDirection: "row", gap: espaciado.sm, marginTop: espaciado.xs }}>
                  <View style={{ flex: 1 }}>
                    <Boton
                      onPress={() => aceptarMutacion.mutate(item.id)}
                      deshabilitado={pendiente}
                    >
                      Aceptar
                    </Boton>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Boton
                      variante="destructivo"
                      onPress={() => rechazarMutacion.mutate(item.id)}
                      deshabilitado={pendiente}
                    >
                      Rechazar
                    </Boton>
                  </View>
                </View>
              )}

              {item.estado === "ACEPTADO" && item.partido && (
                <View style={{ marginTop: espaciado.xs }}>
                  <Boton
                    variante="secundario"
                    onPress={() =>
                      router.push({ pathname: "/partido/[id]", params: { id: item.partido!.id } })
                    }
                  >
                    Ver partido pactado
                  </Boton>
                </View>
              )}
            </Tarjeta>
          );
        }}
      />
    </Pantalla>
  );
}

function crearEstilos({ espaciado }: Tema) {
  return {
    item: {
      gap: espaciado.xs,
    },
  };
}
