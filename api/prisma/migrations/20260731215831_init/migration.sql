-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('PROVISIONAL', 'RANKEADO');

-- CreateEnum
CREATE TYPE "RolIntegrante" AS ENUM ('CAPITAN', 'JUGADOR');

-- CreateEnum
CREATE TYPE "CantidadJugadores" AS ENUM ('F5', 'F6', 'F7', 'F8', 'F11');

-- CreateEnum
CREATE TYPE "Superficie" AS ENUM ('SINTETICO', 'SALON', 'PASTO', 'TIERRA');

-- CreateEnum
CREATE TYPE "EstadoDesafio" AS ENUM ('PROPUESTO', 'ACEPTADO', 'RECHAZADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "EstadoPartido" AS ENUM ('PACTADO', 'FIRMADO', 'EN_JUEGO', 'REPORTADO', 'CONFIRMADO', 'EN_DISPUTA', 'LIQUIDADO', 'SUSPENDIDO', 'VOID');

-- CreateEnum
CREATE TYPE "OutcomePartido" AS ENUM ('GANA_LOCAL', 'GANA_VISITANTE', 'EMPATE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "nombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capitanId" TEXT NOT NULL,
    "estado" "EstadoEquipo" NOT NULL DEFAULT 'PROVISIONAL',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 1500,
    "rd" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "volatilidad" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rol" "RolIntegrante" NOT NULL DEFAULT 'JUGADOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "verificada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "desafianteId" TEXT NOT NULL,
    "desafiadoId" TEXT NOT NULL,
    "cantidadJugadores" "CantidadJugadores" NOT NULL,
    "superficie" "Superficie" NOT NULL,
    "sedeId" TEXT,
    "fechaPropuesta" TIMESTAMP(3),
    "estado" "EstadoDesafio" NOT NULL DEFAULT 'PROPUESTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT,
    "equipoLocalId" TEXT NOT NULL,
    "equipoVisitanteId" TEXT NOT NULL,
    "cantidadJugadores" "CantidadJugadores" NOT NULL,
    "superficie" "Superficie" NOT NULL,
    "sedeId" TEXT,
    "estado" "EstadoPartido" NOT NULL DEFAULT 'FIRMADO',
    "codigoHandshake" TEXT NOT NULL,
    "reporterLocalId" TEXT,
    "reporterVisitanteId" TEXT,
    "outcomeFinal" "OutcomePartido",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_reports" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "outcome" "OutcomePartido" NOT NULL,
    "golesLocal" INTEGER,
    "golesVisita" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating_ledger" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "ratingResultante" DOUBLE PRECISION NOT NULL,
    "rdResultante" DOUBLE PRECISION NOT NULL,
    "volatilidadResultante" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telefono_key" ON "users"("telefono");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "teams_rating_idx" ON "teams"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_userId_key" ON "team_members"("teamId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "matches_challengeId_key" ON "matches"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "matches_codigoHandshake_key" ON "matches"("codigoHandshake");

-- CreateIndex
CREATE UNIQUE INDEX "match_reports_matchId_reporterId_key" ON "match_reports"("matchId", "reporterId");

-- CreateIndex
CREATE INDEX "rating_ledger_teamId_createdAt_idx" ON "rating_ledger"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_capitanId_fkey" FOREIGN KEY ("capitanId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_desafianteId_fkey" FOREIGN KEY ("desafianteId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_desafiadoId_fkey" FOREIGN KEY ("desafiadoId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_equipoLocalId_fkey" FOREIGN KEY ("equipoLocalId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_equipoVisitanteId_fkey" FOREIGN KEY ("equipoVisitanteId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_reporterLocalId_fkey" FOREIGN KEY ("reporterLocalId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_reporterVisitanteId_fkey" FOREIGN KEY ("reporterVisitanteId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reports" ADD CONSTRAINT "match_reports_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reports" ADD CONSTRAINT "match_reports_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_reports" ADD CONSTRAINT "match_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_ledger" ADD CONSTRAINT "rating_ledger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating_ledger" ADD CONSTRAINT "rating_ledger_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
