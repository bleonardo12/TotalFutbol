import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { obtenerUsuarioActual } from "@/api/auth";
import { aceptarDesafio, misDesafios, rechazarDesafio, type DesafioConDeltas } from "@/api/challenges";
import { misPartidos, reportarResultado, type Partido } from "@/api/matches";
import { obtenerMiEntorno, type MiEntorno } from "@/api/ranking";
import {
  crearEquipo,
  misEquipos,
  obtenerForma,
  type CategoriaFutbol,
  type Division,
  type Equipo,
} from "@/api/teams";
import {
  BarraAccion,
  Boton,
  Campo,
  Chip,
  EtiquetaSeccion,
  FilaEscalera,
  Pantalla,
  SelectorChips,
  Tarjeta,
} from "@/components";
import { useAuthStore } from "@/store/auth-store";
import { useTema, type Tema } from "@/theme";

const VENTANA_DISPUTA_HORAS = 24;
const CHALLENGE_TTL_HORAS = 48;
/** Si jugo hace menos de esto, Estado B muestra la escalera directamente en vez del hero de inactividad. */
const DIAS_ACTIVIDAD_RECIENTE = 5;

const ETIQUETA_DIVISION: Record<Division, string> = {
  ELITE: "Elite",
  ORO: "Oro",
  PLATA: "Plata",
  BRONCE: "Bronce",
};

const TONO_DIVISION: Record<Division, "elite" | "oro" | "neutral"> = {
  ELITE: "elite",
  ORO: "oro",
  PLATA: "neutral",
  BRONCE: "neutral",
};

const OPCIONES_CATEGORIA: { valor: CategoriaFutbol; etiqueta: string }[] = [
  { valor: "MASCULINO", etiqueta: "Masculino" },
  { valor: "FEMENINO", etiqueta: "Femenino" },
  { valor: "MIXTO", etiqueta: "Mixto" },
];

function iniciales(nombre: string): string {
  return nombre.trim().slice(0, 2).toUpperCase();
}

function horasRestantes(desdeIso: string, ventanaHoras: number): string {
  const limite = new Date(desdeIso).getTime() + ventanaHoras * 60 * 60 * 1000;
  const restanteMs = limite - Date.now();
  if (restanteMs <= 0) {
    return "vencido";
  }
  return `${Math.ceil(restanteMs / (60 * 60 * 1000))} h`;
}

function otroReporte(partido: Partido, miEquipoId: string) {
  return partido.reportes.find((r) => r.teamId !== miEquipoId);
}

function puedeConfirmar(partido: Partido, usuarioId: string, miEquipoId: string): boolean {
  const esParte = partido.equipoLocalId === miEquipoId || partido.equipoVisitanteId === miEquipoId;
  const yaReporte = partido.reportes.some((r) => r.reporterId === usuarioId);
  return esParte && !yaReporte && partido.estado === "REPORTADO";
}

function rivalDe(partido: Partido, miEquipoId: string): { id: string; nombre: string } {
  return partido.equipoLocalId === miEquipoId
    ? { id: partido.equipoVisitanteId, nombre: partido.equipoVisitante.nombre }
    : { id: partido.equipoLocalId, nombre: partido.equipoLocal.nombre };
}

function textoUltimoPartido(partido: Partido, miEquipoId: string): string {
  const esLocal = partido.equipoLocalId === miEquipoId;
  const rival = rivalDe(partido, miEquipoId).nombre;
  if (partido.outcomeFinal === "EMPATE") {
    return `Empataste con ${rival}`;
  }
  const gane =
    (esLocal && partido.outcomeFinal === "GANA_LOCAL") ||
    (!esLocal && partido.outcomeFinal === "GANA_VISITANTE");
  return gane ? `Le ganaste a ${rival}` : `Perdiste con ${rival}`;
}

