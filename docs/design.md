# Sistema de diseño — TotalFutbol

> Ajustado al código que ya existe. Esto es un **re-skin + capa de vida**, NO un rebuild. Ya existe
> un buen sistema de tokens (`app/src/theme/`), fuentes Sora+Inter cargadas, y un kit de
> componentes. Se conserva todo eso; se cambian valores y se suma dirección, profundidad y motion.

---

## 0. Diagnóstico: por qué se ve "boceto" (aunque la base es buena)

Lo construido está limpio y consistente. Se siente básico por cinco razones puntuales:

1. **La paleta es el default genérico de "app tech":** navy casi negro + **acento azul** (`#4FACFF`).
   Azul-sobre-navy es el look más templado que existe y no tiene NADA de fútbol. Es la causa #1.
2. **No hay motion real.** Solo el press-scale del botón. Sin transiciones, sin animación de lista,
   sin count-up, sin haptics. Una app 2026 se siente viva; esta se siente estática.
3. **La pantalla insignia (ranking) desperdicia sus números.** El rating —el dato más importante de
   toda la app— se renderiza a 16px, igual que el nombre del equipo. No hay jerarquía, ni podio, ni
   numerales grandes. En una app de ranking, los números tienen que ser el héroe.
4. **Todo es plano.** Cards y filas con borde de 1px, sin elevación, sin glow, sin profundidad.
   Competente pero estéril.
5. **El logo es un emoji ⚽** (`MarcaHero`) y el splash/icono siguen en azul. Grita "placeholder".

Ninguna de estas exige rehacer nada. Son cambios de valores + una capa de animación.

---

## 1. Dirección estética

**Concepto: la cancha de fútbol 5 sintético, de noche, bajo reflectores.** El lugar real donde pasan
estos partidos. Verde-negro profundo del césped nocturno, **ámbar de los reflectores** como acento,
blanco tiza de las líneas.

**La firma (lo memorable):** el tratamiento de los **números** (rating, puesto). Numerales grandes,
atléticos, con **glow ámbar** en el podio (top 3 / Elite). Es el único lugar donde se gasta audacia;
todo lo demás, quieto.

**Semántica de color = la tabla:** ámbar = ascenso/gloria/acción; verde = confirmado/en vivo; rojo =
descenso/peligro. Codifica la zona, no decora.

> La dirección es una propuesta fuerte; los hex son ajustables si querés otro humor. Lo no negociable
> es tener una dirección y aplicarla entera, en vez del azul default.

---

## 2. Paleta — mapeada a los tokens que YA existen

Se reemplazan los **valores** en `app/src/theme/colores.ts` (paleta `dark`), manteniendo la interfaz
`Paleta` y los nombres de token. Nadie renombra nada:

| Token existente | Nuevo valor | Antes (azul default) |
|---|---|---|
| `fondo` | `#0B1210` | `#080A0D` |
| `superficie` | `#131C18` | `#171D26` |
| `superficieElevada` | `#1B2823` | `#212A35` |
| `superficieAcento` | `#1E241A` | `#16233A` |
| `borde` | `#26332C` | `#28323E` |
| `bordeAcento` | `#8A6A2A` | `#2D5C94` |
| `textoPrimario` | `#EEF2ED` | `#F7F9FC` |
| `textoSecundario` | `#9EB0A6` | `#AEB9C6` |
| `textoApagado` | `#63736A` | `#6B7684` |
| `acento` | `#FFB020` (ámbar reflector) | `#4FACFF` (azul) |
| `acentoTexto` | `#0B1210` | `#08131F` |
| `exito` | `#2FB877` (turf) | `#34C759` |
| `error` | `#E5484D` (descenso) | `#FF5A52` |
| `alerta` | `#F2A93B` | `#F5A623` |

Sumar un token nuevo para el glow del podio: `glowPodio` = `#FFB020` usado como sombra de color (blur
alto, opacidad ~0.35), reservado al top 3. También actualizar en `app.json` el `backgroundColor` del
splash (`#208AEF` → `#0B1210`) y del adaptiveIcon (`#E6F4FE` → `#0B1210`).

