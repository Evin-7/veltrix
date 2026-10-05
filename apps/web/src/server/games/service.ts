import "server-only";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
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
  categories?: Array<keyof typeof categoryToDatabase>;
  provider?: string;
  sort: "popular" | "newest" | "name";
  featured?: boolean;
  popular?: boolean;
  new?: boolean;
  page: number;
  pageSize: number;
  includeTotal?: boolean;
};

export const RETIRED_GAME_SLUGS = ["cinder-club"] as const;
const publicWhere = {
  status: "ACTIVE" as const,
  provider: { status: "ACTIVE" as const },
  NOT: { slug: { in: [...RETIRED_GAME_SLUGS] } },
};
export const PUBLIC_GAMES_CACHE_TAG = "public-games";
export const PUBLIC_PROVIDERS_CACHE_TAG = "public-providers";
const PUBLIC_DATA_REVALIDATE_SECONDS = 300;

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

async function queryPublicGames(input: ListGamesInput) {
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
  if (input.categories?.length) {
    where.category = { in: input.categories.map((category) => categoryToDatabase[category]) };
  }
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

  let records;
  let total: number;
  if (input.includeTotal === false) {
    records = await prisma.game.findMany({ where, select: gameSelect, orderBy, skip, take: input.pageSize });
    total = records.length;
  } else {
    [records, total] = await prisma.$transaction([
      prisma.game.findMany({ where, select: gameSelect, orderBy, skip, take: input.pageSize }),
      prisma.game.count({ where }),
    ]);
  }

  return {
    games: records.map(mapGame),
    meta: { page: input.page, pageSize: input.pageSize, total, totalPages: Math.ceil(total / input.pageSize) },
  };
}

const cachedListPublicGames = unstable_cache(
  queryPublicGames,
  ["public-games-list"],
  { revalidate: PUBLIC_DATA_REVALIDATE_SECONDS, tags: [PUBLIC_GAMES_CACHE_TAG] },
);

export function listPublicGames(input: ListGamesInput) {
  return cachedListPublicGames(input);
}

async function queryPublicGameBySlug(slug: string) {
  const prisma = getPrisma();
  const game = await prisma.game.findFirst({ where: { ...publicWhere, slug }, select: gameSelect });
  return game ? mapGame(game) : null;
}

const cachedPublicGameBySlug = unstable_cache(
  queryPublicGameBySlug,
  ["public-game-by-slug"],
  { revalidate: PUBLIC_DATA_REVALIDATE_SECONDS, tags: [PUBLIC_GAMES_CACHE_TAG] },
);

export function getPublicGameBySlug(slug: string) {
  return cachedPublicGameBySlug(slug);
}

async function queryPublicGameById(id: string) {
  const game = await getPrisma().game.findFirst({ where: { ...publicWhere, id }, select: gameSelect });
  return game ? mapGame(game) : null;
}

const cachedPublicGameById = unstable_cache(
  queryPublicGameById,
  ["public-game-by-id"],
  { revalidate: PUBLIC_DATA_REVALIDATE_SECONDS, tags: [PUBLIC_GAMES_CACHE_TAG] },
);

export function getPublicGameById(id: string) {
  return cachedPublicGameById(id);
}

async function queryPublicProviders() {
  const prisma = getPrisma();
  return prisma.gameProvider.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
}

const cachedPublicProviders = unstable_cache(
  queryPublicProviders,
  ["public-providers"],
  { revalidate: PUBLIC_DATA_REVALIDATE_SECONDS, tags: [PUBLIC_PROVIDERS_CACHE_TAG, PUBLIC_GAMES_CACHE_TAG] },
);

export function listPublicProviders() {
  return cachedPublicProviders();
}
