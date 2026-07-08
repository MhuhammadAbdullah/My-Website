import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

// The localhost default exists purely so `pnpm dev` works with zero setup.
// In a production build it means NEXT_PUBLIC_API_URL was never actually
// configured on the hosting platform -- every data fetch will fail (though,
// thanks to withFallback(), no longer crash the build), so this needs to be
// loud and visible in the build log rather than silently swallowed.
if (process.env.NODE_ENV === "production" && env.NEXT_PUBLIC_API_URL.includes("localhost")) {
  console.error(
    "[web] NEXT_PUBLIC_API_URL is not set for this production build and is falling back to " +
      `"${env.NEXT_PUBLIC_API_URL}", which is unreachable outside local development. ` +
      "Set NEXT_PUBLIC_API_URL to the deployed backend URL in your hosting platform's environment variables.",
  );
}
