import "server-only";
import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

type Environment = z.infer<typeof environmentSchema>;

let cachedEnvironment: Environment | undefined;

export function getEnv(): Environment {
  if (cachedEnvironment) return cachedEnvironment;

  const result = environmentSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    APP_URL: process.env.APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    throw new Error(`Invalid server environment configuration: ${result.error.issues.map((issue) => issue.path.join(".") || "root").join(", ")}`);
  }

  cachedEnvironment = result.data;
  return cachedEnvironment;
}
