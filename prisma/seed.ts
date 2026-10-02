import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../apps/web/src/server/auth/password";
import { applyWalletMutation } from "../apps/web/src/server/wallet/ledger";
import { gameSeeds, providerSeeds } from "./seed-data";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL },
  },
});

const demoAccounts = [
  { email: "superadmin@veltrix.local", username: "veltrix_root", displayName: "Veltrix Root", role: "SUPER_ADMIN" as const, envKey: "SEED_SUPER_ADMIN_PASSWORD", fallback: "VeltrixSuper!2026" },
  { email: "admin@veltrix.local", username: "veltrix_ops", displayName: "Veltrix Ops", role: "ADMIN" as const, envKey: "SEED_ADMIN_PASSWORD", fallback: "VeltrixAdmin!2026" },
  { email: "player@veltrix.local", username: "orbit_player", displayName: "Orbit Player", role: "PLAYER" as const, envKey: "SEED_PLAYER_PASSWORD", fallback: "VeltrixPlayer!2026" },
  { email: "player2@veltrix.local", username: "velvet_player", displayName: "Velvet Player", role: "PLAYER" as const, envKey: "SEED_PLAYER_2_PASSWORD", fallback: "VeltrixPlayer2!2026" },
  { email: "player3@veltrix.local", username: "lumen_player", displayName: "Lumen Player", role: "PLAYER" as const, envKey: "SEED_PLAYER_3_PASSWORD", fallback: "VeltrixPlayer3!2026" },
];
const productionSeed = process.env.NODE_ENV === "production" || process.env.VELTRIX_SEED_ENV === "production";
function seedEvent(event: string, fields: Record<string, number | string> = {}) {
  process.stdout.write(`${JSON.stringify({ event: `seed.${event}`, ...fields })}\n`);
}

