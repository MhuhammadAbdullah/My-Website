import { createAgencyAuthClient } from "@agency/auth/client";
import { env } from "./env";

export const authClient = createAgencyAuthClient(env.NEXT_PUBLIC_API_URL);
