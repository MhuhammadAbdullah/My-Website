import { createAuthClient } from "better-auth/react";

export function createAgencyAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    basePath: "/api/v1/auth",
  });
}

export type AgencyAuthClient = ReturnType<typeof createAgencyAuthClient>;
