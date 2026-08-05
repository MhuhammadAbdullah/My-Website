import type { NextFunction, Request, Response } from "express";
import { influencerAuth } from "@agency/auth/influencer-server";
import { prisma } from "@agency/database";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      influencer?: {
        id: string;
        email: string;
        status: string;
      };
    }
  }
}

export function toNodeHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  return headers;
}

// A session is only treated as fully authenticated once its token has a
// matching, unexpired row here -- written by POST /influencer-otp/verify.
// Reusing the generic InfluencerVerification table (rather than a schema
// change) keeps a brand-new session default-deny: the marker doesn't exist
// until the OTP step actually completes, so an abandoned password-only
// sign-in can never reach any requireInfluencerAuth-gated route.
export const OTP_VERIFIED_PREFIX = "otp-verified:";

export async function getInfluencerSession(req: Request) {
  return influencerAuth.api.getSession({ headers: toNodeHeaders(req) });
}

// Resolves the influencer session and loads the row, but does NOT gate on
// status -- some self-service endpoints (e.g. "why was my application
// rejected") are legitimately reachable by a PENDING/REJECTED influencer.
// Use `requireApprovedInfluencer` below for the dashboard/booking-management
// routes that should only work once vetted.
export async function requireInfluencerAuth(req: Request, res: Response, next: NextFunction) {
  const session = await getInfluencerSession(req);

  if (!session?.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const otpVerified = await prisma.influencerVerification.findFirst({
    where: { identifier: `${OTP_VERIFIED_PREFIX}${session.session.token}`, expiresAt: { gt: new Date() } },
  });
  if (!otpVerified) {
    res.status(401).json({ error: "OTP verification required", code: "OTP_REQUIRED" });
    return;
  }

  const dbInfluencer = await prisma.influencer.findUnique({ where: { id: session.user.id } });

  if (!dbInfluencer) {
    res.status(403).json({ error: "Account is not permitted to access the influencer dashboard" });
    return;
  }

  req.influencer = { id: dbInfluencer.id, email: dbInfluencer.email, status: dbInfluencer.status };

  next();
}

export function requireApprovedInfluencer(req: Request, res: Response, next: NextFunction) {
  if (req.influencer?.status !== "APPROVED") {
    res.status(403).json({ error: "Your application must be approved before you can access this." });
    return;
  }
  next();
}
