-- Daily grant deduplication table.
-- Unique constraint on (userId, date) prevents double-grants even under
-- concurrent requests, replacing the previous check-then-insert pattern.
CREATE TABLE "DailyGrantRecord" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "date"      TEXT NOT NULL,
    "amount"    INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyGrantRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyGrantRecord_userId_date_key" ON "DailyGrantRecord"("userId", "date");
CREATE INDEX "DailyGrantRecord_userId_idx" ON "DailyGrantRecord"("userId");