async function main() {
  if (productionSeed) {
    const missing = demoAccounts.filter((account) => !process.env[account.envKey]).map((account) => account.envKey);
    if (missing.length > 0) throw new Error(`Production seed requires injected passwords: ${missing.join(", ")}`);
  }
  const providers = new Map<string, { id: string }>();
  const games = new Map<string, { id: string }>();
  const users = new Map<string, { id: string; role: "PLAYER" | "ADMIN" | "SUPER_ADMIN" }>();
  seedEvent("providers.start");

  for (const provider of providerSeeds) {
    const record = await prisma.gameProvider.upsert({
      where: { slug: provider.slug },
      update: { name: provider.name, status: "ACTIVE" },
      create: { name: provider.name, slug: provider.slug, status: "ACTIVE" },
      select: { id: true },
    });
    providers.set(provider.slug, record);
  }

  for (const game of gameSeeds) {
    const provider = providers.get(game.providerSlug);
    if (!provider) throw new Error(`Missing provider for ${game.slug}`);

    const record = await prisma.game.upsert({
      where: { slug: game.slug },
      update: {
        providerId: provider.id,
        name: game.name,
        description: game.description,
        category: game.category,
        status: "ACTIVE",
        featured: game.featured,
        newGame: game.newGame,
        popular: game.popular,
        demoRtp: game.demoRtp,
      },
      create: {
        providerId: provider.id,
        name: game.name,
        slug: game.slug,
        description: game.description,
        category: game.category,
        status: "ACTIVE",
        featured: game.featured,
        newGame: game.newGame,
        popular: game.popular,
        demoRtp: game.demoRtp,
      },
      select: { id: true },
    });
    games.set(game.slug, record);
  }
  seedEvent("catalog.completed", { providers: providerSeeds.length, games: gameSeeds.length });

  for (const account of demoAccounts) {
    const password = process.env[account.envKey] ?? account.fallback;
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {
        passwordHash,
        role: account.role,
        status: "ACTIVE",
        profile: {
          upsert: {
            create: { username: account.username, displayName: account.displayName },
            update: { username: account.username, displayName: account.displayName },
          },
        },
      },
      create: {
        email: account.email,
        passwordHash,
        role: account.role,
        status: "ACTIVE",
        profile: {
          create: { username: account.username, displayName: account.displayName },
        },
      },
      select: { id: true, role: true },
    });
    users.set(account.email, user);
  }
  seedEvent("accounts.completed", { accounts: demoAccounts.length });

  const vipConfigs = [
    { level: "BRONZE" as const, xpThreshold: 0, rewardVC: 0 },
    { level: "SILVER" as const, xpThreshold: 100, rewardVC: 250 },
    { level: "GOLD" as const, xpThreshold: 500, rewardVC: 500 },
    { level: "PLATINUM" as const, xpThreshold: 1_500, rewardVC: 1_000 },
    { level: "DIAMOND" as const, xpThreshold: 5_000, rewardVC: 2_500 },
  ];
  for (const config of vipConfigs) {
    await prisma.vipLevelConfig.upsert({ where: { level: config.level }, update: config, create: config });
  }

  for (const account of demoAccounts.filter((item) => item.role === "PLAYER")) {
    const user = users.get(account.email);
    if (!user) continue;
    await prisma.playerProgression.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, level: "BRONZE", xp: 0 } });
    await prisma.responsibleGamingSetting.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  }

  const superAdmin = users.get("superadmin@veltrix.local");
  if (superAdmin) {
    await prisma.promotion.upsert({
      where: { slug: "veltrix-welcome-season" },
      update: { title: "Veltrix Welcome Season", description: "A fictional-credit welcome reward for exploring the Veltrix demo world.", startAt: new Date("2026-01-01T00:00:00.000Z"), endAt: new Date("2099-01-01T00:00:00.000Z"), status: "ACTIVE", rewardVC: 750, eligibility: {} },
      create: { title: "Veltrix Welcome Season", slug: "veltrix-welcome-season", description: "A fictional-credit welcome reward for exploring the Veltrix demo world.", startAt: new Date("2026-01-01T00:00:00.000Z"), endAt: new Date("2099-01-01T00:00:00.000Z"), status: "ACTIVE", rewardVC: 750, eligibility: {}, createdById: superAdmin.id },
    });
  }

  const playerAccounts = demoAccounts.filter((account) => account.role === "PLAYER");
  for (const account of playerAccounts) {
    const user = users.get(account.email);
    if (!user) throw new Error(`Missing seeded user for ${account.email}`);

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!wallet) await tx.wallet.create({ data: { userId: user.id, balance: 0 } });

      await applyWalletMutation(tx, {
        userId: user.id,
        type: "WELCOME_BONUS",
        amount: 10_000,
        idempotencyKey: `welcome:${user.id}`,
        referenceId: `welcome:${user.id}`,
        createdAt: new Date("2026-01-15T10:00:00.000Z"),
      });
    }, { maxWait: 15_000, timeout: 30_000 });
  }

  const playerOne = users.get("player@veltrix.local");
  const playerTwo = users.get("player2@veltrix.local");
  const lunarCircuit = games.get("lunar-circuit");
  const velvetRoulette = games.get("velvet-roulette");
  const signalBlackjack = games.get("signal-blackjack");

  if (playerOne && lunarCircuit && velvetRoulette) {
    await prisma.$transaction(async (tx) => {
      const dailyResult = await applyWalletMutation(tx, {
        userId: playerOne.id,
        type: "DAILY_REWARD",
        amount: 500,
        idempotencyKey: `daily:seed:${playerOne.id}:2026-01-15`,
        referenceId: `daily:seed:${playerOne.id}:2026-01-15`,
        createdAt: new Date("2026-01-15T10:05:00.000Z"),
      });
      const existingDailyHistory = await tx.rewardHistory.findUnique({ where: { walletTransactionId: dailyResult.transaction.id }, select: { id: true } });
      if (!existingDailyHistory) {
        await tx.rewardHistory.create({ data: { userId: playerOne.id, type: "DAILY_REWARD", amountVC: 500, walletTransactionId: dailyResult.transaction.id, sourceKey: `daily-reward:${playerOne.id}:2026-01-15`, metadata: { seeded: true } } });
      }
      await tx.favourite.upsert({ where: { userId_gameId: { userId: playerOne.id, gameId: lunarCircuit.id } }, update: {}, create: { userId: playerOne.id, gameId: lunarCircuit.id } });
      await tx.favourite.upsert({ where: { userId_gameId: { userId: playerOne.id, gameId: velvetRoulette.id } }, update: {}, create: { userId: playerOne.id, gameId: velvetRoulette.id } });
      await tx.recentGame.upsert({ where: { userId_gameId: { userId: playerOne.id, gameId: lunarCircuit.id } }, update: { lastPlayedAt: new Date("2026-01-15T10:10:00.000Z") }, create: { userId: playerOne.id, gameId: lunarCircuit.id, lastPlayedAt: new Date("2026-01-15T10:10:00.000Z") } });
      await tx.recentGame.upsert({ where: { userId_gameId: { userId: playerOne.id, gameId: velvetRoulette.id } }, update: { lastPlayedAt: new Date("2026-01-15T10:15:00.000Z") }, create: { userId: playerOne.id, gameId: velvetRoulette.id, lastPlayedAt: new Date("2026-01-15T10:15:00.000Z") } });
    }, { maxWait: 15_000, timeout: 30_000 });
  }

  if (playerTwo && signalBlackjack) {
    await prisma.$transaction(async (tx) => {
      await tx.favourite.upsert({ where: { userId_gameId: { userId: playerTwo.id, gameId: signalBlackjack.id } }, update: {}, create: { userId: playerTwo.id, gameId: signalBlackjack.id } });
      await tx.recentGame.upsert({ where: { userId_gameId: { userId: playerTwo.id, gameId: signalBlackjack.id } }, update: { lastPlayedAt: new Date("2026-01-16T10:15:00.000Z") }, create: { userId: playerTwo.id, gameId: signalBlackjack.id, lastPlayedAt: new Date("2026-01-16T10:15:00.000Z") } });
    }, { maxWait: 15_000, timeout: 30_000 });
  }

  if (playerTwo && velvetRoulette) {
    seedEvent("demo_session.start");
    await prisma.$transaction(async (tx) => {
      const sessionId = "00000000-0000-4000-8000-000000000701";
      const roundId = "00000000-0000-4000-8000-000000000702";
      const createdAt = new Date("2026-01-16T10:20:00.000Z");
      const wager = await applyWalletMutation(tx, {
        userId: playerTwo.id,
        type: "GAME_WAGER",
        amount: -100,
        idempotencyKey: `seed:demo-round:${roundId}:wager`,
        referenceId: `game-round:${roundId}:wager`,
        metadata: { seeded: true, roundId, game: "velvet-roulette" },
        createdAt,
      });
      seedEvent("demo_session.wagered");
      await applyWalletMutation(tx, {
        userId: playerTwo.id,
        type: "GAME_WIN",
        amount: 200,
        idempotencyKey: `seed:demo-round:${roundId}:payout`,
        referenceId: `game-round:${roundId}:payout`,
        metadata: { seeded: true, roundId, convention: "total_returned_after_wager" },
        createdAt: new Date("2026-01-16T10:20:02.000Z"),
      });
      seedEvent("demo_session.paid");
      await tx.gameSession.upsert({
        where: { id: sessionId },
        update: { status: "COMPLETED", startedAt: createdAt, endedAt: new Date("2026-01-16T10:20:02.000Z"), totalWagered: 100, totalWon: 200, roundCount: 1 },
        create: { id: sessionId, userId: playerTwo.id, gameId: velvetRoulette.id, status: "COMPLETED", startedAt: createdAt, endedAt: new Date("2026-01-16T10:20:02.000Z"), totalWagered: 100, totalWon: 200, roundCount: 1 },
      });
      seedEvent("demo_session.session");
      await tx.gameRound.upsert({
        where: { id: roundId },
        update: { sessionId, gameId: velvetRoulette.id, userId: playerTwo.id, roundNumber: 1, status: "SETTLED", wager: 100, payout: 200, netResult: 100, gameType: "ROULETTE", result: { seeded: true, winningNumber: 17, winningColor: "RED", bet: { type: "RED" }, payout: 200 }, createdAt, settledAt: new Date("2026-01-16T10:20:02.000Z") },
        create: { id: roundId, sessionId, gameId: velvetRoulette.id, userId: playerTwo.id, roundNumber: 1, status: "SETTLED", wager: 100, payout: 200, netResult: 100, gameType: "ROULETTE", result: { seeded: true, winningNumber: 17, winningColor: "RED", bet: { type: "RED" }, payout: 200 }, createdAt, settledAt: new Date("2026-01-16T10:20:02.000Z") },
      });
      seedEvent("demo_session.round");
      await tx.gameAction.upsert({
        where: { idempotencyKey: `seed:demo-round:${roundId}:action` },
        update: { sessionId, roundId, userId: playerTwo.id, type: "ROULETTE_SPIN", requestHash: "0000000000000000000000000000000000000000000000000000000000000000", response: { seeded: true, roundId, wager: 100, winningNumber: 17, winningColor: "RED", payout: 200, netResult: 100 }, createdAt },
        create: { sessionId, roundId, userId: playerTwo.id, type: "ROULETTE_SPIN", idempotencyKey: `seed:demo-round:${roundId}:action`, requestHash: "0000000000000000000000000000000000000000000000000000000000000000", response: { seeded: true, roundId, wager: 100, winningNumber: 17, winningColor: "RED", payout: 200, netResult: 100 }, createdAt },
      });
      seedEvent("demo_session.action");
      if (wager.idempotent) return;
    }, { maxWait: 15_000, timeout: 30_000 });
    seedEvent("demo_session.completed");
  }

  process.stdout.write(`${JSON.stringify({ event: "seed.completed", providers: providerSeeds.length, games: gameSeeds.length, accounts: demoAccounts.length })}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${JSON.stringify({ event: "seed.failed", message: error instanceof Error ? error.message : "Unknown error" })}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
