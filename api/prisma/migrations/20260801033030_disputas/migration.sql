-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('JUGADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "CapaDisputa" AS ENUM ('C1_EVIDENCIA', 'C2_PLANTELES', 'C3_ADMIN');

-- CreateEnum
CREATE TYPE "RespuestaPoll" AS ENUM ('CONFIRMA_CAPITAN', 'CONTRADICE_CAPITAN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rol" "RolUsuario" NOT NULL DEFAULT 'JUGADOR';

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "capa" "CapaDisputa" NOT NULL DEFAULT 'C1_EVIDENCIA',
    "nonce" TEXT NOT NULL,
    "capaExpiraEn" TIMESTAMP(3) NOT NULL,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "resolucion" "OutcomePartido",
    "anulada" BOOLEAN NOT NULL DEFAULT false,
    "resueltaPorId" TEXT,
    "resueltaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidence" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "subidoPorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_poll_respuestas" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "integranteId" TEXT NOT NULL,
    "respuesta" "RespuestaPoll" NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_poll_respuestas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disputes_matchId_key" ON "disputes"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_nonce_key" ON "disputes"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "dispute_poll_respuestas_disputeId_integranteId_key" ON "dispute_poll_respuestas"("disputeId", "integranteId");

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resueltaPorId_fkey" FOREIGN KEY ("resueltaPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_poll_respuestas" ADD CONSTRAINT "dispute_poll_respuestas_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "disputes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_poll_respuestas" ADD CONSTRAINT "dispute_poll_respuestas_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_poll_respuestas" ADD CONSTRAINT "dispute_poll_respuestas_integranteId_fkey" FOREIGN KEY ("integranteId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
