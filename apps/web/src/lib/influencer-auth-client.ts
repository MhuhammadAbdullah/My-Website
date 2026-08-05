import { createInfluencerAuthClient } from "@agency/auth/influencer-client";

// No baseURL: requests go to this app's own origin (proxied to the real API
// via the /api/v1/influencer-auth/* rewrite in next.config.ts) so the
// session cookie is set on web's own domain, not the API's.
export const influencerAuthClient = createInfluencerAuthClient();
