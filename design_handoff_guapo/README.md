# Handoff: Guapo — rediseño visual completo de la app

## Qué es esto

Paquete de diseño para implementar el rediseño de la app de ranking de fútbol amateur del repo
`bleonardo12/TotalFutbol`. Cubre las 20 pantallas del flujo que ya existe en `app/src/app/`, con una
dirección visual nueva ("cancha nocturna") y copy en español rioplatense.

Incluye además la propuesta de nombre de producto: **Guapo** (el nombre estaba TBD en `CLAUDE.md`).

## Sobre los archivos de diseño

Los archivos en `diseno/` son **referencias de diseño hechas en HTML** — prototipos que muestran el
aspecto y la intención, **no código para copiar y pegar**. La tarea es **recrear estos diseños en el
entorno que ya existe en el repo**: React Native + Expo + Expo Router, con los componentes de
`app/src/components/` y el tema de `app/src/theme/`. No agregar librerías de UI nuevas.

Para abrirlos: `diseno/Guapo.dc.html` y `diseno/Wireframes.dc.html` se abren en cualquier navegador
(necesitan `support.js`, que está en la misma carpeta).

- `Guapo.dc.html` — **alta fidelidad**, las 20 pantallas finales. Es la fuente de verdad visual.
- `Wireframes.dc.html` — los wireframes previos, con las alternativas descartadas y la exploración de
  nombre. Solo para contexto de por qué las pantallas quedaron así.

## Fidelidad

**Alta fidelidad.** Colores, tipografía, espaciados y copy son finales. Recrear pixel-perfect usando
los componentes existentes del repo, extendiéndolos donde haga falta.

Los mocks están dibujados a 390 px de ancho (Android de referencia). Todo tiene que ser fluido: usar
`flex`, no anchos fijos, salvo donde se indica explícitamente.

---

## 1. Design tokens

### Colores — reemplazar `app/src/theme/colores.ts`

La paleta pasa de azul sobre gris a **verde cancha nocturna con un solo acento lima**. Ver el archivo
listo para pegar en `tokens/colores.ts` de este bundle.

| Token | Hex | Uso |
| --- | --- | --- |
| `fondo` | `#08110D` | fondo de pantalla |
| `superficie` | `#0F1B15` | tarjetas, filas de lista |
| `superficieElevada` | `#16241D` | avatares, inputs, chips neutros |
| `superficieAcento` | `#131F0C` | tarjeta destacada / fila "vos" |
| `superficieHundida` | `#0C1712` | encabezados de sección dentro de tarjeta, celdas de stat |
| `barra` | `#0A1410` | tab bar y barra de acción inferior |
| `borde` | `#1F3128` | borde por defecto de tarjeta |
| `bordeSutil` | `#17261E` | separadores, línea bajo el header |
| `bordeControl` | `#2A3E34` | borde de botón secundario / chip inactivo |
| `bordeAcento` | `#2F4A26` | borde de tarjeta destacada o card con acción |
| `acento` | `#B8F03C` | **único** acento: CTA, valor propio, activo |
| `acentoTexto` | `#0A1A05` | texto sobre `acento` |
| `oro` | `#E6B450` | división Oro |
| `oroFondo` / `oroBorde` | `#2A2110` / `#4A3A15` | chip de Oro, banda de alerta |
| `alerta` | `#F2B33D` | relojes, ventanas por vencer, offline |
| `error` | `#FF6146` | disputa, no-show, cerrar sesión |
| `errorFondo` / `errorBorde` | `#1A0F0C` / `#4A2A22` | tarjeta de disputa, botón destructivo |
| `textoPrimario` | `#EEF4EC` | |
| `textoSecundario` | `#93A79B` | |
| `textoApagado` | `#5E7268` | labels de sección, metadatos |
| `textoFantasma` | `#3A4A42` | chevrons, placeholders, número de versión |

Divisiones: Elite usa `acento`, Oro usa `oro`, Plata `#AEBDB6`, Bronce `#C08552`.

**Solo tema oscuro.** El diseño no tiene variante clara — el uso real es de noche, en la cancha, con
el brillo al mango. Sacar la paleta `clara` de `colores.ts` o dejarla apuntando a la oscura.

