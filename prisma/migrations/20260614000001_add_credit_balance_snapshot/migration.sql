-- Running balance snapshot table.
-- Maintained alongside every CreditLedgerEntry write so getBalances()
-- is a single primary-key lookup instead of a full groupBy scan.
CREATE TABLE "CreditBalance" (
    "userId"           TEXT NOT NULL,
    "purchasedCompute" INTEGER NOT NULL DEFAULT 0,
    "arenaCredits"     INTEGER NOT NULL DEFAULT 0,
    "bonusCompute"     INTEGER NOT NULL DEFAULT 0,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("userId")
);

-- Back-fill from existing ledger data so the snapshot is correct on deploy.
INSERT INTO "CreditBalance" ("userId", "purchasedCompute", "arenaCredits", "bonusCompute", "updatedAt")
SELECT
    "userId",
    COALESCE(SUM(CASE WHEN "bucket" = 'purchased_compute' THEN "amount" ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN "bucket" = 'arena_credits'     THEN "amount" ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN "bucket" = 'bonus_compute'     THEN "amount" ELSE 0 END), 0),
    NOW()
FROM "CreditLedgerEntry"
GROUP BY "userId"
ON CONFLICT ("userId") DO NOTHING;
