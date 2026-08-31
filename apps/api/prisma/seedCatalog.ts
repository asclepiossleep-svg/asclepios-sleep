import { seedBaseConfig } from "../src/domain/demoSeed";
import { prisma } from "../src/db";

/**
 * 31 Aug 2026 — catalog-only reseed, safe to run on every deploy.
 *
 * `seedBaseConfig()` only touches shared catalog tables (Product, Question,
 * DecisionRule, AudioTrack, Wallpaper, ContentItem, Programme,
 * RoutineStepDef, FeatureFlag) via `upsert` keyed on each row's stable
 * `code` — it never creates or touches a User, so it is safe to run
 * against the live production database repeatedly without affecting any
 * real customer's account or data. This is deliberately separate from
 * `prisma/seed.ts` (which also runs `seedAllDemoAccounts()` and does touch
 * the 9 demo test accounts) — wiring only this into `vercel-build` keeps
 * every deploy's catalog data (including newly-added Wallpaper rows) in
 * sync with the code, without resetting demo account state on every
 * deploy.
 *
 * Root cause this fixes: real-photo Wallpaper rows were added to
 * demoSeed.ts on 29 Aug 2026, but nothing had ever re-run `seedBaseConfig`
 * against the live Supabase database since — `vercel-build` only ran
 * `prisma db push` (schema only, no data). Production's Wallpaper table
 * was therefore still empty/stale, which is why /setup/wallpaper showed no
 * images and (combined with a separate front-end bug, fixed in the same
 * batch) never left its loading state.
 */
seedBaseConfig()
  .then(() => {
    console.log("Catalog synced (Product/Question/Wallpaper/Programme/etc.)");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