### Tipografía — reemplazar `app/src/theme/tipografia.ts`

Cambia el par Sora/Inter por **Archivo** (titulares y UI) + **JetBrains Mono** (todo número).
Regla dura: **cualquier número que sea un dato — rating, posición, marcador, código, tiempo, delta —
va en JetBrains Mono.** Es lo que le da el aire de tablero deportivo.

Paquetes: `@expo-google-fonts/archivo` y `@expo-google-fonts/jetbrains-mono`. Cargar en
`app/src/app/_layout.tsx` junto a las que ya carga.

| Nivel | Familia | Size / line-height / tracking | Uso |
| --- | --- | --- | --- |
| `display` | Archivo_900Black | 34 / 35 / −1.4 | títulos de pantallas de celebración y vacías |
| `titulo` | Archivo_900Black | 26 / 28 / −0.8 | título de tab (La escalera, Desafíos, Perfil) |
| `subtitulo` | Archivo_800ExtraBold | 17 / 19 / −0.3 | nombre de equipo en header y tarjetas |
| `cuerpo` | Archivo_500Medium | 14 / 21 / 0 | texto de lectura |
| `cuerpoDestacado` | Archivo_700Bold | 15 / 20 / 0 | filas de lista, ítems de menú |
| `etiqueta` | Archivo_800ExtraBold | 12 / 14 / +1.6 | labels de sección, SIEMPRE EN MAYÚSCULA |
| `caption` | Archivo_500Medium | 12 / 17 / 0 | metadatos bajo un título |
| `boton` | Archivo_900Black | 16 / 18 / −0.2 | CTA primario |
| `numero` | JetBrainsMono_800ExtraBold | 22 / 22 | rating en header |
| `numeroGrande` | JetBrainsMono_800ExtraBold | 52 / 52 / −2 | rating en perfil de equipo |
| `numeroHeroe` | JetBrainsMono_800ExtraBold | 88 / 88 / −4 | delta de rating en la pantalla de liquidación |
| `numeroChico` | JetBrainsMono_700Bold | 13 / 16 | posición, tiempos, deltas en fila |
| `codigo` | JetBrainsMono_800ExtraBold | 40 / 40, tracking 6 | código de handshake |

### Espaciado y radios — `app/src/theme/espaciado.ts`

Espaciado: se mantiene `4 / 8 / 12 / 16 / 24 / 32 / 48`.

Radios, en cambio, suben:

```
sm: 8      chips cuadrados chicos, barras de progreso internas
md: 11     botones, chips de opción (cantidad, superficie), celdas de stat
lg: 14     botones grandes, tarjetas de lista
xl: 16     tarjeta estándar
xxl: 20    tarjeta hero (rating, firmar, provisional)
pill: 999  chips de división y estado
```

Padding de pantalla: **20 px** horizontal (hoy es 24). Gap vertical por defecto entre bloques: **14**.
Padding interno de tarjeta: **16**; de tarjeta hero: **22**.

### Sombras

Sin sombras. La jerarquía sale del color de superficie y del borde. La única excepción es un glow en
la línea del escáner QR: `shadowColor: '#B8F03C', shadowRadius: 14, shadowOpacity: .6`.

---

## 2. Componentes a actualizar en `app/src/components/`

### `Boton.tsx`

Tres variantes, todas `borderRadius: 14`, `paddingVertical: 17`, `alignItems: center`, texto
`tipografia.boton`.

- `primario` — fondo `#B8F03C`, texto `#0A1A05`, sin borde.
- `secundario` — transparente, borde 1px `#2A3E34`, texto `#EEF4EC` (o `#93A79B` cuando es la opción
  de descarte, tipo "Achicarse").
- `destructivo` — transparente, borde 1px `#4A2A22`, texto `#FF6146`.

Mantener el feedback de escala a 0.97 que ya tiene. Deshabilitado: fondo `#16241D`, texto `#5E7268`
(no bajar opacidad — sobre fondo oscuro se ve sucio).

### `Tarjeta.tsx`

