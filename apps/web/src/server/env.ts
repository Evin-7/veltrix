import "server-only";
import { z } from "zod";

const environmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  ADMIN_APP_URL: z.string().url().default("http://localhost:3001"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
}).superRefine((environment, context) => {
  const hasUrl = Boolean(environment.UPSTASH_REDIS_REST_URL);
  const hasToken = Boolean(environment.UPSTASH_REDIS_REST_TOKEN);
  if (hasUrl !== hasToken) {
    context.addIssue({ code: "custom", path: ["UPSTASH_REDIS_REST_URL"], message: "Both Upstash REST variables must be configured together." });
  }
});

type Environment = z.infer<typeof environmentSchema>;

let cachedEnvironment: Environment | undefined;

export function getEnv(): Environment {
  if (cachedEnvironment) return cachedEnvironment;

  const result = environmentSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    APP_URL: process.env.APP_URL,
    ADMIN_APP_URL: process.env.ADMIN_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  if (!result.success) {
    throw new Error(`Invalid server environment configuration: ${result.error.issues.map((issue) => issue.path.join(".") || "root").join(", ")}`);
  }

  cachedEnvironment = result.data;
  return cachedEnvironment;
}
