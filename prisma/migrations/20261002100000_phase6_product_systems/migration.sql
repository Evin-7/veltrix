ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'PROMOTION_REWARD';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'VIP_REWARD';

CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'ARCHIVED');
CREATE TYPE "VipLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');
CREATE TYPE "RewardHistoryType" AS ENUM ('DAILY_REWARD', 'PROMOTION_REWARD', 'VIP_MILESTONE');
CREATE TYPE "NotificationType" AS ENUM ('REWARD', 'PROMOTION', 'ACCOUNT', 'RESPONSIBLE_GAMING', 'SYSTEM');

CREATE TABLE "Promotion" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "banner" JSONB,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "rewardVC" INTEGER NOT NULL,
    "eligibility" JSONB,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromotionClaim" (
    "id" UUID NOT NULL,
    "promotionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rewardVC" INTEGER NOT NULL,
    "walletTransactionId" UUID,
    "idempotencyKey" VARCHAR(160) NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromotionClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VipLevelConfig" (
    "level" "VipLevel" NOT NULL,
    "xpThreshold" INTEGER NOT NULL,
    "rewardVC" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VipLevelConfig_pkey" PRIMARY KEY ("level")
);

CREATE TABLE "PlayerProgression" (
    "userId" UUID NOT NULL,
    "level" "VipLevel" NOT NULL DEFAULT 'BRONZE',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlayerProgression_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "XpEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sourceType" VARCHAR(40) NOT NULL,
    "sourceId" VARCHAR(160) NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RewardHistory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "RewardHistoryType" NOT NULL,
    "amountVC" INTEGER NOT NULL DEFAULT 0,
    "level" "VipLevel",
    "promotionId" UUID,
    "walletTransactionId" UUID,
    "sourceKey" VARCHAR(200) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResponsibleGamingSetting" (
    "userId" UUID NOT NULL,
    "sessionReminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "dailyWagerLimit" INTEGER,
    "maxWager" INTEGER,
    "coolOffUntil" TIMESTAMP(3),
    "selfExcludedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResponsibleGamingSetting_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Promotion_slug_key" ON "Promotion"("slug");
CREATE INDEX "Promotion_status_startAt_endAt_idx" ON "Promotion"("status", "startAt", "endAt");
CREATE INDEX "Promotion_createdById_createdAt_idx" ON "Promotion"("createdById", "createdAt");
CREATE UNIQUE INDEX "PromotionClaim_walletTransactionId_key" ON "PromotionClaim"("walletTransactionId");
CREATE UNIQUE INDEX "PromotionClaim_idempotencyKey_key" ON "PromotionClaim"("idempotencyKey");
CREATE UNIQUE INDEX "PromotionClaim_promotionId_userId_key" ON "PromotionClaim"("promotionId", "userId");
CREATE INDEX "PromotionClaim_userId_claimedAt_idx" ON "PromotionClaim"("userId", "claimedAt");
CREATE INDEX "PromotionClaim_promotionId_claimedAt_idx" ON "PromotionClaim"("promotionId", "claimedAt");
CREATE INDEX "PlayerProgression_level_xp_idx" ON "PlayerProgression"("level", "xp");
CREATE UNIQUE INDEX "XpEvent_sourceType_sourceId_key" ON "XpEvent"("sourceType", "sourceId");
CREATE INDEX "XpEvent_userId_createdAt_idx" ON "XpEvent"("userId", "createdAt");
CREATE UNIQUE INDEX "RewardHistory_walletTransactionId_key" ON "RewardHistory"("walletTransactionId");
CREATE UNIQUE INDEX "RewardHistory_sourceKey_key" ON "RewardHistory"("sourceKey");
CREATE INDEX "RewardHistory_userId_createdAt_idx" ON "RewardHistory"("userId", "createdAt");
CREATE INDEX "RewardHistory_userId_type_createdAt_idx" ON "RewardHistory"("userId", "type", "createdAt");
CREATE INDEX "RewardHistory_promotionId_idx" ON "RewardHistory"("promotionId");
CREATE INDEX "ResponsibleGamingSetting_coolOffUntil_idx" ON "ResponsibleGamingSetting"("coolOffUntil");
CREATE INDEX "ResponsibleGamingSetting_selfExcludedUntil_idx" ON "ResponsibleGamingSetting"("selfExcludedUntil");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionClaim" ADD CONSTRAINT "PromotionClaim_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionClaim" ADD CONSTRAINT "PromotionClaim_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionClaim" ADD CONSTRAINT "PromotionClaim_walletTransactionId_fkey"
  FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PlayerProgression" ADD CONSTRAINT "PlayerProgression_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardHistory" ADD CONSTRAINT "RewardHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardHistory" ADD CONSTRAINT "RewardHistory_promotionId_fkey"
  FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardHistory" ADD CONSTRAINT "RewardHistory_walletTransactionId_fkey"
  FOREIGN KEY ("walletTransactionId") REFERENCES "WalletTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResponsibleGamingSetting" ADD CONSTRAINT "ResponsibleGamingSetting_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "VipLevelConfig" ("level", "xpThreshold", "rewardVC", "createdAt", "updatedAt") VALUES
  ('BRONZE', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('SILVER', 100, 250, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('GOLD', 500, 500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('PLATINUM', 1500, 1000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('DIAMOND', 5000, 2500, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("level") DO NOTHING;

INSERT INTO "PlayerProgression" ("userId", "level", "xp", "createdAt", "updatedAt")
SELECT "id", 'BRONZE', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "ResponsibleGamingSetting" ("userId", "createdAt", "updatedAt")
SELECT "id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User"
WHERE "role" = 'PLAYER'
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "RewardHistory" ("id", "userId", "type", "amountVC", "walletTransactionId", "sourceKey", "createdAt")
SELECT gen_random_uuid(), "userId", 'DAILY_REWARD', "amount", "id", 'legacy-daily:' || "id"::text, "createdAt"
FROM "WalletTransaction"
WHERE "type" = 'DAILY_REWARD'
ON CONFLICT ("sourceKey") DO NOTHING;