- normal: fondo `#0F1B15`, borde 1px `#1F3128`, radio 16, padding 16, gap 12.
- `destacada`: borde `#2F4A26`, radio 20, padding 22 y **rayado de cancha** de fondo:
  franjas verticales de 26 px al 2.2% de opacidad del acento. En RN se resuelve con un
  `<LinearGradient>` de paradas duras o una `<View>` absoluta con franjas; es sutil, si complica se
  puede omitir sin romper el diseño.
- nueva variante `peligro`: fondo `#1A0F0C`, borde `#4A2A22` (tarjeta de disputa).

### `Chip.tsx`

Cambia de "color al 15%" a pares fondo/borde explícitos, `borderRadius: 999`, `padding: 3px 10px`,
texto `Archivo_800ExtraBold 10px`, tracking `.6`, **en mayúscula**.

| Tono | Fondo | Borde | Texto |
| --- | --- | --- | --- |
| `elite` | `#131F0C` | `#2F4A26` | `#B8F03C` |
| `oro` | `#2A2110` | `#4A3A15` | `#E6B450` |
| `neutral` | transparente | `#2A3E34` | `#93A79B` |
| `alerta` | `#2A2110` | `#4A3A15` | `#F2B33D` |
| `error` | `#1A0F0C` | `#4A2A22` | `#FF6146` |

### `Tabs.tsx`

Dos formas distintas, no una:

1. **Segmentado** (categoría, recibidos/enviados): contenedor `#0C1712` con borde `#1F3128`,
   radio 11, padding 3. Pestaña activa: fondo `#16241D`, radio 8, texto `Archivo_800 13px #EEF4EC`.
   Inactiva: sin fondo, texto `#5E7268`.
2. **Píldoras** (filtro de división): chips sueltos con gap 7. Activa: fondo `#B8F03C`, texto
   `#0A1A05`. Inactiva: borde `#2A3E34`, texto `#93A79B`. Padding `6px 14px`, radio 999.

### `MarcaHero.tsx`

Reemplazar el placeholder con emoji por el wordmark: un círculo de 56 px con borde de 6 px en
`#B8F03C`, y debajo **GUAPO** en `Archivo_900Black 62px`, tracking `−3`, color `#EEF4EC`. Bajada:
"Que se sepa quién se la banca." en `Archivo_600 16px #93A79B`, centrada, ancho máx 250.
Sobre todo eso, un radial gradient desde arriba-centro: `rgba(184,240,60,.11)` al 0% → transparente
al 60%.

### Nuevos componentes sugeridos

- `FilaEscalera` — la fila del ranking. Props: `posicion`, `nombre`, `rating`, `esMio`, `metadato?`,
  `accion?`. Se usa en Inicio y en Ranking, con la variante "vos" resaltada.
- `EtiquetaSeccion` — el `<Text>` de 12px extrabold en mayúscula con tracking 1.6 y color `#5E7268`.
  Aparece ~20 veces.
- `BarraAccion` — barra fija inferior con el CTA "Estoy en la cancha" + botón cuadrado de escanear.

### Tab bar (`app/src/app/(tabs)/_layout.tsx`)

Fondo `#0A1410`, borde superior `#17261E`, activo `#B8F03C`, inactivo `#5E7268`, label
`Archivo_600 10px` (activo `Archivo_700`). Los íconos Ionicons actuales sirven; en los mocks están
como cuadrados de 19 px porque son placeholders.

---

## 3. Pantallas

Orden de implementación sugerido: **Inicio → partido (QR/firmar/reportar) → ranking/desafíos →
disputa/admin → arranque/cuenta**. Inicio es la pantalla estrella y define casi todos los patrones.

### 3.1 Inicio — `app/src/app/(tabs)/inicio.tsx`

Es la pantalla más importante y la que más cambia: hoy es una tarjeta suelta, ahora es un scroll con
secciones.

> **Regla dura: Inicio tiene SIEMPRE la misma estructura.** Los mismos bloques, en el mismo orden,
> pase lo que pase con el ranking. Un equipo sin rankear no ve una pantalla "más simple" — ve la misma
> pantalla con los bloques degradados: valores en gris, guiones, ceros, y una línea que dice por qué
> está así. **Ningún bloque se oculta por falta de datos** (única excepción: fichas de desafío si el
> backend todavía no las tiene, ver §5). Esto es a propósito: el usuario nuevo tiene que ver desde el
> día uno la forma completa del producto y entender qué se desbloquea.

