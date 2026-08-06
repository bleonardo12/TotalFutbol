import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import {
  aceptarDesafio,
  misDesafios,
  rechazarDesafio,
  ETIQUETA_ESTADO_DESAFIO,
  TONO_ESTADO_DESAFIO,
} from "@/api/challenges";
import { misEquipos } from "@/api/teams";
import { Boton, Chip, Pantalla, Tabs, Tarjeta, type OpcionTab } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

type Solapa = "recibidos" | "enviados";

const OPCIONES_SOLAPA: OpcionTab<Solapa>[] = [
  { valor: "recibidos", etiqueta: "Recibidos" },
  { valor: "enviados", etiqueta: "Enviados" },
];

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function MisDesafios(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const queryClient = useQueryClient();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);
  const [solapa, setSolapa] = useState<Solapa>("recibidos");

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

  const todos = desafiosQuery.data ?? [];
  const recibidos = todos.filter((d) => d.desafiadoId === miEquipoId);
  const enviados = todos.filter((d) => d.desafianteId === miEquipoId);
  const pendientesRecibidos = recibidos.filter((d) => d.estado === "PROPUESTO").length;
  const lista = solapa === "recibidos" ? recibidos : enviados;

  return (
    <Pantalla style={{ padding: 0 }}>
      <View style={{ padding: espaciado.lg, gap: espaciado.md }}>
        <Text style={[tipografia.titulo, { color: colores.textoPrimario }]}>Desafíos</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: espaciado.sm }}>
          <View style={{ flex: 1 }}>
            <Tabs opciones={OPCIONES_SOLAPA} valorActivo={solapa} onCambiar={setSolapa} variante="segmentado" />
          </View>
          {pendientesRecibidos > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>{pendientesRecibidos}</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={lista}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: espaciado.lg, paddingBottom: espaciado.lg, gap: espaciado.sm }}
        ListEmptyComponent={
          !desafiosQuery.isLoading ? (
            <Tarjeta style={{ borderStyle: "dashed", alignItems: "center", gap: espaciado.xs }}>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario, textAlign: "center" }]}>
                {solapa === "recibidos" ? "Nadie te desafió todavía" : "Todavía no retaste a nadie"}
              </Text>
              <Text style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}>
                {solapa === "recibidos"
                  ? "Cuando alguien te rete, aparece acá."
                  : "Andá a la escalera y retá a alguien."}
              </Text>
              {solapa === "enviados" && (
                <Boton variante="secundario" onPress={() => router.push("/ranking")}>
                  Ver la escalera
                </Boton>
              )}
            </Tarjeta>
          ) : null
        }
        renderItem={({ item }) => {
          const soyDesafiante = item.desafianteId === miEquipoId;
          const rival = soyDesafiante ? item.desafiado : item.desafiante;
          const puedoResponder = item.estado === "PROPUESTO" && item.desafiadoId === miEquipoId;
          const rechazado = item.estado === "RECHAZADO";
          const aceptado = item.estado === "ACEPTADO";

          const deltaSiGano = soyDesafiante ? item.deltaDesafianteSiGana : item.deltaDesafiadoSiGana;
          const deltaSiPierdo = soyDesafiante ? item.deltaDesafianteSiPierde : item.deltaDesafiadoSiPierde;

          return (
            <Tarjeta style={{ gap: espaciado.md, opacity: rechazado ? 0.6 : 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[tipografia.cuerpoDestacado, { flex: 1, color: colores.textoPrimario }]}>
                  {soyDesafiante ? `Desafiaste a ${rival.nombre}` : `${rival.nombre} te desafió`}
                </Text>
                <Chip texto={ETIQUETA_ESTADO_DESAFIO[item.estado]} tono={TONO_ESTADO_DESAFIO[item.estado]} />
              </View>

              {(item.estado === "PROPUESTO" || puedoResponder) && (
                <View style={{ flexDirection: "row", gap: espaciado.sm }}>
                  <View style={styles.celdaRiesgo}>
                    <Text style={[styles.celdaRiesgoValor, { color: colores.acento }]}>
                      {`+${Math.round(deltaSiGano)}`}
                    </Text>
                    <Text style={styles.celdaRiesgoEtiqueta}>SI GANÁS</Text>
                  </View>
                  <View style={styles.celdaRiesgo}>
                    <Text style={[styles.celdaRiesgoValor, { color: colores.textoSecundario }]}>
                      {Math.round(deltaSiPierdo)}
                    </Text>
                    <Text style={styles.celdaRiesgoEtiqueta}>SI PERDÉS</Text>
                  </View>
                </View>
              )}

              {aceptado && (
                <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                  {[
                    item.fechaPropuesta ? formatearFecha(item.fechaPropuesta) : null,
                    item.sede?.nombre ?? null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Coordinen la fecha y la cancha en persona."}
                </Text>
              )}

              {rechazado && (
                <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                  {soyDesafiante ? `${rival.nombre} se achicó.` : "Te achicaste."}
                </Text>
              )}

              {puedoResponder && (
                <View style={{ flexDirection: "row", gap: espaciado.sm }}>
                  <View style={{ flex: 1 }}>
                    <Boton onPress={() => aceptarMutacion.mutate(item.id)} deshabilitado={pendiente}>
                      Aceptar
                    </Boton>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Boton
                      variante="secundario"
                      onPress={() => rechazarMutacion.mutate(item.id)}
                      deshabilitado={pendiente}
                    >
                      Achicarse
                    </Boton>
                  </View>
                </View>
              )}

              {aceptado && item.partido && (
                <Boton
                  variante="secundario"
                  onPress={() =>
                    router.push({ pathname: "/partido/[id]", params: { id: (item.partido as { id: string }).id } })
                  }
                >
                  Ver partido pactado
                </Boton>
              )}
            </Tarjeta>
          );
        }}
      />
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    badge: {
      backgroundColor: colores.acento,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 1,
    },
    badgeTexto: {
      fontFamily: "JetBrainsMono_800ExtraBold",
      fontSize: 11,
      color: colores.acentoTexto,
    },
    celdaRiesgo: {
      flex: 1,
      backgroundColor: colores.superficieHundida,
      borderRadius: radio.md,
      paddingVertical: espaciado.sm,
      alignItems: "center" as const,
      gap: 3,
    },
    celdaRiesgoValor: {
      fontFamily: "JetBrainsMono_800ExtraBold",
      fontSize: 16,
    },
    celdaRiesgoEtiqueta: {
      fontFamily: "Archivo_800ExtraBold",
      fontSize: 10,
      letterSpacing: 1.2,
      color: colores.textoApagado,
    },
  };
}
