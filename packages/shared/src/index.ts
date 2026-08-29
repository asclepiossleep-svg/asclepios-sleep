/**
 * @asclepios/shared
 *
 * Single source of truth for the vocabulary defined across the Asclepios
 * Sleep handoff documents (00–06 + Supplement 07). Both apps/api and
 * apps/web import from here so the domain language never drifts or gets
 * hard-coded into a component (Doc 01 §5 — the one non-negotiable rule).
 *
 * Every enum below is a *default seed*, not a hard limit: the underlying
 * tables (Question, Product, Rule, Content...) are the source of truth at
 * runtime. These TS types exist for compile-time safety inside the engines,
 * not to replace the versioned backend config.
 */

// ---------------------------------------------------------------------------
// Doc 02 §4 — Tags (a user can hold many simultaneously)
// ---------------------------------------------------------------------------
export const TAGS = [
  "SLEEP_ONSET",
  "NIGHT_WAKING",
  "EARLY_WAKING",
  "RACING_THOUGHTS",
  "STRESS",
  "IRREGULAR_SCHEDULE",
  "LATE_CAFFEINE",
  "SCREEN_EXPOSURE",
  "BREATHING_DISCOMFORT",
  "NASAL_DISCOMFORT",
  "PAIN",
  "PHYSICAL_DISCOMFORT",
  "DIGESTIVE_DISCOMFORT",
  "LOW_MORNING_ENERGY",
  "TRAVEL_TIMEZONE_CHANGE",
  "PRODUCT_NON_ADHERENCE",
] as const;
export type Tag = (typeof TAGS)[number];

// ---------------------------------------------------------------------------
// Doc 02 §6 — Severity buckets (display strategy, not a raw score)
// ---------------------------------------------------------------------------
export const SEVERITY_BUCKETS = [
  "MINIMAL",
  "MILD",
  "MODERATE",
  "HIGH",
  "VERY_HIGH_SAFETY",
] as const;
export type SeverityBucket = (typeof SEVERITY_BUCKETS)[number];

// ---------------------------------------------------------------------------
// Doc 02 §5 — Scoring dimensions per tag (data shape, weights are admin-owned)
// ---------------------------------------------------------------------------
export interface TagScore {
  tag: Tag;
  severity: number; // 0-10, subjective distress/symptom intensity
  frequency: number; // 0-5, per week
  duration: number; // 0-5, how long it has persisted
  impact: number; // 0-5, daytime function impact
  confidence: number; // 0-1, how sure the system is of this classification
  trend: "IMPROVING" | "STABLE" | "WORSENING";
}

// ---------------------------------------------------------------------------
// Doc 02 §7 — Intent Router destinations
// ---------------------------------------------------------------------------
export const INTENTS = [
  "PREFERENCE_CHANGE",
  "MEDIA_REQUEST",
  "ROUTINE_PREFERENCE",
  "COMMERCE",
  "PRODUCT_HELP",
  "SLEEP_HELP",
  "NEW_SYMPTOM",
  "PROGRESS",
  "TIMEZONE_TRAVEL",
] as const;
export type Intent = (typeof INTENTS)[number];

// ---------------------------------------------------------------------------
// Doc 03 §5 — Strategy Engine final Action Codes
// ---------------------------------------------------------------------------
export const ACTION_CODES = [
  "CONTINUE",
  "REMIND",
  "SIMPLIFY",
  "OPTIMISE",
  "ASK_MORE",
  "CHANGE_ROUTINE",
  "RECOMMEND_CONTENT",
  "ADD_PRODUCT",
  "REPLACE_PRODUCT",
  "REASSESS",
  "ESCALATE",
] as const;
export type ActionCode = (typeof ACTION_CODES)[number];

// ---------------------------------------------------------------------------
// Doc 03 §3 — Adherence classifications
// ---------------------------------------------------------------------------
export type AdherenceLevel = "LOW" | "GOOD" | "HIGH_NO_IMPROVEMENT" | "ROUTINE_NON_ADHERENCE";

// ---------------------------------------------------------------------------
// Doc 03 §4 — Response Engine trend comparison result
// ---------------------------------------------------------------------------
export type ResponseDirection = "IMPROVED" | "UNCHANGED" | "WORSENED";