**Orden fijo de bloques**, siempre:

```
header  ·  TE TOCA A VOS  ·  TU ESCALERA  ·  fichas  ·  TU FORMA  ·  LO ÚLTIMO  ·  barra de acción
```

**Header** (no es el header de Expo Router — es parte de la pantalla, `headerShown: false`):
fila de 42 px, padding `10px 20px 14px`, borde inferior `#17261E`.
Escudo 42×42 radio 12 (`#16241D`, borde `#1F3128`, iniciales en `Archivo_900 17px #B8F03C`) ·
nombre del equipo `subtitulo` · debajo chip de división + `#12 de 340` en `caption #5E7268` ·
a la derecha rating en `numero` y debajo el delta del mes en `JetBrainsMono_700 11px`.

**Bloque por bloque, con y sin ranking:**

| Bloque | Rankeado | Sin rankear |
| --- | --- | --- |
| Rating (header) | `1483` en `#EEF4EC`, delta `+24 ↑` en acento | el provisorio `1500` en `#5E7268` + label "provisorio" — **nunca vacío ni oculto** |
| Chip de división | ORO (color de división) | `SIN RANKEAR`, chip neutro |
| Posición | `#12 de 340` | `— de 340` |
| TE TOCA A VOS | confirmaciones y desafíos pendientes | una sola card: "Te falta un partido para tener número" + contador `1 de 1`, con Generar código / Me pasaron uno |
| TU ESCALERA | 2 arriba (con RETAR) · **tu fila** · 2 abajo; bandas "A TIRO — 2 PARA EL TOP 10" y "TE RESPIRAN EN LA NUCA" | top 3 del ranking + **tu fila con `—` de posición y "todavía afuera"**; bandas "ARRIBA DE TODO — A DÓNDE QUERÉS LLEGAR" y "ENTRÁS CON EL PRIMER PARTIDO CONFIRMADO" |
| Fichas | puntos llenos en acento + próxima regeneración | puntos en `#2A3E34` + "se habilitan cuando tengas número" |
| TU FORMA | 10 barras (últimas 3 en acento), pie con "pico 1520", celdas G-E-P / UPSET / FAIR-PLAY | barras de 3 px en `#1F3128` sobre línea punteada, nota "Sin partidos todavía…", celdas `0-0-0` / `—` / `1000` |
| Bloque extra | — | `CÓMO FUNCIONA`: 3 pasos numerados (el 1 lleno en acento). Solo mientras no hay número; es el único bloque que se agrega, no reemplaza a ninguno |
| LO ÚLTIMO | deltas de rating y novedades de la zona | fila de plantel ("1 de 11" + Sumar) y novedades de la zona |
| Barra de acción | fija abajo: **Estoy en la cancha** (primario, flex 1) + botón cuadrado de 58 px para escanear | idéntica, siempre presente |

**Detalles del estado rankeado con pendientes:**

1. `TE TOCA A VOS` + badge contador (píldora `#B8F03C`, texto `#0A1A05`, `JetBrainsMono_800 11px`).
2. **Tarjeta de confirmación** (borde `#2F4A26`): título "Deportivo Aldao dice que ganó 3–2"
   (`Archivo_700 16px`), reloj a la derecha en `#F2B33D`; línea de consecuencia
   ("Si no decís nada, se liquida así. Perderías 19 puntos."); dos botones al 50%:
   **Fue así** (primario) / **No fue así** (secundario). El copy evita "confirmar/disputar" a
   propósito: es más humano y deja claro que negar abre disputa.
3. **Tarjeta de desafío recibido**: rival, reloj de vencimiento, chips de formato, la línea de puntos
   en juego ("Ganarles vale **+41**. Perder, apenas −7."), y **Aceptar** / **Achicarse**.
4. `TU ESCALERA` + link "Ver todo" (`Archivo_600 12px #B8F03C`). Tarjeta con overflow hidden: banda
   superior `#0C1712`, dos filas arriba con botón RETAR, **la fila propia** con fondo `#131F0C` y
   bordes `#2F4A26` (posición y rating en acento, nombre reemplazado por **VOS**), dos filas abajo en
   `#93A79B`, banda inferior.
