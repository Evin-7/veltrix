import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { blackjackAction, dealBlackjackRound, spinSlotsRound } from "./service";

const runIntegration = process.env.VELTRIX_GAMEPLAY_INTEGRATION === "1";

describe.skipIf(!runIntegration)("Phase 4 PostgreSQL gameplay integration", () => {
  const prisma = new PrismaClient();
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `gameplay-test-${randomUUID()}@veltrix.local`,
        passwordHash: "integration-only",
        profile: { create: { username: `gameplay_${randomUUID().replaceAll("-", "").slice(0, 20)}` } },
        wallet: { create: { balance: 1_000 } },
      },
      select: { id: true },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("settles one slot round once and links both ledger entries", async () => {
    const key = `integration-slot:${randomUUID()}`;
    const first = await spinSlotsRound(userId, 100, key) as { roundId: string; idempotent?: boolean };
    const second = await spinSlotsRound(userId, 100, key) as { roundId: string; idempotent?: boolean };
    expect(first.roundId).toBe(second.roundId);
    expect(second.idempotent).toBe(true);
    await expect(prisma.gameRound.count({ where: { id: first.roundId } })).resolves.toBe(1);
    await expect(prisma.walletTransaction.count({ where: { referenceId: { startsWith: `game-round:${first.roundId}:` } } })).resolves.toBeGreaterThanOrEqual(1);
  });

  it("serializes concurrent wagers without allowing a negative wallet", async () => {
    const user = await prisma.user.create({
      data: {
        email: `gameplay-concurrency-${randomUUID()}@veltrix.local`,
        passwordHash: "integration-only",
        profile: { create: { username: `concurrency_${randomUUID().replaceAll("-", "").slice(0, 18)}` } },
        wallet: { create: { balance: 100 } },
      },
      select: { id: true },
    });
    const results = await Promise.allSettled([
      spinSlotsRound(user.id, 100, `parallel-a:${randomUUID()}`),
      spinSlotsRound(user.id, 100, `parallel-b:${randomUUID()}`),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    await expect(prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } })).resolves.toMatchObject({ balance: 0 });
  });

  it("returns the stored response for a repeated blackjack action", async () => {
    const user = await prisma.user.create({
      data: {
        email: `gameplay-blackjack-${randomUUID()}@veltrix.local`,
        passwordHash: "integration-only",
        profile: { create: { username: `blackjack_${randomUUID().replaceAll("-", "").slice(0, 18)}` } },
        wallet: { create: { balance: 1_000 } },
      },
      select: { id: true },
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const deal = await dealBlackjackRound(user.id, 100, `integration-deal:${randomUUID()}`) as { roundId: string; status: string };
      if (deal.status !== "ACTIVE") continue;
      const key = `integration-stand:${randomUUID()}`;
      const first = await blackjackAction(user.id, deal.roundId, "stand", key) as { roundId: string; idempotent?: boolean };
      const second = await blackjackAction(user.id, deal.roundId, "stand", key) as { roundId: string; idempotent?: boolean };
      expect(first.roundId).toBe(second.roundId);
      expect(second.idempotent).toBe(true);
      return;
    }
    throw new Error("Could not obtain an active blackjack hand for idempotency coverage.");
  });
});
