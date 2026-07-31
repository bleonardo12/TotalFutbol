# Mapa conceptual — App de ranking de equipos de fútbol

> Documento de dominio. Es la fuente de verdad del **qué** y el **por qué**, no del código. Estado: diseño conceptual, sin implementación todavía. Nombre del producto: **TBD**. Idioma de trabajo: español.

---

## 1\. Tesis del producto

Un ranking de **equipos** de fútbol amateur, dirigido por desafíos. Dos equipos registrados se enfrentan, cargan el resultado y el ganador suma en un ranking. Inspirado en Spindex (rating de tenis de mesa), pero con dos saltos de complejidad: la unidad es un **equipo** (no un jugador) y **no hay árbitro central**.

El motor emocional es el "hambre de gloria": cualquiera puede, en principio, desafiar a cualquiera. La app no arbitra el partido; solo resuelve **un eje: el resultado final**, y como último recurso hay un decisor humano (admin).

**Norte de diseño:** el camino honesto debe ser el de menor esfuerzo y mayor recompensa esperada; el fraudulento, más trabajo, con costo y con ganancia esperada baja. Con eso, el fraude cae solo al margen. No se busca fraude cero, se busca fraude **marginal**.

---

## 2\. Modelo de enganche

**Etapa 1 (arranque): presencial, en el momento.** Dos equipos ya están juntos para jugar; uno tiene la app, el otro la descarga ahí mismo. Es el "partido entre conocidos / desafío random". El ranking se siembra solo como clusters locales, porque los partidos son entre gente físicamente junta.

**Etapa 2 (cuando la app ya sea conocida): desafíos a distancia.** Un equipo desafía a otro sin estar presente, se coordina fecha y cancha. Recién acá aparecen problemas como el no-show.

**Requisito duro:** la registración y la vinculación entre equipos tienen que ser **muy ágiles** —se hacen en la cancha, en el momento—. La fricción acá mata el loop.

**Vinculación:** por **QR o código corto de partido**. El equipo que ya tiene la app genera el código/QR, el otro lo escanea después de bajar la app, y ambos quedan enlazados para ese partido. Cero tipear nombres, cero buscar usuarios.

---

## 3\. Entidades del dominio

- **Equipo** — la unidad rankeada. Nombre, escudo, capitán/es, rating, fair-play, división, historial. Atado a una identidad persistente (ver §4) para que no se pueda escapar del historial.  
- **Integrante / Jugador** — miembro de un equipo. Carga progresiva (no obligatoria al inicio). Habilita el ranking de goleadores/asistencias (secundario, ver §11).  
- **Cancha / Sede (Venue)** — lugar físico con geolocalización. Puede tener estado "verificada" (operador de la cancha confirma resultados). Sus coordenadas alimentan las zonas del ranking (§15).  
- **Desafío** — propuesta de partido entre dos equipos (formato, fecha, cancha). Ciclo: propuesto → aceptado/rechazado.  
- **Partido** — el enfrentamiento. Ligado a exactamente dos equipos y **un reporter por lado**, fijados en el handshake. Tiene formato (§5), estado (§8) y resultado (outcome).  
- **Rating** — número de habilidad por equipo (Glicko-2). Se guarda como **ledger append-only** (cada cambio es un asiento inmutable con su partido de origen). Auditable y reconstruible.  
- **Disputa** — proceso de resolución cuando los reportes discrepan en el outcome (§10).  
- **Incidente** — reporte de un hecho de conducta (ej. agresión) pegado a un partido (§11).  
- **Fair-play** — número holístico de confianza por equipo (§11).

---

## 4\. Identidad y registración

Registro **ágil pero con identidad persistente**. La fricción anti-fraude no vive en el registro, vive en **la puerta del ranking**.