5. **Fichas**: título + regeneración a la izquierda; a la derecha un punto de 15 px por ficha.
6. `TU FORMA`: barras de 56 px de alto, gap 4 — viejas `#1F3128`, medias `#2A3E34`, últimas 3
   `#B8F03C`. Debajo tres celdas `#0C1712` radio 11.
7. `LO ÚLTIMO`: tarjetas radio 14; la de rating ganado lleva el delta en acento a la izquierda.

**Cuando no hay nada pendiente** (el caso más frecuente en un equipo rankeado): la sección
`TE TOCA A VOS` **no desaparece** — muestra una sola card de empuje con la consecuencia concreta:
"11 días sin pisar la cancha / Racing de Boedo te pasó mientras tanto", con el CTA primario. Si hace
menos de ~5 días que jugó, la card dice el próximo objetivo en lugar del reproche
("Faltan 2 para el top 10"). Nunca queda un hueco.

**Sin equipo** — ahí sí es otra pantalla: la de crear equipo (ver 3.5).

### 3.2 El partido

Todas cuelgan de `app/src/app/partido/`.

**Generar código** (`generar.tsx`) — header con back. Grupos `CUÁNTOS SON` (5 chips flex 1, número en
mono 17px) y `EN QUÉ PISO` (4 chips de ancho por contenido). Activo: fondo acento. Nueva tarjeta de
**cancha detectada por GPS** con link "Cambiar". CTA primario abajo.

**Código listo** — QR de 250×250 sobre fondo **`#EEF4EC`** con radio 20 y 16 de padding (el QR tiene
que ir sobre claro para que escanee bien; es la única superficie clara de toda la app). Debajo,
`O QUE TIPEEN` y el código en `codigo` (40px mono, tracking 6). Píldora de vencimiento con punto
`#F2B33D` y cuenta regresiva viva `Vence en 9:41`. Al pie, fila con formato y cancha.

**Escanear** (`unirse.tsx`) — segmentado Escanear QR / Tipear código. Visor de 330 px de alto, radio
20, con **cuatro esquinas** de 44 px (borde 4px acento, radio 14 en la esquina externa) y una línea
horizontal de 2 px con glow que anima de arriba abajo. Texto "Apuntá al código del rival" abajo.
Nota de por qué hace falta estar los dos presentes.
Sin permiso de cámara: mismo marco, con el motivo y un botón para pedirlo.

**Firmar** (`firmar.tsx`) — **la pantalla más importante del modelo de confianza**. Título
"Esto ya es serio". Tarjeta hero con los dos equipos y un divisor "VS" (línea–texto–línea); cada
equipo con escudo, nombre, `rating · división · reporta <nombre>` y un punto de estado a la derecha
(lleno acento = ya firmó). Tres celdas: formato, **±22 EN JUEGO** (en acento) y **NONCE**. Línea que
nombra explícitamente a los dos reporters. CTA "Firmar y a jugar".

**Reportar** (`[id].tsx`) — "¿Cómo salió?" en `display`. Tres opciones apiladas en tarjetas de
20 px de padding, cada una con el **delta de rating a la derecha** (esto es nuevo y es clave: el
usuario ve lo que está en juego al elegir). Seleccionada = fondo acento con texto oscuro.
Marcador opcional: dos cajas de 88×80, radio 16, número en mono 36px, con un guion en el medio; la
nota "El rating lo mueve quién ganó, no por cuánto". CTA primario + botón destructivo
"Pasó algo feo en el partido" (reporte de incidente, sin adjudicar culpa).

**Esperando al rival** — anillo de 120 px (borde 3px `#1F3128`, dos lados en acento, rotado −30°)
con el marcador en el centro. Título, explicación de la regla de silencio, barra de progreso de la
ventana (8 px, relleno acento) con "reportado 21:04" y "quedan 14 h" en `#F2B33D`. Tarjeta con el
estado de cada lado (punto lleno / punto vacío). Botón secundario "Recordarles".

