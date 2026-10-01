-- Phase 4 server-authoritative gameplay records.
CREATE TYPE "GameSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');
CREATE TYPE "GameRoundStatus" AS ENUM ('PENDING', 'ACTIVE', 'SETTLED', 'CANCELLED');
CREATE TYPE "GameType" AS ENUM ('SLOTS', 'BLACKJACK', 'ROULETTE');
CREATE TYPE "GameActionType" AS ENUM ('SLOT_SPIN', 'ROULETTE_SPIN', 'BLACKJACK_DEAL', 'BLACKJACK_HIT', 'BLACKJACK_STAND', 'BLACKJACK_DOUBLE');

CREATE TABLE "GameSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "totalWagered" INTEGER NOT NULL DEFAULT 0,
    "totalWon" INTEGER NOT NULL DEFAULT 0,
    "roundCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameRound" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" "GameRoundStatus" NOT NULL DEFAULT 'PENDING',
    "wager" INTEGER NOT NULL,
    "payout" INTEGER NOT NULL DEFAULT 0,
    "netResult" INTEGER NOT NULL DEFAULT 0,
    "gameType" "GameType" NOT NULL,
    "state" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameAction" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "GameActionType" NOT NULL,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameAction_idempotencyKey_key" ON "GameAction"("idempotencyKey");
CREATE UNIQUE INDEX "GameSession_userId_gameId_active_key" ON "GameSession"("userId", "gameId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "GameRound_sessionId_roundNumber_key" ON "GameRound"("sessionId", "roundNumber");
CREATE UNIQUE INDEX "GameRound_one_active_per_session_idx" ON "GameRound"("sessionId") WHERE "status" IN ('PENDING', 'ACTIVE');
CREATE INDEX "GameSession_userId_status_updatedAt_idx" ON "GameSession"("userId", "status", "updatedAt");
CREATE INDEX "GameSession_gameId_status_updatedAt_idx" ON "GameSession"("gameId", "status", "updatedAt");
CREATE INDEX "GameSession_userId_createdAt_idx" ON "GameSession"("userId", "createdAt");
CREATE INDEX "GameRound_userId_createdAt_idx" ON "GameRound"("userId", "createdAt");
CREATE INDEX "GameRound_userId_gameType_createdAt_idx" ON "GameRound"("userId", "gameType", "createdAt");
CREATE INDEX "GameRound_sessionId_status_idx" ON "GameRound"("sessionId", "status");
CREATE INDEX "GameAction_roundId_createdAt_idx" ON "GameAction"("roundId", "createdAt");
CREATE INDEX "GameAction_userId_createdAt_idx" ON "GameAction"("userId", "createdAt");
CREATE INDEX "GameAction_sessionId_createdAt_idx" ON "GameAction"("sessionId", "createdAt");

ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAction" ADD CONSTRAINT "GameAction_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAction" ADD CONSTRAINT "GameAction_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAction" ADD CONSTRAINT "GameAction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_totalWagered_nonnegative_check" CHECK ("totalWagered" >= 0);
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_totalWon_nonnegative_check" CHECK ("totalWon" >= 0);
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_roundCount_nonnegative_check" CHECK ("roundCount" >= 0);
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_wager_positive_check" CHECK ("wager" > 0);
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_payout_nonnegative_check" CHECK ("payout" >= 0);
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_net_math_check" CHECK ("netResult" = "payout" - "wager");
