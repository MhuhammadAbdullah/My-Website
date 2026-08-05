import { randomInt, createHash } from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { verifyLoginOtpSchema } from "@agency/types";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { getInfluencerSession, OTP_VERIFIED_PREFIX } from "../middleware/require-influencer-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { sendLoginOtpEmail } from "../lib/influencer-mailer.js";

export const influencerOtpRouter = Router();

const OTP_TTL_MS = 5 * 60 * 1000;
const LOGIN_OTP_PREFIX = "login-otp:";

// Deliberately not authenticated by requireInfluencerAuth -- that middleware
// now requires an OTP-verified session, which is exactly the thing these two
// endpoints exist to establish. Both just need a password-verified session
// (set by influencerAuth.api.signIn.email before the client calls /request).
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many code requests. Please try again in a few minutes." },
});
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please request a new code." },
});

function hashOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

influencerOtpRouter.post(
  "/request",
  otpRequestLimiter,
  asyncHandler(async (req, res) => {
    const session = await getInfluencerSession(req);
    if (!session?.user) throw new ApiError(401, "Authentication required");

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const identifier = `${LOGIN_OTP_PREFIX}${session.session.token}`;

    await prisma.influencerVerification.deleteMany({ where: { identifier } });
    await prisma.influencerVerification.create({
      data: { identifier, value: hashOtp(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });

    await sendLoginOtpEmail({ name: session.user.name, email: session.user.email }, code);

    res.json({ status: true });
  }),
);

influencerOtpRouter.post(
  "/verify",
  otpVerifyLimiter,
  asyncHandler(async (req, res) => {
    const session = await getInfluencerSession(req);
    if (!session?.user) throw new ApiError(401, "Authentication required");

    const { code } = verifyLoginOtpSchema.parse(req.body);
    const identifier = `${LOGIN_OTP_PREFIX}${session.session.token}`;

    const verification = await prisma.influencerVerification.findFirst({
      where: { identifier },
      orderBy: { createdAt: "desc" },
    });

    if (!verification || verification.expiresAt < new Date() || verification.value !== hashOtp(code)) {
      throw new ApiError(400, "That code is incorrect or has expired.");
    }

    await prisma.influencerVerification.deleteMany({ where: { identifier } });
    await prisma.influencerVerification.create({
      data: {
        identifier: `${OTP_VERIFIED_PREFIX}${session.session.token}`,
        value: "1",
        expiresAt: session.session.expiresAt,
      },
    });

    res.json({ status: true });
  }),
);
