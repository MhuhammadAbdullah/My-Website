import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@agency/database";

// AUTH_TRUSTED_ORIGINS is a comma-separated list of origins. Entries pasted from a browser address bar
// ("https://admin.example.com/login", trailing slash, upper case) are reduced to the bare origin, because an
// origin check compares scheme + host + port only. Wildcard patterns ("https://*.example.com") are kept as typed.
function parseOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry.includes("*")) return entry.replace(/\/+$/, "");
      try {
        return new URL(entry).origin;
      } catch {
        return entry;
      }
    });
}

const rootDomain = process.env.AUTH_COOKIE_DOMAIN;
const trustedOrigins = parseOrigins(process.env.AUTH_TRUSTED_ORIGINS);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // matches where apps/api mounts the handler: app.all("/api/v1/auth/*", ...)
  basePath: "/api/v1/auth",
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once/day
  },
  // web + admin are trusted subdomains of one apex domain in production,
  // so the session cookie is shared and there's no duplicate login flow.
  advanced: rootDomain
    ? {
        crossSubDomainCookies: { enabled: true, domain: rootDomain },
      }
    : undefined,
});

export type Auth = typeof auth;
