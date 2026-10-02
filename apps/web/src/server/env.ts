import "server-only";
import { z } from "zod";

const postgresUrl = z.string().url().refine((value) => /^postgres(?:ql)?:\/\//i.test(value), "Must be a PostgreSQL connection URL.");
const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", "Must use HTTPS.");

const environmentSchema = z.object({
  DATABASE_URL: postgresUrl,
  AUTH_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  ADMIN_APP_URL: z.string().url().default("http://localhost:3001"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().min(1).optional(),
  CLOUDINARY_FOLDER: z.string().min(1).default("veltrix/avatars"),
  UPSTASH_REDIS_REST_URL: httpsUrl.optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  KV_REST_API_URL: httpsUrl.optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
}).superRefine((environment, context) => {
  if (environment.NODE_ENV === "production") {
    if (new URL(environment.APP_URL).protocol !== "https:") {
      context.addIssue({ code: "custom", path: ["APP_URL"], message: "Production APP_URL must use HTTPS." });
    }
    if (new URL(environment.ADMIN_APP_URL).protocol !== "https:") {
      context.addIssue({ code: "custom", path: ["ADMIN_APP_URL"], message: "Production ADMIN_APP_URL must use HTTPS." });
    }
  }

  const hasUrl = Boolean(environment.UPSTASH_REDIS_REST_URL ?? environment.KV_REST_API_URL);
  const hasToken = Boolean(environment.UPSTASH_REDIS_REST_TOKEN ?? environment.KV_REST_API_TOKEN);
  if (hasUrl !== hasToken) {
    context.addIssue({ code: "custom", path: ["UPSTASH_REDIS_REST_URL"], message: "Both Upstash REST variables must be configured together." });
  }
  const hasGoogleClientId = Boolean(environment.GOOGLE_CLIENT_ID);
  const hasGoogleClientSecret = Boolean(environment.GOOGLE_CLIENT_SECRET);
  if (hasGoogleClientId !== hasGoogleClientSecret) {
    context.addIssue({ code: "custom", path: ["GOOGLE_CLIENT_ID"], message: "Both Google OAuth variables must be configured together." });
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
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    ADMIN_APP_URL: process.env.ADMIN_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
    CLOUDINARY_FOLDER: process.env.CLOUDINARY_FOLDER,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  });

  if (!result.success) {
    throw new Error(`Invalid server environment configuration: ${result.error.issues.map((issue) => issue.path.join(".") || "root").join(", ")}`);
  }

  cachedEnvironment = result.data;
  return cachedEnvironment;
}
