import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { actualizarPerfil, obtenerUsuarioActual, type Genero } from "@/api/auth";
import { Boton, Campo, Pantalla, Tarjeta } from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

const OPCIONES_GENERO: { valor: Genero; etiqueta: string }[] = [
  { valor: "MASCULINO", etiqueta: "Masculino" },
  { valor: "FEMENINO", etiqueta: "Femenino" },
  { valor: "OTRO", etiqueta: "Otro" },
  { valor: "PREFIERO_NO_DECIR", etiqueta: "Prefiero no decir" },
];

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Perfil personal (Hito 6b, inspirado en el onboarding de Spindex). Sin foto todavia -- ver POST /auth/me/foto, falta la pantalla de selector. */
export default function CompletarPerfil(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);

  const usuarioQuery = useQuery({
    queryKey: ["usuario", "actual"],
    queryFn: () => obtenerUsuarioActual(accessToken as string),
    enabled: accessToken !== null,
  });

  const [nombre, setNombre] = useState(usuarioQuery.data?.nombre ?? "");
  const [apellido, setApellido] = useState(usuarioQuery.data?.apellido ?? "");
  const [fechaNacimiento, setFechaNacimiento] = useState(
    usuarioQuery.data?.fechaNacimiento?.slice(0, 10) ?? "",
  );
  const [genero, setGenero] = useState<Genero | null>(usuarioQuery.data?.genero ?? null);

  const mutacion = useMutation({
    mutationFn: () =>
      actualizarPerfil(accessToken as string, {
        nombre,
        apellido,
        fechaNacimiento,
        genero: genero as Genero,
      }),
    onSuccess: () => {
      router.replace("/inicio");
    },
  });

  const completo =
    nombre.trim().length >= 2 &&
    apellido.trim().length >= 2 &&
    FECHA_REGEX.test(fechaNacimiento) &&
    genero !== null;

  return (
    <Pantalla centrado>
      <Tarjeta style={{ gap: espaciado.md }}>
        <Text style={[tipografia.subtitulo, { color: colores.textoPrimario, textAlign: "center" }]}>
          Contanos un poco de vos
        </Text>

        <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} />
        <Campo etiqueta="Apellido" value={apellido} onChangeText={setApellido} />
        <Campo
          etiqueta="Fecha de nacimiento"
          placeholder="AAAA-MM-DD"
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />

        <View style={{ gap: espaciado.xs }}>
          <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>Genero</Text>
          <View style={styles.opciones}>
            {OPCIONES_GENERO.map((opcion) => {
              const activo = genero === opcion.valor;
              return (
                <Pressable
                  key={opcion.valor}
                  onPress={() => setGenero(opcion.valor)}
                  style={[styles.opcion, activo && styles.opcionActiva]}
                >
                  <Text
                    style={[
                      tipografia.caption,
                      { color: activo ? colores.acentoTexto : colores.textoSecundario },
                    ]}
                  >
                    {opcion.etiqueta}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {mutacion.isError && (
          <Text style={[tipografia.caption, { color: colores.error }]}>
            {mutacion.error.message}
          </Text>
        )}

        <Boton
          onPress={() => mutacion.mutate()}
          cargando={mutacion.isPending}
          deshabilitado={!completo}
        >
          Continuar
        </Boton>
      </Tarjeta>
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    opciones: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: espaciado.sm,
    },
    opcion: {
      borderWidth: 1,
      borderColor: colores.borde,
      borderRadius: radio.pill,
      paddingVertical: espaciado.sm,
      paddingHorizontal: espaciado.md,
    },
    opcionActiva: {
      backgroundColor: colores.acento,
      borderColor: colores.acento,
    },
  };
}
