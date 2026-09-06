import { prisma } from "../db";
import { grantEntitlement } from "./entitlement";
import { DEMO_ACCOUNTS, type Tag, type ProgrammeGoal, type ProgrammeDayTheme } from "@asclepios/shared";

/**
 * All base config (Products, Questions, Rules, Content, Audio, Wallpaper,
 * Programme, RoutineStepDef, FeatureFlags) plus the 9 Supplement-07 §5 demo
 * accounts. This is imported by both `prisma/seed.ts` (first-time staging
 * seed) and the `/demo/:email/reset` route (Supplement 07 §5: "每個 Demo
 * Account 有 Reset Demo State 按鈕... 回復 seed 狀態").
 *
 * Demo data runs through the *same* Decision/Entitlement Engine as real
 * users — nothing here is a hand-painted screen (Supplement 07 §5).
 */

export async function seedBaseConfig() {
  await prisma.featureFlag.upsert({
    where: { key: "product_activation_qr" },
    update: {},
    create: { key: "product_activation_qr", enabled: false },
  });
  await prisma.featureFlag.upsert({
    where: { key: "ai_gateway" },
    update: {},
    create: { key: "ai_gateway", enabled: false },
  });

  /**
   * Real Phase 1 product line — Asclepios 阿斯康, per the printed catalog
   * (阿斯康睡眠管理catalog.pdf, supplied 27 Aug 2026) which Edmund confirmed
   * supersedes the earlier Drive brand memory. That memory doc (Rock
   * Pillar_AsclepiosHealth_SleepBrand_Memory.md) described a 4-SKU line
   * (SLEEPTAPE™ as a mouth tape + AIRFLOW™ nasal strip + a magnesium mouth
   * spray + AIRMASK™ aroma mask) — RETIRED as of this confirmation. The
   * catalog's actual Phase 1 is 3 SKUs, and the naming/format both changed:
   * SLEEPTAPE™ is itself the nasal strip (not a mouth tape, no separate
   * AIRFLOW™), and the "magnesium" product is a drink powder stick-pack,
   * not a spray — paired day/night with a new DAY MODE™ gut/mood powder
   * that didn't exist in the memory doc at all. See the project's
   * `asclepios-sleep-product-catalog-digest.md` for full ingredient panels.
   * Prices are still provisional — catalog note: "remark could change from
   * final confirmation of the production from the factory."
   *
   * REGULATORY — Part A/B content rule from the brand memory doc, binding on
   * whatever copy an Admin later types into `description` for these rows:
   * never claim to "treat/solve/cure" sleep apnoea (OSA) or use the clinical
   * term "呼吸困難" (dyspnea) in any tier, including soft/social content;
   * "鼻塞" (occasional nasal stuffiness) is fine. Never depict an AI-generated
   * or role-played "medical professional" (e.g. in a white coat) endorsing a
   * product, even in an internal-only draft. See seeded ContentItem
   * CONTENT_SAFETY_DISCLAIMER below for the required safety line.
   */
  const sleeptapeData = {
    name: "SLEEPTAPE™ Nasal Strips (Lavender)",
    description: "Nasal strip worn across the bridge before sleep — helps maintain nasal breathing, reduce mouth-breathing/snoring. 30 individually-wrapped strips/box.",
    category: "NASAL_STRIP",
    priceCents: 1999,
    active: true,
    market: "UK",
    lifecycleState: "ACTIVE",
  };
  const dayModeData = {
    name: "DAY MODE™",
    description: "Daytime drink-powder supplement — gut, digestion & stress/mood management, contains B vitamins. Taken before/with a main meal. 20 × 10g packs/box.",
    category: "DAY_SUPPLEMENT",
    priceCents: 2499,
    active: true,
    market: "UK",
    lifecycleState: "ACTIVE",
  };
  const restSleepModeData = {
    name: "REST & SLEEP MODE™",
    description: "Night-time drink-powder supplement — magnesium glycinate + L-theanine + GABA + calming herbal extracts. Taken 30-60 min before bed. 20 × 10g packs/box.",
    category: "SLEEP_SUPPLEMENT",
    priceCents: 2799,
    active: true,
    market: "UK",
    lifecycleState: "ACTIVE",
  };
  const p01 = await prisma.product.upsert({ where: { code: "P01" }, update: sleeptapeData, create: { code: "P01", ...sleeptapeData } });
  const p02 = await prisma.product.upsert({ where: { code: "P02" }, update: dayModeData, create: { code: "P02", ...dayModeData } });
  const p03 = await prisma.product.upsert({ where: { code: "P03" }, update: restSleepModeData, create: { code: "P03", ...restSleepModeData } });

  await seedProductProtocols(p01.id, p02.id, p03.id);

  await prisma.contentItem.upsert({
    where: { code: "CONTENT_SAFETY_DISCLAIMER" },
    update: {},
    create: {
      code: "CONTENT_SAFETY_DISCLAIMER",
      type: "ARTICLE",
      title: "Safety & Suitability Notice",
      locale: "zh-HK",
      url: null,
      active: true,
      layer: "PUBLIC", // always visible, never gated behind an entitlement
      // Mandatory line per the brand memory doc §3 — surface verbatim
      // wherever product copy is shown, not paraphrased.
      tagsJson: JSON.stringify(["PRODUCT_SAFETY_NOTICE"]),
    },
  });

  await seedContentLibrary();

  await prisma.routineStepDef.upsert({ where: { code: "STEP_PRODUCT" }, update: {}, create: { code: "STEP_PRODUCT", label: "Use tonight's product", category: "PRODUCT", defaultOrder: 1 } });
  await prisma.routineStepDef.upsert({ where: { code: "STEP_BREATHING" }, update: {}, create: { code: "STEP_BREATHING", label: "1-minute breathing", category: "BREATHING", defaultOrder: 2 } });
  await prisma.routineStepDef.upsert({ where: { code: "STEP_STRETCH" }, update: {}, create: { code: "STEP_STRETCH", label: "Gentle stretch", category: "STRETCH", defaultOrder: 3 } });
  await prisma.routineStepDef.upsert({ where: { code: "STEP_MUSIC" }, update: {}, create: { code: "STEP_MUSIC", label: "Start sleep music", category: "MUSIC", defaultOrder: 4 } });

  await prisma.audioTrack.upsert({ where: { code: "AUD_MOON_LAKE_01" }, update: {}, create: { code: "AUD_MOON_LAKE_01", title: "Moon Lake", category: "WATER", durationSeconds: 3600 } });
  await prisma.audioTrack.upsert({ where: { code: "AUD_SOFT_PIANO" }, update: {}, create: { code: "AUD_SOFT_PIANO", title: "Soft Piano Morning", category: "CLASSICAL", durationSeconds: 600, isPremium: true } });
  await prisma.audioTrack.upsert({ where: { code: "WAKE_COUNTRYSIDE_02" }, update: {}, create: { code: "WAKE_COUNTRYSIDE_02", title: "Birds & Countryside", category: "NATURE", durationSeconds: 600 } });

  // Music Library V1 (29 Aug 2026) — Phase 1 seed: today's 9 SYNTH_TRACKS
  // as real MusicTrack catalog rows (sourceType SYNTHESIZED, audioUrl
  // null — synthEngine tells the not-yet-built player which
  // synthEngine.ts engine to run instead). Nothing reads MusicTrack yet
  // (Tonight/SleepPlayer still run off SYNTH_TRACKS directly), so this is
  // purely catalog data ahead of the Phase 3/5/6 player+UI work — gives
  // the schema something real to query/test against immediately, per
  // Edmund's own §14 ("create seed/demo records now"), without inventing
  // placeholder tracks that don't actually exist.
  await prisma.musicTrack.upsert({
    where: { slug: "synth-pink-noise" },
    update: {},
    create: { slug: "synth-pink-noise", title: "Pink Noise", sourceType: "SYNTHESIZED", synthEngine: "PINK_NOISE", primaryCategory: "SLEEP_SOUNDS", subcategory: "PINK_NOISE", sortOrder: 1 },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "synth-brown-noise" },
    update: {},
    create: { slug: "synth-brown-noise", title: "Brown Noise", sourceType: "SYNTHESIZED", synthEngine: "BROWN_NOISE", primaryCategory: "SLEEP_SOUNDS", subcategory: "BROWN_NOISE", sortOrder: 2 },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "synth-white-noise" },
    update: {},
    create: { slug: "synth-white-noise", title: "White Noise", sourceType: "SYNTHESIZED", synthEngine: "WHITE_NOISE", primaryCategory: "SLEEP_SOUNDS", subcategory: "WHITE_NOISE", sortOrder: 3 },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "synth-calm-mind-432" },
    update: {},
    create: { slug: "synth-calm-mind-432", title: "Calm Mind (432Hz)", sourceType: "SYNTHESIZED", synthEngine: "BLEND_432", primaryCategory: "SOUND_HEALING", subcategory: "FREQ_432", frequencyHz: 432, sortOrder: 4 },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "synth-deep-relax-528" },
    update: {},
    create: { slug: "synth-deep-relax-528", title: "Deep Relax (528Hz)", sourceType: "SYNTHESIZED", synthEngine: "BLEND_528", primaryCategory: "SOUND_HEALING", subcategory: "FREQ_528", frequencyHz: 528, sortOrder: 5 },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "synth-ocean-waves" },
    update: {},
    create: { slug: "synth-ocean-waves", title: "Ocean Waves", sourceType: "SYNTHESIZED", synthEngine: "OCEAN_WAVES", primaryCategory: "SLEEP_SOUNDS", subcategory: "OCEAN_WAVES", sortOrder: 6 },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "synth-gentle-rain" },
    update: {},
    create: { slug: "synth-gentle-rain", title: "Gentle Rain", sourceType: "SYNTHESIZED", synthEngine: "GENTLE_RAIN", primaryCategory: "SLEEP_SOUNDS", subcategory: "RAIN", sortOrder: 7 },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "synth-singing-bowl" },
    update: {},
    create: { slug: "synth-singing-bowl", title: "Singing Bowl", sourceType: "SYNTHESIZED", synthEngine: "SINGING_BOWL", primaryCategory: "SOUND_HEALING", subcategory: "SINGING_BOWL", sortOrder: 8 },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "synth-forest-wind" },
    update: {},
    create: { slug: "synth-forest-wind", title: "Forest Wind", sourceType: "SYNTHESIZED", synthEngine: "FOREST_WIND", primaryCategory: "SLEEP_SOUNDS", subcategory: "FOREST", sortOrder: 9 },
  });

  // Real-photo wallpaper library (Edmund-commissioned, photorealistic
  // direction — 29 Aug 2026, "B start compose into the APP"). imageUrl
  // points at static files under apps/web/public/wallpapers/, served
  // as-is by Vite/Vercel (not a Vite import — Wallpaper.imageUrl is a
  // runtime DB value, so these can't be bundled the way the Login hero
  // images were). themeColor is kept on every row as a fallback tint for
  // the brief window before the image loads, and in case a row's image
  // is ever pulled. The 5 original placeholder rows below now point at
  // the closest-matching real photo instead of getting duplicate rows.
  await prisma.wallpaper.upsert({ where: { code: "WALL_MOON_LAKE_04" }, update: { imageUrl: "/wallpapers/moonlit-lake.webp" }, create: { code: "WALL_MOON_LAKE_04", title: "Moon Lake", category: "WATER", imageUrl: "/wallpapers/moonlit-lake.webp", themeColor: "#2b3a55" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_JAPANESE_CALM_01" }, update: { imageUrl: "/wallpapers/stone-lantern-pond.webp" }, create: { code: "WALL_JAPANESE_CALM_01", title: "Japanese Calm", category: "JAPANESE_CALM", imageUrl: "/wallpapers/stone-lantern-pond.webp", themeColor: "#3c4a3e" } });
  // Master Kick-off V1 Phase 3/§26 — 3 categories added on top of the
  // original 7. See packages/shared WALLPAPER_CATEGORIES for the full list.
  await prisma.wallpaper.upsert({ where: { code: "WALL_SUNRISE_01" }, update: { imageUrl: "/wallpapers/ocean-dawn.webp" }, create: { code: "WALL_SUNRISE_01", title: "Slow Sunrise", category: "SUNRISE", imageUrl: "/wallpapers/ocean-dawn.webp", themeColor: "#e8a15c" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_MIST_MOUNTAINS_01" }, update: { imageUrl: "/wallpapers/mountain-dawn.webp" }, create: { code: "WALL_MIST_MOUNTAINS_01", title: "Misty Peaks", category: "MIST_MOUNTAINS", imageUrl: "/wallpapers/mountain-dawn.webp", themeColor: "#7c8a94" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_STARRY_SKY_01" }, update: { imageUrl: "/wallpapers/nebula-calm.webp" }, create: { code: "WALL_STARRY_SKY_01", title: "Starry Sky", category: "STARRY_SKY", imageUrl: "/wallpapers/nebula-calm.webp", themeColor: "#141a33" } });

  // 21 further real-photo wallpapers (29 Aug 2026 build) — curated/deduped
  // from Edmund's 10 photoreal concept sheets. WARM_COZY is the one new
  // category (packages/shared WALLPAPER_CATEGORIES) for the candle/
  // bedroom/reading-nook cluster that didn't fit any existing category.
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_QUIET_PIER" }, update: {}, create: { code: "WALL_PHOTO_QUIET_PIER", title: "Quiet Pier", category: "WATER", imageUrl: "/wallpapers/quiet-pier.webp", themeColor: "#4a6470" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_WATERFALL_COVE" }, update: {}, create: { code: "WALL_PHOTO_WATERFALL_COVE", title: "Waterfall Cove", category: "WATER", imageUrl: "/wallpapers/waterfall-cove.webp", themeColor: "#3d5a52" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_LOTUS_REFLECTION" }, update: {}, create: { code: "WALL_PHOTO_LOTUS_REFLECTION", title: "Lotus Reflection", category: "WATER", imageUrl: "/wallpapers/lotus-reflection.webp", themeColor: "#385147" } });

  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_COURTYARD_FOUNTAIN" }, update: {}, create: { code: "WALL_PHOTO_COURTYARD_FOUNTAIN", title: "Courtyard Fountain", category: "JAPANESE_CALM", imageUrl: "/wallpapers/courtyard-fountain.webp", themeColor: "#39443a" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_BAMBOO_WATER_BASIN" }, update: {}, create: { code: "WALL_PHOTO_BAMBOO_WATER_BASIN", title: "Bamboo Water Basin", category: "JAPANESE_CALM", imageUrl: "/wallpapers/bamboo-water-basin.webp", themeColor: "#414f3c" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_LOTUS_POOL_EVENING" }, update: {}, create: { code: "WALL_PHOTO_LOTUS_POOL_EVENING", title: "Lotus Pool at Dusk", category: "JAPANESE_CALM", imageUrl: "/wallpapers/lotus-pool-evening.webp", themeColor: "#33403d" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_MOSS_GARDEN_STREAM" }, update: {}, create: { code: "WALL_PHOTO_MOSS_GARDEN_STREAM", title: "Moss Garden Stream", category: "JAPANESE_CALM", imageUrl: "/wallpapers/moss-garden-stream.webp", themeColor: "#3a4a3a" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_BUDDHA_SERENITY" }, update: {}, create: { code: "WALL_PHOTO_BUDDHA_SERENITY", title: "Buddha Serenity", category: "JAPANESE_CALM", imageUrl: "/wallpapers/buddha-serenity.webp", themeColor: "#37423f" } });

  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_SLEEP_SANCTUARY" }, update: {}, create: { code: "WALL_PHOTO_SLEEP_SANCTUARY", title: "Sleep Sanctuary", category: "WARM_COZY", imageUrl: "/wallpapers/sleep-sanctuary.webp", themeColor: "#6b4f36" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_RAINY_READING_NOOK" }, update: {}, create: { code: "WALL_PHOTO_RAINY_READING_NOOK", title: "Rainy Reading Nook", category: "WARM_COZY", imageUrl: "/wallpapers/rainy-reading-nook.webp", themeColor: "#5c5548" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_TEA_BY_WINDOW" }, update: {}, create: { code: "WALL_PHOTO_TEA_BY_WINDOW", title: "Tea by the Window", category: "WARM_COZY", imageUrl: "/wallpapers/tea-by-window.webp", themeColor: "#5e5644" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_CANDLE_BATH" }, update: {}, create: { code: "WALL_PHOTO_CANDLE_BATH", title: "Candlelit Bath", category: "WARM_COZY", imageUrl: "/wallpapers/candle-bath.webp", themeColor: "#6e5638" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_SINGING_BOWL_GLOW" }, update: {}, create: { code: "WALL_PHOTO_SINGING_BOWL_GLOW", title: "Singing Bowl Glow", category: "WARM_COZY", imageUrl: "/wallpapers/singing-bowl-glow.webp", themeColor: "#75552c" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_CANDLE_ZEN" }, update: {}, create: { code: "WALL_PHOTO_CANDLE_ZEN", title: "Candle Zen", category: "WARM_COZY", imageUrl: "/wallpapers/candle-zen.webp", themeColor: "#4f4534" } });

  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_TWILIGHT_HORIZON" }, update: {}, create: { code: "WALL_PHOTO_TWILIGHT_HORIZON", title: "Twilight Horizon", category: "NIGHT", imageUrl: "/wallpapers/twilight-horizon.webp", themeColor: "#2e3550" } });

  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_AURORA_REFLECTION" }, update: {}, create: { code: "WALL_PHOTO_AURORA_REFLECTION", title: "Aurora Reflection", category: "STARRY_SKY", imageUrl: "/wallpapers/aurora-reflection.webp", themeColor: "#2c3a4a" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_STARRY_FOREST_PATH" }, update: {}, create: { code: "WALL_PHOTO_STARRY_FOREST_PATH", title: "Starry Forest Path", category: "STARRY_SKY", imageUrl: "/wallpapers/starry-forest-path.webp", themeColor: "#1f2438" } });

  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_FOREST_MIST" }, update: {}, create: { code: "WALL_PHOTO_FOREST_MIST", title: "Forest Mist", category: "MIST_MOUNTAINS", imageUrl: "/wallpapers/forest-mist.webp", themeColor: "#4a5548" } });

  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_CHAKRA_LIGHT" }, update: {}, create: { code: "WALL_PHOTO_CHAKRA_LIGHT", title: "Chakra Light", category: "ABSTRACT", imageUrl: "/wallpapers/chakra-light.webp", themeColor: "#4a3a5c" } });

  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_RAIN_WINDOW" }, update: {}, create: { code: "WALL_PHOTO_RAIN_WINDOW", title: "Rain on the Window", category: "MINIMAL", imageUrl: "/wallpapers/rain-window.webp", themeColor: "#5a6068" } });

  await prisma.wallpaper.upsert({ where: { code: "WALL_PHOTO_MEADOW_LIGHT" }, update: {}, create: { code: "WALL_PHOTO_MEADOW_LIGHT", title: "Meadow Light", category: "BRITISH_COUNTRYSIDE", imageUrl: "/wallpapers/meadow-light.webp", themeColor: "#7c8452" } });

  // Music Library V1 — Phase 3 (31 Aug 2026): the first 12 real, properly
  // licensed audio files (Edmund downloaded these from Pixabay Music,
  // "Free for commercial use, no attribution required", and uploaded them
  // himself to apps/web/public/audio/). sourceType is ASCLEPIOS_LICENSED —
  // not THIRD_PARTY_API, since these are permanent local files, not a
  // live-resolved provider stream. artworkUrl reuses an existing wallpaper
  // photo whose mood matches each track, rather than sourcing separate
  // cover art. primaryCategory/subcategory follow packages/shared's
  // MUSIC_SUBCATEGORIES controlled vocabulary.
  await prisma.musicTrack.upsert({
    where: { slug: "gentle-rain" },
    update: {},
    create: {
      slug: "gentle-rain", title: "Gentle Rain", artist: "Eryliaa", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/gentle-rain.mp3", artworkUrl: "/wallpapers/rain-window.webp",
      primaryCategory: "SLEEP_SOUNDS", subcategory: "RAIN",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "ocean-waves" },
    update: {},
    create: {
      slug: "ocean-waves", title: "Soothing Ocean Waves", artist: "DRAGON-STUDIO", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/ocean-waves.mp3", artworkUrl: "/wallpapers/waterfall-cove.webp",
      primaryCategory: "SLEEP_SOUNDS", subcategory: "OCEAN_WAVES",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "forest-wind-birds" },
    update: {},
    create: {
      slug: "forest-wind-birds", title: "Forest Wind with Birds", artist: "Eryliaa", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/forest-wind-birds.mp3", artworkUrl: "/wallpapers/forest-mist.webp",
      primaryCategory: "SLEEP_SOUNDS", subcategory: "FOREST",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "singing-bowl-struck" },
    update: {},
    create: {
      slug: "singing-bowl-struck", title: "E Flat Tibetan Singing Bowl", artist: "freesound_community", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/singing-bowl-struck.mp3", artworkUrl: "/wallpapers/singing-bowl-glow.webp",
      primaryCategory: "SOUND_HEALING", subcategory: "TIBETAN_BOWL",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "singing-bowl-long" },
    update: {},
    create: {
      slug: "singing-bowl-long", title: "Singing Bowl, Long", artist: "freesound_community", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/singing-bowl-long.mp3", artworkUrl: "/wallpapers/singing-bowl-glow.webp",
      primaryCategory: "SOUND_HEALING", subcategory: "SINGING_BOWL",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "852hz-deep-meditation" },
    update: {},
    create: {
      slug: "852hz-deep-meditation", title: "Deep Meditation 852Hz", artist: "Dominique_GARNIER", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/852hz-deep-meditation.mp3", artworkUrl: "/wallpapers/chakra-light.webp",
      primaryCategory: "SOUND_HEALING", subcategory: "FREQ_852", frequencyHz: 852,
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "relaxing-sleep" },
    update: {},
    create: {
      slug: "relaxing-sleep", title: "Relaxing Sleep", artist: "AtlasAudio", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/relaxing-sleep.mp3", artworkUrl: "/wallpapers/moonlit-lake.webp",
      primaryCategory: "MUSIC", subcategory: "DEEP_SLEEP_AMBIENT",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "space-music" },
    update: {},
    create: {
      slug: "space-music", title: "Space", artist: "AtlasAudio", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/space-music.mp3", artworkUrl: "/wallpapers/nebula-calm.webp",
      primaryCategory: "MUSIC", subcategory: "SOFT_SPACE",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "calm-soft-piano" },
    update: {},
    create: {
      slug: "calm-soft-piano", title: "Calm and Soft Piano", artist: "Clavier-Music", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/calm-soft-piano.mp3", artworkUrl: "/wallpapers/tea-by-window.webp",
      primaryCategory: "MUSIC", subcategory: "SLEEP_PIANO",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "classical-piano" },
    update: {},
    create: {
      slug: "classical-piano", title: "Classical Piano Music", artist: "Clavier-Music", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/classical-piano.mp3", artworkUrl: "/wallpapers/candle-zen.webp",
      primaryCategory: "MUSIC", subcategory: "CLASSICAL_RELAXATION",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "lullaby-piano-sleep" },
    update: {},
    create: {
      slug: "lullaby-piano-sleep", title: "Lullaby — Relaxing Piano for Sleep", artist: "Clavier-Music", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/lullaby-piano-sleep.mp3", artworkUrl: "/wallpapers/sleep-sanctuary.webp",
      primaryCategory: "MUSIC", subcategory: "MINIMAL_PIANO",
    },
  });
  await prisma.musicTrack.upsert({
    where: { slug: "pachelbels-canon" },
    update: {},
    create: {
      slug: "pachelbels-canon", title: "Pachelbel's Canon (Canon in D)", artist: "Clavier-Music", sourceType: "ASCLEPIOS_LICENSED",
      audioUrl: "/audio/pachelbels-canon.mp3", artworkUrl: "/wallpapers/quiet-pier.webp",
      primaryCategory: "MUSIC", subcategory: "CHAMBER_MUSIC",
    },
  });

  // Pre-existing generic programme, kept as-is (dropping it is a data-model
  // decision, not a UI bug fix) but nothing enrols in it any more — Fix
  // #5.6's guided journey only ships copy/content for the two named
  // programmes below and GET /programmes only ever lists those two, so an
  // enrollment here would have no i18n strings or ProgrammeDay content to
  // render. Whole-site audit (6 Sep 2026) moved demo.premium off of this
  // (see that case below) after finding exactly that: an invisible,
  // untranslatable enrollment.
  await prisma.programme.upsert({ where: { code: "PRG_28DAY_CORE" }, update: {}, create: { code: "PRG_28DAY_CORE", name: "28-Day Sleep Reset", lengthDays: 28, reviewFrequencyDays: 7 } });

  // Requirement Recovery Matrix #20/#21 — the two named programmes.
  // Display copy (name/description, overview/who-for) lives client-side in
  // i18n keyed by `code` (same pattern as tonight.track.* / library.category.*)
  // — these DB rows only carry the structural facts (length, review cadence,
  // goal/improvement-area codes, and the 7-night -> 30-day continuity link).
  const quickstartGoals: ProgrammeGoal[] = ["FALL_ASLEEP_FASTER", "CONSISTENT_ROUTINE"];
  const quickstartTags: Tag[] = ["SLEEP_ONSET", "IRREGULAR_SCHEDULE"];
  const quickstart = await prisma.programme.upsert({
    where: { code: "PRG_7NIGHT_QUICKSTART" },
    update: { goalsJson: JSON.stringify(quickstartGoals), improvementTagsJson: JSON.stringify(quickstartTags), nextProgrammeCode: "PRG_30DAY_RESET" },
    create: {
      code: "PRG_7NIGHT_QUICKSTART",
      name: "7-Night Quick Start",
      lengthDays: 7,
      reviewFrequencyDays: 7,
      goalsJson: JSON.stringify(quickstartGoals),
      improvementTagsJson: JSON.stringify(quickstartTags),
      nextProgrammeCode: "PRG_30DAY_RESET",
    },
  });

  const resetGoals: ProgrammeGoal[] = ["FALL_ASLEEP_FASTER", "FEWER_NIGHT_WAKINGS", "CALMER_MIND_AT_BEDTIME", "MORE_MORNING_ENERGY"];
  const resetTags: Tag[] = ["SLEEP_ONSET", "NIGHT_WAKING", "STRESS", "LOW_MORNING_ENERGY"];
  const reset = await prisma.programme.upsert({
    where: { code: "PRG_30DAY_RESET" },
    update: { goalsJson: JSON.stringify(resetGoals), improvementTagsJson: JSON.stringify(resetTags) },
    create: {
      code: "PRG_30DAY_RESET",
      name: "30-Day Sleep Reset",
      lengthDays: 30,
      reviewFrequencyDays: 7,
      goalsJson: JSON.stringify(resetGoals),
      improvementTagsJson: JSON.stringify(resetTags),
    },
  });

  await seedProgrammeDays(quickstart.id, quickstart.lengthDays);
  await seedProgrammeDays(reset.id, reset.lengthDays);

  const q100 = await prisma.question.upsert({
    where: { code_version: { code: "Q100", version: 1 } },
    update: {},
    create: {
      code: "Q100",
      version: 1,
      locale: "en",
      text: "What's the biggest problem with your sleep tonight?",
      type: "SINGLE_SELECT",
    },
  });
  await prisma.answerOption.upsert({
    where: { id: "A_RACING_SEED" },
    update: {},
    create: { id: "A_RACING_SEED", questionId: q100.id, code: "A_RACING", label: "My mind won't stop racing", tagEffectsJson: JSON.stringify([{ tag: "RACING_THOUGHTS", delta: 3 }]) },
  });
  await prisma.answerOption.upsert({
    where: { id: "A_NASAL_SEED" },
    update: {},
    create: { id: "A_NASAL_SEED", questionId: q100.id, code: "A_NASAL", label: "I can't breathe through my nose", tagEffectsJson: JSON.stringify([{ tag: "NASAL_DISCOMFORT", delta: 4 }]) },
  });
  await prisma.answerOption.upsert({
    where: { id: "A_NONE_SEED" },
    update: {},
    create: { id: "A_NONE_SEED", questionId: q100.id, code: "A_NONE", label: "Nothing in particular", tagEffectsJson: JSON.stringify([]) },
  });

  await prisma.question.upsert({
    where: { code_version: { code: "Q103", version: 1 } },
    update: {},
    create: {
      code: "Q103",
      version: 1,
      locale: "en",
      text: "How often has that happened in the last week?",
      type: "SINGLE_SELECT",
      triggerCondition: JSON.stringify({ tag: "RACING_THOUGHTS", gte: 1 }),
    },
  });

  return { p01, p02, p03 };
}

/**
 * Requirement Recovery Matrix #22 — Sleep Answer Library seed content.
 * Genuine, self-authored general sleep-hygiene education (no clinical
 * claims, no fabricated citations) across the doc's 4 categories, in both
 * shipped locales — same "no real asset yet, so build the honest thing"
 * approach as the synthesized audio and colour-card wallpapers this
 * session. All PUBLIC layer for V1 (product/programme-locked library items
 * are a Milestone-2-later addition, once #14/#20/#21 give it something real
 * to gate).
 */
/**
 * Requirement Recovery Matrix #14 — Product micro-protocols. Real usage
 * instructions taken directly from the printed catalog's own panels (page 3
 * for SLEEPTAPE™, page 4 for DAY MODE™ / REST & SLEEP MODE™) — nothing
 * invented, nothing clinical. Each product gets its own short numbered
 * sequence instead of the old flat "use tonight's product" line.
 */
async function seedProductProtocols(sleeptapeId: string, dayModeId: string, restSleepModeId: string) {
  const rows: { productId: string; locale: "en" | "zh-HK"; stepOrder: number; title: string; instruction: string }[] = [
    // P01 — SLEEPTAPE™ Nasal Strips
    { productId: sleeptapeId, locale: "en", stepOrder: 1, title: "Clean & dry", instruction: "Clean and dry the skin across your nose bridge." },
    { productId: sleeptapeId, locale: "en", stepOrder: 2, title: "Apply", instruction: "Peel the strip and centre it on the bridge of your nose. Press lightly to secure." },
    { productId: sleeptapeId, locale: "en", stepOrder: 3, title: "Breathe & sleep", instruction: "Breathe calmly through your nose and settle in to sleep. Pairs well with REST & SLEEP MODE™." },
    { productId: sleeptapeId, locale: "zh-HK", stepOrder: 1, title: "清潔同抹乾", instruction: "將鼻樑位置嘅皮膚清潔同抹乾。" },
    { productId: sleeptapeId, locale: "zh-HK", stepOrder: 2, title: "貼上", instruction: "撕開鼻貼，貼喺鼻樑中間位置，輕輕按實。" },
    { productId: sleeptapeId, locale: "zh-HK", stepOrder: 3, title: "呼吸同瞓覺", instruction: "平靜咁用鼻呼吸，然後安心瞓覺。同REST & SLEEP MODE™一齊用效果更好。" },
    // P02 — DAY MODE™ (before/with a main meal)
    { productId: dayModeId, locale: "en", stepOrder: 1, title: "Open", instruction: "Tear open one 10g pack." },
    { productId: dayModeId, locale: "en", stepOrder: 2, title: "Mix", instruction: "Stir the powder into 200-250ml of water." },
    { productId: dayModeId, locale: "en", stepOrder: 3, title: "Drink", instruction: "Drink before or with your main meal." },
    { productId: dayModeId, locale: "zh-HK", stepOrder: 1, title: "撕開", instruction: "撕開一包10g裝。" },
    { productId: dayModeId, locale: "zh-HK", stepOrder: 2, title: "沖調", instruction: "將粉末加入200-250ml水度攪勻。" },
    { productId: dayModeId, locale: "zh-HK", stepOrder: 3, title: "飲用", instruction: "餐前或者隨主要一餐一齊飲用。" },
    // P03 — REST & SLEEP MODE™ (30-60 min before bed)
    { productId: restSleepModeId, locale: "en", stepOrder: 1, title: "Open", instruction: "Tear open one 10g pack, 30-60 minutes before bed." },
    { productId: restSleepModeId, locale: "en", stepOrder: 2, title: "Mix", instruction: "Stir the powder into 200-250ml of water." },
    { productId: restSleepModeId, locale: "en", stepOrder: 3, title: "Drink & wind down", instruction: "Drink, then begin winding down for the night." },
    { productId: restSleepModeId, locale: "zh-HK", stepOrder: 1, title: "撕開", instruction: "瞓覺前30-60分鐘，撕開一包10g裝。" },
    { productId: restSleepModeId, locale: "zh-HK", stepOrder: 2, title: "沖調", instruction: "將粉末加入200-250ml水度攪勻。" },
    { productId: restSleepModeId, locale: "zh-HK", stepOrder: 3, title: "飲用同放鬆", instruction: "飲用之後，開始放鬆準備瞓覺。" },
  ];

  for (const row of rows) {
    await prisma.productProtocolStep.upsert({
      where: { productId_locale_stepOrder: { productId: row.productId, locale: row.locale, stepOrder: row.stepOrder } },
      update: { title: row.title, instruction: row.instruction },
      create: row,
    });
  }
}

async function seedContentLibrary() {
  const items: {
    code: string;
    category: "UNDERSTAND" | "LEARN" | "USE" | "EXPLORE";
    locale: "en" | "zh-HK";
    title: string;
    bodyMarkdown: string;
  }[] = [
    {
      code: "CONTENT_UNDERSTAND_SLEEP_QUALITY",
      category: "UNDERSTAND",
      locale: "en",
      title: "Sleep quality vs. sleep quantity",
      bodyMarkdown:
        "8 hours in bed isn't the same as 8 hours of good sleep. Quality is about how much of that time is spent in deep, uninterrupted sleep — frequent waking, even brief ones you don't remember, can leave you tired even after a full night. That's why Asclepios Sleep tracks how you feel and how often you wake, not just how long you slept.",
    },
    {
      code: "CONTENT_UNDERSTAND_SLEEP_QUALITY",
      category: "UNDERSTAND",
      locale: "zh-HK",
      title: "瞓覺質素 vs. 瞓覺時間",
      bodyMarkdown:
        "瞓咗8個鐘唔代表瞓得好。瞓覺質素講嘅係呢8個鐘入面,有幾多時間係深層、冇被打斷嘅瞓眠——就算係好短、你自己都唔記得嘅夜醒,都可以令你第二朝仍然覺得攰。所以Asclepios Sleep除咗記錄瞓覺時間,仲會追蹤你嘅感覺同夜醒次數。",
    },
    {
      code: "CONTENT_UNDERSTAND_SLEEP_PRESSURE",
      category: "UNDERSTAND",
      locale: "en",
      title: "How your body 'saves up' the urge to sleep",
      bodyMarkdown:
        "The longer you're awake, the stronger your body's drive to sleep gets — this builds up through the day and is one reason naps late in the day can make it harder to fall asleep at night. A steady wind-down routine and a consistent bedtime help this natural pressure work with you instead of against you.",
    },
    {
      code: "CONTENT_UNDERSTAND_SLEEP_PRESSURE",
      category: "UNDERSTAND",
      locale: "zh-HK",
      title: "身體點樣『儲』瞓意",
      bodyMarkdown:
        "你醒得越耐,身體想瞓嘅『壓力』就越大——呢個係成日累積落嚟嘅,亦都係點解夜晚遲小睡會令你夜晚更難瞓著嘅其中一個原因。穩定嘅放鬆程序同固定嘅瞓覺時間,可以幫呢種自然嘅『瞓意』幫返自己,而唔係阻住自己。",
    },
    {
      code: "CONTENT_LEARN_478_BREATHING",
      category: "LEARN",
      locale: "en",
      title: "The 4-7-8 breathing technique",
      bodyMarkdown:
        "Breathe in quietly through your nose for 4 seconds, hold for 7 seconds, then exhale slowly through your mouth for 8 seconds. Repeat 3-4 times. This longer exhale is thought to help activate your body's relaxation response — try it as part of your wind-down before you start tonight's sleep track.",
    },
    {
      code: "CONTENT_LEARN_478_BREATHING",
      category: "LEARN",
      locale: "zh-HK",
      title: "4-7-8 呼吸法",
      bodyMarkdown:
        "用鼻慢慢吸氣4秒,閂住氣7秒,再用口慢慢呼氣8秒,重複3-4次。呼氣時間拉長,有助啟動身體嘅放鬆反應——可以喺開始今晚嘅瞓覺聲音之前,做呢個做為放鬆程序嘅一部分。",
    },
    {
      code: "CONTENT_LEARN_WINDDOWN_ROUTINE",
      category: "LEARN",
      locale: "en",
      title: "Building a wind-down routine",
      bodyMarkdown:
        "A wind-down routine is a short, repeatable sequence — dim the lights, put the phone away, breathe, then start your sleep sound — that signals to your body it's time to slow down. Keep it under 15 minutes and do it in the same order most nights; the repetition itself is what makes it effective, more than any single step.",
    },
    {
      code: "CONTENT_LEARN_WINDDOWN_ROUTINE",
      category: "LEARN",
      locale: "zh-HK",
      title: "點樣建立瞓覺前嘅『落閘』程序",
      bodyMarkdown:
        "『落閘』程序係一個短、可以重複做嘅步驟——調暗燈光、放低手機、深呼吸、再開始瞓覺聲音——用嚟提示身體係時候慢落嚟。盡量控制喺15分鐘之內,而且大部分晚上都用返同一個次序;呢個重複本身,先係令佢有效嘅關鍵,多過任何單一個步驟。",
    },
    {
      code: "CONTENT_USE_SOUND_TRACKS",
      category: "USE",
      locale: "en",
      title: "Getting the most out of tonight's sound",
      bodyMarkdown:
        "On the Tonight screen, pick a sound and a duration before you tap Start Sleep — Pink and Brown Noise are steadier and better for masking background noise, while the 432Hz/528Hz tracks blend a soft tone with noise. In the Sleep Player you can adjust volume or pause anytime, and the sound fades out automatically near the end rather than cutting off abruptly.",
    },
    {
      code: "CONTENT_USE_SOUND_TRACKS",
      category: "USE",
      locale: "zh-HK",
      title: "點樣用好今晚嘅瞓覺聲音",
      bodyMarkdown:
        "喺「今晚計劃」page,撳「開始瞓覺」之前可以揀聲音同時長——粉紅噪音同棕色噪音比較穩定,適合遮蓋背景聲音;432Hz/528Hz就係音調加噪音嘅組合。喺Sleep Player入面隨時都可以調音量或者暫停,聲音去到尾段會自動淡出,唔會突然停晒。",
    },
    {
      code: "CONTENT_USE_WALLPAPER_THEME",
      category: "USE",
      locale: "en",
      title: "Choosing your wallpaper and theme colour",
      bodyMarkdown:
        "Your wallpaper and accent colour are personal, not functional — pick whatever feels calming to look at last thing at night. You can change either anytime from Settings, and the app remembers your choice across every screen, day and night mode alike.",
    },
    {
      code: "CONTENT_USE_WALLPAPER_THEME",
      category: "USE",
      locale: "zh-HK",
      title: "點樣揀啱自己嘅Wallpaper同主題色",
      bodyMarkdown:
        "Wallpaper同主題色純粹係個人喜好,唔會影響功能——揀一個瞓覺前睇落舒服嘅就得。隨時都可以喺「設定」度改,App會記住你嘅揀選,喺日間夜晚模式同所有畫面都一致。",
    },
    {
      code: "CONTENT_EXPLORE_CAFFEINE",
      category: "EXPLORE",
      locale: "en",
      title: "How long caffeine stays in your system",
      bodyMarkdown:
        "Caffeine has a half-life of roughly 5-6 hours in most adults — meaning half of what you drank is still in your system that long after. An afternoon coffee can still be affecting your ability to fall asleep well into the evening. If you're having trouble winding down, an earlier cut-off time is often the easiest thing to try first.",
    },
    {
      code: "CONTENT_EXPLORE_CAFFEINE",
      category: "EXPLORE",
      locale: "zh-HK",
      title: "咖啡因喺體內可以停留幾耐",
      bodyMarkdown:
        "大部分成年人嘅咖啡因半衰期大約係5-6個鐘——即係話你飲落嘅咖啡因,過咗咁耐都仲有一半留喺體內。下午飲嘅咖啡,好可能夜晚都仲影響緊你入睡。如果你發覺自己好難靜落嚟,提早戒咖啡因嘅時間,通常係最容易試嘅第一步。",
    },
    {
      code: "CONTENT_EXPLORE_BLUE_LIGHT",
      category: "EXPLORE",
      locale: "en",
      title: "Blue light and your sleep",
      bodyMarkdown:
        "Screens emit more blue-wavelength light than warm room lighting, and that wavelength is especially good at telling your brain it's still daytime. Dimming your phone, switching to a night mode, or just putting screens away 30-60 minutes before your wind-down routine can make it easier to feel sleepy on schedule.",
    },
    {
      code: "CONTENT_EXPLORE_BLUE_LIGHT",
      category: "EXPLORE",
      locale: "zh-HK",
      title: "藍光同瞓覺嘅關係",
      bodyMarkdown:
        "螢幕發出嘅藍光波長,比暖色燈光多,而呢種波長特別容易令大腦以為仲係日頭。喺開始『落閘』程序前30-60分鐘,調暗手機、開夜間模式,或者索性放低螢幕,都可以幫你更加準時感覺到瞓意。",
    },
  ];

  for (const item of items) {
    const uniqueCode = `${item.code}_${item.locale}`;
    await prisma.contentItem.upsert({
      where: { code: uniqueCode },
      update: {},
      create: {
        code: uniqueCode,
        type: "ARTICLE",
        title: item.title,
        locale: item.locale,
        url: null,
        active: true,
        layer: "PUBLIC",
        category: item.category,
        bodyMarkdown: item.bodyMarkdown,
      },
    });
  }

  await seedTonightGuidance();
}

// Fix #5.6 (5 Sep 2026) — the 7 recurring day themes both programmes are
// built from. A 30-day programme isn't 30 hand-authored days; it cycles
// through the same themed journey ~4.3 times, which is a defensible V1
// MVP per this track's own "best-guess MVP, placeholder/generic copy where
// no specific content exists yet" instruction. contentItemCode reuses base
// ContentItem codes already seeded above (by seedContentLibrary) or by
// seedTonightGuidance below — resolved to a locale row at read time by
// GET /programmes/:code, same `<code>_<locale>` + en-fallback convention
// GET /tonight already uses for step guidance.
const PROGRAMME_DAY_CYCLE: { theme: ProgrammeDayTheme; contentItemCode: string }[] = [
  { theme: "WINDDOWN_CONSISTENCY", contentItemCode: "CONTENT_LEARN_WINDDOWN_ROUTINE" },
  { theme: "BREATHING_BEFORE_BED", contentItemCode: "CONTENT_LEARN_478_BREATHING" },
  { theme: "PRODUCT_ROUTINE", contentItemCode: "TONIGHT_GUIDE_PRODUCT" },
  { theme: "CAFFEINE_CUTOFF", contentItemCode: "CONTENT_EXPLORE_CAFFEINE" },
  { theme: "SCREEN_WINDDOWN", contentItemCode: "CONTENT_EXPLORE_BLUE_LIGHT" },
  { theme: "CONSISTENT_WAKE", contentItemCode: "CONTENT_UNDERSTAND_SLEEP_PRESSURE" },
  { theme: "REFLECT_NOTICE", contentItemCode: "CONTENT_UNDERSTAND_SLEEP_QUALITY" },
];

async function seedProgrammeDays(programmeId: string, lengthDays: number) {
  for (let dayNumber = 1; dayNumber <= lengthDays; dayNumber++) {
    const { theme, contentItemCode } = PROGRAMME_DAY_CYCLE[(dayNumber - 1) % PROGRAMME_DAY_CYCLE.length];
    await prisma.programmeDay.upsert({
      where: { programmeId_dayNumber: { programmeId, dayNumber } },
      update: { themeCode: theme, contentItemCode },
      create: { programmeId, dayNumber, themeCode: theme, contentItemCode },
    });
  }
}

/**
 * Fix #5.4 (5 Sep 2026) — Tonight steps previously had no what/why copy at
 * all (PRODUCT steps only had an optional "how" via ProductProtocolStep).
 * Rather than inventing a new content mechanism, this reuses the existing
 * ContentItem table with the same `<code>_<locale>` convention
 * seedContentLibrary already uses — so a future text/video/audio lesson can
 * replace a row here (by changing `type`/`url`) without any schema or route
 * change. `category` is intentionally null: these rows aren't part of the
 * Sleep Answer Library's UNDERSTAND/LEARN/USE/EXPLORE taxonomy — they're
 * read directly by GET /tonight via a `TONIGHT_GUIDE_<stepCode>` code
 * lookup, not surfaced through /content.
 */
async function seedTonightGuidance() {
  const items: { code: string; locale: "en" | "zh-HK"; title: string; bodyMarkdown: string }[] = [
    {
      code: "TONIGHT_GUIDE_PRODUCT",
      locale: "en",
      title: "Why this step is here",
      bodyMarkdown:
        "Using your product at the same point in your routine every night is what helps it work — skipping it breaks the pattern your body is starting to learn. Tap \"View steps\" above for tonight's exact how-to.",
    },
    {
      code: "TONIGHT_GUIDE_PRODUCT",
      locale: "zh-HK",
      title: "點解會有呢個步驟",
      bodyMarkdown: "每晚喺程序入面同一個位用返你嘅產品,先可以幫到效果——唔跟就會打亂身體已經開始習慣嘅節奏。撳返上面「睇用法步驟」睇今晚實際點做。",
    },
    {
      code: "TONIGHT_GUIDE_BREATHING",
      locale: "en",
      title: "A short breathing exercise",
      bodyMarkdown:
        "Racing thoughts before bed are common — breathing out for longer than you breathe in signals your nervous system to calm down. Try 4-7-8: breathe in for 4 seconds, hold for 7, exhale slowly for 8, and repeat 3-4 times before you start tonight's sound.",
    },
    {
      code: "TONIGHT_GUIDE_BREATHING",
      locale: "zh-HK",
      title: "簡單呼吸練習",
      bodyMarkdown: "瞓覺前腦入面諗嘢多好正常——呼氣拉長過吸氣,可以提示神經系統慢慢靜落嚟。試下4-7-8:吸氣4秒,閂氣7秒,慢慢呼氣8秒,重複3-4次先開始今晚嘅聲音。",
    },
    {
      code: "TONIGHT_GUIDE_MUSIC",
      locale: "en",
      title: "Picking tonight's sound",
      bodyMarkdown:
        "A steady sound can mask background noise and give your mind something calm to settle into. Noise (Pink/Brown/White) works well if your room isn't quiet; gentler ambient tracks suit an already-quiet space.",
    },
    {
      code: "TONIGHT_GUIDE_MUSIC",
      locale: "zh-HK",
      title: "點揀今晚嘅聲音",
      bodyMarkdown: "穩定嘅聲音可以遮蓋背景噪音,俾個心靜落嚟。房間唔夠靜就啱用噪音類(粉紅/棕色/白噪音);本身已經好靜就啱用溫和啲嘅背景音樂。",
    },
  ];

  for (const item of items) {
    const uniqueCode = `${item.code}_${item.locale}`;
    await prisma.contentItem.upsert({
      where: { code: uniqueCode },
      update: {},
      create: {
        code: uniqueCode,
        type: "ARTICLE",
        title: item.title,
        locale: item.locale,
        url: null,
        active: true,
        layer: "PUBLIC",
        category: null,
        bodyMarkdown: item.bodyMarkdown,
      },
    });
  }
}

async function wipeUserTransactionalData(userId: string) {
  await prisma.morningCheckin.deleteMany({ where: { userId } });
  await prisma.productUsageLog.deleteMany({ where: { userId } });
  await prisma.routineStepLog.deleteMany({ where: { userId } });
  await prisma.plannedAction.deleteMany({ where: { userId } });
  await prisma.sleepSession.deleteMany({ where: { userId } });
  await prisma.assessmentAnswer.deleteMany({ where: { assessment: { userId } } });
  await prisma.assessment.deleteMany({ where: { userId } });
  await prisma.tagScore.deleteMany({ where: { userId } });
  await prisma.coreProfileSnapshot.deleteMany({ where: { userId } });
  await prisma.reviewSnapshot.deleteMany({ where: { userId } });
  await prisma.entitlement.deleteMany({ where: { userId, grantedVia: "DEMO_SEED" } });
  await prisma.productOwnership.deleteMany({ where: { userId, acquiredVia: "DEMO_SEED" } });
}

async function seedNights(userId: string, productId: string | null, doneNights: number, ratings: number[]) {
  for (let i = 0; i < 7; i++) {
    const dayOffset = 7 - i;
    const windDown = new Date(Date.now() - dayOffset * 24 * 3600 * 1000);
    const plannedDate = windDown.toISOString().slice(0, 10);
    const session = await prisma.sleepSession.create({
      data: { userId, windDownStart: windDown, sleepAudioDurationMode: "FIXED", sleepAudioDurationSeconds: 3600, status: "ENDED" },
    });
    const status = i < doneNights ? "DONE" : "SKIPPED";
    if (productId) {
      await prisma.productUsageLog.create({ data: { userId, productId, sessionId: session.id, status, loggedAt: windDown } });
      await prisma.plannedAction.create({
        data: { userId, stepCode: "PRODUCT", stepKey: `PRODUCT:${productId}`, productId, sessionId: session.id, plannedDate, status, completedAt: windDown },
      });
    }
    await prisma.routineStepLog.create({ data: { userId, sessionId: session.id, stepCode: "MUSIC", status: "DONE", loggedAt: windDown } });
    await prisma.plannedAction.create({
      data: { userId, stepCode: "MUSIC", stepKey: "MUSIC", sessionId: session.id, plannedDate, status: "DONE", completedAt: windDown },
    });
    await prisma.morningCheckin.create({
      data: {
        userId,
        sessionId: session.id,
        sleepRating: ratings[i] ?? 3,
        nightWakingCount: "1",
        morningEnergy: ratings[i] >= 4 ? "GOOD" : ratings[i] === 3 ? "AVERAGE" : "POOR",
        submittedAt: windDown,
      },
    });
  }
}

export async function reseedDemoUser(email: string) {
  const account = DEMO_ACCOUNTS.find((a) => a.email === email);
  if (!account) throw new Error("not_a_demo_account");

  const { p01, p02, p03 } = await seedBaseConfig();

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, isDemo: true, demoScenario: account.label } });
    await prisma.authIdentity.create({ data: { userId: user.id, provider: "PASSWORD" } });
  }
  await wipeUserTransactionalData(user.id);

  const ensureMembership = async (tier: "FREE" | "PREMIUM" | "DEMO") => {
    await prisma.membership.deleteMany({ where: { userId: user!.id } });
    await prisma.membership.create({ data: { userId: user!.id, tier } });
  };

  switch (email) {
    case "demo.new@asclepios.test":
      await ensureMembership("FREE");
      break;

    case "demo.standard@asclepios.test":
      await ensureMembership("FREE");
      await seedNights(user.id, null, 5, [3, 3, 4, 4, 3, 4, 4]);
      break;

    case "demo.product@asclepios.test":
      await ensureMembership("FREE");
      await prisma.productOwnership.create({ data: { userId: user.id, productId: p01.id, acquiredVia: "DEMO_SEED" } });
      await seedNights(user.id, p01.id, 5, [3, 4, 4, 4, 4, 4, 5]);
      break;

    case "demo.multi@asclepios.test":
      await ensureMembership("PREMIUM");
      for (const p of [p01, p02, p03]) {
        await prisma.productOwnership.create({ data: { userId: user.id, productId: p.id, acquiredVia: "DEMO_SEED" } });
      }
      await seedNights(user.id, p01.id, 6, [4, 4, 4, 5, 4, 5, 5]);
      break;

    case "demo.lowadherence@asclepios.test":
      // REST & SLEEP MODE™ (p03) is the pre-bed product — a natural fit for
      // a "keeps skipping it" scenario. p02/DAY MODE™ is a daytime,
      // before-meal supplement and isn't tracked through the nightly
      // ProductUsageLog model, so it never belongs in seedNights().
      await ensureMembership("FREE");
      await prisma.productOwnership.create({ data: { userId: user.id, productId: p03.id, acquiredVia: "DEMO_SEED" } });
      await seedNights(user.id, p03.id, 2, [3, 3, 2, 3, 3, 3, 3]);
      break;

    case "demo.poorresponse@asclepios.test":
      await ensureMembership("FREE");
      await prisma.productOwnership.create({ data: { userId: user.id, productId: p01.id, acquiredVia: "DEMO_SEED" } });
      await seedNights(user.id, p01.id, 7, [2, 2, 3, 2, 2, 3, 2]);
      break;

    case "demo.premium@asclepios.test":
      // Whole-site audit (6 Sep 2026) — this used to enrol into
      // PRG_28DAY_CORE, a leftover generic programme that Fix #5.6's guided
      // journey never carried i18n copy for and GET /programmes excludes
      // from the browse list (see the comment above PRG_28DAY_CORE's own
      // seed below). The enrollment row silently existed but could never
      // render — no ProgrammeDay content, no `programme.PRG_28DAY_CORE.*`
      // translations, and invisible in the Programmes UI, while the demo
      // picker's tooltip (DEMO_ACCOUNTS in packages/shared) still promised
      // "28-day programme". Repointed at the real, supported 30-Day Sleep
      // Reset instead. `startedAt` (not the otherwise-unread `currentDay`
      // column — GET /:code derives the displayed day from `startedAt` via
      // computeProgrammeDayState, see programmeContinuity.ts) is backdated
      // 8 days so the demo actually lands mid-programme, matching the
      // "Day 9" scenario this account has always been meant to show.
      await ensureMembership("PREMIUM");
      await grantEntitlement(user.id, "PROGRAMME_30DAY_RESET", "DEMO_SEED");
      await grantEntitlement(user.id, "media.premium_audio", "DEMO_SEED");
      await prisma.programmeEnrollment.deleteMany({ where: { userId: user.id } });
      const prg = await prisma.programme.findUniqueOrThrow({ where: { code: "PRG_30DAY_RESET" } });
      await prisma.programmeEnrollment.create({
        data: { userId: user.id, programmeId: prg.id, startedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000) },
      });
      await seedNights(user.id, p03.id, 6, [4, 4, 5, 4, 5, 5, 5]);
      break;

    case "demo.travel@asclepios.test":
      await ensureMembership("FREE");
      await prisma.user.update({ where: { id: user.id }, data: { timezone: "Europe/London" } });
      await seedNights(user.id, null, 4, [3, 4, 2, 3, 4, 3, 4]);
      break;

    case "demo.admin@asclepios.test":
      await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      await ensureMembership("DEMO");
      break;
  }

  return prisma.user.findUniqueOrThrow({ where: { id: user.id } });
}

export async function seedAllDemoAccounts() {
  await seedBaseConfig();
  for (const account of DEMO_ACCOUNTS) {
    await reseedDemoUser(account.email);
  }
}
