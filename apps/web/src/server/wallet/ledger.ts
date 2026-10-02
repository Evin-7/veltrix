import { Prisma, type PrismaClient } from "@prisma/client";
import { conflict, insufficientBalance, notFound } from "../http/errors";

export const MAX_VC_BALANCE = 2_000_000_000;

export type WalletDbClient = Prisma.TransactionClient | PrismaClient;

export type WalletMutationInput = {
  userId: string;
  type: "WELCOME_BONUS" | "DAILY_REWARD" | "GAME_WAGER" | "GAME_WIN" | "ADMIN_ADJUSTMENT" | "PROMOTION_REWARD" | "VIP_REWARD";
  amount: number;
  idempotencyKey: string;
  referenceId?: string;
  metadata?: Prisma.InputJsonValue;
  createdAt?: Date;
};

export type LockedWallet = { id: string; userId: string; balance: number };

export function calculateWalletBalance(balanceBefore: number, amount: number) {
  if (!Number.isSafeInteger(balanceBefore) || !Number.isSafeInteger(amount) || amount === 0) {
    throw conflict("Wallet amounts must be non-zero integer virtual balance units.");
  }

  const balanceAfter = balanceBefore + amount;
  if (balanceAfter < 0) throw insufficientBalance();
  if (balanceAfter > MAX_VC_BALANCE) throw conflict("The wallet balance exceeds the allowed virtual balance limit.");
  return balanceAfter;
}

export async function lockWallet(tx: WalletDbClient, userId: string): Promise<LockedWallet> {
  const rows = await tx.$queryRaw<LockedWallet[]>(Prisma.sql`
    SELECT "id", "userId", "balance"
    FROM "Wallet"
    WHERE "userId" = ${userId}::uuid
    FOR UPDATE
  `);

  const wallet = rows[0];
  if (!wallet) throw notFound("Wallet not found.");
  return wallet;
}

export async function applyWalletMutationToLockedWallet(tx: WalletDbClient, wallet: LockedWallet, input: WalletMutationInput) {
  if (!input.idempotencyKey || input.idempotencyKey.length > 160) throw conflict("A valid idempotency key is required.");

  const existing = await tx.walletTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.walletId !== wallet.id || existing.userId !== input.userId || existing.type !== input.type || existing.amount !== input.amount) {
      throw conflict("The idempotency key has already been used for a different operation.");
    }
    return { transaction: existing, balance: existing.balanceAfter, idempotent: true };
  }

  const balanceAfter = calculateWalletBalance(wallet.balance, input.amount);
  await tx.wallet.update({ where: { id: wallet.id }, data: { balance: balanceAfter } });
  const transaction = await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      balanceBefore: wallet.balance,
      balanceAfter,
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });

  return { transaction, balance: balanceAfter, idempotent: false };
}

export async function applyWalletMutation(tx: WalletDbClient, input: WalletMutationInput) {
  const wallet = await lockWallet(tx, input.userId);
  return applyWalletMutationToLockedWallet(tx, wallet, input);
}
