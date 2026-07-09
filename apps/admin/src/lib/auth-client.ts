import { createAgencyAuthClient } from "@agency/auth/client";

// No baseURL: requests go to this app's own origin (proxied to the real API
// via the /api/v1/* rewrite in next.config.ts) so the session cookie is set
// on admin's own domain, not the API's — see next.config.ts for why.
export const authClient = createAgencyAuthClient();
