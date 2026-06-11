-- Add rate_limit_roulette and benchmark_brawl to GameType enum
ALTER TYPE "GameType" ADD VALUE IF NOT EXISTS 'rate_limit_roulette';
ALTER TYPE "GameType" ADD VALUE IF NOT EXISTS 'benchmark_brawl';
