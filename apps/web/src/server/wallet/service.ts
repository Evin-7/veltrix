import "server-only";
import { Prisma } from "@prisma/client";
import { getPrisma } from "@/server/db/prisma";
import { formatCurrency } from "@/lib/currency";
import { notFound } from "@/server/http/errors";
import { createNotification } from "@/server/notifications/service";
import { recordRewardHistory } from "@/server/rewards/service";
import { applyWalletMutation, applyWalletMutationToLockedWallet, lockWallet, type WalletMutationInput } from "./ledger";
import type { WalletTransactionTypeValue } from "./constants";

export const WELCOME_BONUS_AMOUNT = 10_000;
export const DAILY_REWARD_AMOUNT = 500;

export { walletTransactionTypes } from "./constants";
export type { WalletTransactionTypeValue } from "./constants";

export type WalletSummary = { balance: number; currency: "VC" };
export type WalletTransactionView = {
  type: WalletTransactionTypeValue;
  amount: number;
  balanceAfter: number;
  createdAt: string;
};

function utcDayStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function nextUtcDay(value: Date) {
  const start = utcDayStart(value);
  start.setUTCDate(start.getUTCDate() + 1);
  return start;
}

function utcDayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function createPlayerWalletWithWelcome(tx: Prisma.TransactionClient, userId: string) {
  await tx.wallet.create({ data: { userId, balance: 0 } });
  return applyWalletMutation(tx, {
    userId,
    type: "WELCOME_BONUS",
    amount: WELCOME_BONUS_AMOUNT,
    idempotencyKey: `welcome:${userId}`,
    referenceId: `welcome:${userId}`,
  });
}

export async function getWalletSummary(userId: string): Promise<WalletSummary> {
  const wallet = await getPrisma().wallet.findUnique({ where: { userId }, select: { balance: true } });
  if (!wallet) throw notFound("Wallet not found.");
  return { balance: wallet.balance, currency: "VC" };
}

export async function listWalletTransactions(userId: string, input: { page: number; pageSize: number; type?: WalletTransactionTypeValue }) {
  const prisma = getPrisma();
  const where: Prisma.WalletTransactionWhereInput = { userId, ...(input.type ? { type: input.type } : {}) };
  const [transactions, total] = await prisma.$transaction([
    prisma.walletTransaction.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * input.pageSize, take: input.pageSize, select: { type: true, amount: true, balanceAfter: true, createdAt: true } }),
    prisma.walletTransaction.count({ where }),
  ]);

  return {
    transactions: transactions.map((transaction) => ({
      type: transaction.type,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
      createdAt: transaction.createdAt.toISOString(),
    })),
    meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) },
  };
}

export async function getDailyRewardStatus(userId: string) {
  const prisma = getPrisma();
  const now = new Date();
  const start = utcDayStart(now);
  const next = nextUtcDay(now);
  const transaction = await prisma.walletTransaction.findFirst({
    where: { userId, type: "DAILY_REWARD", createdAt: { gte: start, lt: next } },
    orderBy: { createdAt: "asc" },
    select: { amount: true },
  });

  return { amount: DAILY_REWARD_AMOUNT, claimed: Boolean(transaction), available: !transaction, nextEligibleAt: next.toISOString() };
}

export async function claimDailyReward(userId: string) {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const start = utcDayStart(now);
    const next = nextUtcDay(now);
    const wallet = await lockWallet(tx, userId);
    const existing = await tx.walletTransaction.findFirst({
      where: { userId, type: "DAILY_REWARD", createdAt: { gte: start, lt: next } },
      orderBy: { createdAt: "asc" },
    });

    if (existing) {
      return { amount: DAILY_REWARD_AMOUNT, balance: existing.balanceAfter, claimed: true, idempotent: true, nextEligibleAt: next.toISOString() };
    }

    const mutation: WalletMutationInput = {
      userId,
      type: "DAILY_REWARD",
      amount: DAILY_REWARD_AMOUNT,
      idempotencyKey: `daily:${userId}:${utcDayKey(now)}`,
      referenceId: `daily:${userId}:${utcDayKey(now)}`,
    };
    const result = await applyWalletMutationToLockedWallet(tx, wallet, mutation);
    await recordRewardHistory(tx, { userId, type: "DAILY_REWARD", amountVC: DAILY_REWARD_AMOUNT, walletTransactionId: result.transaction.id, sourceKey: `daily-reward:${userId}:${utcDayKey(now)}`, metadata: { date: utcDayKey(now) } });
    await createNotification(tx, { userId, type: "REWARD", title: "Daily reward claimed", message: `${formatCurrency(DAILY_REWARD_AMOUNT)} was added to your wallet.` });
    return { amount: DAILY_REWARD_AMOUNT, balance: result.balance, claimed: true, idempotent: result.idempotent, nextEligibleAt: next.toISOString() };
  });
}
