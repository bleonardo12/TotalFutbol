import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { misPartidos, ETIQUETA_ESTADO_PARTIDO, TONO_ESTADO_PARTIDO } from "@/api/matches";
import { Boton, Chip, EmptyState, Pantalla } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

export default function ListaPartidos(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);

  const partidosQuery = useQuery({
    queryKey: ["partidos", "mios"],
    queryFn: () => misPartidos(accessToken as string),
    enabled: accessToken !== null,
  });

  return (
    <Pantalla>
      <View style={{ flexDirection: "row", gap: espaciado.sm }}>
        <View style={{ flex: 1 }}>
          <Boton variante="secundario" onPress={() => router.push("/partido/generar")}>
            Generar codigo
          </Boton>
        </View>
        <View style={{ flex: 1 }}>
          <Boton variante="secundario" onPress={() => router.push("/partido/unirse")}>
            Unirme con codigo
          </Boton>
        </View>
      </View>

      <FlatList
        data={partidosQuery.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: espaciado.xs }}
        refreshControl={
          <RefreshControl
            refreshing={partidosQuery.isFetching}
            onRefresh={() => partidosQuery.refetch()}
            tintColor={colores.acento}
          />
        }
        ListEmptyComponent={
          !partidosQuery.isLoading ? <EmptyState titulo="Todavia no tenes partidos" /> : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.item}
            onPress={() => router.push({ pathname: "/partido/[id]", params: { id: item.id } })}
          >
            <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
              {item.equipoLocal.nombre} vs {item.equipoVisitante.nombre}
            </Text>
            <Chip texto={ETIQUETA_ESTADO_PARTIDO[item.estado]} tono={TONO_ESTADO_PARTIDO[item.estado]} />
          </Pressable>
        )}
      />
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    item: {
      backgroundColor: colores.superficie,
      borderRadius: radio.md,
      padding: espaciado.md,
      gap: espaciado.xs,
    },
  };
}