- Registro por **SMS/WhatsApp OTP** (ancla la unicidad anti-smurf: un teléfono ≈ un capitán; hay muchos Gmails pero pocos números) o Gmail como opción de bajísima fricción. El peso anti-duplicado viene del teléfono.  
- Crear equipo \= nombre \+ capitán verificado. Instantáneo.  
- El equipo nuevo entra **provisional / sin rankear**. Recién pisa la escalera cuando un partido queda **mutuamente confirmado** por el rival. Esto mata el "abro 100 equipos y farmeo": cada equipo trucho necesita un rival real que confirme un partido real.  
- **Identidad del plantel \= progresiva.** En la cancha nadie carga 11 jugadores antes de jugar. El equipo nace con nombre \+ capitán; el plantel se completa después. Las exigencias de integridad **escalan con lo que está en juego**: en el picadito alcanza honor \+ doble confirmación; la verificación dura de plantel recién se activa cerca de la cima.  
- **Un reporter por lado por partido**, fijado en el handshake (el teléfono que generó el código y el que lo escaneó). Un integrante que arme un equipo duplicado para denunciar otro resultado no es parte del contrato de ese partido: no tiene derecho a reportarlo.

---

## 5\. Formatos de cancha

El formato es **(cantidad de jugadores × superficie)**, dos campos, no una lista plana.

- Cantidad: 5, 6, 7/8, 11\.  
- Superficie: sintético, salón/piso, pasto, etc.

Ej.: "fútbol 5 sintético" y "fútbol 5 salón" difieren solo en superficie. Guardar los dos campos da mejores estadísticas y un enum limpio.

---

## 6\. Motor de ranking

- **Glicko-2** (rating \+ RD/deviation \+ volatilidad). El RD es la "confianza" del número: resuelve solo los equipos nuevos (RD alto, se mueve rápido), inactivos (RD crece) y rachas anómalas.  
- **Ranking ÚNICO por equipo**, no separado por formato. El tipo de cancha es una **variable estratégica** que el equipo pondera al aceptar o rechazar un desafío (un top en fútbol 5 piso arriesga su posición si acepta un 11 en pasto). Aceptar o negar es decisión del equipo.  
- **Outcome-only (G/E/P):** el rating lo mueve *quién ganó*, no el marcador. (Consecuencia: se entierra la ponderación por diferencia de gol.)  
- Los puntos en juego **no se negocian**: los calcula Glicko según el resultado esperado. Ganarle a uno mucho mejor suma mucho; perder contra uno peor cuesta caro.

**Condiciones para que el ranking único no mienta:**

1. **Transparencia del mix.** El rating es "el mejor entre los desafíos que realmente aceptó". Un equipo que solo juega futsal tiene un número que significa "elite de futsal". Ranking único como titular \+ **stats por formato visibles** como la letra chica. El ladder es la capa de juego; las stats, la capa de verdad.  
2. **Rechazar tiene que ser legible, no gratis** (ver defensa del título, abajo).

### Estructura temporal (tres capas)

1. **Rating perpetuo (Glicko).** Nunca se resetea. Es el nivel real y siembra las divisiones cada temporada. Resetearlo sería mentir sobre el nivel.  
2. **Temporada anual (se renueva).** La renovación NO es un número aparte: es la propia **competencia estacional de las divisiones**. Cada temporada hay una tabla dentro de tu división; al cierre, ascenso/descenso; campeón por división, y el campeón de Elite \= **campeón del año**. Un ingresante puede ganar *su* temporada sin superar a los perpetuos de arriba → motivación fresca cada año.  
3. **Histórico / legado.** Pico de rating \+ **palmarés** (campeones y títulos por año y división). La gloria que la temporada no borra.

La distinción que lo sostiene: separar *qué tan bueno sos* (rating perpetuo, honesto) de *cómo te fue este año* (temporada, reseteable). El reset vive en la competencia estacional, nunca en el rating.

### Niveles / zonas

- **Divisiones estacionales estilo AFA** (ej. Promocional → Ascenso → Primera → Elite). Jugás una temporada dentro de tu división; al cierre, **los de arriba ascienden y los de abajo descienden**. Formato culturalmente nativo, y da el ritmo de temporada (arranque, lucha por no descender, definición, campeón). El rating perpetuo Glicko hace el **seeding** de cada temporada. *(Alternativa descartada: divisiones por banda de rating continua, siempre live — más simple, pero pierde el drama de temporada.)*  
- **Estado provisional** para ingresantes (RD alto, Elite bloqueada hasta completar X partidos verificados). El bloqueo es por **confianza (RD), no por rank**: un ingresante realmente bueno sale de provisional rápido y **se gana** el derecho a desafiar tops. Se merece por resultados, no por antigüedad.  
- **Antigüedad ≠ rating.** La antigüedad/cantidad de partidos alimenta la confianza (RD) y desbloquea derechos, pero no da posición. Un equipo viejo y malo no merece estar arriba.  
- **Defensa del título:** para *retener* un lugar en Elite hay que aceptar un mínimo de desafíos por temporada (variedad incluida). El que se esconde para blindar su rank decae o se marca como "esquivo". La estructura estacional es además el anti-coasting: si no competís la temporada, no puntuás y descendés.

