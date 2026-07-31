-- CreateTable
CREATE TABLE "match_handshakes" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "equipoLocalId" TEXT NOT NULL,
    "generadoPorId" TEXT NOT NULL,
    "cantidadJugadores" "CantidadJugadores" NOT NULL,
    "superficie" "Superficie" NOT NULL,
    "sedeId" TEXT,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "consumidoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_handshakes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_handshakes_codigo_key" ON "match_handshakes"("codigo");

-- AddForeignKey
ALTER TABLE "match_handshakes" ADD CONSTRAINT "match_handshakes_equipoLocalId_fkey" FOREIGN KEY ("equipoLocalId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_handshakes" ADD CONSTRAINT "match_handshakes_generadoPorId_fkey" FOREIGN KEY ("generadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_handshakes" ADD CONSTRAINT "match_handshakes_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;
