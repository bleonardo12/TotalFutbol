# Prompt de arranque para Claude Code

> Pegá esto en Claude Code en la raíz del repo (con CLAUDE.md, docs/concepto.md y docs/arquitectura.md ya presentes). Es para el **Hito 1 (la espina)**. Trabajá en modo plan primero.

---

Sos el desarrollador principal de este proyecto. Antes de escribir una línea de código, leé CLAUDE.md, docs/concepto.md y docs/arquitectura.md: son la fuente de verdad del producto y de la arquitectura. Respetá todas las decisiones bloqueadas y no reabras ninguna sin avisarme.

**Contexto de stack (decidido):** monorepo con pnpm workspaces → /app (Expo React Native \+ TS, Expo Router), /api (NestJS \+ TS), /packages/core (dominio puro: motor Glicko-2 y máquina de estados del partido), /packages/config (tsconfig/eslint/prettier compartidos). DB PostgreSQL con Prisma. Redis \+ BullMQ para jobs. Objetivo inmediato: **Android** (iOS viene después con el mismo código).

**Tu tarea ahora es el Hito 1 — la espina.** NO construyas disputas, fair-play, temporadas ni fichas todavía (son hitos posteriores). El Hito 1 es:

1. Scaffold del monorepo con la estructura de arriba, linting y formato configurados, y scripts de dev que levanten /api y /app.  
2. **Esquema Prisma** de las entidades núcleo: users, teams, team\_members, venues, challenges, matches, match\_reports, rating\_ledger (append-only). Migración inicial.  
3. **Auth OTP:** endpoints para pedir y verificar un código por teléfono, emisión de JWT (access/refresh). Podés stubbear el envío real del SMS/WhatsApp detrás de una interfaz OtpSender (implementación real después); en dev, que loguee el código.  
4. **Equipos y venues:** crear equipo (nombre \+ capitán verificado, entra provisional), CRUD mínimo de venues con geo.  
5. **Partido (camino feliz):** máquina de estados PACTADO→FIRMADO→EN\_JUEGO→REPORTADO→CONFIRMADO→ LIQUIDADO. Handshake por **código de partido** (un lado genera, el otro escanea/ingresa), **un reporter por lado** fijado en el handshake, **doble reporte** de outcome; si coinciden, se liquida.  
6. **Motor Glicko-2** en /packages/core como funciones puras \+ tests unitarios. Al liquidar, se calcula el delta y se escribe un asiento en rating\_ledger **dentro de una transacción**. El rating del equipo se materializa desde el ledger.  
7. **Ranking básico:** endpoint que devuelve equipos ordenados por rating.  
8. En /app: pantallas mínimas para verificar el flujo end-to-end — login OTP, crear equipo, generar/ escanear código de partido, reportar resultado, ver ranking. UI funcional, sin pulir.

**Reglas de trabajo:**

- Empezá proponiéndome un **plan** del Hito 1 dividido en tareas de un commit cada una. Esperá mi OK antes de codear.  
- El dominio (/packages/core) va **con tests desde el inicio**. Corré los tests antes de dar por cerrada cada tarea.  
- La app **nunca** decide reglas de negocio: todo rating/elegibilidad se resuelve en /api.  
- Todo en **español** (nombres de dominio, comentarios, mensajes).  
- Si algo necesario no está definido en los docs (ver docs/concepto.md §16), **listámelo como pregunta abierta y no inventes** la regla: la decido yo.

Cuando tengas el plan, mostrámelo.  
