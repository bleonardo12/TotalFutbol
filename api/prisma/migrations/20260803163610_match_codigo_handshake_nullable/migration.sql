-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "codigoHandshakeExpiraEn" TIMESTAMP(3),
ALTER COLUMN "codigoHandshake" DROP NOT NULL;
