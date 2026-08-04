import { useMutation, useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { generarHandshake, type CantidadJugadores, type Superficie } from "@/api/matches";
import { misEquipos } from "@/api/teams";
import { useAuthStore } from "@/store/auth-store";

const OPCIONES_CANTIDAD: CantidadJugadores[] = ["F5", "F6", "F7", "F8", "F11"];
const OPCIONES_SUPERFICIE: { valor: Superficie; etiqueta: string }[] = [
  { valor: "SINTETICO", etiqueta: "Sintetico" },
  { valor: "SALON", etiqueta: "Salon" },
  { valor: "PASTO", etiqueta: "Pasto" },
  { valor: "TIERRA", etiqueta: "Tierra" },
];

export default function GenerarPartido(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const [cantidadJugadores, setCantidadJugadores] = useState<CantidadJugadores>("F5");
  const [superficie, setSuperficie] = useState<Superficie>("SINTETICO");

  const equiposQuery = useQuery({
    queryKey: ["equipos", "mios"],
    queryFn: () => misEquipos(accessToken as string),
    enabled: accessToken !== null,
  });
  const equipo = equiposQuery.data?.[0];

  const mutacion = useMutation({
    mutationFn: () =>
      generarHandshake(
        accessToken as string,
        (equipo as { id: string }).id,
        cantidadJugadores,
        superficie,
      ),
  });

  if (equiposQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Generar partido" }} />
        <ActivityIndicator />
      </View>
    );
  }

  if (!equipo) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Generar partido" }} />
        <Text style={styles.aviso}>Primero necesitas crear un equipo.</Text>
        <Pressable style={styles.boton} onPress={() => router.push("/inicio")}>
          <Text style={styles.botonTexto}>Ir a crear equipo</Text>
        </Pressable>
      </View>
    );
  }

  if (mutacion.data) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Generar partido" }} />
        <Text style={styles.etiqueta}>Codigo del partido</Text>
        <View style={styles.qrContenedor}>
          <QRCode value={mutacion.data.codigo} size={220} />
        </View>
        <Text style={styles.codigo}>{mutacion.data.codigo}</Text>
        <Text style={styles.aviso}>
          El rival escanea el QR (o ingresa el codigo a mano). Vence en 10 minutos.
        </Text>
        <Pressable style={styles.boton} onPress={() => router.replace("/partidos")}>
          <Text style={styles.botonTexto}>Ver mis partidos</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Generar partido" }} />
      <Text style={styles.titulo}>Generar partido para {equipo.nombre}</Text>

      <Text style={styles.etiqueta}>Cantidad de jugadores</Text>
      <View style={styles.opciones}>
        {OPCIONES_CANTIDAD.map((opcion) => (
          <Pressable
            key={opcion}
            style={[styles.opcion, cantidadJugadores === opcion && styles.opcionSeleccionada]}
            onPress={() => setCantidadJugadores(opcion)}
          >
            <Text
              style={[
                styles.opcionTexto,
                cantidadJugadores === opcion && styles.opcionTextoSeleccionado,
              ]}
            >
              {opcion.replace("F", "")}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.etiqueta}>Superficie</Text>
      <View style={styles.opciones}>
        {OPCIONES_SUPERFICIE.map((opcion) => (
          <Pressable
            key={opcion.valor}
            style={[styles.opcion, superficie === opcion.valor && styles.opcionSeleccionada]}
            onPress={() => setSuperficie(opcion.valor)}
          >
            <Text
              style={[
                styles.opcionTexto,
                superficie === opcion.valor && styles.opcionTextoSeleccionado,
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        ))}
      </View>

      {mutacion.isError && <Text style={styles.error}>{mutacion.error.message}</Text>}

      <Pressable
        style={[styles.boton, mutacion.isPending && styles.botonDeshabilitado]}
        disabled={mutacion.isPending}
        onPress={() => mutacion.mutate()}
      >
        {mutacion.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Generar codigo</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  titulo: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  etiqueta: {
    fontSize: 14,
    color: "#555",
  },
  opciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  opcion: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  opcionSeleccionada: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  opcionTexto: {
    color: "#333",
  },
  opcionTextoSeleccionado: {
    color: "#fff",
    fontWeight: "600",
  },
  qrContenedor: {
    alignItems: "center",
    marginTop: 16,
  },
  codigo: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
    marginVertical: 16,
  },
  aviso: {
    textAlign: "center",
    color: "#666",
    marginBottom: 16,
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
  error: {
    color: "#c0392b",
  },
});