export default function Inicio(): React.JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const router = useRouter();
  const tema = useTema();
  const { colores, espaciado, tipografia } = tema;
  const styles = crearEstilos(tema);

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState<CategoriaFutbol | null>(null);

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
  const equipo: Equipo | undefined = equiposQuery.data?.[0];
  const rankeado = equipo?.estado === "RANKEADO";

  const miEntornoQuery = useQuery({
    queryKey: ["ranking", "mi-entorno", equipo?.id],
    queryFn: () => obtenerMiEntorno((equipo as Equipo).id),
    enabled: rankeado,
  });

  const formaQuery = useQuery({
    queryKey: ["equipos", "forma", equipo?.id],
    queryFn: () => obtenerForma((equipo as Equipo).id),
    enabled: rankeado,
  });

  const partidosQuery = useQuery({
    queryKey: ["partidos", "mios"],
    queryFn: () => misPartidos(accessToken as string),
    enabled: !!equipo,
  });

  const desafiosQuery = useQuery({
    queryKey: ["desafios", "mios"],
    queryFn: () => misDesafios(accessToken as string),
    enabled: !!equipo,
  });

  const crearMutacion = useMutation({
    mutationFn: () => crearEquipo(accessToken as string, nombre, categoria as CategoriaFutbol),
    onSuccess: () => {
      setNombre("");
      setCategoria(null);
      queryClient.invalidateQueries({ queryKey: ["equipos", "mios"] });
    },
  });

  const confirmarMutacion = useMutation({
    mutationFn: (partido: Partido) => {
      const otro = otroReporte(partido, (equipo as Equipo).id);
      if (!otro) {
        throw new Error("Todavia no hay un reporte del rival");
      }
      return reportarResultado(
        accessToken as string,
        partido.id,
        otro.outcome,
        otro.golesLocal ?? undefined,
        otro.golesVisita ?? undefined,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partidos", "mios"] });
      queryClient.invalidateQueries({ queryKey: ["equipos", "mios"] });
    },
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

  const cargandoBase = equiposQuery.isLoading || (!!equipo && usuarioQuery.isLoading);
  const cargandoActivo =
    !!equipo &&
    (partidosQuery.isLoading ||
      desafiosQuery.isLoading ||
      (rankeado && (miEntornoQuery.isLoading || formaQuery.isLoading)));

  if (cargandoBase || cargandoActivo) {
    return <Pantalla centrado />;
  }

  // Estado D: sin equipo -- formulario de alta.
  if (!equipo) {
    return (
      <Pantalla centrado>
        <Tarjeta style={{ gap: espaciado.md }}>
          <Text style={[tipografia.display, { color: colores.textoPrimario, textAlign: "center" }]}>
            ¿Cómo se llaman?
          </Text>
          <Campo placeholder="Nombre del equipo" value={nombre} onChangeText={setNombre} />

          <View style={{ gap: espaciado.xs }}>
            <EtiquetaSeccion>Categoria (fija, no se puede cambiar despues)</EtiquetaSeccion>
            <SelectorChips
              opciones={OPCIONES_CATEGORIA}
              valorSeleccionado={categoria}
              onCambiar={setCategoria}
            />
          </View>

          {crearMutacion.isError && (
            <Text style={[tipografia.caption, { color: colores.error }]}>
              {crearMutacion.error.message}
            </Text>
          )}
          <Boton
            onPress={() => crearMutacion.mutate()}
            cargando={crearMutacion.isPending}
            deshabilitado={nombre.length < 2 || categoria === null}
          >
            Crear
          </Boton>
        </Tarjeta>
      </Pantalla>
    );
  }

  const usuario = usuarioQuery.data;
  const miEntorno: MiEntorno | undefined = miEntornoQuery.data;
  const forma = formaQuery.data;

  const partidosPendientes = (partidosQuery.data ?? []).filter(
    (p) => usuario && puedeConfirmar(p, usuario.id, equipo.id),
  );
  const desafiosPendientes = (desafiosQuery.data ?? []).filter(
    (d) => d.estado === "PROPUESTO" && d.desafiadoId === equipo.id,
  );
  const totalPendientes = partidosPendientes.length + desafiosPendientes.length;

  const ultimosPartidos = (partidosQuery.data ?? [])
    .filter((p) => p.estado === "LIQUIDADO")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2);

  const header = (
    <View style={styles.header}>
      <View style={styles.escudo}>
        <Text style={styles.escudoTexto}>{iniciales(equipo.nombre)}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[tipografia.subtitulo, { color: colores.textoPrimario }]}>{equipo.nombre}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: espaciado.xs }}>
          {rankeado && equipo.division ? (
            <Chip texto={ETIQUETA_DIVISION[equipo.division]} tono={TONO_DIVISION[equipo.division]} />
          ) : (
            <Chip texto="Provisional" tono="neutral" />
          )}
          {miEntorno && (
            <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
              {`#${miEntorno.posicion} de ${miEntorno.total}`}
            </Text>
          )}
        </View>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {rankeado ? (
          <>
            <Text style={[tipografia.numero, { color: colores.textoPrimario }]}>
              {Math.round(equipo.rating)}
            </Text>
            <Text
              style={[
                tipografia.numeroChico,
                { color: (miEntorno?.deltaDelMes ?? 0) > 0 ? colores.acento : colores.textoApagado },
              ]}
            >
              {miEntorno && miEntorno.deltaDelMes !== 0
                ? `${miEntorno.deltaDelMes > 0 ? "+" : ""}${Math.round(miEntorno.deltaDelMes)}${miEntorno.deltaDelMes > 0 ? " ↑" : ""}`
                : "−0"}
            </Text>
          </>
        ) : (
          <Text style={[tipografia.numero, { color: colores.textoFantasma }]}>—</Text>
        )}
      </View>
    </View>
  );

  // Estado C: provisional.
  if (!rankeado) {
    return (
      <Pantalla style={{ padding: 0 }}>
        {header}
        <View style={{ padding: espaciado.lg, gap: espaciado.lg }}>
          <Tarjeta destacada style={{ alignItems: "center", gap: espaciado.sm }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                borderWidth: 3,
                borderColor: colores.bordeAcento,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 3, borderColor: colores.acento }}
              />
            </View>
            <Text
              style={[tipografia.display, { color: colores.textoPrimario, textAlign: "center" }]}
            >
              Todavía no sos nadie
            </Text>
            <Text
              style={[
                tipografia.cuerpo,
                { color: colores.textoSecundario, textAlign: "center", maxWidth: 290 },
              ]}
            >
              Jugá un partido, firmalo con el QR en la cancha y que el rival lo confirme. Ahí entrás
              a la escalera con un número real.
            </Text>
            <View style={{ width: "100%", gap: espaciado.sm, marginTop: espaciado.xs }}>
              <Boton onPress={() => router.push("/partido/generar")}>Generar código</Boton>
              <Boton variante="secundario" onPress={() => router.push("/partido/unirse")}>
                Me pasaron uno
              </Boton>
            </View>
          </Tarjeta>

          <Tarjeta style={{ gap: espaciado.md }}>
            <EtiquetaSeccion>Cómo funciona</EtiquetaSeccion>
            {[
              "Se juntan en la cancha y escanean el QR. Eso firma el contrato.",
              "Juegan. Cada capitán carga quién ganó.",
              "Si coinciden, listo: entrás al ranking.",
            ].map((paso, indice) => (
              <View key={paso} style={{ flexDirection: "row", gap: espaciado.md, alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    backgroundColor: indice === 0 ? colores.acento : "transparent",
                    borderWidth: indice === 0 ? 0 : 1.5,
                    borderColor: colores.bordeControl,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "JetBrainsMono_800ExtraBold",
                      fontSize: 12,
                      color: indice === 0 ? colores.acentoTexto : colores.textoSecundario,
                    }}
                  >
                    {indice + 1}
                  </Text>
                </View>
                <Text style={[tipografia.cuerpo, { flex: 1, color: colores.textoSecundario }]}>
                  {paso}
                </Text>
              </View>
            ))}
          </Tarjeta>

          <Tarjeta style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>Plantel</Text>
              <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                1 de 11 · lo cargás cuando quieras
              </Text>
            </View>
            <View style={styles.botonChico}>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>Sumar</Text>
            </View>
          </Tarjeta>
        </View>
      </Pantalla>
    );
  }

  const posicion = miEntorno?.posicion ?? 0;
  const vecinosVisibles = totalPendientes > 0
    ? (miEntorno?.vecinos ?? [])
    : (miEntorno?.vecinos ?? []).filter((v) => v.posicion <= posicion);
  const hayVecinosAbajo = (miEntorno?.vecinos ?? []).some((v) => v.posicion > posicion);
  const mostrarHeroInactividad = totalPendientes === 0 && (miEntorno?.diasInactivo ?? 0) >= DIAS_ACTIVIDAD_RECIENTE;

  return (
    <Pantalla style={{ padding: 0 }}>
      {header}
      <View style={{ flex: 1, padding: espaciado.lg, gap: espaciado.lg }}>
        {totalPendientes > 0 && (
          <View style={{ gap: espaciado.md }}>
            <View style={styles.filaEtiquetaConBadge}>
              <EtiquetaSeccion>Te toca a vos</EtiquetaSeccion>
              <View style={styles.badge}>
                <Text style={styles.badgeTexto}>{totalPendientes}</Text>
              </View>
            </View>

            {partidosPendientes.map((partido) => {
              const otro = otroReporte(partido, equipo.id);
              const rival = rivalDe(partido, equipo.id);
              return (
                <Tarjeta key={partido.id} style={{ borderColor: colores.bordeAcento, gap: espaciado.md }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espaciado.sm }}>
                    <Text style={[tipografia.cuerpoDestacado, { flex: 1, color: colores.textoPrimario }]}>
                      {otro
                        ? `${rival.nombre} dice que ${otro.outcome === "EMPATE" ? "empataron" : "ganó"}${
                            otro.golesLocal !== null && otro.golesVisita !== null
                              ? ` ${otro.golesLocal}–${otro.golesVisita}`
                              : ""
                          }`
                        : `${rival.nombre} reportó el resultado`}
                    </Text>
                    {otro && (
                      <Text style={[tipografia.numeroChico, { color: colores.alerta }]}>
                        {horasRestantes(otro.createdAt, VENTANA_DISPUTA_HORAS)}
                      </Text>
                    )}
                  </View>
                  <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                    Si no decís nada, se liquida así.
                  </Text>
                  <View style={{ flexDirection: "row", gap: espaciado.sm }}>
                    <View style={{ flex: 1 }}>
                      <Boton
                        onPress={() => confirmarMutacion.mutate(partido)}
                        cargando={confirmarMutacion.isPending}
                      >
                        Fue así
                      </Boton>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Boton
                        variante="secundario"
                        onPress={() => router.push({ pathname: "/partido/[id]", params: { id: partido.id } })}
                      >
                        No fue así
                      </Boton>
                    </View>
                  </View>
                </Tarjeta>
              );
            })}

            {desafiosPendientes.map((desafio: DesafioConDeltas) => (
              <Tarjeta key={desafio.id} style={{ gap: espaciado.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: espaciado.sm }}>
                  <Text style={[tipografia.cuerpoDestacado, { flex: 1, color: colores.textoPrimario }]}>
                    {`${desafio.desafiante.nombre} te desafió`}
                  </Text>
                  <Text style={[tipografia.numeroChico, { color: colores.textoApagado }]}>
                    {horasRestantes(desafio.createdAt, CHALLENGE_TTL_HORAS)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: espaciado.xs, flexWrap: "wrap" }}>
                  <Chip texto={desafio.cantidadJugadores.replace("F", "")} tono="neutral" />
                  <Chip texto={desafio.superficie} tono="neutral" />
                </View>
                <Text style={[tipografia.caption, { color: colores.textoSecundario }]}>
                  Ganarles vale{" "}
                  <Text style={{ color: colores.acento, fontFamily: "Archivo_700Bold" }}>
                    {`+${Math.round(desafio.deltaDesafiadoSiGana)}`}
                  </Text>
                  . Perder, apenas{" "}
                  <Text style={{ color: colores.textoPrimario }}>
                    {Math.round(desafio.deltaDesafiadoSiPierde)}
                  </Text>
                  .
                </Text>
                <View style={{ flexDirection: "row", gap: espaciado.sm }}>
                  <View style={{ flex: 1 }}>
                    <Boton
                      onPress={() => aceptarMutacion.mutate(desafio.id)}
                      cargando={aceptarMutacion.isPending}
                    >
                      Aceptar
                    </Boton>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Boton
                      variante="secundario"
                      onPress={() => rechazarMutacion.mutate(desafio.id)}
                      cargando={rechazarMutacion.isPending}
                    >
                      Achicarse
                    </Boton>
                  </View>
                </View>
              </Tarjeta>
            ))}
          </View>
        )}

        {mostrarHeroInactividad && (
          <Tarjeta destacada style={{ alignItems: "center", gap: espaciado.sm }}>
            <Text style={[tipografia.display, { color: colores.textoPrimario, textAlign: "center" }]}>
              {`${miEntorno?.diasInactivo} días sin\npisar la cancha`}
            </Text>
            <Text
              style={[
                tipografia.cuerpo,
                { color: colores.textoSecundario, textAlign: "center", maxWidth: 280 },
              ]}
            >
              {miEntorno?.pasadoPor
                ? `${miEntorno.pasadoPor.nombre} te pasó mientras tanto. Cuanto más esperás, menos confiable es tu número.`
                : "Cuanto más esperás, menos confiable es tu número."}
            </Text>
            <View style={{ marginTop: espaciado.xs, alignSelf: "stretch" }}>
              <Boton onPress={() => router.push("/partido/generar")}>Estoy en la cancha</Boton>
            </View>
            <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
              o retá a alguien de arriba ↓
            </Text>
          </Tarjeta>
        )}

        {vecinosVisibles.length > 0 && (
          <View style={{ gap: espaciado.sm }}>
            <View style={styles.filaEtiquetaConBadge}>
              <EtiquetaSeccion>Tu escalera</EtiquetaSeccion>
              <Pressable onPress={() => router.push("/ranking")}>
                <Text style={{ fontFamily: "Archivo_600SemiBold", fontSize: 12, color: colores.acento }}>
                  Ver todo
                </Text>
              </Pressable>
            </View>
            <Tarjeta style={{ padding: 0, gap: 0, overflow: "hidden" }}>
              <View style={styles.bandaEscalera}>
                <Text style={styles.bandaEscaleraTexto}>
                  {posicion > 10
                    ? `A TIRO — ${posicion - 10} PARA EL TOP 10`
                    : "YA ESTÁS EN EL TOP 10"}
                </Text>
              </View>
              {vecinosVisibles.map((vecino) => (
                <FilaEscalera
                  key={vecino.id}
                  posicion={vecino.posicion}
                  nombre={vecino.esPropio ? "VOS" : vecino.nombre}
                  rating={vecino.rating}
                  esMio={vecino.esPropio}
                  accion={
                    !vecino.esPropio && vecino.posicion < posicion
                      ? {
                          etiqueta: "RETAR",
                          onPress: () =>
                            router.push({
                              pathname: "/desafio/proponer",
                              params: { equipoDesafiadoId: vecino.id, equipoDesafiadoNombre: vecino.nombre },
                            }),
                        }
                      : undefined
                  }
                />
              ))}
              {totalPendientes > 0 && hayVecinosAbajo && (
                <View style={styles.bandaEscalera}>
                  <Text style={styles.bandaEscaleraTexto}>TE RESPIRAN EN LA NUCA</Text>
                </View>
              )}
            </Tarjeta>
          </View>
        )}

        {forma && (
          <View style={{ gap: espaciado.sm }}>
            <EtiquetaSeccion>Tu forma</EtiquetaSeccion>
            <Tarjeta style={{ gap: espaciado.md }}>
              {forma.barras.length > 0 && (
                <>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: espaciado.xs, height: 56 }}>
                    {forma.barras.map((valor, indice) => {
                      const desdeElFinal = forma.barras.length - indice;
                      const color =
                        desdeElFinal <= 3
                          ? colores.acento
                          : desdeElFinal <= 6
                            ? colores.bordeControl
                            : colores.borde;
                      return (
                        <View
                          key={indice}
                          style={{
                            flex: 1,
                            height: `${Math.max(6, valor * 100)}%`,
                            backgroundColor: color,
                            borderRadius: 3,
                          }}
                        />
                      );
                    })}
                  </View>
                  <Text style={[tipografia.numeroChico, { color: colores.textoApagado, textAlign: "right" }]}>
                    {`pico ${Math.round(forma.pico)}`}
                  </Text>
                </>
              )}
              <View style={{ flexDirection: "row", gap: espaciado.sm }}>
                <View style={styles.celdaStat}>
                  <Text style={styles.celdaStatValor}>
                    {`${forma.gEP.g}-${forma.gEP.e}-${forma.gEP.p}`}
                  </Text>
                  <EtiquetaSeccion>G-E-P</EtiquetaSeccion>
                </View>
                <View style={styles.celdaStat}>
                  <Text style={[styles.celdaStatValor, { color: colores.acento }]}>
                    {`${forma.upsetPorcentaje}%`}
                  </Text>
                  <EtiquetaSeccion>Upset</EtiquetaSeccion>
                </View>
                <View style={styles.celdaStat}>
                  <Text style={styles.celdaStatValor}>{Math.round(equipo.fairPlay)}</Text>
                  <EtiquetaSeccion>Fair-play</EtiquetaSeccion>
                </View>
              </View>
            </Tarjeta>
          </View>
        )}

        {ultimosPartidos.length > 0 && (
          <View style={{ gap: espaciado.sm }}>
            <EtiquetaSeccion>Lo último</EtiquetaSeccion>
            <View style={{ gap: espaciado.sm }}>
              {ultimosPartidos.map((partido) => (
                <Tarjeta key={partido.id} style={{ paddingVertical: espaciado.md }}>
                  <Text style={[tipografia.cuerpo, { color: colores.textoPrimario }]}>
                    {textoUltimoPartido(partido, equipo.id)}
                  </Text>
                </Tarjeta>
              ))}
            </View>
          </View>
        )}
      </View>

      {totalPendientes > 0 && (
        <BarraAccion
          etiqueta="Estoy en la cancha"
          onPress={() => router.push("/partido/generar")}
          onEscanear={() => router.push("/partido/unirse")}
        />
      )}
    </Pantalla>
  );
}

