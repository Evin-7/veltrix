import { z } from "zod";

const booleanQuery = z.enum(["true", "false"]).transform((value) => value === "true").optional();

export const gameQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  category: z.enum(["Slots", "Table Games", "Live-style", "Arcade", "Blackjack", "Roulette"]).optional(),
  provider: z.string().trim().max(80).optional(),
  sort: z.enum(["popular", "newest", "name"]).default("popular"),
  featured: booleanQuery,
  popular: booleanQuery,
  new: booleanQuery,
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});
