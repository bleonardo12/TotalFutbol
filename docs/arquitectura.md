# Arquitectura técnica — App de ranking de fútbol

> Cómo se construye. Complementa `docs/concepto.md` (el qué/por qué) y `CLAUDE.md` (el resumen). Base decidida: **React Native \+ Expo** (frontend), **backend self-host en VPS**. **Android primero, iOS después** (misma base de código; solo cambia el target de build).

---

## 1\. Stack

| Capa | Elección | Por qué |
| :---- | :---- | :---- |
| App | **React Native \+ Expo** (managed) \+ **TypeScript** | Una sola base iOS/Android; reutiliza tu JS/TS; EAS Build compila Android (y luego iOS) en la nube |
| Navegación | **Expo Router** (file-based) | Rutas por archivos, deep links fáciles (sirve para el QR) |
| Estado server | **TanStack Query** | Cache, reintentos, sincronización con la API sin boilerplate |
| Estado UI local | **Zustand** | Liviano; evita el peso de Redux |
| Backend | **NestJS** (Node \+ TS) | Modular por dominio (rating, disputas, fair-play, temporadas): escala con la complejidad del negocio |
| DB | **PostgreSQL** | Integridad relacional, transacciones para liquidar rating, ledger append-only |
| ORM | **Prisma** | Type-safe, migraciones versionadas, buen DX |
| Jobs/colas | **Redis \+ BullMQ** | El dominio está lleno de tiempo diferido: ventanas de confirmación, silencio=asentimiento, decay de fair-play, cierre de temporada |
| Auth | **OTP por SMS/WhatsApp** \+ JWT (access/refresh) | El teléfono es el ancla anti-smurf; el OTP verifica identidad |
| Push | **Expo Push Notifications** | Abstrae FCM (Android) y APNs (iOS) detrás de una sola API |
| Storage | **MinIO** (S3-compatible, self-host) | Fotos de evidencia (nonce); encaja con self-hosting |
| Mapas/geo | **expo-location** \+ tiles (Mapbox/OSM) | Geocerca de check-in y zonas emergentes |
| QR | **expo-camera** | Escaneo del código de partido |

**Alternativas serias descartadas (por mérito, no por dificultad):** Flutter (mejor UI pero implica Dart, lenguaje nuevo); Fastify en vez de NestJS (más liviano pero menos estructura para este dominio); Drizzle en vez de Prisma (más cerca del SQL, menos DX). Cualquiera es defendible; las de arriba son el punto óptimo para un dev solo que prioriza sostenibilidad.

---

## 2\. Estructura del monorepo

**pnpm workspaces** (liviano; Turborepo es innecesario para un solo dev al inicio).

/app          → Expo React Native (TypeScript)

/api          → NestJS (TypeScript)

/packages

  /core       → dominio puro y compartido: motor Glicko-2, tipos, máquina de estados

  /config     → tsconfig, eslint, prettier compartidos

`/packages/core` es clave: el **motor de rating** y la **máquina de estados del partido** son funciones puras, testeables y compartibles (la app puede previsualizar puntos sin llamar al server). Nada de side-effects ahí adentro.

---

## 3\. Frontend (Expo RN)

Módulos por feature (carpetas): `auth`, `teams`, `venues`, `challenges`, `matches`, `ranking`, `disputes`, `fairplay`, `notifications`, `profile`.

Módulos nativos vía Expo:

- **expo-camera** → escaneo de QR (handshake de partido).  
- **expo-location** → check-in geocercado; alimenta zonas.  
- **expo-notifications** → push (registro de token → API).  
- **expo-secure-store** → tokens JWT en almacenamiento seguro del dispositivo.

Regla dura del frontend: **la app nunca decide reglas de negocio** (rating, disputas, elegibilidad). Solo muestra estado y dispara acciones; el server es la única fuente de verdad. Esto evita que un cliente modificado haga trampa.

---

## 4\. Backend (NestJS) — módulos de dominio

Cada uno es un módulo Nest con su controller \+ service \+ repos:

- **auth** — OTP (envío \+ verificación), emisión/refresh de JWT, identidad del capitán.  
- **teams / members** — creación ágil, plantel progresivo, identidad persistente.  
- **venues** — canchas, geo, estado "verificada".  
- **challenges** — pacto a distancia (desistible ≤24h), ciclo propuesto/aceptado.  
- **matches** — máquina de estados (PACTADO→FIRMADO→…→LIQUIDADO/VOID), handshake QR, un reporter por lado, doble reporte.  
- **rating** — invoca el motor Glicko-2 de `/packages/core` dentro de una transacción al liquidar; escribe el **ledger append-only**.  
- **disputes** — árbol por capas (A/B/C1/C2/C3), stake, timeouts vía jobs.  
- **fairplay** — deltas por evento (regla/agregado), decay temporal, presunción como input a C3.  
- **seasons / divisions** — temporadas estacionales, tablas por división, ascenso/descenso al cierre, seeding por rating perpetuo, palmarés.  
- **notifications** — familias de notificación; registro de tokens; expiración de desafíos.

