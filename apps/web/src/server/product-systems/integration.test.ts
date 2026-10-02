import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { claimPromotion } from "../promotions/service";
import { getPrisma } from "../db/prisma";
import { markNotificationRead } from "../notifications/service";
import { spinSlotsRound } from "../gameplay/service";

const runIntegration = process.env.VELTRIX_PHASE6_INTEGRATION === "1";

describe.skipIf(!runIntegration)("Phase 6 PostgreSQL integration", () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
    await getPrisma().$disconnect();
  });

  async function createPlayer(balance: number) {
    const id = randomUUID();
    const user = await prisma.user.create({
      data: {
        email: `phase6-${id}@veltrix.local`,
        passwordHash: "integration-only",
        profile: { create: { username: `phase6_${id.replaceAll("-", "").slice(0, 20)}` } },
        wallet: { create: { balance } },
        progression: { create: { level: "BRONZE", xp: 0 } },
        responsibleGaming: { create: {} },
      },
      select: { id: true },
    });
    return user.id;
  }

  it("issues one promotion reward under concurrent claims", async () => {
    const userId = await createPlayer(1_000);
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
    const promotion = await prisma.promotion.create({ data: { title: "Phase 6 concurrency", slug: `phase6-${randomUUID()}`, description: "Integration promotion", startAt: new Date(Date.now() - 60_000), endAt: new Date(Date.now() + 60_000), status: "ACTIVE", rewardVC: 50, eligibility: {}, createdById: admin.id } });

    const results = await Promise.allSettled([
      claimPromotion(userId, promotion.id, `phase6-claim-a-${randomUUID()}`),
      claimPromotion(userId, promotion.id, `phase6-claim-b-${randomUUID()}`),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    expect(await prisma.promotionClaim.count({ where: { promotionId: promotion.id, userId } })).toBe(1);
    expect(await prisma.walletTransaction.count({ where: { userId, type: "PROMOTION_REWARD" } })).toBe(1);
  });

  it("serializes concurrent wagers against a UTC daily limit", async () => {
    const userId = await createPlayer(1_000);
    await prisma.responsibleGamingSetting.update({ where: { userId }, data: { dailyWagerLimit: 10, maxWager: 10 } });
    const results = await Promise.allSettled([spinSlotsRound(userId, 10, `phase6-spin-a-${randomUUID()}`), spinSlotsRound(userId, 10, `phase6-spin-b-${randomUUID()}`)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.walletTransaction.count({ where: { userId, type: "GAME_WAGER" } })).toBe(1);
  });

  it("scopes notification reads to the authenticated user", async () => {
    const ownerId = await createPlayer(100);
    const otherId = await createPlayer(100);
    const notification = await prisma.notification.create({ data: { userId: ownerId, type: "SYSTEM", title: "Private", message: "Owner only" } });
    await expect(markNotificationRead(otherId, notification.id)).rejects.toThrow("Notification not found");
  });
});
