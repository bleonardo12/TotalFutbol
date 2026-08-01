-- CreateEnum
CREATE TYPE "TipoEventoFairPlay" AS ENUM ('PARTIDO_LIMPIO', 'GHOSTING', 'REPORTE_FALSO_PROBADO', 'DISPUTA_FRIVOLA', 'INCIDENTE_FLAG');

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "fairPlay" DOUBLE PRECISION NOT NULL DEFAULT 900;

-- CreateTable
CREATE TABLE "fair_play_ledger" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "matchId" TEXT,
    "tipo" "TipoEventoFairPlay" NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "fairPlayResultante" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fair_play_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_incident_flags" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "flaggeadoPorTeamId" TEXT NOT NULL,
    "flaggeadoPorUserId" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_incident_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fair_play_ledger_teamId_createdAt_idx" ON "fair_play_ledger"("teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "match_incident_flags_matchId_flaggeadoPorTeamId_key" ON "match_incident_flags"("matchId", "flaggeadoPorTeamId");

-- AddForeignKey
ALTER TABLE "fair_play_ledger" ADD CONSTRAINT "fair_play_ledger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_play_ledger" ADD CONSTRAINT "fair_play_ledger_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_incident_flags" ADD CONSTRAINT "match_incident_flags_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_incident_flags" ADD CONSTRAINT "match_incident_flags_flaggeadoPorTeamId_fkey" FOREIGN KEY ("flaggeadoPorTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_incident_flags" ADD CONSTRAINT "match_incident_flags_flaggeadoPorUserId_fkey" FOREIGN KEY ("flaggeadoPorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