**Liquidado** — pantalla de premio, con radial gradient de acento al 13% desde arriba.
`CONFIRMADO` en etiqueta acento, título con el resultado, **el delta en `numeroHeroe` (88px acento)**,
la transición `1483 → 1501` en mono 24px, tarjeta `#131F0C` con el puesto nuevo, línea de próximo
objetivo, y dos botones al pie. Vale la pena una animación de conteo del delta (600 ms, ease-out).

### 3.3 Ranking y desafíos

**Ranking** (`(tabs)/ranking.tsx`) — título "La escalera". Segmentado de categoría + píldoras de
división. La lista se **agrupa por división** con un encabezado: barra vertical de 6×16 del color de
la división + etiqueta ("ELITE · TOP 25%"). Cada fila es una tarjeta suelta (no lista continua):
radio 13, padding `13px 15px`, con posición (mono 15px), escudo 32×32 radio 9, nombre + metadato
opcional (`W7 · 44 partidos`), rating, y botón RETAR si es desafiable. La fila propia: fondo
`#131F0C`, borde `#2F4A26`, subtítulo "tu equipo" en acento.

**Ranking vacío** — tres barras de escalera ascendentes (la última punteada), "Todavía no hay nadie
arriba", CTA y un consejo concreto de arranque presencial.

**Proponer desafío** (`desafio/proponer.tsx`) — tarjeta hero con "Los Pibes del 9 / **DESAFÍA A** /
Atlético Saavedra" y la distancia en el ranking. Los mismos grupos de formato. Nueva **tarjeta de
economía de ficha**: cuántas tenés (puntos), y dos filas — "Si ganás +31 · ficha vuelve" /
"Si perdés −9 · ficha quemada". Nota de las 48 h y del QR. CTA "Mandar el desafío".

**Desafíos** (`(tabs)/desafios.tsx`) — segmentado Recibidos/Enviados con contador. Tarjeta de desafío
recibido con las dos filas de riesgo/recompensa en cajas `#0C1712`. Aceptado: chip ACEPTADO y
resumen de fecha/cancha. Rechazado: opacidad .6 y chip "SE ACHICARON" + nota de ficha devuelta.
Al final, tarjeta punteada de estímulo cuando no hay actividad.

### 3.4 Cuando se rompe

**Disputa** (`disputa/[matchId]/index.tsx`) — header con estado EN DISPUTA en `#FF6146`. Tarjeta
`peligro` con "Los dos dicen que ganaron" y las dos versiones lado a lado. Después, un **timeline
vertical de 3 pasos**: círculo de 26 px (el activo lleno en acento, los futuros con borde
`#2A3E34`) unidos por una línea de 2 px `#1F3128`; cada paso con título y explicación en una frase.
CTA "Subir la foto" + nota del stake de fair-play gastado y bajo qué condición vuelve.

**Subir evidencia** (`subir-evidencia.tsx`) — cámara con el nonce sobreimpreso y la instrucción de
que tiene que verse en la foto. Mismo lenguaje de marco que el escáner.

**Poll** (`poll.tsx`) — "Vos que estuviste, ¿cómo salió?" en `display`, contexto de una línea, cuatro
opciones apiladas (radio 14, padding 18; la primera con borde `#2F4A26`), botón secundario "Tengo una
foto" y nota de anonimato. **No mostrar recuento de votos**: no es una votación.

**Admin** (`admin/index.tsx`) — "Cola" + badge rojo con el total. Cada caso es una tarjeta con SLA a
la derecha (rojo si vence en <24 h) y una grilla de señales: Evidencia / Plantel / Fair-play / Geo,
cada una con su valor coloreado. Si aplica la presunción por fair-play, banda `#2A2110` explicándola
como rebatible. Tres botones al pie: Gana A (acento) / Gana B / Anular (rojo). Tercera tarjeta:
detección de patrón de equipos efímeros. Pie: "Toda decisión queda firmada en el ledger".

**Sin señal** — banda superior `#2A2110` con punto `#F2B33D` y "Sin conexión — guardando local".
Tarjeta que dice explícitamente qué quedó guardado y cuándo se manda, fila de cola, botón reintentar.
Skeletons: bloques `#16241D` (línea principal) y `#131E19` (secundaria) dentro de tarjetas normales.
**Sin animación de shimmer** — en oscuro queda ruidoso.

### 3.5 Arranque y cuenta

