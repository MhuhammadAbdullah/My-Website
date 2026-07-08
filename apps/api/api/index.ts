import "../src/env.js";
import { createApp } from "../src/app.js";

// Vercel's Node.js runtime invokes this file's default export directly as the
// request handler for every request routed here (see vercel.json's catch-all
// rewrite) -- an Express app instance is itself a valid (req, res) => void
// handler, so no adapter is needed. This intentionally does NOT call
// app.listen() or install the process-level unhandledRejection/uncaughtException
// safety nets from src/index.ts: those exist for a long-lived process (Render,
// Railway, a VPS, local dev via tsx) and have no meaning in a serverless
// runtime, where each invocation is a fresh, isolated context that Vercel
// itself supervises.
export default createApp();
