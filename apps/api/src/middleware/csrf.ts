import type { NextFunction, Request, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

// CSRF defence for the cookie-authenticated API. Session cookies are sent
// automatically by browsers, so a state-changing request must prove it comes
// from one of our own front-ends: its Origin (or, failing that, Referer) has to
// be on the same allow-list CORS uses. Requests that carry no cookie (public
// form posts from server code, curl, tests) cannot be a CSRF vector -- they have
// no ambient credentials -- so they pass through to the normal auth checks.
export function csrfOriginCheck(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins.map((o) => originOf(o) ?? o));

  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = originOf(req.headers.origin) ?? originOf(req.headers.referer);
    if (origin) {
      // Empty allow-list only happens in development (production refuses to boot without one).
      if (allowed.size === 0 || allowed.has(origin)) return next();
      res.status(403).json({ error: "Cross-site request blocked" });
      return;
    }

    if (req.headers.cookie) {
      res.status(403).json({ error: "Cross-site request blocked (missing Origin)" });
      return;
    }
    next();
  };
}
