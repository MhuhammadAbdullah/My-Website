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

const trustedOrigins = parseOrigins(process.env.AUTH_TRUSTED_ORIGINS);

// A second, fully separate Better Auth instance for the Influencer
// Marketplace's self-registering vendors -- deliberately NOT the same
// principal as the staff `auth` instance in ./server.ts. It's bound to its
// own tables (Influencer/InfluencerSession/InfluencerAuthAccount/
// InfluencerVerification, see schema.prisma) via the `user`/`session`/
// `account`/`verification` model-remapping options below, so influencer
// sessions never collide with staff admin-panel sessions even though both
// run on the same Express process and share one Postgres database.
//
// `modelName` here must be the Prisma Client's camelCase accessor for the
// model (e.g. "influencerSession" for `model InfluencerSession`), not the
// PascalCase Prisma schema name -- the adapter does a literal `db[model]`
// lookup on the generated client. `fields` remaps Better Auth's built-in
// field names (it expects `userId` on session/account) to this schema's
// actual FK column (`influencerId`).
// packages/auth deliberately has no knowledge of nodemailer/mail-transport
// (that's apps/api's concern) -- apps/api registers the actual sender once
// at startup via setInfluencerResetPasswordSender (see apps/api/src/index.ts),
// keeping this package free of app-level dependencies.
type ResetPasswordSender = (data: {
  user: { id: string; name: string; email: string };
  url: string;
}) => void | Promise<void>;

let resetPasswordSender: ResetPasswordSender | undefined;

export function setInfluencerResetPasswordSender(sender: ResetPasswordSender) {
  resetPasswordSender = sender;
}

export const influencerAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // matches where apps/api mounts the handler: app.all("/api/v1/influencer-auth/*", ...)
  basePath: "/api/v1/influencer-auth",
  trustedOrigins,
  user: {
    modelName: "influencer",
  },
  session: {
    modelName: "influencerSession",
    fields: { userId: "influencerId" },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once/day
  },
  account: {
    modelName: "influencerAuthAccount",
    fields: { userId: "influencerId" },
  },
  verification: {
    modelName: "influencerVerification",
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      if (!resetPasswordSender) {
        console.warn("No influencer reset-password sender registered -- skipping email");
        return;
      }
      await resetPasswordSender({ user, url });
    },
  },
});

export type InfluencerAuth = typeof influencerAuth;
