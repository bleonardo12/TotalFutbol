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
/** Si jugo hace menos de esto, la card de "sin pendientes" muestra el proximo objetivo en vez del reproche. */
const DIAS_ACTIVIDAD_RECIENTE = 5;
const TOPE_BARRAS_FORMA_VACIA = 10;

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

const PASOS_COMO_FUNCIONA = [
  "Se juntan en la cancha y escanean el QR. Eso firma el contrato.",
  "Juegan. Cada capitán carga quién ganó.",
  "Si coinciden, listo: entrás al ranking.",
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

  // mi-entorno y forma se degradan (no tiran error) para un equipo sin rankear -- Inicio nunca
  // oculta un bloque, siempre pide los dos apenas hay equipo (docs Guapo §3.1).
  const miEntornoQuery = useQuery({
    queryKey: ["ranking", "mi-entorno", equipo?.id],
    queryFn: () => obtenerMiEntorno((equipo as Equipo).id),
    enabled: !!equipo,
  });

  const formaQuery = useQuery({
    queryKey: ["equipos", "forma", equipo?.id],
    queryFn: () => obtenerForma((equipo as Equipo).id),
    enabled: !!equipo,
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
      miEntornoQuery.isLoading ||
      formaQuery.isLoading);

  if (cargandoBase || cargandoActivo) {
    return <Pantalla centrado />;
  }

  // Sin equipo: unica pantalla realmente distinta (docs Guapo §3.1, "ahi si es otra pantalla").
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
  const tieneForma = !!forma && forma.barras.length > 0;

  const partidosPendientes = rankeado
    ? (partidosQuery.data ?? []).filter((p) => usuario && puedeConfirmar(p, usuario.id, equipo.id))
    : [];
  const desafiosPendientes = rankeado
    ? (desafiosQuery.data ?? []).filter((d) => d.estado === "PROPUESTO" && d.desafiadoId === equipo.id)
    : [];
  const totalPendientes = partidosPendientes.length + desafiosPendientes.length;

  const ultimosPartidos = (partidosQuery.data ?? [])
    .filter((p) => p.estado === "LIQUIDADO")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2);

  const posicion = miEntorno?.posicion ?? 0;
  const vecinosVisibles =
    totalPendientes > 0
      ? (miEntorno?.vecinos ?? [])
      : (miEntorno?.vecinos ?? []).filter((v) => v.posicion <= posicion);
  const hayVecinosAbajo = (miEntorno?.vecinos ?? []).some((v) => v.posicion > posicion);

  // Regla dura (docs Guapo §3.1): Inicio SIEMPRE tiene la misma estructura de bloques. Un equipo
  // sin rankear no ve una pantalla mas simple -- ve la misma pantalla con los bloques degradados
  // (valores en gris, guiones, ceros). La unica pantalla realmente distinta es "sin equipo" arriba.
  return (
    <Pantalla style={{ padding: 0 }}>
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
              <Chip texto="Sin rankear" tono="neutral" />
            )}
            <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
              {miEntorno
                ? `${miEntorno.posicion !== null ? `#${miEntorno.posicion}` : "—"} de ${miEntorno.total}`
                : "—"}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={[tipografia.numero, { color: rankeado ? colores.textoPrimario : colores.textoApagado }]}
          >
            {Math.round(equipo.rating)}
          </Text>
          {rankeado ? (
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
          ) : (
            <Text style={[tipografia.numeroChico, { color: colores.textoApagado }]}>provisorio</Text>
          )}
        </View>
      </View>

      <View style={{ flex: 1, padding: espaciado.lg, gap: espaciado.lg }}>
        {/* TE TOCA A VOS -- nunca se oculta, siempre hay al menos una card. */}
        <View style={{ gap: espaciado.md }}>
          <View style={styles.filaEtiquetaConBadge}>
            <EtiquetaSeccion>Te toca a vos</EtiquetaSeccion>
            {(!rankeado || totalPendientes > 0) && (
              <View style={styles.badge}>
                <Text style={styles.badgeTexto}>{rankeado ? totalPendientes : 1}</Text>
              </View>
            )}
          </View>

          {!rankeado && (
            <Tarjeta style={{ gap: espaciado.md }}>
              <Text style={[tipografia.cuerpoDestacado, { color: colores.textoPrimario }]}>
                Te falta un partido para tener número
              </Text>
              <View style={{ flexDirection: "row", gap: espaciado.sm }}>
                <View style={{ flex: 1 }}>
                  <Boton onPress={() => router.push("/partido/generar")}>Generar código</Boton>
                </View>
                <View style={{ flex: 1 }}>
                  <Boton variante="secundario" onPress={() => router.push("/partido/unirse")}>
                    Me pasaron uno
                  </Boton>
                </View>
              </View>
            </Tarjeta>
          )}

          {rankeado &&
            partidosPendientes.map((partido) => {
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

          {rankeado &&
            desafiosPendientes.map((desafio: DesafioConDeltas) => (
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

          {rankeado && totalPendientes === 0 && (
            <Tarjeta destacada style={{ alignItems: "center", gap: espaciado.sm }}>
              {(miEntorno?.diasInactivo ?? 0) >= DIAS_ACTIVIDAD_RECIENTE ? (
                <>
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
                </>
              ) : (
                <>
                  <Text style={[tipografia.display, { color: colores.textoPrimario, textAlign: "center" }]}>
                    {posicion > 10 ? `Faltan ${posicion - 10}\npara el top 10` : "Ya estás\nen el top 10"}
                  </Text>
                  <Text
                    style={[
                      tipografia.cuerpo,
                      { color: colores.textoSecundario, textAlign: "center", maxWidth: 280 },
                    ]}
                  >
                    Retá a alguien de arriba para acortar la distancia.
                  </Text>
                </>
              )}
              <View style={{ marginTop: espaciado.xs, alignSelf: "stretch" }}>
                <Boton onPress={() => router.push("/partido/generar")}>Estoy en la cancha</Boton>
              </View>
              <Text style={[tipografia.caption, { color: colores.textoApagado }]}>
                o retá a alguien de arriba ↓
              </Text>
            </Tarjeta>
          )}
        </View>

        {/* TU ESCALERA -- nunca se oculta: top 3 + fila propia "todavia afuera" si no rankea. */}
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
            {rankeado ? (
              <>
                <View style={styles.bandaEscalera}>
                  <Text style={styles.bandaEscaleraTexto}>
                    {posicion > 10 ? `A TIRO — ${posicion - 10} PARA EL TOP 10` : "YA ESTÁS EN EL TOP 10"}
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
              </>
            ) : (
              <>
                <View style={styles.bandaEscalera}>
                  <Text style={styles.bandaEscaleraTexto}>ARRIBA DE TODO — A DÓNDE QUERÉS LLEGAR</Text>
                </View>
                {(miEntorno?.vecinos ?? []).map((vecino) => (
                  <FilaEscalera
                    key={vecino.id}
                    posicion={vecino.posicion}
                    nombre={vecino.nombre}
                    rating={vecino.rating}
                  />
                ))}
                <FilaEscalera posicion="—" nombre="VOS" rating={equipo.rating} esMio metadato="todavía afuera" />
                <View style={styles.bandaEscalera}>
                  <Text style={styles.bandaEscaleraTexto}>ENTRÁS CON EL PRIMER PARTIDO CONFIRMADO</Text>
                </View>
              </>
            )}
          </Tarjeta>
        </View>

        {/* Fichas de desafio: unico bloque que si se oculta -- no existen en el backend todavia (§5). */}

        {/* TU FORMA -- nunca se oculta: barras y celdas en cero/guion sin partidos. */}
        <View style={{ gap: espaciado.sm }}>
          <EtiquetaSeccion>Tu forma</EtiquetaSeccion>
          <Tarjeta style={{ gap: espaciado.md }}>
            {tieneForma ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: espaciado.xs, height: 56 }}>
                  {(forma as NonNullable<typeof forma>).barras.map((valor, indice, barras) => {
                    const desdeElFinal = barras.length - indice;
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
                  {`pico ${Math.round((forma as NonNullable<typeof forma>).pico)}`}
                </Text>
              </>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-end",
                    gap: espaciado.xs,
                    height: 56,
                    borderBottomWidth: 1,
                    borderBottomColor: colores.borde,
                    borderStyle: "dashed",
                    paddingBottom: espaciado.xs,
                  }}
                >
                  {Array.from({ length: TOPE_BARRAS_FORMA_VACIA }).map((_, indice) => (
                    <View
                      key={indice}
                      style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: colores.borde }}
                    />
                  ))}
                </View>
                <Text style={[tipografia.caption, { color: colores.textoApagado, textAlign: "center" }]}>
                  Sin partidos todavía…
                </Text>
              </>
            )}
            <View style={{ flexDirection: "row", gap: espaciado.sm }}>
              <View style={styles.celdaStat}>
                <Text style={styles.celdaStatValor}>
                  {tieneForma
                    ? `${(forma as NonNullable<typeof forma>).gEP.g}-${(forma as NonNullable<typeof forma>).gEP.e}-${(forma as NonNullable<typeof forma>).gEP.p}`
                    : "0-0-0"}
                </Text>
                <EtiquetaSeccion>G-E-P</EtiquetaSeccion>
              </View>
              <View style={styles.celdaStat}>
                <Text
                  style={[
                    styles.celdaStatValor,
                    { color: tieneForma ? colores.acento : colores.textoApagado },
                  ]}
                >
                  {tieneForma ? `${(forma as NonNullable<typeof forma>).upsetPorcentaje}%` : "—"}
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

        {/* Bloque extra: solo mientras no hay numero -- se agrega, no reemplaza a ningun otro bloque. */}
        {!rankeado && (
          <Tarjeta style={{ gap: espaciado.md }}>
            <EtiquetaSeccion>Cómo funciona</EtiquetaSeccion>
            {PASOS_COMO_FUNCIONA.map((paso, indice) => (
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
                <Text style={[tipografia.cuerpo, { flex: 1, color: colores.textoSecundario }]}>{paso}</Text>
              </View>
            ))}
          </Tarjeta>
        )}

        {/* LO ULTIMO -- nunca se oculta: deltas propios si rankea, plantel si todavia no. */}
        <View style={{ gap: espaciado.sm }}>
          <EtiquetaSeccion>Lo último</EtiquetaSeccion>
          {rankeado ? (
            <View style={{ gap: espaciado.sm }}>
              {ultimosPartidos.length > 0 ? (
                ultimosPartidos.map((partido) => (
                  <Tarjeta key={partido.id} style={{ paddingVertical: espaciado.md }}>
                    <Text style={[tipografia.cuerpo, { color: colores.textoPrimario }]}>
                      {textoUltimoPartido(partido, equipo.id)}
                    </Text>
                  </Tarjeta>
                ))
              ) : (
                <Tarjeta style={{ paddingVertical: espaciado.md }}>
                  <Text style={[tipografia.cuerpo, { color: colores.textoApagado }]}>
                    Sin actividad todavía.
                  </Text>
                </Tarjeta>
              )}
            </View>
          ) : (
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
          )}
        </View>
      </View>

      {/* Barra de accion -- siempre presente, rankeado o no (docs Guapo §3.1). */}
      <BarraAccion
        etiqueta="Estoy en la cancha"
        onPress={() => router.push("/partido/generar")}
        onEscanear={() => router.push("/partido/unirse")}
      />
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