Infra transversal:

- **Jobs (BullMQ):** ventana de confirmación, silencio=asentimiento, ventanas de disputa, decay de fair-play, cierre de temporada / ascenso-descenso. Todo lo "diferido en el tiempo" vive acá.  
- **Transacciones \+ idempotencia:** reportar resultado y liquidar rating son operaciones que exigen seguridad transaccional (dos reportes concurrentes, reintentos). Cada liquidación es atómica.

---

## 5\. Datos (PostgreSQL)

Tablas núcleo (esquema a refinar en implementación):

- `users` (capitán; teléfono verificado)  
- `teams`, `team_members`  
- `venues`  
- `challenges`  
- `matches` (estado, formato \= jugadores \+ superficie, reporter por lado)  
- `match_reports` (un reporte por lado; outcome \+ marcador)  
- `rating_ledger` **(append-only)** — cada asiento: match\_id, delta, rating/RD/vol resultantes. El rating actual del equipo se materializa desde acá.  
- `disputes`, `dispute_evidence`  
- `incidents` (flags de conducta, pegados al partido)  
- `fairplay_ledger` (deltas por evento; el score se deriva con decay)  
- `seasons`, `divisions`, `division_standings`

Patrones que no se negocian:

- **Ledger append-only** para rating y fair-play → auditable y reconstruible (nada se sobrescribe).  
- **Máquina de estados** del partido enforced en el server (transiciones válidas, no saltos).

---

## 6\. Servicios externos

- **OTP:** proveedor SMS/WhatsApp (ej. WhatsApp Business API, o SMS local AR). A definir por costo/ cobertura en Argentina.  
- **Push:** Expo Push (usa FCM en Android). Requiere proyecto Firebase para las credenciales FCM.  
- **Storage:** MinIO en el VPS (o bucket S3-compatible).  
- **Mapas:** tiles (Mapbox tiene free tier; OSM self-host es la opción soberana).

---

## 7\. Android primero — build y deploy

- **Dev loop:** `expo start` \+ **development build** (EAS) en un Android físico. Ojo: cámara, location y push necesitan un dev build (no alcanza Expo Go puro para la config nativa de push).  
- **Release:** `eas build -p android` → genera **AAB** para Play Store; empezás por el **internal testing track**.  
- **Costo:** Google Play, pago único de USD 25\.  
- **iOS después:** el mismo código; se agrega `eas build -p ios` (compila en la nube macOS de Expo, no necesitás Mac) \+ cuenta Apple Developer (USD 99/año) cuando llegue el momento.

---

## 8\. Roadmap de construcción (fundaciones primero, en orden)

No es un MVP de juguete: es la arquitectura correcta construida en la secuencia correcta. Cada hito se apoya en el anterior.

1. **Espina.** Scaffold del monorepo. Auth OTP. Crear equipo. Venues. Partido vía handshake QR \+ doble reporte \+ liquidación Glicko (camino feliz) \+ rating\_ledger. Ranking básico.  
2. **Disputas.** Árbol por capas \+ jobs de timeout (silencio=asentimiento, ventanas). Void.  
3. **Fair-play.** Deltas por evento \+ incidentes \+ decay. Presunción en C3.  
4. **Temporadas.** Divisiones estacionales, tablas, ascenso/descenso, seeding, palmarés.  
5. **Economía \+ engagement.** Fichas de desafío, notificaciones, estadísticas por formato.

---

## 9\. Arranque con Claude Code — el loop de trabajo

Trabajá en ciclos cortos, no "hacelo todo":

1. **Plan primero.** Pedile que lea `CLAUDE.md` \+ `docs/concepto.md` \+ `docs/arquitectura.md` y proponga un plan del hito antes de escribir código. Revisás el plan, no el código a ciegas.  
2. **Milestone chico.** Un hito del §8 por vez; dentro de eso, tareas de un commit cada una.  
3. **Tests en el dominio.** El motor Glicko-2 y la máquina de estados van con tests desde el día uno (son funciones puras; no hay excusa).  
4. **Revisás y commiteás.** Diffs chicos, revisables. Que corra los tests antes de dar por hecho un paso.  
5. **Preguntas abiertas → se marcan, no se inventan.** Si algo no está en los docs (ver §16 del concepto), que lo liste y lo decidís vos; no que invente reglas de negocio.

El prompt de arranque listo para pegar está en `prompt-claude-code.md`.  