---

## 7\. Economía de desafío

Para matar el "billete de lotería gratis" (desafiar tops sin costo, porque en Glicko perder contra un top no cuesta casi nada y ganar paga muchísimo), el costo **no** va en el rating, va en una moneda aparte:

- **Fichas de desafío** (energía que se regenera con el tiempo y la actividad). Desafiar dentro de la zona cuesta poco; desafiar muy por encima cuesta muchas fichas.  
- Perder el desafío hacia arriba **quema la ficha**: es el "castigo proporcional a la insolencia", real y escalado a la ambición, pero sin ensuciar el rating. Ganar el upset devuelve la ficha y paga rating grande.  
- **Rendimientos decrecientes anti-farmeo:** desafiar repetido al mismo top paga cada vez menos y cuesta cada vez más fichas. Mata el spam y la colusión.

---

## 8\. Ciclo de vida del partido (máquina de estados)

\[PACTADO a distancia, desistible ≤24h\] → FIRMADO (QR en cancha) → EN\_JUEGO → REPORTADO → CONFIRMADO | EN\_DISPUTA → LIQUIDADO

                                                                                          ↘ SUSPENDIDO/ABANDONADO → VOID

El estado **PACTADO** solo existe en etapa 2\. En etapa 1 (presencial) se entra directo a FIRMADO.

- **PACTADO (a distancia) \= pacto NO vinculante.** Un desafío a distancia es solo un pacto con **ventana de desistimiento** (≤24h): dentro de la ventana, cualquiera se baja sin penalidad.  
- **FIRMADO \= siempre por QR en la cancha, con ambos presentes.** El **contrato vinculante** se firma *en el momento del partido* escaneando el QR — nunca a distancia. Ahí quedan fijados el reporter por lado y los puntos en riesgo.  
- **Invariante:** el rating **solo** se mueve a partir de un partido FIRMADO por QR, con ambos presentes y confirmado. Nada más produce un resultado de rating.  
- **SUSPENDIDO/ABANDONADO** (ej. agresión): regla fija \= **sin resultado (void)**, salvo que ambos acuerden otra cosa. Mata el incentivo de provocar el quilombo para "ganar" por suspensión.

---

## 9\. Verificación y auditoría

Defensa en capas, de la más barata a la más costosa. La verificación se **calibra al incentivo de fraude** \= (puntos en juego × qué tan cerrado × qué tan batacazo). Resultados esperados y goleadas → confianza casi total, un toque. El caso a vigilar es el **batacazo cerrado** (David gana 3-2): motivo

+ coartada plausible.  
1. **Doble reporte independiente** → si coinciden, confirmación automática. Resuelve la mayoría.  
2. **Contrato pre-partido** (QR): un equipo no puede reclamar después un partido que no se pactó.  
3. **Co-ubicación por geocerca:** check-in de ambos en las coordenadas de la cancha dentro de una ventana. Mata partidos fabricados entre equipos que nunca se cruzaron.  
4. **Evidencia con nonce:** código único por partido que la foto del tablero debe mostrar. Impide reciclar fotos viejas.  
5. **Sedes verificadas:** el operador de la cancha confirma. Tercero neutral, señal más fuerte.

---

## 10\. Árbol de disputa

Precondición: equipo verificado \+ contrato firmado por QR. La frontera Capa 2 / Capa 3 no es el marcador, es el **outcome** (¿coinciden en quién ganó, o en que fue empate?).

