-- Add player progression fields to UserProfile
ALTER TABLE "UserProfile" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserProfile" ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "UserProfile" ADD COLUMN "totalGamesPlayed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserProfile" ADD COLUMN "totalGamesWon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserProfile" ADD COLUMN "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserProfile" ADD COLUMN "bestStreak" INTEGER NOT NULL DEFAULT 0;

-- Create Achievement table
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Achievement_userId_code_key" ON "Achievement"("userId", "code");
CREATE INDEX "Achievement_userId_idx" ON "Achievement"("userId");
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
