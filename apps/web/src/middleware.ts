import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Mirrors apps/admin/src/middleware.ts's pattern: a fast, local check for
// cookie *presence* only (no network call to the API). This is the actual
// root fix for "logged out on every navigation" -- the previous gate lived
// entirely in the dashboard layout (getInfluencerServerSession, see
// influencer-server-session.ts), which made a live fetch to the API on
// every single navigation and collapsed ANY failure (network blip, slow
// response, transient 5xx) into "not authenticated", forcing a redirect to
// login even though the session cookie/token was still perfectly valid.
// Middleware can't be fooled by a flaky backend since it never talks to one.
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/influencer/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/influencer/dashboard/:path*"],
};
