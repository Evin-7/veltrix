import { z } from "zod";

export const eligibilitySchema = z.object({
  minLevel: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"]).optional(),
  minXp: z.number().int().min(0).max(2_000_000_000).optional(),
  newPlayerWithinDays: z.number().int().min(1).max(365).optional(),
}).strict();

const promotionFields = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(2).max(1000),
  banner: z.object({ imageUrl: z.string().url().max(500).optional(), accent: z.string().max(40).optional() }).strict().nullable().optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "ENDED", "ARCHIVED"]).default("DRAFT"),
  rewardVC: z.number().int().min(1).max(2_000_000_000),
  eligibility: eligibilitySchema.default({}),
}).strict();

export const promotionCreateSchema = promotionFields.superRefine((value, context) => {
  if (value.endAt <= value.startAt) context.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after start time." });
  if (value.status === "ACTIVE" && (value.startAt > new Date() || value.endAt <= new Date())) context.addIssue({ code: "custom", path: ["status"], message: "An active promotion must be within its scheduled window." });
});

export const promotionUpdateSchema = promotionFields.partial().omit({ slug: true }).superRefine((value, context) => {
  if (value.startAt && value.endAt && value.endAt <= value.startAt) context.addIssue({ code: "custom", path: ["endAt"], message: "End time must be after start time." });
});

export const promotionListSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });
export const promotionIdSchema = z.string().uuid();

export type PromotionCreateInput = z.infer<typeof promotionCreateSchema>;
export type PromotionUpdateInput = z.infer<typeof promotionUpdateSchema>;
