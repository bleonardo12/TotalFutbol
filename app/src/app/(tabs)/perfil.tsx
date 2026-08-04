import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { Image, Text, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import { Boton, Pantalla, Tarjeta } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

export default function Perfil(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const router = useRouter();
  const tema = useTema();
  const { colores, tipografia } = tema;
  const styles = crearEstilos(tema);

  const usuarioQuery = useQuery({
    queryKey: ["usuario", "actual"],
    queryFn: () => obtenerUsuarioActual(accessToken as string),
    enabled: accessToken !== null,
  });
  const usuario = usuarioQuery.data;

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
            <Text style={[tipografia.titulo, { color: colores.textoSecundario }]}>
              {usuario?.nombre?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
        )}
        <Text style={[tipografia.subtitulo, { color: colores.textoPrimario }]}>
          {usuario?.nombre || usuario?.apellido
            ? `${usuario?.nombre ?? ""} ${usuario?.apellido ?? ""}`.trim()
            : "Sin nombre"}
        </Text>
        <Text style={[tipografia.cuerpo, { color: colores.textoSecundario }]}>
          {usuario?.telefono}
        </Text>

        <Link href="/completar-perfil" asChild>
          <Boton variante="secundario" onPress={() => {}}>
            Editar perfil
          </Boton>
        </Link>
      </Tarjeta>

      {usuario?.rol === "ADMIN" && (
        <Link href="/admin" asChild>
          <Boton variante="secundario" onPress={() => {}}>
            Panel de admin
          </Boton>
        </Link>
      )}

      <Boton variante="destructivo" onPress={salir}>
        Cerrar sesion
      </Boton>
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    tarjeta: {
      alignItems: "center" as const,
      gap: espaciado.sm,
    },
    foto: {
      width: 72,
      height: 72,
      borderRadius: radio.pill,
      marginBottom: espaciado.sm,
    },
    fotoPlaceholder: {
      width: 72,
      height: 72,
      borderRadius: radio.pill,
      backgroundColor: colores.superficieElevada,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: espaciado.sm,
    },
  };
}
