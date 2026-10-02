import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores.").transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
}).strict();

export const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();
