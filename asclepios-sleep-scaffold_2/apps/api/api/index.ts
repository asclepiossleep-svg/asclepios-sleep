import { app } from "../src/app";

// Vercel serverless entry point. An Express app is itself a valid
// (req, res) handler, so no adapter library is needed — this file just
// re-exports the same app that local dev uses via src/index.ts.
//
// vercel.json routes every request into this one function.
export default app;
