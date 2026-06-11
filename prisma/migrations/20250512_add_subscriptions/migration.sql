-- Add subscription_grant to LedgerEntryType enum
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'subscription_grant';

-- Create UserSubscription table
CREATE TABLE IF NOT EXISTS "UserSubscription" (
    "id"                   TEXT NOT NULL,
    "userId"               TEXT NOT NULL,
    "stripeCustomerId"     TEXT,
    "stripeSubscriptionId" TEXT,
    "tier"                 TEXT NOT NULL,
    "status"               TEXT NOT NULL DEFAULT 'active',
    "monthlyCredits"       INTEGER NOT NULL,
    "currentPeriodEnd"     TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- Unique and index constraints
CREATE UNIQUE INDEX IF NOT EXISTS "UserSubscription_userId_key"               ON "UserSubscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserSubscription_stripeSubscriptionId_key" ON "UserSubscription"("stripeSubscriptionId");
CREATE INDEX        IF NOT EXISTS "UserSubscription_stripeSubscriptionId_idx" ON "UserSubscription"("stripeSubscriptionId");
CREATE INDEX        IF NOT EXISTS "UserSubscription_stripeCustomerId_idx"     ON "UserSubscription"("stripeCustomerId");
CREATE INDEX        IF NOT EXISTS "UserSubscription_status_idx"               ON "UserSubscription"("status");

-- Foreign key to UserProfile
ALTER TABLE "UserSubscription"
    ADD CONSTRAINT "UserSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
