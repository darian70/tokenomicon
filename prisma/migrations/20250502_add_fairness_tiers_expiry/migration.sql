-- Add provably fair fields, difficulty tier, and session expiry to GameSession
ALTER TABLE "GameSession" ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'sandbox';
ALTER TABLE "GameSession" ADD COLUMN "serverSeedHash" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "clientSeed" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "serverSeed" TEXT;
ALTER TABLE "GameSession" ADD COLUMN "nonce" INTEGER;
ALTER TABLE "GameSession" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Index for active session lookups (unsettled sessions per user)
CREATE INDEX "GameSession_userId_settledAt_idx" ON "GameSession"("userId", "settledAt");
