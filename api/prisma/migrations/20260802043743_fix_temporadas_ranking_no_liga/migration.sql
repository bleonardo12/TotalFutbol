-- DropForeignKey
ALTER TABLE "season_entries" DROP CONSTRAINT "season_entries_seasonId_fkey";
ALTER TABLE "season_entries" DROP CONSTRAINT "season_entries_teamId_fkey";

-- DropTable
DROP TABLE "season_entries";

-- AlterEnum: Division pasa de estilo AFA (Promocional/Ascenso/Primera/Elite)
-- a cortes por percentil del ranking global (Elite/Oro/Plata/Bronce).
-- campeonatos.division esta vacia (0 filas) en este momento, sin datos que migrar.
BEGIN;
CREATE TYPE "Division_new" AS ENUM ('ELITE', 'ORO', 'PLATA', 'BRONCE');
ALTER TABLE "campeonatos" ALTER COLUMN "division" TYPE "Division_new" USING ("division"::text::"Division_new");
ALTER TYPE "Division" RENAME TO "Division_old";
ALTER TYPE "Division_new" RENAME TO "Division";
DROP TYPE "Division_old";
COMMIT;
