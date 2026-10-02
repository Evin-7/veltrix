import { z } from "zod";

export const responsibleSettingsSchema = z.object({
  sessionReminderMinutes: z.number().int().min(5).max(240),
  dailyWagerLimit: z.number().int().min(1).max(2_000_000_000).nullable(),
  maxWager: z.number().int().min(1).max(500).nullable(),
}).strict();

export const coolOffSchema = z.object({ hours: z.union([z.literal(1), z.literal(24), z.literal(168)]) }).strict();
export const selfExclusionSchema = z.object({ days: z.union([z.literal(1), z.literal(7), z.literal(30), z.literal(365)]) }).strict();

export type ResponsibleSettingsInput = z.infer<typeof responsibleSettingsSchema>;
