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

async function main() {
  const providers = new Map<string, { id: string }>();
  const games = new Map<string, { id: string }>();
  const users = new Map<string, { id: string; role: "PLAYER" | "ADMIN" | "SUPER_ADMIN" }>();

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
    });
  }

  const playerOne = users.get("player@veltrix.local");
  const playerTwo = users.get("player2@veltrix.local");
  const lunarCircuit = games.get("lunar-circuit");
  const velvetRoulette = games.get("velvet-roulette");
  const signalBlackjack = games.get("signal-blackjack");

  if (playerOne && lunarCircuit && velvetRoulette) {
    await prisma.$transaction(async (tx) => {
      await applyWalletMutation(tx, {
        userId: playerOne.id,
        type: "DAILY_REWARD",
        amount: 500,
        idempotencyKey: `daily:seed:${playerOne.id}:2026-01-15`,
        referenceId: `daily:seed:${playerOne.id}:2026-01-15`,
        createdAt: new Date("2026-01-15T10:05:00.000Z"),
      });
      await tx.favourite.upsert({ where: { userId_gameId: { userId: playerOne.id, gameId: lunarCircuit.id } }, update: {}, create: { userId: playerOne.id, gameId: lunarCircuit.id } });
      await tx.favourite.upsert({ where: { userId_gameId: { userId: playerOne.id, gameId: velvetRoulette.id } }, update: {}, create: { userId: playerOne.id, gameId: velvetRoulette.id } });
      await tx.recentGame.upsert({ where: { userId_gameId: { userId: playerOne.id, gameId: lunarCircuit.id } }, update: { lastPlayedAt: new Date("2026-01-15T10:10:00.000Z") }, create: { userId: playerOne.id, gameId: lunarCircuit.id, lastPlayedAt: new Date("2026-01-15T10:10:00.000Z") } });
      await tx.recentGame.upsert({ where: { userId_gameId: { userId: playerOne.id, gameId: velvetRoulette.id } }, update: { lastPlayedAt: new Date("2026-01-15T10:15:00.000Z") }, create: { userId: playerOne.id, gameId: velvetRoulette.id, lastPlayedAt: new Date("2026-01-15T10:15:00.000Z") } });
    });
  }

  if (playerTwo && signalBlackjack) {
    await prisma.$transaction(async (tx) => {
      await tx.favourite.upsert({ where: { userId_gameId: { userId: playerTwo.id, gameId: signalBlackjack.id } }, update: {}, create: { userId: playerTwo.id, gameId: signalBlackjack.id } });
      await tx.recentGame.upsert({ where: { userId_gameId: { userId: playerTwo.id, gameId: signalBlackjack.id } }, update: { lastPlayedAt: new Date("2026-01-16T10:15:00.000Z") }, create: { userId: playerTwo.id, gameId: signalBlackjack.id, lastPlayedAt: new Date("2026-01-16T10:15:00.000Z") } });
    });
  }

  console.log(`Seeded ${providerSeeds.length} providers, ${gameSeeds.length} games, and ${demoAccounts.length} demo accounts.`);
}

main()
  .catch((error) => {
    console.error("Database seed failed.", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
