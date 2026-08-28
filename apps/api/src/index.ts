import { app } from "./app";

// Local dev / any non-Vercel host (Docker, a VM, etc.). Vercel deploys use
// api/index.ts instead, which imports the same `app` and never calls listen().
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`Asclepios Sleep API listening on http://localhost:${port}`);
});
