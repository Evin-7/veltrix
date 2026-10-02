import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { applyWalletMutation } from "./ledger";

const runIntegration = process.env.VELTRIX_WALLET_INTEGRATION === "1";

describe.skipIf(!runIntegration)("wallet PostgreSQL integration", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createWallet(balance = 0) {
    const user = await prisma.user.create({
      data: {
        email: `wallet-test-${randomUUID()}@veltrix.local`,
        passwordHash: "integration-only",
        profile: { create: { username: `wallet_${randomUUID().replaceAll("-", "").slice(0, 20)}` } },
        wallet: { create: { balance } },
      },
      select: { id: true },
    });
    return user.id;
  }

  it("creates welcome credit exactly once and preserves ledger math", async () => {
    const userId = await createWallet();
    const first = await prisma.$transaction((tx) => applyWalletMutation(tx, { userId, type: "WELCOME_BONUS", amount: 10_000, idempotencyKey: `welcome:test:${userId}` }));
    const second = await prisma.$transaction((tx) => applyWalletMutation(tx, { userId, type: "WELCOME_BONUS", amount: 10_000, idempotencyKey: `welcome:test:${userId}` }));
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const entries = await prisma.walletTransaction.findMany({ where: { userId } });

    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(wallet.balance).toBe(10_000);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ amount: 10_000, balanceBefore: 0, balanceAfter: 10_000 });
  });

  it("rejects negative balances and leaves the wallet unchanged", async () => {
    const userId = await createWallet(100);
    await expect(prisma.$transaction((tx) => applyWalletMutation(tx, { userId, type: "GAME_WAGER", amount: -101, idempotencyKey: `debit:test:${userId}` }))).rejects.toThrow("enough virtual balance");
    await expect(prisma.wallet.findUniqueOrThrow({ where: { userId } })).resolves.toMatchObject({ balance: 100 });
    await expect(prisma.walletTransaction.count({ where: { userId } })).resolves.toBe(0);
  });

  it("serializes concurrent debits so only one can spend the balance", async () => {
    const userId = await createWallet(100);
    const attempts = await Promise.allSettled([
      prisma.$transaction((tx) => applyWalletMutation(tx, { userId, type: "GAME_WAGER", amount: -80, idempotencyKey: `parallel:a:${userId}` })),
      prisma.$transaction((tx) => applyWalletMutation(tx, { userId, type: "GAME_WAGER", amount: -80, idempotencyKey: `parallel:b:${userId}` })),
    ]);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(wallet.balance).toBe(20);
    await expect(prisma.walletTransaction.count({ where: { userId } })).resolves.toBe(1);
  });

  it("keeps favourite uniqueness and user ownership at the database boundary", async () => {
    const firstUserId = await createWallet();
    const secondUserId = await createWallet();
    const game = await prisma.game.findFirstOrThrow();
    await prisma.favourite.upsert({ where: { userId_gameId: { userId: firstUserId, gameId: game.id } }, update: {}, create: { userId: firstUserId, gameId: game.id } });
    await prisma.favourite.upsert({ where: { userId_gameId: { userId: firstUserId, gameId: game.id } }, update: {}, create: { userId: firstUserId, gameId: game.id } });
    expect(await prisma.favourite.count({ where: { userId: firstUserId, gameId: game.id } })).toBe(1);
    expect(await prisma.favourite.count({ where: { userId: secondUserId, gameId: game.id } })).toBe(0);
  });

  it("rejects ledger updates and deletes", async () => {
    const userId = await createWallet();
    await prisma.$transaction((tx) => applyWalletMutation(tx, { userId, type: "WELCOME_BONUS", amount: 10_000, idempotencyKey: `immutable:${userId}` }));
    const entry = await prisma.walletTransaction.findFirstOrThrow({ where: { userId } });
    await expect(prisma.walletTransaction.update({ where: { id: entry.id }, data: { amount: 1 } })).rejects.toThrow("append-only");
    await expect(prisma.walletTransaction.delete({ where: { id: entry.id } })).rejects.toThrow("append-only");
  });

});
