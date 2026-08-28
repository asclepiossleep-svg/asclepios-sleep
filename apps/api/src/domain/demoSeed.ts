import { prisma } from "../db";
import { grantEntitlement } from "./entitlement";
import { DEMO_ACCOUNTS } from "@asclepios/shared";

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

  await prisma.routineStepDef.upsert({ where: { code: "STEP_PRODUCT" }, update: {}, create: { code: "STEP_PRODUCT", label: "Use tonight's product", category: "PRODUCT", defaultOrder: 1 } });
  await prisma.routineStepDef.upsert({ where: { code: "STEP_BREATHING" }, update: {}, create: { code: "STEP_BREATHING", label: "1-minute breathing", category: "BREATHING", defaultOrder: 2 } });
  await prisma.routineStepDef.upsert({ where: { code: "STEP_STRETCH" }, update: {}, create: { code: "STEP_STRETCH", label: "Gentle stretch", category: "STRETCH", defaultOrder: 3 } });
  await prisma.routineStepDef.upsert({ where: { code: "STEP_MUSIC" }, update: {}, create: { code: "STEP_MUSIC", label: "Start sleep music", category: "MUSIC", defaultOrder: 4 } });

  await prisma.audioTrack.upsert({ where: { code: "AUD_MOON_LAKE_01" }, update: {}, create: { code: "AUD_MOON_LAKE_01", title: "Moon Lake", category: "WATER", durationSeconds: 3600 } });
  await prisma.audioTrack.upsert({ where: { code: "AUD_SOFT_PIANO" }, update: {}, create: { code: "AUD_SOFT_PIANO", title: "Soft Piano Morning", category: "CLASSICAL", durationSeconds: 600, isPremium: true } });
  await prisma.audioTrack.upsert({ where: { code: "WAKE_COUNTRYSIDE_02" }, update: {}, create: { code: "WAKE_COUNTRYSIDE_02", title: "Birds & Countryside", category: "NATURE", durationSeconds: 600 } });

  await prisma.wallpaper.upsert({ where: { code: "WALL_MOON_LAKE_04" }, update: {}, create: { code: "WALL_MOON_LAKE_04", title: "Moon Lake", category: "WATER", themeColor: "#2b3a55" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_JAPANESE_CALM_01" }, update: {}, create: { code: "WALL_JAPANESE_CALM_01", title: "Japanese Calm", category: "JAPANESE_CALM", themeColor: "#3c4a3e" } });
  // Master Kick-off V1 Phase 3/§26 — 3 categories added on top of the
  // original 7. See packages/shared WALLPAPER_CATEGORIES for the full list.
  await prisma.wallpaper.upsert({ where: { code: "WALL_SUNRISE_01" }, update: {}, create: { code: "WALL_SUNRISE_01", title: "Slow Sunrise", category: "SUNRISE", themeColor: "#e8a15c" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_MIST_MOUNTAINS_01" }, update: {}, create: { code: "WALL_MIST_MOUNTAINS_01", title: "Misty Peaks", category: "MIST_MOUNTAINS", themeColor: "#7c8a94" } });
  await prisma.wallpaper.upsert({ where: { code: "WALL_STARRY_SKY_01" }, update: {}, create: { code: "WALL_STARRY_SKY_01", title: "Starry Sky", category: "STARRY_SKY", themeColor: "#141a33" } });

  await prisma.programme.upsert({ where: { code: "PRG_28DAY_CORE" }, update: {}, create: { code: "PRG_28DAY_CORE", name: "28-Day Sleep Reset", lengthDays: 28, reviewFrequencyDays: 7 } });

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

async function wipeUserTransactionalData(userId: string) {
  await prisma.morningCheckin.deleteMany({ where: { userId } });
  await prisma.productUsageLog.deleteMany({ where: { userId } });
  await prisma.routineStepLog.deleteMany({ where: { userId } });
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
    const session = await prisma.sleepSession.create({
      data: { userId, windDownStart: windDown, sleepAudioDurationMode: "FIXED", sleepAudioDurationSeconds: 3600, status: "ENDED" },
    });
    const status = i < doneNights ? "DONE" : "SKIPPED";
    if (productId) {
      await prisma.productUsageLog.create({ data: { userId, productId, sessionId: session.id, status, loggedAt: windDown } });
    }
    await prisma.routineStepLog.create({ data: { userId, sessionId: session.id, stepCode: "MUSIC", status: "DONE", loggedAt: windDown } });
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
      await ensureMembership("PREMIUM");
      await grantEntitlement(user.id, "programme.28day", "DEMO_SEED");
      await grantEntitlement(user.id, "media.premium_audio", "DEMO_SEED");
      await prisma.programmeEnrollment.deleteMany({ where: { userId: user.id } });
      const prg = await prisma.programme.findUniqueOrThrow({ where: { code: "PRG_28DAY_CORE" } });
      await prisma.programmeEnrollment.create({ data: { userId: user.id, programmeId: prg.id, currentDay: 9 } });
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
