import "./env.js";
import { createApp } from "./app.js";
import { env } from "./env.js";

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

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
