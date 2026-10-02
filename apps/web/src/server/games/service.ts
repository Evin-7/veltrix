import "server-only";
import { Prisma } from "@prisma/client";
import { getGamePresentation } from "@/features/games/presentation";
import type { Game, GameCategory } from "@/features/games/types";
import { getPrisma } from "@/server/db/prisma";

const categoryToDatabase = {
  Slots: "SLOTS",
  "Table Games": "TABLE_GAMES",
  "Live-style": "LIVE_STYLE",
  Arcade: "ARCADE",
  Blackjack: "BLACKJACK",
  Roulette: "ROULETTE",
} as const;

const categoryToPublic = {
  SLOTS: "Slots",
  TABLE_GAMES: "Table Games",
  LIVE_STYLE: "Live-style",
  BLACKJACK: "Blackjack",
  ROULETTE: "Roulette",
  ARCADE: "Arcade",
} as const satisfies Record<string, GameCategory>;

type ListGamesInput = {
  search?: string;
  category?: keyof typeof categoryToDatabase;
  provider?: string;
  sort: "popular" | "newest" | "name";
  featured?: boolean;
  popular?: boolean;
  new?: boolean;
  page: number;
  pageSize: number;
};

const publicWhere = { status: "ACTIVE" as const, provider: { status: "ACTIVE" as const } };

export function mapGame(game: {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: keyof typeof categoryToPublic;
  thumbnail: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  featured: boolean;
  newGame: boolean;
  popular: boolean;
  demoRtp: Prisma.Decimal;
  provider: { name: string; slug: string };
}): Game {
  const presentation = getGamePresentation(game.slug);
  return {
    id: game.id,
    name: game.name,
    slug: game.slug,
    description: game.description,
    category: categoryToPublic[game.category],
    provider: game.provider.name,
    providerSlug: game.provider.slug,
    thumbnail: game.thumbnail,
    status: game.status,
    featured: game.featured,
    isNew: game.newGame,
    popular: game.popular,
    rtp: `${Number(game.demoRtp).toFixed(1)}%`,
    ...presentation,
  };
}

export const gameSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  thumbnail: true,
  status: true,
  featured: true,
  newGame: true,
  popular: true,
  demoRtp: true,
  provider: { select: { name: true, slug: true } },
} satisfies Prisma.GameSelect;

export async function listPublicGames(input: ListGamesInput) {
  const prisma = getPrisma();
  const where: Prisma.GameWhereInput = { ...publicWhere };

  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: "insensitive" } },
      { description: { contains: input.search, mode: "insensitive" } },
      { provider: { name: { contains: input.search, mode: "insensitive" } } },
    ];
  }
  if (input.category) where.category = categoryToDatabase[input.category];
  if (input.provider) where.provider = { ...publicWhere.provider, slug: input.provider };
  if (input.featured !== undefined) where.featured = input.featured;
  if (input.popular !== undefined) where.popular = input.popular;
  if (input.new !== undefined) where.newGame = input.new;

  const orderBy: Prisma.GameOrderByWithRelationInput[] = input.sort === "name"
    ? [{ name: "asc" }]
    : input.sort === "newest"
      ? [{ newGame: "desc" }, { createdAt: "desc" }, { name: "asc" }]
      : [{ popular: "desc" }, { featured: "desc" }, { name: "asc" }];
  const skip = (input.page - 1) * input.pageSize;

  const [records, total] = await prisma.$transaction([
    prisma.game.findMany({ where, select: gameSelect, orderBy, skip, take: input.pageSize }),
    prisma.game.count({ where }),
  ]);

  return {
    games: records.map(mapGame),
    meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) },
  };
}

export async function getPublicGameBySlug(slug: string) {
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({ where: { ...publicWhere, slug }, select: gameSelect });
  return game ? mapGame(game) : null;
}

export async function getPublicGameById(id: string) {
  const game = await getPrisma().game.findFirst({ where: { ...publicWhere, id }, select: gameSelect });
  return game ? mapGame(game) : null;
}

export async function listPublicProviders() {
  const prisma = getPrisma();
  return prisma.gameProvider.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
}
