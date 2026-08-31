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
// 31 Aug 2026 — Edmund's report: these 9 slugs are Phase-1 placeholder
// MusicTrack rows (SYNTHESIZED, no real audioUrl/artworkUrl) that show up
// in the Music Library as blank white tiles doing nothing when tapped.
// Real licensed tracks now cover the same moods, so these are unpublished
// here directly (kept out of demoSeed.ts's own giant upsert block on
// purpose — a small, low-risk, separately-runnable step) rather than
// deleted, so nothing referencing them by id ever breaks.
const LEGACY_SYNTH_SLUGS = [
  "synth-pink-noise",
  "synth-brown-noise",
  "synth-white-noise",
  "synth-calm-mind-432",
  "synth-deep-relax-528",
  "synth-ocean-waves",
  "synth-gentle-rain",
  "synth-singing-bowl",
  "synth-forest-wind",
];

seedBaseConfig()
  .then(() => prisma.musicTrack.updateMany({ where: { slug: { in: LEGACY_SYNTH_SLUGS } }, data: { published: false } }))
  .then(() => {
    console.log("Catalog synced (Product/Question/Wallpaper/Programme/etc.)");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
