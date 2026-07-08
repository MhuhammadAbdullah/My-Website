import "./env.js";
import { createRequire } from "node:module";
import express, { type RequestHandler } from "express";
import cors from "cors";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@agency/auth/server";
import { env } from "./env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

// helmet ships types only as a single index.d.cts with no .d.ts/.d.mts
// sibling. Vercel's own separate serverless-function type-check pass
// (distinct from -- and additional to -- this project's own passing
// `tsc --noEmit`) doesn't resolve that shape correctly: it falls back to an
// untyped whole-module inference and reports the import as "not callable",
// regardless of whether the import is written as a default import or a
// namespace import with an explicit `.default` read -- both were tried and
// both fail identically under that separate checker, which rules out import
// style as the cause. Loading it via a genuine CJS require() sidesteps
// package.json "types"/module resolution for this package entirely; the
// value comes from Node's own CJS loader (unambiguous at runtime), and the
// type below is written out explicitly rather than inferred.
const require = createRequire(import.meta.url);
type HelmetOptions = Record<string, unknown>;
const helmet: (options?: Readonly<HelmetOptions>) => RequestHandler = require("helmet");

// Safety net for the whole process. Without this, an unhandled rejection
// anywhere -- including inside third-party request handlers that bypass our
// own Express error middleware, like Better Auth's `toNodeHandler` mount for
// `/api/v1/auth/*` -- crashes the entire Node process on Node 15+'s default
// "unhandled rejection terminates the process" behavior. A single transient
// hiccup (e.g. the DB pooler dropping a connection for a moment) would then
// take down every route, not just the one request that failed. Logging and
// continuing keeps the server available; the pool reconnects on the next
// query as normal.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection (server staying up):", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception (server staying up):", error);
});

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

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

export default app;
