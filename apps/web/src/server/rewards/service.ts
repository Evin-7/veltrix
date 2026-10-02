import "server-only";
import { Prisma, type PrismaClient, type VipLevel } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { formatCurrency } from "@/lib/currency";
import { applyWalletMutationToLockedWallet, type LockedWallet } from "@/server/wallet/ledger";
import { createNotification } from "@/server/notifications/service";
import { vipLevelIndex } from "./constants";

type RewardDbClient = Prisma.TransactionClient | PrismaClient;

function jsonValue(value: Record<string, unknown>) {
  return value as Prisma.InputJsonValue;
}

export async function recordRewardHistory(tx: RewardDbClient, input: { userId: string; type: "DAILY_REWARD" | "PROMOTION_REWARD" | "VIP_MILESTONE"; amountVC: number; level?: VipLevel; promotionId?: string; walletTransactionId?: string; sourceKey: string; metadata?: Record<string, unknown> }) {
  return tx.rewardHistory.create({ data: { userId: input.userId, type: input.type, amountVC: input.amountVC, level: input.level, promotionId: input.promotionId, walletTransactionId: input.walletTransactionId, sourceKey: input.sourceKey, metadata: input.metadata ? jsonValue(input.metadata) : undefined } });
}

async function lockProgression(tx: Prisma.TransactionClient, userId: string) {
  const rows = await tx.$queryRaw<Array<{ userId: string; level: VipLevel; xp: number }>>(Prisma.sql`SELECT "userId", "level", "xp" FROM "PlayerProgression" WHERE "userId" = ${userId}::uuid FOR UPDATE`);
  if (rows[0]) return rows[0];
  await tx.playerProgression.create({ data: { userId, level: "BRONZE", xp: 0 } });
  return tx.$queryRaw<Array<{ userId: string; level: VipLevel; xp: number }>>(Prisma.sql`SELECT "userId", "level", "xp" FROM "PlayerProgression" WHERE "userId" = ${userId}::uuid FOR UPDATE`).then((result) => result[0]);
}

function levelForXp(xp: number, configs: Array<{ level: VipLevel; xpThreshold: number }>): VipLevel {
  return configs.filter((config) => config.xpThreshold <= xp).sort((a, b) => b.xpThreshold - a.xpThreshold)[0]?.level ?? "BRONZE";
}

export async function awardGameplayXp(tx: Prisma.TransactionClient, userId: string, sourceId: string, xpAmount: number, lockedWallet: LockedWallet) {
  const progression = await lockProgression(tx, userId);
  const existing = await tx.xpEvent.findUnique({ where: { sourceType_sourceId: { sourceType: "GAME_ROUND", sourceId } } });
  if (existing) return { progression, wallet: lockedWallet, milestones: [] as VipLevel[] };

  const configs = await tx.vipLevelConfig.findMany({ orderBy: { xpThreshold: "asc" }, select: { level: true, xpThreshold: true, rewardVC: true } });
  const nextXp = progression.xp + xpAmount;
  const nextLevel = levelForXp(nextXp, configs);
  await tx.xpEvent.create({ data: { userId, sourceType: "GAME_ROUND", sourceId, amount: xpAmount } });
  await tx.playerProgression.update({ where: { userId }, data: { xp: nextXp, level: nextLevel } });

  let wallet = lockedWallet;
  const milestones: VipLevel[] = [];
  for (const config of configs) {
    if (vipLevelIndex(config.level) <= vipLevelIndex(progression.level) || config.level === "BRONZE" || config.xpThreshold > nextXp) continue;
    const sourceKey = `vip:${userId}:${config.level}`;
    const alreadyRecorded = await tx.rewardHistory.findUnique({ where: { sourceKey }, select: { id: true } });
    if (alreadyRecorded) continue;
    let walletTransactionId: string | undefined;
    if (config.rewardVC > 0) {
      const result = await applyWalletMutationToLockedWallet(tx, wallet, { userId, type: "VIP_REWARD", amount: config.rewardVC, idempotencyKey: sourceKey, referenceId: sourceKey, metadata: jsonValue({ level: config.level, xp: nextXp }) });
      wallet = { ...wallet, balance: result.balance };
      walletTransactionId = result.transaction.id;
    }
    await recordRewardHistory(tx, { userId, type: "VIP_MILESTONE", amountVC: config.rewardVC, level: config.level, walletTransactionId, sourceKey, metadata: { xp: nextXp } });
    await createNotification(tx, { userId, type: "REWARD", title: `${config.level} level reached`, message: config.rewardVC > 0 ? `You reached ${config.level} and received ${formatCurrency(config.rewardVC)}.` : `You reached ${config.level}. Keep exploring the Veltrix world.` });
    milestones.push(config.level);
  }
  return { progression: { userId, level: nextLevel, xp: nextXp }, wallet, milestones };
}

export async function getRewardOverview(userId: string) {
  const prisma = getPrisma();
  const progression = await prisma.playerProgression.upsert({ where: { userId }, update: {}, create: { userId, level: "BRONZE", xp: 0 }, select: { level: true, xp: true } });
  const configs = await prisma.vipLevelConfig.findMany({ orderBy: { xpThreshold: "asc" }, select: { level: true, xpThreshold: true, rewardVC: true } });
  const currentIndex = vipLevelIndex(progression.level);
  const next = configs.find((config) => vipLevelIndex(config.level) > currentIndex) ?? null;
  const current = configs.find((config) => config.level === progression.level) ?? configs[0];
  const rewards = await prisma.rewardHistory.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30, select: { id: true, type: true, amountVC: true, level: true, createdAt: true, metadata: true } });
  return { progression: { level: progression.level, xp: progression.xp, currentThreshold: current?.xpThreshold ?? 0, nextLevel: next?.level ?? null, nextThreshold: next?.xpThreshold ?? null, progress: next ? Math.min(100, Math.round(((progression.xp - (current?.xpThreshold ?? 0)) / Math.max(1, next.xpThreshold - (current?.xpThreshold ?? 0))) * 100)) : 100 }, configs: configs.map((config) => ({ level: config.level, xpThreshold: config.xpThreshold, rewardVC: config.rewardVC })), history: rewards.map((reward) => ({ ...reward, createdAt: reward.createdAt.toISOString() })) };
}

export async function listRewardHistory(userId: string, input: { page: number; pageSize: number }) {
  const where = { userId };
  const prisma = getPrisma();
  const [records, total] = await prisma.$transaction([
    prisma.rewardHistory.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize, select: { id: true, type: true, amountVC: true, level: true, promotionId: true, walletTransactionId: true, sourceKey: true, metadata: true, createdAt: true } }),
    prisma.rewardHistory.count({ where }),
  ]);
  return { history: records.map((record) => ({ ...record, createdAt: record.createdAt.toISOString() })), meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) } };
}
