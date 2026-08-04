-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO', 'PREFIERO_NO_DECIR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "apellido" TEXT,
ADD COLUMN     "fechaNacimiento" TIMESTAMP(3),
ADD COLUMN     "fotoUrl" TEXT,
ADD COLUMN     "genero" "Genero";
