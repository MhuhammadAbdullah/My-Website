import { cookies } from "next/headers";
import { env } from "./env";
import type { InfluencerMeRead } from "./influencer-types";

// Server Components can't use influencer-auth-client (browser-only, relies
// on the same-origin proxy rewrite for cookies) -- this fetches the real API
// directly, forwarding the incoming request's cookie header manually. That
// works regardless of which domain originally set the cookie, since Better
// Auth's session lookup only cares about the token value itself.
//
// IMPORTANT: this must NOT be the thing that decides "is this user logged
// out" -- that's middleware.ts's job now (a fast, local, cookie-presence-only
// check that can't be fooled by a flaky backend). This function only
// resolves to `null` on a *confirmed* unauthenticated response (401/403 from
// the session endpoint, i.e. the cookie is present but the session is
// genuinely invalid/expired). Any other failure -- network error, timeout,
// 5xx -- throws instead of silently returning null, so the caller's error
// boundary can show a retryable error rather than the app forcing a login
// redirect over what might just be a transient backend hiccup.
export async function getInfluencerServerSession(): Promise<InfluencerMeRead | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;

  const sessionRes = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/influencer-auth/get-session`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (sessionRes.status === 401 || sessionRes.status === 403) return null;
  if (!sessionRes.ok) throw new Error(`Session check failed (${sessionRes.status})`);
  const session = await sessionRes.json();
  if (!session?.user) return null;

  const meRes = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/influencers/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  if (meRes.status === 401 || meRes.status === 403) return null;
  if (!meRes.ok) throw new Error(`Profile fetch failed (${meRes.status})`);
  const me = await meRes.json();
  return me.item as InfluencerMeRead;
}
