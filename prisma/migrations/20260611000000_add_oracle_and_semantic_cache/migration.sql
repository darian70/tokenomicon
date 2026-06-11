-- Migration: add_oracle_and_semantic_cache
-- Adds the GameRoundOracle tables and SemanticCacheEntry table.
-- Run against production: npx prisma migrate deploy

-- OracleCacheEntry: computed ground truth, deduped by content hash.
CREATE TABLE IF NOT EXISTS "OracleCacheEntry" (
    "id"            TEXT NOT NULL,
    "game"          "GameType" NOT NULL,
    "cacheKey"      TEXT NOT NULL,
    "challenge"     JSONB NOT NULL,
    "groundTruth"   JSONB NOT NULL,
    "oracleCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerCalls" JSONB NOT NULL DEFAULT '[]',
    "hits"          INTEGER NOT NULL DEFAULT 0,
    "expiresAt"     TIMESTAMP(3) NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OracleCacheEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OracleCacheEntry_game_cacheKey_key"
    ON "OracleCacheEntry"("game", "cacheKey");

CREATE INDEX IF NOT EXISTS "OracleCacheEntry_game_expiresAt_idx"
    ON "OracleCacheEntry"("game", "expiresAt");

-- OraclePoolEntry: pre-warmed rounds ready to serve at play-time.
CREATE TABLE IF NOT EXISTS "OraclePoolEntry" (
    "id"          TEXT NOT NULL,
    "game"        "GameType" NOT NULL,
    "tier"        TEXT NOT NULL,
    "cacheKey"    TEXT NOT NULL,
    "challenge"   JSONB NOT NULL,
    "groundTruth" JSONB NOT NULL,
    "reservedAt"  TIMESTAMP(3),
    "servedAt"    TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OraclePoolEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OraclePoolEntry_game_tier_servedAt_reservedAt_idx"
    ON "OraclePoolEntry"("game", "tier", "servedAt", "reservedAt");

CREATE INDEX IF NOT EXISTS "OraclePoolEntry_createdAt_idx"
    ON "OraclePoolEntry"("createdAt");

-- OracleCallLog: per-call audit log for cost reconciliation.
CREATE TABLE IF NOT EXISTS "OracleCallLog" (
    "id"            TEXT NOT NULL,
    "game"          "GameType" NOT NULL,
    "tier"          TEXT NOT NULL,
    "outcome"       TEXT NOT NULL,
    "oracleCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "providerCalls" INTEGER NOT NULL DEFAULT 0,
    "durationMs"    INTEGER NOT NULL DEFAULT 0,
    "cacheKey"      TEXT,
    "error"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OracleCallLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OracleCallLog_game_createdAt_idx"
    ON "OracleCallLog"("game", "createdAt");

CREATE INDEX IF NOT EXISTS "OracleCallLog_outcome_createdAt_idx"
    ON "OracleCallLog"("outcome", "createdAt");

-- SemanticCacheEntry: prompt embeddings for near-duplicate API response reuse.
CREATE TABLE IF NOT EXISTS "SemanticCacheEntry" (
    "id"                TEXT NOT NULL,
    "model"             TEXT NOT NULL,
    "promptHash"        TEXT NOT NULL,
    "promptText"        TEXT NOT NULL,
    "embedding"         JSONB NOT NULL,
    "responseText"      TEXT NOT NULL,
    "promptTokens"      INTEGER NOT NULL DEFAULT 0,
    "completionTokens"  INTEGER NOT NULL DEFAULT 0,
    "cacheHits"         INTEGER NOT NULL DEFAULT 0,
    "savedCreditsTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemanticCacheEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SemanticCacheEntry_model_promptHash_key"
    ON "SemanticCacheEntry"("model", "promptHash");

CREATE INDEX IF NOT EXISTS "SemanticCacheEntry_model_expiresAt_idx"
    ON "SemanticCacheEntry"("model", "expiresAt");

CREATE INDEX IF NOT EXISTS "SemanticCacheEntry_createdAt_idx"
    ON "SemanticCacheEntry"("createdAt");
