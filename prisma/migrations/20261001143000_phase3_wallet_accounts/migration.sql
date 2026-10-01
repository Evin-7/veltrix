-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('WELCOME_BONUS', 'DAILY_REWARD', 'GAME_WAGER', 'GAME_WIN', 'ADMIN_ADJUSTMENT');

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "referenceId" VARCHAR(160),
    "idempotencyKey" VARCHAR(160),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Favourite" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favourite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecentGame" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "lastPlayedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecentGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX "Wallet_balance_idx" ON "Wallet"("balance");
CREATE UNIQUE INDEX "WalletTransaction_idempotencyKey_key" ON "WalletTransaction"("idempotencyKey");
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "WalletTransaction_userId_type_createdAt_idx" ON "WalletTransaction"("userId", "type", "createdAt");
CREATE INDEX "WalletTransaction_referenceId_idx" ON "WalletTransaction"("referenceId");
CREATE UNIQUE INDEX "Favourite_userId_gameId_key" ON "Favourite"("userId", "gameId");
CREATE INDEX "Favourite_userId_createdAt_idx" ON "Favourite"("userId", "createdAt");
CREATE INDEX "Favourite_gameId_idx" ON "Favourite"("gameId");
CREATE UNIQUE INDEX "RecentGame_userId_gameId_key" ON "RecentGame"("userId", "gameId");
CREATE INDEX "RecentGame_userId_lastPlayedAt_idx" ON "RecentGame"("userId", "lastPlayedAt");
CREATE INDEX "RecentGame_gameId_idx" ON "RecentGame"("gameId");

-- Keep all monetary-style integer invariants in the database as well as in the service.
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_balance_nonnegative_check" CHECK ("balance" >= 0);
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_amount_nonzero_check" CHECK ("amount" <> 0);
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_balance_before_nonnegative_check" CHECK ("balanceBefore" >= 0);
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_balance_after_nonnegative_check" CHECK ("balanceAfter" >= 0);
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_balance_math_check" CHECK ("balanceAfter" = "balanceBefore" + "amount");

-- Phase 2 may already contain PLAYER rows when this migration is applied. Backfill each
-- player exactly once with the same welcome-credit invariant used by registration.
INSERT INTO "Wallet" ("id", "userId", "balance", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "id", 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'PLAYER';

INSERT INTO "WalletTransaction" (
    "id", "walletId", "userId", "type", "amount", "balanceBefore", "balanceAfter",
    "referenceId", "idempotencyKey", "createdAt"
)
SELECT
    gen_random_uuid(), w."id", u."id", 'WELCOME_BONUS', 10000, 0, 10000,
    'welcome:' || u."id"::text, 'welcome:' || u."id"::text, CURRENT_TIMESTAMP
FROM "User" u
JOIN "Wallet" w ON w."userId" = u."id"
WHERE u."role" = 'PLAYER';

UPDATE "Wallet"
SET "balance" = 10000, "updatedAt" = CURRENT_TIMESTAMP
WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" = 'PLAYER');

-- Ledger entries are append-only. Corrections must be compensating entries.
CREATE OR REPLACE FUNCTION veltrix_prevent_wallet_transaction_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'WalletTransaction rows are append-only';
END;
$$;

CREATE TRIGGER wallet_transaction_append_only
BEFORE UPDATE OR DELETE ON "WalletTransaction"
FOR EACH ROW EXECUTE FUNCTION veltrix_prevent_wallet_transaction_mutation();

-- Add relationships after backfill so existing PLAYER rows are valid before constraints apply.
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey"
    FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecentGame" ADD CONSTRAINT "RecentGame_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecentGame" ADD CONSTRAINT "RecentGame_gameId_fkey"
    FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
