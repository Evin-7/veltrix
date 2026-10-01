import { z } from "zod";

const optionalNullableString = (max: number) => z.union([z.string().trim().max(max), z.null()]).optional();

export const updateProfileSchema = z.object({
  displayName: optionalNullableString(80),
  avatarUrl: z.union([z.string().trim().url().max(500).refine((value) => value.startsWith("https://"), "Avatar URL must use HTTPS."), z.null()]).optional(),
}).strict().refine((value) => value.displayName !== undefined || value.avatarUrl !== undefined, { message: "At least one profile field is required." });

export const uuidSchema = z.string().uuid();
export const gameIdentifierSchema = z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9-]+$/);
