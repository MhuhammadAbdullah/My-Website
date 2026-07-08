import "../dist/env.js";
import { createApp } from "../dist/app.js";

// Plain JavaScript, not TypeScript, on purpose: Vercel's Node.js builder runs
// a second, independent TypeScript verification pass on any .ts file under
// /api, separate from -- and less reliable in this pnpm workspace than --
// the project's own `tsc` build (see the build script, which now actually
// emits to dist/ instead of --noEmit). That second pass has repeatedly
// misresolved helmet/express-rate-limit's dual ESM+CJS package exports in
// this monorepo regardless of import style, even though the real build
// already type-checked this exact code correctly. Importing the
// already-compiled, already-verified output sidesteps that broken check
// entirely instead of fighting it.
//
// Vercel's Node.js runtime invokes this file's default export directly as
// the request handler for every request routed here (see vercel.json's
// catch-all rewrite) -- an Express app instance is itself a valid
// (req, res) => void handler, so no adapter is needed.
export default createApp();
