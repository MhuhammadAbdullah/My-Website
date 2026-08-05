import { createAuthClient } from "better-auth/react";

export function createInfluencerAuthClient(baseURL?: string) {
  return createAuthClient({
    baseURL,
    basePath: "/api/v1/influencer-auth",
  });
}

export type InfluencerAuthClient = ReturnType<typeof createInfluencerAuthClient>;
