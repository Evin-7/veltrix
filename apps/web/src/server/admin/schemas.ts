import { z } from "zod";

const pageSchema = z.coerce.number().int().min(1).default(1);
const pageSizeSchema = z.coerce.number().int().min(1).max(100).default(25);

export const adminListSchema = z.object({ page: pageSchema, pageSize: pageSizeSchema });

export const playerListSchema = adminListSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const playerStatusSchema = z.object({ status: z.enum(["ACTIVE", "DISABLED"]) });

export const walletAdjustmentSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().min(-2_000_000_000).max(2_000_000_000).refine((value) => value !== 0, "Amount must not be zero."),
  reason: z.string().trim().min(3).max(500),
});

export const transactionListSchema = adminListSchema.extend({
  search: z.string().trim().max(120).optional(),
  type: z.enum(["WELCOME_BONUS", "DAILY_REWARD", "GAME_WAGER", "GAME_WIN", "ADMIN_ADJUSTMENT", "PROMOTION_REWARD", "VIP_REWARD"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const sessionListSchema = adminListSchema.extend({
  search: z.string().trim().max(120).optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const auditListSchema = adminListSchema.extend({
  action: z.string().trim().max(80).optional(),
  targetType: z.string().trim().max(40).optional(),
  actor: z.string().trim().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const gameCreateSchema = z.object({
  providerId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(2).max(500),
  category: z.enum(["SLOTS", "TABLE_GAMES", "LIVE_STYLE", "BLACKJACK", "ROULETTE", "ARCADE"]),
  thumbnail: z.string().url().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).default("INACTIVE"),
  featured: z.boolean().default(false),
  newGame: z.boolean().default(false),
  popular: z.boolean().default(false),
  demoRtp: z.number().min(0).max(100),
});

export const gameUpdateSchema = gameCreateSchema.omit({ providerId: true, slug: true }).partial();

export const providerCreateSchema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), status: z.enum(["ACTIVE", "INACTIVE"]).default("INACTIVE") });
export const providerUpdateSchema = z.object({ name: z.string().trim().min(2).max(80).optional(), status: z.enum(["ACTIVE", "INACTIVE"]).optional() }).refine((value) => Object.keys(value).length > 0, "At least one provider field is required.");
export const vipConfigSchema = z.object({ level: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"]), xpThreshold: z.number().int().min(0).max(2_000_000_000), rewardVC: z.number().int().min(0).max(2_000_000_000) });

export type PlayerListInput = z.infer<typeof playerListSchema>;
export type TransactionListInput = z.infer<typeof transactionListSchema>;
export type SessionListInput = z.infer<typeof sessionListSchema>;
export type AuditListInput = z.infer<typeof auditListSchema>;