- **A. Coinciden en outcome →** liquida. Si difieren solo en el marcador, se guarda "marcador en disputa" y no frena nada (el ladder es outcome-only).  
- **B. Un lado reporta, el otro no responde →** **silencio \= asentimiento** (aceptación tácita). Tras nudges y una ventana, el resultado reportado liquida provisoriamente y queda disputable por una ventana de gracia. Quejas repetidas de "yo nunca confirmé" contra un mismo equipo alimentan detección de patrón.  
- **C. Discrepan en el outcome → se abre disputa**, y abrir disputa **cuesta un stake de fair-play** (gate anti-abuso). En orden:  
  - **C1 — Evidencia primero.** Foto con nonce, sede verificada, geo. Si algo es concluyente, decide y termina. Pesa más que cualquier voto.  
  - **C2 — Ampliar a los planteles, NO como votación.** Votar por mayoría solo reproduce la grieta. El poll sirve para: (i) **defección interna** (jugadores del propio equipo que contradicen a su capitán \= señal fortísima) y (ii) que aparezca evidencia que los capitanes no subieron. Filtro barato; no arquitecturar para depender de él (la mayoría no responde).  
  - **C3 — Explicaciones con el admin (decisor final).** Solo llega la grieta limpia sin evidencia. Se notifica a ambos, cada uno expone, el admin decide. Si es genuinamente indeterminable, **anula** (sin cambio de rating) — pero es decisión del admin, no un derecho automático del que disputó (si no, la disputa se vuelve un escudo). Toda decisión de admin se loguea en el ledger.

**Transversal:** cada capa con **reloj** (ventana de confirmación, de evidencia, de poll, SLA de admin) para que nada quede colgado. La Capa 4 solo es sostenible si llega un **goteo**, no un río: lo garantizan el stake por disputar, la detección de patrón, y que A/B/C1/C2 filtren casi todo antes.

---

## 11\. Fair-play (holístico)

Un **solo número** de confianza por equipo (mezcla honestidad \+ conducta). Ranking paralelo al de habilidad. Le da a la buena conducta una consecuencia real, que es lo que genera la intención de cuidarla.

### Presunción en disputas (iuris tantum)

En empate probatorio genuino (C3), si el **diferencial de fair-play** entre los dos equipos supera un umbral, la disputa se presume en contra del de peor historial — **rebatible** por cualquier evidencia concreta. Si los dos tienen historial parecido → presunción neutra → se cae al void. Nunca opera sobre la prueba (C1); solo en el vacío probatorio, como input estructurado a la decisión del admin (no auto-resuelve).

### Qué lo alimenta (solo conducta/honestidad, nunca desacuerdos sobre el juego)

La clave que mantiene a la app afuera del arbitraje: los desacuerdos honestos (gol discutido por una falta previa, no se llevó el conteo) **no** tocan el fair-play — van al árbol de disputa como discrepancia de resultado. Solo la **mala conducta** mueve el fair-play. Y todo es **regla o agregado**, nunca juicio de un hecho de cancha.

**Restan (valores iniciales a calibrar con datos reales, escala 0–1000, arranque en 900):**

| Evento | Δ aprox. | Naturaleza |
| :---- | :---- | :---- |
| Reporte falso **probado** (evidencia o defección interna) | −150 | probado, golpe fuerte |
| No-show de partido acordado | −80 | regla |
| Disputa frívola (perdida, sin evidencia) | −40 (+ pierde stake) | probado |
| Ghosting repetido (no confirmar en ventana) | −15 / vez | regla |
| Flag de incidente de un rival | −5 a −10 a **ambos** | agregado |

**Suman / sanan:**

- Partido completado y confirmado limpio → \+3 (deriva positiva lenta).  
- **Decaimiento temporal** de las marcas viejas (\~6–12 meses) → una mala noche no es perpetua; el score refleja conducta **reciente**. Sin esto nadie se redime y perdés al que quería mejorar.

**Peso:** lo **probado** pesa fuerte; lo **presunto** (un flag suelto, perder por presunción) pesa leve, para no disparar la espiral de retroalimentación.

### Agresiones / incidentes — sin adjudicar

No se adjudica quién pegó. El flag no es "denunciar al rival", es "reportar un incidente en el partido": se pega al **partido**, y ambos equipos quedan marcados como "estuvieron en un partido con incidente". No hay nada que ganar contradenunciando (no le pega directo al otro). La señal confiable sale del **agregado**: el equipo flaggeado por **muchos rivales distintos** con el tiempo se delata solo; un flag mutuo aislado es ruido. La ley de los grandes números separa al violento serial del que tuvo una mala noche, sin juzgar un solo incidente.

