-- CreateEnum
CREATE TYPE "TipoDeclinacion" AS ENUM ('RECHAZO', 'DESISTIMIENTO');

-- AlterEnum
ALTER TYPE "TipoEventoFairPlay" ADD VALUE 'DECLINACION_DESAFIO';

-- CreateTable
CREATE TABLE "declinaciones_desafio" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "tipo" "TipoDeclinacion" NOT NULL,
    "challengeId" TEXT,
    "matchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "declinaciones_desafio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "declinaciones_desafio_teamId_createdAt_idx" ON "declinaciones_desafio"("teamId", "createdAt");

-- AddForeignKey
ALTER TABLE "declinaciones_desafio" ADD CONSTRAINT "declinaciones_desafio_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declinaciones_desafio" ADD CONSTRAINT "declinaciones_desafio_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "declinaciones_desafio" ADD CONSTRAINT "declinaciones_desafio_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