// ---------------------------------------------------------------------------
// Supplement 07 §11 — Sleep audio duration presets (display / underlying value)
// ---------------------------------------------------------------------------
export const SLEEP_AUDIO_DURATION_PRESETS = [
  { label: "10 min", seconds: 600 },
  { label: "20 min", seconds: 1200 },
  { label: "30 min", seconds: 1800 },
  { label: "45 min", seconds: 2700 },
  { label: "1 hr", seconds: 3600 },
  { label: "1.5 hr", seconds: 5400 },
  { label: "2 hr", seconds: 7200 },
  { label: "3 hr", seconds: 10800 },
] as const;

export type SleepAudioDurationMode = "FIXED" | "CUSTOM" | "UNTIL_WAKE" | "ALL_NIGHT";

// Supplement 07 §14 — Wake style presets (user picks a feeling, not a curve)
export const WAKE_STYLES = ["GENTLE", "NORMAL", "STRONG"] as const;
export type WakeStyle = (typeof WAKE_STYLES)[number];

export const SNOOZE_MINUTES = [5, 10, 15] as const;
export const EXTEND_AUDIO_MINUTES = [15, 30, 60] as const;

// Supplement 07 §17 — Sleep visual duration
export type VisualDurationMode = "15_MIN" | "30_MIN" | "60_MIN" | "UNTIL_AUDIO" | "ALL_NIGHT";

