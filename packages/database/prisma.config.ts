import path from "node:path";
import { defineConfig } from "prisma/config";

// A prisma.config.ts file opts out of Prisma's implicit .env loading (which
// only kicks in for a bare schema.prisma), so the datasource's env("DATABASE_URL")/
// env("DIRECT_URL") calls resolve to nothing unless loaded explicitly here.
try {
  process.loadEnvFile(path.join(import.meta.dirname, ".env"));
} catch {
  // No .env file (e.g. CI providing real env vars directly) -- not fatal.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
