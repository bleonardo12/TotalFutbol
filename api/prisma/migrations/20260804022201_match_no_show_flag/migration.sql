-- CreateTable
CREATE TABLE "match_no_show_flags" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "flaggeadoPorTeamId" TEXT NOT NULL,
    "flaggeadoPorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_no_show_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_no_show_flags_matchId_flaggeadoPorTeamId_key" ON "match_no_show_flags"("matchId", "flaggeadoPorTeamId");

-- AddForeignKey
ALTER TABLE "match_no_show_flags" ADD CONSTRAINT "match_no_show_flags_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_no_show_flags" ADD CONSTRAINT "match_no_show_flags_flaggeadoPorTeamId_fkey" FOREIGN KEY ("flaggeadoPorTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_no_show_flags" ADD CONSTRAINT "match_no_show_flags_flaggeadoPorUserId_fkey" FOREIGN KEY ("flaggeadoPorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
