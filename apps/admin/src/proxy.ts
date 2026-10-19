import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie && !request.nextUrl.pathname.startsWith("/login")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (sessionCookie && request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // /api is excluded: those requests are proxied straight through to the
  // real API (see next.config.ts rewrites) and must not be intercepted by
  // this page-auth-gate, or the login POST itself would get redirected.
  // manifest / pwa-icon / sw.js / offline are the installable-app files: the browser fetches them without a session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|manifest.webmanifest|pwa-icon|sw.js|offline).*)"],
};