**Login** (`login.tsx`) — wordmark GUAPO centrado con el radial gradient; bajada "Que se sepa quién
se la banca."; input de teléfono con el prefijo `+54 9` fijo en `#5E7268`; CTA primario "Mandame el
código"; divisor "o"; botón secundario Google; nota de una línea explicando *por qué* piden el
teléfono ("Un teléfono, un capitán. Es lo que hace que el ranking no sea un chiste.").

**Verificar** (`verificar.tsx`) — "Los 6 dígitos que te llegaron" en `display`, con el número abajo.
Seis cajas de 62 px de alto, radio 12; llenas con borde `#2F4A26`, la activa con borde 2px acento y
un cursor de 2×26; vacías con borde `#1F3128`. Reenvío con contador. CTA deshabilitado hasta los 6.

**Crear equipo** (`(tabs)/inicio.tsx` cuando no hay equipo) — "¿Cómo se llaman?" en `display`, input
con borde acento de 2 px, tres opciones de categoría con la advertencia de que no se cambia, fila de
escudos autogenerados por iniciales (acento / neutro / oro / subir foto) y CTA.

**Perfil de equipo** — tarjeta hero con escudo de 64 px en acento, nombre, chips de división y zona,
rating en `numeroGrande` y "pico 1520". Gráfico de 12 barras. Cuatro celdas de stat. `DÓNDE SON
BUENOS`: por formato, con barra de progreso de 6 px (la mejor en acento, el resto `#2A3E34`).
`PALMARÉS`: tarjeta punteada cuando está vacía, con el gancho de cuándo cierra la temporada.

**Cuenta** (`(tabs)/perfil.tsx`) — tarjeta de usuario con avatar de 58 px y chip CAPITÁN; lista de
ítems con chevron `#3A4A42`; "Panel de admin" solo si `rol === 'ADMIN'`; cerrar sesión destructivo;
versión al pie en mono `#3A4A42`.

---

## 4. Interacciones y comportamiento

- **Press**: escala a 0.97 en 80 ms, vuelve en 120 ms (ya está en `Boton`). Aplicarlo también a las
  filas de la escalera y a las tarjetas tocables.
- **Entrada de pantalla**: fade + translateY de 16 → 0 en 450 ms (ya está en `inicio.tsx`). Mantener,
  pero que no se dispare en cada refetch de React Query — solo en el primer render.
- **Relojes**: las ventanas (confirmación, vencimiento de desafío, expiración del código QR) se
  actualizan cada segundo en la UI. El backend manda; el reloj del cliente es solo visual.
- **Línea del escáner**: loop de 2 s, ida y vuelta, ease-in-out.
- **Liquidación**: conteo del delta de 0 a +18 en 600 ms ease-out, y la barra/puesto entra después.
- **Ficha gastada**: el punto de la ficha se apaga con un fade de 200 ms al mandar el desafío.
- **Optimistic UI**: al confirmar un resultado, actualizar la UI de una y revertir si falla — en la
  cancha la conexión es mala y la espera se siente rota.
- **Offline**: encolar reportes de resultado en almacenamiento local y reintentar. Es el caso real
  más común de fricción.

## 5. Estado y datos

No cambia el modelo de datos; todo lo que muestran las pantallas ya existe o es derivable de la API
en `app/src/api/`. Lo que hace falta agregar:

- `posicion` y `total` del equipo propio, y los **vecinos de escalera** (2 arriba, 2 abajo) — hoy hay
  que traerse el ranking entero para calcularlo. Conviene un endpoint `GET /ranking/mi-entorno`.
- **Deltas proyectados** por resultado (`+22 / +2 / −19`) para la pantalla de reportar y para las
  tarjetas de desafío. Los calcula Glicko-2 en `packages/core`; exponerlos.
- **Fichas de desafío**: cantidad, tope y momento de la próxima regeneración. Todavía no existe en el
  backend (§7 del concepto) — si no está implementado, ocultar el bloque entero, no mostrarlo en cero.
- Racha (`W4` / `L1`), tasa de upset y pico histórico, para las celdas de stat.
- Días desde el último partido, y qué equipo lo pasó en el ínterin, para el estado B de Inicio.

