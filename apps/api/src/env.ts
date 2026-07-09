import { z } from "zod";

// Vercel's dashboard stores an env var's value exactly as typed -- if it's
// pasted straight from a .env file's `KEY="value"` line (where dotenv-style
// parsers, incl. Node's own --env-file, strip the surrounding quotes but
// Vercel's UI does not), every consumer downstream gets the quote
// characters baked into the value. This already broke Cloudinary uploads in
// production (CLOUDINARY_CLOUD_NAME resolved to the 11-character string
// `"dgkd8jw6a"`, quotes included, which Cloudinary rejected outright).
// Stripping one matching pair of leading/trailing quotes before validation
// means that mistake degrades gracefully instead of shipping a broken value.
const dequote = (value: unknown) =>
  typeof value === "string" ? value.replace(/^(['"])(.*)\1$/, "$2") : value;
const str = (inner: z.ZodString = z.string()) => z.preprocess(dequote, inner);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: str(z.string().min(1)),
  BETTER_AUTH_SECRET: str(z.string().min(16)),
  BETTER_AUTH_URL: str(z.string().url()),
  AUTH_TRUSTED_ORIGINS: str(z.string()).default(""),
  AUTH_COOKIE_DOMAIN: str(z.string()).optional(),
  CLOUDINARY_CLOUD_NAME: str(z.string().min(1)),
  CLOUDINARY_API_KEY: str(z.string().min(1)),
  CLOUDINARY_API_SECRET: str(z.string().min(1)),
  SMTP_HOST: str(z.string()).optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: str(z.string()).optional(),
  SMTP_PASSWORD: str(z.string()).optional(),
  SMTP_FROM: str(z.string()).optional(),
  ADMIN_NOTIFICATION_EMAIL: str(z.string()).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — check apps/api/.env against .env.example");
}

export const env = parsed.data;
