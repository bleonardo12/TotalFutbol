import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import { crearEquipo, misEquipos, type Division } from "@/api/teams";
import { useAuthStore } from "@/store/auth-store";

const ETIQUETA_DIVISION: Record<Division, string> = {
  ELITE: "Elite",
  ORO: "Oro",
  PLATA: "Plata",
  BRONCE: "Bronce",
};

export default function Equipo(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");

  const usuarioQuery = useQuery({
    queryKey: ["usuario", "actual"],
    queryFn: () => obtenerUsuarioActual(accessToken as string),
    enabled: accessToken !== null,
  });

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });

  const crearMutacion = useMutation({
    mutationFn: () => crearEquipo(accessToken as string, nombre),
    onSuccess: () => {
      setNombre("");
      queryClient.invalidateQueries({ queryKey: ["equipos", "mios"] });
    },
  });

  async function salir(): Promise<void> {
    await cerrarSesion();
    router.replace("/login");
  }

  if (equiposQuery.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  const equipo = equiposQuery.data?.[0];

  return (
    <View style={styles.container}>
      {equipo ? (
        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>{equipo.nombre}</Text>
          <Text style={styles.etiqueta}>
            Estado: {equipo.estado === "RANKEADO" ? "Rankeado" : "Provisional"}
          </Text>
          <Text style={styles.etiqueta}>Rating: {Math.round(equipo.rating)}</Text>
          {equipo.division && (
            <Text style={styles.etiqueta}>División: {ETIQUETA_DIVISION[equipo.division]}</Text>
          )}
          <Text style={styles.etiqueta}>Fair-play: {Math.round(equipo.fairPlay)}</Text>
          <Link href="/partido" style={styles.link}>
            Ver mis partidos
          </Link>
          <Link href="/desafio" style={styles.link}>
            Ver mis desafios
          </Link>
          <Link href="/ranking" style={styles.link}>
            Ver ranking
          </Link>
        </View>
      ) : (
        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>Crear equipo</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del equipo"
            value={nombre}
            onChangeText={setNombre}
          />
          {crearMutacion.isError && <Text style={styles.error}>{crearMutacion.error.message}</Text>}
          <Pressable
            style={[
              styles.boton,
              (crearMutacion.isPending || nombre.length < 2) && styles.botonDeshabilitado,
            ]}
            disabled={crearMutacion.isPending || nombre.length < 2}
            onPress={() => crearMutacion.mutate()}
          >
            {crearMutacion.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>Crear</Text>
            )}
          </Pressable>
        </View>
      )}
      {usuarioQuery.data?.rol === "ADMIN" && (
        <Link href="/admin" style={styles.link}>
          Panel de admin
        </Link>
      )}
      <Pressable style={styles.botonSecundario} onPress={salir}>
        <Text style={styles.botonSecundarioTexto}>Cerrar sesion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 24,
  },
  tarjeta: {
    gap: 8,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  etiqueta: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  link: {
    color: "#208AEF",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  boton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  botonTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  botonSecundario: {
    alignItems: "center",
    padding: 8,
  },
  botonSecundarioTexto: {
    color: "#888",
  },
  error: {
    color: "#c0392b",
  },
});