// ---------------------------------------------------------------------------
// Master Kick-off V1 Phase 3/§26 — Wallpaper categories. The original 7
// (NATURE...JAPANESE_CALM) plus 3 added by the Master Kick-off doc, plus
// WARM_COZY added 29 Aug 2026 for the real-photo wallpaper library's
// candle/bedroom/reading-nook cluster (no prior category fit that mood).
// Centralized here so Admin UI, seed data and the Prisma schema comment
// never list these independently and drift.
// ---------------------------------------------------------------------------
export const WALLPAPER_CATEGORIES = [
  "NATURE",
  "NIGHT",
  "WATER",
  "MINIMAL",
  "ABSTRACT",
  "BRITISH_COUNTRYSIDE",
  "JAPANESE_CALM",
  "SUNRISE",
  "MIST_MOUNTAINS",
  "STARRY_SKY",
  "WARM_COZY",
] as const;
export type WallpaperCategory = (typeof WALLPAPER_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Design moodboard (28 Aug 2026) — Theme Color picker presets. These are the
// six accent colours the product design settled on; the Home/Wallpaper/
// SleepPlayer/etc. UI applies whichever one the user picks as a CSS variable
// override on top of the existing day/night token system (tokens.css). Do
// not hard-code these hex values anywhere else — import from here.
// ---------------------------------------------------------------------------
export const THEME_COLORS = [
  { code: "SAGE", hex: "#B7CDB8" },
  { code: "SKY", hex: "#A7C7E7" },
  { code: "LAVENDER", hex: "#C6B7E6" },
  { code: "TWILIGHT", hex: "#8E7CC3" },
  { code: "DEEP_BLUE", hex: "#3F416B" },
  { code: "CHARCOAL", hex: "#2B2D42" },
] as const;
export type ThemeColorCode = (typeof THEME_COLORS)[number]["code"];

// ---------------------------------------------------------------------------
// Requirement Recovery Matrix #24/#25/#29 (29 Aug 2026) — the Sleep Player
// had no actual audio playback at all. Real recorded tracks (nature/water/
// piano/singing-bowl per the Requirement doc's music-category list) need
// licensed audio assets that don't exist yet — but several of the doc's own
// listed categories (Brown Noise, Pink Noise, White Noise, frequency-labelled
// tracks like 432/528/852 Hz) can be genuinely synthesized in the browser
// with the Web Audio API, no asset files required. This catalog is real,
// playable audio today; `packages/shared` is the single source so the API
// and the player never diverge on what "sleepAudioId" values are valid.
// AudioTrack (recorded, licensed) rows stay a separate, DB-driven catalog
// for when real assets exist — this list is deliberately not stored there.
// ---------------------------------------------------------------------------
export const SYNTH_TRACKS = [
  { code: "SYNTH_PINK_NOISE", engine: "PINK_NOISE", category: "NOISE" },
  { code: "SYNTH_BROWN_NOISE", engine: "BROWN_NOISE", category: "NOISE" },
  { code: "SYNTH_WHITE_NOISE", engine: "WHITE_NOISE", category: "NOISE" },
  { code: "SYNTH_CALM_MIND", engine: "BLEND_432", category: "AMBIENT" },
  { code: "SYNTH_DEEP_RELAX", engine: "BLEND_528", category: "AMBIENT" },
  // Music Library (29 Aug 2026) — Edmund's brief: "APP have original
  // musics", expanding this from 5 noise/tone presets to a real browsable
  // library (see Library music picker). Still genuinely synthesized live
  // via Web Audio — no licensed audio files anywhere — just more distinct-
  // sounding engines (see synthEngine.ts for how each is built).
  { code: "SYNTH_OCEAN_WAVES", engine: "OCEAN_WAVES", category: "WATER" },
  { code: "SYNTH_GENTLE_RAIN", engine: "GENTLE_RAIN", category: "WATER" },
  { code: "SYNTH_SINGING_BOWL", engine: "SINGING_BOWL", category: "BOWL" },
  { code: "SYNTH_FOREST_WIND", engine: "FOREST_WIND", category: "NATURE" },
] as const;
export type SynthTrackCode = (typeof SYNTH_TRACKS)[number]["code"];
export type SynthEngineType = (typeof SYNTH_TRACKS)[number]["engine"];

export function isSynthTrack(id: string | null | undefined): id is SynthTrackCode {
  return !!id && SYNTH_TRACKS.some((t) => t.code === id);
}

// ---------------------------------------------------------------------------
// Requirement Recovery Matrix #11 — 4-mode teaching/intervention taxonomy
// (Rhythm/Calm/Body/Support). Every Tonight step is tagged with exactly one
// mode so the UI can show *why* a step is there, not just what it is.
// RHYTHM/SUPPORT are reserved for step types not built yet (timing-consistency
// prompts, environment/companion steps) — included now so the taxonomy is
// complete and doesn't need a breaking change later.
// ---------------------------------------------------------------------------
export const INTERVENTION_MODES = [
  { code: "RHYTHM", label: "Rhythm" },
  { code: "CALM", label: "Calm" },
  { code: "BODY", label: "Body" },
  { code: "SUPPORT", label: "Support" },
] as const;
export type InterventionMode = (typeof INTERVENTION_MODES)[number]["code"];

const STEP_MODE_MAP: Record<string, InterventionMode> = {
  PRODUCT: "BODY",
  BREATHING: "CALM",
  MUSIC: "CALM",
};

export function stepModeFor(stepCode: string): InterventionMode {
  return STEP_MODE_MAP[stepCode] ?? "SUPPORT";
}

// ---------------------------------------------------------------------------
// Requirement Recovery Matrix #12 — Routine levels 1/2/3. System-chosen only
// (never a user-facing picker) — see apps/api's routineLevelEngine.ts for
// how a user's level is derived from their review history.
// ---------------------------------------------------------------------------
export const ROUTINE_LEVELS = [1, 2, 3] as const;
export type RoutineLevel = (typeof ROUTINE_LEVELS)[number];

// ---------------------------------------------------------------------------
// Master Kick-off V1 — Content layers. Entitlement resolution for
// PRODUCT_LOCKED/PAID_PROGRAMME stays centralized in entitlement.ts, never
// re-implemented per screen (Coding Rules §21).
// ---------------------------------------------------------------------------
export const CONTENT_LAYERS = ["PUBLIC", "PRODUCT_LOCKED", "PAID_PROGRAMME"] as const;
export type ContentLayer = (typeof CONTENT_LAYERS)[number];

// ---------------------------------------------------------------------------
// Master Kick-off V1 §21 "product info must be dynamic" — lifecycle state.
// ---------------------------------------------------------------------------
export const PRODUCT_LIFECYCLE_STATES = ["ACTIVE", "COMING_SOON", "DISCONTINUED"] as const;
export type ProductLifecycleState = (typeof PRODUCT_LIFECYCLE_STATES)[number];

// ---------------------------------------------------------------------------
// Doc 06 §2 — Service boundaries (folder/module names must match this list)
// ---------------------------------------------------------------------------
export const SERVICE_BOUNDARIES = [
  "auth",
  "profile",
  "commerce",
  "activation",
  "entitlement",
  "product",
  "content",
  "programme",
  "routine",
  "checkin",
  "decision",
  "aiGateway",
  "analytics",
  "admin",
] as const;

// ---------------------------------------------------------------------------
// Feature flags — Supplement 07 §7 locks product_activation_qr OFF by default.
// Doc 00 / 02 lock the AI Gateway OFF by default (AI-light V1).
// ---------------------------------------------------------------------------
export interface FeatureFlags {
  product_activation_qr: boolean;
  ai_gateway: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  product_activation_qr: false,
  ai_gateway: false,
};

// ---------------------------------------------------------------------------
// Supplement 07 §2 — Account vs Membership vs Product Ownership vs Entitlement
// These are deliberately separate concepts/tables. Never collapse them.
// ---------------------------------------------------------------------------
export type MembershipTier = "FREE" | "PREMIUM" | "DEMO";

export interface EntitlementDTO {
  key: string; // e.g. "programme.28day", "media.premium_audio", "course.calm_mind"
  grantedVia: "ORDER" | "ADMIN_GRANT" | "DEMO_SEED" | "QR_ACTIVATION";
  expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// Supplement 07 §5 — Demo seed accounts (identity only; state lives in DB)
// ---------------------------------------------------------------------------
export const DEMO_ACCOUNTS = [
  { email: "demo.new@asclepios.test", label: "Demo New User", scenario: "Day 0, no assessment yet" },
  { email: "demo.standard@asclepios.test", label: "Demo Standard", scenario: "Basic profile, normal daily use" },
  { email: "demo.product@asclepios.test", label: "Demo Product User", scenario: "Owns 1 product, QR not required" },
  { email: "demo.multi@asclepios.test", label: "Demo Multi Product", scenario: "Owns 3 products, tonight shows only 1-3 items" },
  { email: "demo.lowadherence@asclepios.test", label: "Demo Low Adherence", scenario: "Product used 2/7 nights" },
  { email: "demo.poorresponse@asclepios.test", label: "Demo Poor Response", scenario: "Used 7/7 nights, poor outcome" },
  { email: "demo.premium@asclepios.test", label: "Demo Premium", scenario: "28-day programme + premium media" },
  { email: "demo.travel@asclepios.test", label: "Demo Travel", scenario: "HK -> UK timezone change" },
  { email: "demo.admin@asclepios.test", label: "Demo Admin", scenario: "Back-office admin access" },
] as const;

// ---------------------------------------------------------------------------
// Doc 06 §8 Definition of Done — kept here so both apps can assert against it
// in E2E tests without re-typing the list.
// ---------------------------------------------------------------------------
export const DEFINITION_OF_DONE = [
  "Product/pricing/question/answer/rule/content/locale/entitlement changes need no deploy",
  "AI provider can be swapped or turned off without breaking the main flow",
  "Morning Check-in is <=3 primary actions",
  "Steps unrelated to Start Sleep never appear in that flow",
  "Decision history retains its version",
  "Media is delivered via CDN, not the app server",
  "QR/Payment correctly grants entitlement with an audit trail",
  "Multi-language layout does not break",
  "Safety rules always outrank product recommendation",
  "Admin can add products, questions, audio, wallpaper, courses, promotions unaided",
] as const;

// ---------------------------------------------------------------------------
// Requirement Recovery Matrix #22 — Sleep Answer Library's 4-category
// taxonomy. Per the Master Kick-off doc: UNDERSTAND (what/why, conceptual),
// LEARN (a technique/skill to practise), USE (how to use a product or app
// feature), EXPLORE (broader related topics). Every ContentItem in the
// library belongs to exactly one of these — never re-typed as a raw string
// in a route or component.
// ---------------------------------------------------------------------------
export const CONTENT_CATEGORIES = ["UNDERSTAND", "LEARN", "USE", "EXPLORE"] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];
