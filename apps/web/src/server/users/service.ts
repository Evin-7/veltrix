import "server-only";
import { getPrisma } from "@/server/db/prisma";
import { notFound } from "@/server/http/errors";
import { gameSelect, mapGame } from "@/server/games/service";
import { toSafeUser } from "@/server/auth/session";
import type { SafeUser } from "@/types/auth";

const publicGameWhere = { status: "ACTIVE" as const, provider: { status: "ACTIVE" as const } };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function gameIdentifierWhere(identifier: string) {
  return uuidPattern.test(identifier) ? { id: identifier } : { slug: identifier };
}

export async function getUserAccount(userId: string): Promise<SafeUser> {
  const user = await getPrisma().user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user) throw notFound("User not found.");
  return toSafeUser(user);
}

export async function updateUserProfile(userId: string, input: { displayName?: string | null; avatarUrl?: string | null }) {
  const prisma = getPrisma();
  await prisma.profile.update({ where: { userId }, data: input });
  return getUserAccount(userId);
}

export async function listFavouriteGameIds(userId: string) {
  const favourites = await getPrisma().favourite.findMany({ where: { userId }, select: { gameId: true } });
  return favourites.map((favourite) => favourite.gameId);
}

export async function listFavouriteGames(userId: string) {
  const favourites = await getPrisma().favourite.findMany({
    where: { userId, game: publicGameWhere },
    orderBy: { createdAt: "desc" },
    select: { game: { select: gameSelect } },
  });
  return favourites.map((favourite) => mapGame(favourite.game));
}

export async function setGameFavourite(userId: string, gameIdentifier: string, value: boolean) {
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({ where: { ...publicGameWhere, ...gameIdentifierWhere(gameIdentifier) }, select: { id: true } });
  if (!game) throw notFound("Game not found.");

  if (value) {
    await prisma.favourite.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      update: {},
      create: { userId, gameId: game.id },
    });
  } else {
    await prisma.favourite.deleteMany({ where: { userId, gameId: game.id } });
  }
  return { gameId: game.id, isFavourite: value };
}

export async function isGameFavourite(userId: string, gameId: string) {
  const favourite = await getPrisma().favourite.findUnique({ where: { userId_gameId: { userId, gameId } }, select: { id: true } });
  return Boolean(favourite);
}

export async function markRecentlyPlayed(userId: string, gameIdentifier: string) {
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({ where: { ...publicGameWhere, ...gameIdentifierWhere(gameIdentifier) }, select: { id: true } });
  if (!game) throw notFound("Game not found.");
  await prisma.recentGame.upsert({
    where: { userId_gameId: { userId, gameId: game.id } },
    update: { lastPlayedAt: new Date() },
    create: { userId, gameId: game.id, lastPlayedAt: new Date() },
  });
  return { gameId: game.id, recorded: true };
}

export async function listRecentGames(userId: string, limit = 4) {
  const recentGames = await getPrisma().recentGame.findMany({
    where: { userId, game: publicGameWhere },
    orderBy: { lastPlayedAt: "desc" },
    take: limit,
    select: { lastPlayedAt: true, game: { select: gameSelect } },
  });
  return recentGames.map((recentGame) => ({ game: mapGame(recentGame.game), lastPlayedAt: recentGame.lastPlayedAt.toISOString() }));
}