function crearEstilos({ colores, espaciado, radio }: Tema) {
  return {
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: espaciado.md,
      padding: espaciado.lg,
      paddingBottom: espaciado.md,
      borderBottomWidth: 1,
      borderBottomColor: colores.bordeSutil,
    },
    escudo: {
      width: 42,
      height: 42,
      borderRadius: radio.md,
      backgroundColor: colores.superficieElevada,
      borderWidth: 1,
      borderColor: colores.borde,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    escudoTexto: {
      fontFamily: "Archivo_900Black",
      fontSize: 17,
      color: colores.acento,
    },
    filaEtiquetaConBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
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
    bandaEscalera: {
      backgroundColor: colores.superficieHundida,
      paddingVertical: espaciado.sm,
      paddingHorizontal: espaciado.lg,
      borderBottomWidth: 1,
      borderBottomColor: colores.bordeSutil,
    },
    bandaEscaleraTexto: {
      fontFamily: "Archivo_700Bold",
      fontSize: 10,
      letterSpacing: 1.4,
      color: colores.textoApagado,
    },
    celdaStat: {
      flex: 1,
      backgroundColor: colores.superficieHundida,
      borderRadius: radio.md,
      paddingVertical: espaciado.sm,
      alignItems: "center" as const,
      gap: 3,
    },
    celdaStatValor: {
      fontFamily: "JetBrainsMono_800ExtraBold",
      fontSize: 16,
      color: colores.textoPrimario,
    },
    botonChico: {
      borderWidth: 1,
      borderColor: colores.bordeControl,
      borderRadius: radio.sm,
      paddingVertical: espaciado.sm,
      paddingHorizontal: espaciado.md,
    },
  };
}
