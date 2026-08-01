-- CreateEnum
CREATE TYPE "Division" AS ENUM ('PROMOCIONAL', 'ASCENSO', 'PRIMERA', 'ELITE');

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "cerrada" BOOLEAN NOT NULL DEFAULT false,
    "cerradaEn" TIMESTAMP(3),

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_entries" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "division" "Division" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campeonatos" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "division" "Division" NOT NULL,
    "teamId" TEXT NOT NULL,
    "esCampeonDelAnio" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campeonatos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seasons_anio_key" ON "seasons"("anio");

-- CreateIndex
CREATE UNIQUE INDEX "season_entries_seasonId_teamId_key" ON "season_entries"("seasonId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "campeonatos_seasonId_division_key" ON "campeonatos"("seasonId", "division");

-- AddForeignKey
ALTER TABLE "season_entries" ADD CONSTRAINT "season_entries_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_entries" ADD CONSTRAINT "season_entries_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campeonatos" ADD CONSTRAINT "campeonatos_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campeonatos" ADD CONSTRAINT "campeonatos_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
