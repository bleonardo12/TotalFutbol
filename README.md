# TotalFutbol (nombre TBD)

Ranking de equipos de futbol amateur, dirigido por desafios. Ver `CLAUDE.md` para el resumen del
producto y `docs/concepto.md` / `docs/arquitectura.md` para el detalle completo.

## Stack

Monorepo con **pnpm workspaces**:

- `/app` — Expo (React Native) + TypeScript + Expo Router. Target inicial: Android.
- `/api` — NestJS + TypeScript.
- `/packages/core` — dominio puro compartido (motor Glicko-2, maquina de estados del partido).
- `/packages/config` — tsconfig, eslint y prettier compartidos.

## Requisitos

- Node.js >= 22
- pnpm (`corepack enable` o `npm install -g pnpm`)
- Para correr `/app` en un dispositivo/emulador Android: Android Studio + un dev build de Expo
  (ver `docs/arquitectura.md` §7 — Expo Go no alcanza para camara/ubicacion/push).

## Arranque

```bash
pnpm install

# Base de datos (Postgres en docker-compose, puerto 5433 en el host)
docker compose up -d
cp api/.env.example api/.env   # ajustar si hace falta
pnpm --filter @totalfutbol/api run prisma:migrate

# Levanta /api y /app juntos
pnpm dev

# O por separado
pnpm dev:api   # Nest en modo watch, http://localhost:3000
pnpm dev:app   # Metro/Expo, abrir con la app Expo Go o un dev build
```

`/app` necesita saber donde esta `/api`. Copiar `app/.env.example` a `app/.env` y ajustar
`EXPO_PUBLIC_API_URL` segun donde corra la app:

- Emulador Android: `http://10.0.2.2:3000` (`localhost` del emulador apunta a si mismo, no a tu PC).
- Dispositivo fisico (Expo Go o dev build) en la misma red: la IP LAN de tu PC, ej.
  `http://192.168.x.x:3000`.
- Web/simulador iOS en la misma maquina: `http://localhost:3000` anda directo.

## Base de datos

Schema en `api/prisma/schema.prisma` (Prisma + PostgreSQL). Comandos desde `/api`:

| Comando                | Que hace                                                   |
| ---------------------- | ---------------------------------------------------------- |
| `pnpm prisma:migrate`  | Crea/aplica migraciones en dev (`prisma migrate dev`)      |
| `pnpm prisma:deploy`   | Aplica migraciones pendientes sin generar nuevas (CI/prod) |
| `pnpm prisma:generate` | Regenera el Prisma Client                                  |
| `pnpm prisma:studio`   | Explorador visual de datos                                 |

## Scripts

| Comando                             | Que hace                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                          | Corre `/api` y `/app` en paralelo (delega a los `dev` de cada workspace) |
| `pnpm lint`                         | Lint de todos los workspaces que lo definan                              |
| `pnpm format` / `pnpm format:check` | Prettier sobre todo el repo                                              |
| `pnpm test`                         | Tests de todos los workspaces que los definan                            |

Cada workspace (`/api`, `/app`, `/packages/*`) tiene ademas sus propios scripts; correlos con
`pnpm --filter <nombre-del-paquete> run <script>`.
