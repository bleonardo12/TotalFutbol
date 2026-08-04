-- CreateEnum
CREATE TYPE "CategoriaFutbol" AS ENUM ('MASCULINO', 'FEMENINO', 'MIXTO');

-- AlterTable: teams.categoria -- default temporal solo para no romper las
-- filas existentes (equipos de prueba), se saca enseguida asi todo insert
-- nuevo tiene que mandarlo si o si.
ALTER TABLE "teams" ADD COLUMN "categoria" "CategoriaFutbol" NOT NULL DEFAULT 'MASCULINO';
ALTER TABLE "teams" ALTER COLUMN "categoria" DROP DEFAULT;

-- AlterTable: campeonatos.categoria -- mismo criterio (4 filas de prueba existentes)
ALTER TABLE "campeonatos" ADD COLUMN "categoria" "CategoriaFutbol" NOT NULL DEFAULT 'MASCULINO';
ALTER TABLE "campeonatos" ALTER COLUMN "categoria" DROP DEFAULT;

-- DropIndex
DROP INDEX "campeonatos_seasonId_division_key";

-- CreateIndex
CREATE UNIQUE INDEX "campeonatos_seasonId_categoria_division_key" ON "campeonatos"("seasonId", "categoria", "division");
