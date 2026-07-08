import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@agency/auth/server";
import { env } from "./env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());

  const allowedOrigins = env.AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  // Reflecting any origin (the old fallback) combined with credentials: true
  // would let any website make authenticated, cookie-bearing requests to this
  // API the moment AUTH_TRUSTED_ORIGINS is ever left unset in production --
  // fail closed instead of silently opening that up.
  if (env.NODE_ENV === "production" && allowedOrigins.length === 0) {
    throw new Error(
      "AUTH_TRUSTED_ORIGINS must be set in production (comma-separated list of allowed origins, e.g. https://mydomain.com,https://admin.mydomain.com)",
    );
  }
  app.use(
    cors({
      origin: allowedOrigins.length ? allowedOrigins : true,
      credentials: true,
    }),
  );

  // Baseline limiter for the whole API; the contact form has its own tighter
  // limiter layered on top (see routes/contact.routes.ts).
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Better Auth needs the raw request before the JSON body parser touches it.
  app.all("/api/v1/auth/*", toNodeHandler(auth));

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
