import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import { Boton, Chip, ComoFunciona, HojaInferior, Pantalla, Tarjeta } from "@/components";
import { useEquipoActivo } from "@/hooks/useEquipoActivo";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

export default function Perfil(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const router = useRouter();
  const tema = useTema();
  const { colores, tipografia } = tema;
  const styles = crearEstilos(tema);
  const [comoFuncionaAbierto, setComoFuncionaAbierto] = useState(false);

  const usuarioQuery = useQuery({
    queryKey: ["usuario", "actual"],
    queryFn: () => obtenerUsuarioActual(accessToken as string),
    enabled: accessToken !== null,
  });
  const usuario = usuarioQuery.data;

  const { equipo: miEquipo } = useEquipoActivo();
  const esCapitan = miEquipo?.capitanId === usuario?.id;

  async function salir(): Promise<void> {
    await cerrarSesion();
    router.replace("/login");
  }

  return (
    <Pantalla>
      <Tarjeta style={styles.tarjeta}>
        {usuario?.fotoUrl ? (
          <Image source={{ uri: usuario.fotoUrl }} style={styles.foto} />
        ) : (
          <View style={styles.fotoPlaceholder}>
            <Text style={[tipografia.subtitulo, { color: colores.textoSecundario }]}>
              {usuario?.nombre?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[tipografia.subtitulo, { color: colores.textoPrimario }]}>
            {usuario?.nombre || usuario?.apellido
              ? `${usuario?.nombre ?? ""} ${usuario?.apellido ?? ""}`.trim()
              : "Sin nombre"}
          </Text>
          {esCapitan && <Chip texto="Capitán" tono="elite" />}
        </View>
        <Text style={[tipografia.cuerpo, { color: colores.textoSecundario }]}>
          {usuario?.telefono}
        </Text>
      </Tarjeta>

      <View style={styles.lista}>
        <ItemLista etiqueta="Editar perfil" onPress={() => router.push("/completar-perfil")} />
        <ItemLista etiqueta="Cómo funciona" onPress={() => setComoFuncionaAbierto(true)} />
        {esCapitan && (
          <ItemLista etiqueta="Gestionar plantel" onPress={() => router.push("/equipo/plantel")} />
        )}
        <ItemLista etiqueta="Unirme a un equipo" onPress={() => router.push("/equipo/unirse")} />
        {usuario?.rol === "ADMIN" && (
          <ItemLista etiqueta="Panel de admin" onPress={() => router.push("/admin")} />
        )}
      </View>

      <Boton variante="destructivo" onPress={salir}>
        Cerrar sesion
      </Boton>

      <Text style={[tipografia.caption, { color: colores.textoFantasma, textAlign: "center" }]}>
        {`v${Constants.expoConfig?.version ?? "0.0.0"}`}
      </Text>

      <HojaInferior visible={comoFuncionaAbierto} onCerrar={() => setComoFuncionaAbierto(false)}>
        <ComoFunciona />
      </HojaInferior>
    </Pantalla>
  );
}

function ItemLista({ etiqueta, onPress }: { etiqueta: string; onPress: () => void }): React.JSX.Element {
  const { colores, espaciado, tipografia, radio } = useTema();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colores.superficie,
        borderWidth: 1,
        borderColor: colores.borde,
        borderRadius: radio.md,
        paddingVertical: espaciado.md,
        paddingHorizontal: espaciado.lg,
      }}
    >
      <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>{etiqueta}</Text>
      <Ionicons name="chevron-forward" size={18} color={colores.textoFantasma} />
    </Pressable>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    tarjeta: {
      alignItems: "center" as const,
      gap: espaciado.sm,
    },
    lista: {
      gap: espaciado.xs,
    },
    foto: {
      width: 58,
      height: 58,
      borderRadius: radio.pill,
      marginBottom: espaciado.sm,
    },
    fotoPlaceholder: {
      width: 58,
      height: 58,
      borderRadius: radio.pill,
      backgroundColor: colores.superficieElevada,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: espaciado.sm,
    },
  };
}
