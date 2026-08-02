# CLAUDE.md — App de ranking de fútbol (nombre TBD)

Contexto persistente del proyecto. Leer siempre. El detalle completo del dominio está en `docs/concepto.md` — este archivo es el resumen de alto nivel.

## Qué es

Ranking de **equipos** de fútbol amateur, dirigido por desafíos. Dos equipos registrados se enfrentan, cargan el resultado y el ganador sube. Inspirado en Spindex (tenis de mesa), pero la unidad es un equipo y no hay árbitro central. Motor emocional: "hambre de gloria" — cualquiera puede desafiar a cualquiera.

## Estado

Arranque de construcción. Modelo conceptual cerrado (`docs/concepto.md`) y arquitectura definida (`docs/arquitectura.md`). **Stack:** React Native \+ Expo (app), NestJS \+ PostgreSQL \+ Prisma (backend self-host), monorepo pnpm. **Android primero**, iOS después (misma base). Próximo paso: Hito 1 (la espina) — ver `prompt-claude-code.md`.

## Idioma

Todo en **español** (producto, docs, comentarios).

## Cómo trabaja el dueño (Leonardo)

- Directo, técnicamente preciso, orientado a resultados. Entregables listos para pegar/usar.  
- **No proponer atajos ni "alternativas más fáciles" que impliquen un resultado menos profesional.** Apuntar siempre a la mejor solución posible aunque lleve más trabajo.  
- Corregir imprecisiones y no validar por validar.

## Decisiones bloqueadas (no reabrir sin motivo)

- **Rating:** Glicko-2 (rating \+ RD \+ volatilidad). **Ranking único por equipo**, no separado por formato. **Outcome-only (G/E/P)**: el marcador no mueve el rating.  
- **Estructura temporal:** **no es un torneo de fútbol, es un ranking de desafíos tipo Spindex.** Rating **perpetuo** (nunca resetea) \+ **divisiones \= cortes porcentuales en vivo** del ranking global (Elite → Oro → Plata → Bronce, ej. cuartiles), no una liga con tabla de puntos ni ascenso/descenso como evento — la división de un equipo es siempre lo que resulta de recalcular el corte ahora mismo. El cierre anual de temporada no reasigna nada: solo registra en el palmarés quién fue n°1 de cada división ese día (campeón de Elite \= campeón del año). Nada se resetea nunca, ni el rating ni la división.  
- **Formato** \= (cantidad de jugadores × superficie), dos campos.  
- **Registro** ágil por SMS/WhatsApp OTP o Gmail; identidad persistente; anti-fraude en la **puerta del ranking**, no en el registro. Un equipo nuevo entra provisional y solo rankea con partido mutuamente confirmado. Identidad de plantel progresiva; integridad escala con el tier.  
- **Vinculación** en la cancha por **QR / código corto**; **un reporter por lado** fijado en el handshake. **Invariante:** el contrato vinculante se firma SOLO por QR en persona; el rating solo se mueve con un partido firmado \+ confirmado. Los desafíos a distancia son un pacto desistible (≤24h); no-show \= golpe de fair-play, **nunca walkover ni cambio de rating**.  
- **La app NO arbitra.** Solo resuelve un eje: el **resultado**. Admin \= último decisor.  
- **Árbol de disputa** por capas (A coinciden / B silencio=asentimiento / C discrepan → C1 evidencia, C2 planteles sin votar, C3 admin → void si es indeterminable).  
- **Fair-play holístico** (un solo número), ranking paralelo. Solo lo mueve conducta/honestidad, todo por regla o agregado. Agresiones **sin adjudicar**: señal por agregado de flags de rivales distintos. Sana con decaimiento temporal.  
- **Sin chat de texto libre**; interacción estructurada \+ notificaciones.  
- **Zonas geográficas emergen** de la geolocalización de las canchas.  
- **Suspendido/abandonado \= void.**

## Pendiente (ver `docs/concepto.md §16`)

- Detalles de infra a definir en implementación: proveedor OTP (SMS/WhatsApp AR), credenciales FCM.  
- Duración/calendario exacto del cierre anual y los cortes porcentuales finos de cada división (arranca en cuartiles, a calibrar). Sembrado del rating inicial. Calibración numérica fina. Monetización. Nombre.