La paleta `light` se re-tinta en la misma línea (fondo hueso, acento ámbar más saturado), pero la app
es **dark-first**.

---

## 3. Tipografía — ya está bien, falta usarla

Se conserva **Sora** (display/títulos/botones) + **Inter** (cuerpo). Ya están cargadas. Los arreglos:

- **Cifras tabulares** en todo lo numérico (rating, puesto, marcador): agregar
  `fontVariant: ["tabular-nums"]` a los estilos de datos, para que las columnas no bailen.
- **Un nivel numérico grande** que hoy no existe: `numeroHero` (Sora_800ExtraBold, ~44–56px) para el
  rating protagonista en el perfil y para el podio del ranking. El display actual (40px) es para
  titulares, no para el número estrella.
- Usar `display`/`titulo` en las pantallas que hoy no tienen encabezado (el ranking entra directo a
  las tabs, sin título ni hero).

---

## 4. Espaciado, radios, elevación

Escala y radios actuales están bien (base 4). Falta **profundidad**:

- Elevación sutil en cards (sombra fría, no negra pura).
- **Glow ámbar** (`glowPodio`) solo en las filas/badges del podio.
- Radios: cards en `lg`, chips/botones en `md`/`pill` (ya está).

---

## 5. Motion (lo que más falta para "2026")

Agregar **react-native-reanimated + moti + expo-haptics + expo-linear-gradient**. Reglas:

- **Duraciones:** fast 150 / base 250 / slow 400, con **spring**, no lineal.
- **Momento estrella (donde se gasta el presupuesto):** al confirmar un resultado, el rating hace
  **count-up** y la fila del equipo **se desplaza de puesto** en la tabla (layout animation de
  Reanimated). Es el payoff emocional de la app.
- **Entrada de lista:** stagger sutil de las filas del ranking al montar.
- **Transición ranking → perfil:** shared element de la fila al perfil del equipo (Expo Router soporta
  shared transitions).
- **Micro:** migrar el press-scale del `Boton` a Reanimated y sumarle **haptic** (`expo-haptics`) en
  acciones clave (firmar partido, confirmar resultado, mandar desafío). Pull-to-refresh en la tabla.
- **Respetar reduce-motion** siempre. Menos es más: nada de animar todo, o se siente "generado".

---

## 6. El kit (ya existe — se sube de nivel, no se reemplaza)

Componentes actuales: `Pantalla`, `Boton`, `Tarjeta`, `Chip`, `Tabs`, `MarcaHero`. Cambios:

- `Boton` → press-scale con Reanimated + haptic; variante `primario` con leve glow ámbar.
- `Tarjeta` → elevación sutil; `destacada` con tinte ámbar real.
- **Nuevos:** `NumeroRating` (numeral Sora grande, tabular, con glow si es podio) y `FilaRanking`
  (puesto + escudo + nombre + rating, con **borde izquierdo de zona**: ámbar en zona de ascenso, rojo
  en zona de descenso).
- `MarcaHero` → reemplazar el emoji ⚽ por una marca real (SVG simple: monograma/pelota estilizada en
  ámbar sobre pitch).
- `EmptyState` → el "Todavía no hay equipos rankeados" como invitación, no como texto gris perdido.

---

## 7. Stack de estilos — NO se cambia a NativeWind

Se descarta migrar a NativeWind: el sistema de tokens en `theme/` **ya centraliza los estilos y está
limpio**; migrar sería un refactor grande para cero ganancia. La consistencia no era el problema —lo
era la dirección, la profundidad y el motion—. Se mantiene StyleSheet + `useTema`, y se suma solo la
capa de animación (Reanimated/Moti/haptics/gradient).

---

## 8. Piso de calidad

Responsive a pantallas chicas, foco visible, contraste suficiente sobre `fondo`, reduce-motion
respetado. Elegancia = ejecutar bien esta visión, no agregar cosas.