---

## 12\. No-show / desistimiento

Solo aplica a la **etapa 2** (pacto a distancia). Como el contrato vinculante se firma **solo por QR en la cancha** (§8), un no-show significa que **el contrato nunca se firmó** → no hay partido que produzca resultado de rating. Por eso el no-show **no genera walkover ni cambio de rating**; su consecuencia es de **fiabilidad/fair-play**.

- **Desistir dentro de la ventana** (≤24h): gratis, sin penalidad.  
- **Comprometerse y no aparecer** (pasada la ventana): **golpe de fair-play/fiabilidad** (−80). El equipo que sí fue no gana rating (no hubo partido firmado), pero el no-show queda marcado como poco fiable y el patrón repetido se acumula.  
- Esto elimina además la adjudicación turbia de "yo fui y vos no" (quién hizo check-in, ventanas de gracia): sin QR firmado no hay resultado que dirimir, solo se registra la falla de compromiso.

---

## 13\. Estadísticas de equipo

**De cara al usuario:** rating actual \+ gráfico de evolución \+ pico histórico; récord G/E/P total y **por formato**; racha actual y mejor racha; head-to-head vs rivales; **tasa de upset** ("mata-gigantes") y **tasa de defensa** (cuánto aguanta contra los de abajo); goles a favor/en contra si se captura marcador; división e historial de ascensos/descensos; actividad (partidos/mes, último activo); fair-play.

**Señales internas (no necesariamente visibles):** RD/volatilidad; tasa de aceptación de desafíos (para detectar "ducking"); patrones de emparejamiento repetido (anti-colusión); tasa de disputa/contradenuncia (detección de patrón).

Casi todas salen del **ledger append-only** de rating → consistentes y auditables por diseño.

---

## 14\. Interacción y notificaciones

**Sin chat de texto libre.** Toda interacción es **estructurada** alrededor de acciones del partido. Razón: el chat libre te convierte en operador de moderación (reportes, acoso, hay menores jugando), inviable para un dev solo, e invita al trash talk. Si quieren contactarse, que sea por fuera. (Opción futura: set fijo y chico de reacciones/mensajes prefabricados.)

**Familias de notificación:**

- **Ciclo del desafío:** te desafiaron / aceptado / rechazado / partido acordado / recordatorio pre-partido (check-in) / el rival cargó el resultado (confirmá) / disputa abierta / rating actualizado ("sumaste X, ahora sos \#Y").  
- **Competitivo/social:** alguien te pasó, ascendiste/descendiste, "un rival ahora es desafiable", digest semanal.  
- **Negociación:** propuesta de partido (formato/cancha/fecha → contrapropuesta → aceptación).

**Detalles:** los desafíos **expiran** si no se responden (para que la escalera no se estanque); **granularidad de preferencias** de notificación (si spameás, el usuario las apaga y perdés el canal). Recordar: en iOS el push exige la cuenta paga de Apple.

---

## 15\. Alcance geográfico

Las **zonas del ranking emergen** de la geolocalización de las canchas donde se juega, en vez de pedirle al usuario que elija región. Jugás donde jugás y el sistema te ubica. Menos fricción y más honesto que una región autodeclarada. El arranque presencial siembra clusters locales solos, así que la geografía se resuelve organicamente en etapa 1\.

---

## 16\. Decisiones abiertas / pendientes

- **Stack tecnológico** — DECIDIDO: React Native \+ Expo (app), NestJS \+ PostgreSQL \+ Prisma (backend self-host), monorepo pnpm. Android primero. Ver `docs/arquitectura.md`.  
- **Duración y calendario de la temporada** — resuelto el modelo (perpetuo \+ divisiones estacionales AFA-style, §6); falta definir el largo de la temporada, fechas de cierre, y las reglas finas de ascenso/descenso (cuántos suben/bajan por división).  
- **Sembrado del rating inicial** de un equipo nuevo (placement / rating de arranque \+ RD).  
- **Calibración numérica fina** — todos los pesos de fair-play, ventanas de decaimiento, costos de fichas, umbrales de presunción y de tier: valores iniciales a ajustar con datos reales.  
- **Monetización** — sin definir; posible vía sedes/canchas como partners.  
- **Nombre del producto.**

