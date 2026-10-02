import "server-only";
import { Prisma, type PrismaClient, type VipLevel } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { applyWalletMutationToLockedWallet, lockWallet } from "@/server/wallet/ledger";
import { createNotification } from "@/server/notifications/service";
import { recordRewardHistory } from "@/server/rewards/service";
import { conflict, forbidden, notFound } from "@/server/http/errors";

type Eligibility = { minLevel?: VipLevel; minXp?: number; newPlayerWithinDays?: number };
type EligibilityContext = { createdAt: Date; level: VipLevel; xp: number };

function toEligibility(value: Prisma.JsonValue | null): Eligibility {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Eligibility;
}

function levelAllowed(actual: VipLevel, required?: VipLevel) {
  if (!required) return true;
  const levels: VipLevel[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];
  return levels.indexOf(actual) >= levels.indexOf(required);
}

function evaluateEligibility(context: EligibilityContext, promotion: { eligibility: Prisma.JsonValue | null }) {
  const eligibility = toEligibility(promotion.eligibility);
  if (!levelAllowed(context.level, eligibility.minLevel)) return false;
  if (eligibility.minXp !== undefined && context.xp < eligibility.minXp) return false;
  if (eligibility.newPlayerWithinDays !== undefined && context.createdAt < new Date(Date.now() - eligibility.newPlayerWithinDays * 24 * 60 * 60 * 1000)) return false;
  return true;
}

async function getEligibilityContext(tx: Prisma.TransactionClient | PrismaClient, userId: string): Promise<EligibilityContext | null> {
  const [user, progression] = await Promise.all([
    tx.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    tx.playerProgression.findUnique({ where: { userId }, select: { level: true, xp: true } }),
  ]);
  if (!user) return null;
  return { createdAt: user.createdAt, level: progression?.level ?? "BRONZE", xp: progression?.xp ?? 0 };
}

async function isEligible(tx: Prisma.TransactionClient | PrismaClient, userId: string, promotion: { eligibility: Prisma.JsonValue | null }) {
  const context = await getEligibilityContext(tx, userId);
  return context ? evaluateEligibility(context, promotion) : false;
}

function serializePromotion(promotion: { id: string; title: string; slug: string; description: string; banner: Prisma.JsonValue | null; startAt: Date; endAt: Date; status: string; rewardVC: number; eligibility: Prisma.JsonValue | null; createdAt: Date; updatedAt: Date }, claimed = false) {
  return { id: promotion.id, title: promotion.title, slug: promotion.slug, description: promotion.description, banner: promotion.banner, startAt: promotion.startAt.toISOString(), endAt: promotion.endAt.toISOString(), status: promotion.status, rewardVC: promotion.rewardVC, eligibility: promotion.eligibility, claimed, createdAt: promotion.createdAt.toISOString(), updatedAt: promotion.updatedAt.toISOString() };
}

export async function listEligiblePromotions(userId: string) {
  const now = new Date();
  const prisma = getPrisma();
  const [context, records] = await Promise.all([
    getEligibilityContext(prisma, userId),
    prisma.promotion.findMany({ where: { status: "ACTIVE", startAt: { lte: now }, endAt: { gt: now } }, orderBy: [{ endAt: "asc" }, { createdAt: "desc" }], include: { claims: { where: { userId }, select: { id: true } } } }),
  ]);
  if (!context) return [];
  const results = [];
  for (const promotion of records) {
    if (evaluateEligibility(context, promotion)) results.push(serializePromotion(promotion, promotion.claims.length > 0));
  }
  return results;
}

export async function claimPromotion(userId: string, promotionId: string, idempotencyKey: string) {
  return getPrisma().$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT "id" FROM "Promotion" WHERE "id" = ${promotionId}::uuid FOR UPDATE`);
    if (!locked[0]) throw notFound("Promotion not found.");
    const promotion = await tx.promotion.findUniqueOrThrow({ where: { id: promotionId } });
    const byKey = await tx.promotionClaim.findUnique({ where: { idempotencyKey } });
    if (byKey) {
      if (byKey.userId !== userId || byKey.promotionId !== promotionId) throw conflict("The idempotency key has already been used for another promotion claim.");
      return { claimId: byKey.id, rewardVC: byKey.rewardVC, transactionId: byKey.walletTransactionId, idempotent: true };
    }
    const existing = await tx.promotionClaim.findUnique({ where: { promotionId_userId: { promotionId, userId } } });
    if (existing) return { claimId: existing.id, rewardVC: existing.rewardVC, transactionId: existing.walletTransactionId, idempotent: true };
    const now = new Date();
    if (promotion.status !== "ACTIVE" || promotion.startAt > now || promotion.endAt <= now) throw conflict("This promotion is not currently active.");
    if (!(await isEligible(tx, userId, promotion))) throw forbidden("You are not eligible for this promotion.");
    const wallet = await lockWallet(tx, userId);
    const walletResult = await applyWalletMutationToLockedWallet(tx, wallet, { userId, type: "PROMOTION_REWARD", amount: promotion.rewardVC, idempotencyKey: `promotion:${promotion.id}:${userId}`, referenceId: `promotion:${promotion.id}`, metadata: { promotionId: promotion.id, promotionSlug: promotion.slug } });
    const claim = await tx.promotionClaim.create({ data: { promotionId, userId, rewardVC: promotion.rewardVC, walletTransactionId: walletResult.transaction.id, idempotencyKey, claimedAt: now } });
    await recordRewardHistory(tx, { userId, type: "PROMOTION_REWARD", amountVC: promotion.rewardVC, promotionId, walletTransactionId: walletResult.transaction.id, sourceKey: `promotion-claim:${claim.id}`, metadata: { promotionId, promotionSlug: promotion.slug } });
    await createNotification(tx, { userId, type: "PROMOTION", title: `${promotion.title} claimed`, message: `${promotion.rewardVC.toLocaleString("en-US")} VC was added to your fictional-credit wallet.` });
    return { claimId: claim.id, rewardVC: claim.rewardVC, transactionId: claim.walletTransactionId, newBalance: walletResult.balance, idempotent: false };
  }, { maxWait: 15_000, timeout: 30_000 });
}
