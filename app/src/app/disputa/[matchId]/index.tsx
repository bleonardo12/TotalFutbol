import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { type CapaDisputa, obtenerDisputa } from "@/api/disputes";
import { obtenerPartido } from "@/api/matches";
import { useAuthStore } from "@/store/auth-store";

const ETIQUETA_CAPA: Record<CapaDisputa, string> = {
  C1_EVIDENCIA: "Evidencia (C1)",
  C2_PLANTELES: "Consulta al plantel (C2)",
  C3_ADMIN: "Decision del admin (C3)",
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function EstadoDisputa(): React.JSX.Element {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);

  const partidoQuery = useQuery({
    queryKey: ["partidos", matchId],
    queryFn: () => obtenerPartido(accessToken as string, matchId),
    enabled: accessToken !== null && !!matchId,
  });

  const disputaQuery = useQuery({
    queryKey: ["disputas", matchId],
    queryFn: () => obtenerDisputa(accessToken as string, matchId),
    enabled: accessToken !== null && !!matchId,
  });

  if (partidoQuery.isLoading || disputaQuery.isLoading) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator />
      </View>
    );
  }

  const partido = partidoQuery.data;
  const disputa = disputaQuery.data;

  if (!partido || !disputa) {
    return (
      <View style={styles.centro}>
        <Text style={styles.aviso}>No se pudo cargar la disputa.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>
        {partido.equipoLocal.nombre} vs {partido.equipoVisitante.nombre}
      </Text>

      {disputa.resuelta ? (
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>Disputa resuelta</Text>
          <Text style={styles.valorGrande}>
            {disputa.anulada
              ? "Anulada (VOID) — resultado indeterminable"
              : disputa.resolucion === "EMPATE"
                ? "Empate"
                : disputa.resolucion === "GANA_LOCAL"
                  ? `Gano ${partido.equipoLocal.nombre}`
                  : `Gano ${partido.equipoVisitante.nombre}`}
          </Text>
          <Text style={styles.detalle}>
            {disputa.resueltaPor
              ? `Resuelta por el admin el ${formatearFecha(disputa.resueltaEn as string)}`
              : `Vencio sin resolucion el ${formatearFecha(disputa.resueltaEn as string)}`}
          </Text>
        </View>
      ) : (
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>Etapa actual</Text>
          <Text style={styles.valorGrande}>{ETIQUETA_CAPA[disputa.capa]}</Text>
          <Text style={styles.detalle}>Vence el {formatearFecha(disputa.capaExpiraEn)}</Text>
        </View>
      )}

      {disputa.capa === "C1_EVIDENCIA" && !disputa.resuelta && (
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>Codigo para la foto de evidencia</Text>
          <Text style={styles.nonce}>{disputa.nonce}</Text>
          <Text style={styles.detalle}>
            Escribilo a mano y visible en la foto que subas como evidencia.
          </Text>
        </View>
      )}

      {!disputa.resuelta && (
        <>
          <Link
            href={{ pathname: "/disputa/[matchId]/subir-evidencia", params: { matchId } }}
            asChild
          >
            <Pressable style={styles.boton}>
              <Text style={styles.botonTexto}>Subir evidencia</Text>
            </Pressable>
          </Link>

          <Link href={{ pathname: "/disputa/[matchId]/poll", params: { matchId } }} asChild>
            <Pressable style={styles.botonSecundario}>
              <Text style={styles.botonSecundarioTexto}>Responder consulta al plantel</Text>
            </Pressable>
          </Link>
        </>
      )}

      <View style={styles.seccion}>
        <Text style={styles.subtitulo}>Evidencia subida</Text>
        {disputa.evidencias.length === 0 ? (
          <Text style={styles.vacio}>Todavia no se subio evidencia.</Text>
        ) : (
          disputa.evidencias.map((evidencia) => (
            <View key={evidencia.id} style={styles.evidencia}>
              <Image source={{ uri: evidencia.url }} style={styles.miniatura} />
              <View style={styles.evidenciaInfo}>
                <Text style={styles.evidenciaEquipo}>{evidencia.team.nombre}</Text>
                {evidencia.descripcion && (
                  <Text style={styles.detalle}>{evidencia.descripcion}</Text>
                )}
                <Text style={styles.detalle}>{formatearFecha(evidencia.createdAt)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 16,
    gap: 4,
  },
  etiqueta: {
    fontSize: 13,
    color: "#666",
  },
  valorGrande: {
    fontSize: 18,
    fontWeight: "600",
  },
  detalle: {
    fontSize: 13,
    color: "#888",
  },
  nonce: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
  },
  seccion: {
    gap: 8,
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: "600",
  },
  vacio: {
    color: "#888",
  },
  evidencia: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 8,
  },
  miniatura: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: "#f2f2f2",
  },
  evidenciaInfo: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
  },
  evidenciaEquipo: {
    fontWeight: "600",
  },
  aviso: {
    textAlign: "center",
    color: "#666",
  },
  boton: {
    backgroundColor: "#208AEF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  botonTexto: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: "#208AEF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  botonSecundarioTexto: {
    color: "#208AEF",
    fontWeight: "600",
    fontSize: 16,
  },
});