## 6. Copy — reglas

El tono es español rioplatense, corto y con actitud. Reglas:

1. **Nunca una etiqueta de sistema donde puede ir una frase.** No "Confirmar / Disputar" sino
   "Fue así / No fue así". No "Rechazar" sino "Achicarse".
2. **Siempre decir la consecuencia con el número.** "Perderías 19 puntos", "Ganarles vale +41",
   "quedan 14 h", "11 días sin pisar la cancha". El diseño depende de esto: sin el dato concreto las
   pantallas quedan vacías.
3. **Emoji con criterio, no de relleno** (revisado 2026-08-06, rebrand Cabra). La regla original
   ("sin emoji, sin exclamación") se escribió sin pensarla del todo y se revirtió a pedido de
   Leonardo — "estamos en 2026", quiere aprovechar la modernidad y los juegos de palabras. Un emoji
   por concepto, siempre el mismo (ver tabla abajo), nunca decorativo. El número sigue siendo el
   héroe tipográfico (regla 4 de `docs/design.md`): el emoji acompaña al texto, no compite con el
   numeral ni lo reemplaza. Los signos de exclamación quedan permitidos pero no son el default —
   el emoji ya aporta la energía, no hace falta apilar los dos.

**Vocabulario de emoji** (referencia durable para el repaso de copy de cada pantalla):

| Concepto | Emoji | Dónde |
|---|---|---|
| Identidad / mascota | 🐐 | wordmark, hitos máximos (llegar a Elite, campeón del año) |
| Desafío / reto | 👊 | RETAR, mandar desafío |
| Urgencia / cuenta regresiva | ⏳ | SLA de disputa, vencimiento de código/desafío |
| Racha ganadora | 🔥 | TU FORMA con racha positiva |
| Alerta / disputa / fair-play negativo | ⚠️ | disputa abierta, incidente reportado |
| Sin señal / guardado local | 📡 | banda offline |

Los textos exactos están en los mocks. Están pensados para caber: si el copy cambia mucho, revisar
que no se rompa el layout en 360 px de ancho.

## 7. Nombre y marca

El producto pasó de "TotalFutbol (TBD)" a **Guapo** — "el guapo del barrio", el que se la banca
contra cualquiera — y de ahí a **Cabra** (2026-08-06, juego de palabras con GOAT: "Greatest Of All
Time"). Wordmark: `Archivo_900Black`, tracking −3, todo en mayúscula, con un círculo de borde
grueso en acento a la izquierda o encima. Bajada: *"Que se sepa quién es la cabra. 🐐"*

Vocabulario del producto, para usar consistente en toda la app:

- el ranking → **la escalera**
- desafiar → **retar**
- rechazar un desafío → **achicarse**
- ganarle a alguien muy superior → **upset** (se mantiene, ya es de uso común)
- el ranking de conducta → **fair-play** (sin traducir)

Si el nombre cambia, lo único atado a él son `MarcaHero`, el header de tabs (`(tabs)/_layout.tsx`),
el login y `app.json`.

## 8. Assets

Ninguno. Todo el diseño es tipografía, color y formas de CSS/RN — no hay imágenes ni íconos custom.
Los íconos de tab bar son Ionicons, que el repo ya usa. El QR lo genera `react-native-qrcode-svg`,
que ya está instalado.

## 9. Archivos de este bundle

```
design_handoff_guapo/
├── README.md                    este documento
├── tokens/
│   ├── colores.ts               reemplaza app/src/theme/colores.ts
│   ├── tipografia.ts            reemplaza app/src/theme/tipografia.ts
│   └── espaciado.ts             reemplaza app/src/theme/espaciado.ts
└── diseno/
    ├── Guapo.dc.html            LAS 20 PANTALLAS EN ALTA FIDELIDAD — fuente de verdad
    ├── Wireframes.dc.html       wireframes previos y alternativas descartadas
    └── support.js               runtime que necesitan los dos HTML para abrirse
```

Abrí `diseno/Guapo.dc.html` en el navegador y trabajá contra eso: con las devtools se inspeccionan
los valores exactos de color, tamaño y espaciado. Está agrupado en cinco secciones que siguen el
mismo orden que la sección 3 de este README.
