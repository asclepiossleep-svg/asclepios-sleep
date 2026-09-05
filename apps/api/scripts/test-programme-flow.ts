/**
 * Fix #5.6 audit follow-up (5 Sep 2026) — a deterministic, real-HTTP
 * end-to-end test of the Programme guided-journey flow, per the audit's
 * repeated instruction not to declare this track "audit-clean" from a
 * TypeScript build alone. No browser tooling is available in this runner,
 * so this boots the actual Express app (`createApp()` — the same app both
 * `npm run dev` and the Vercel handler use) against a disposable SQLite
 * database and drives it over real HTTP with `fetch`, the same way a real
 * client would.
 *
 * Covers, in order: Programme browse state (goals/improvement areas
 * present and translated in en/zh-HK/zh-CN — checked against the actual
 * i18n JSON files, not a restatement of them), enroll, Day 1 theme/why/how
 * + linked content, Done/Skip surviving a simulated reload, the
 * KEEP/REMOVE/ADJUST review's real consequence on Tonight (REMOVE actually
 * removing a step, KEEP reversing it, ADJUST's note appearing), the review
 * not re-triggering immediately after submission but firing again once the
 * cadence is due, programme completion + the 7-night -> 30-day
 * continuation enrol, and a regression smoke check on other endpoints
 * touched by Fix #5 (Wallpaper, Music Library, Preferences, Tonight).
 *
 * Run with: npm run test:programme-flow (from apps/api).
 */
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const API_ROOT = path.join(__dirname, "..");
const dbFile = path.join(API_ROOT, `.test-programme-flow-${Date.now()}.db`);
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-programme-flow-secret";
process.env.DEMO_DISABLED = "true"; // this harness drives auth directly, not via /demo

// Push the real schema.prisma model set onto a fresh, disposable SQLite
// file before anything below opens a PrismaClient against it. There are no
// committed migrations for the SQLite dev schema (see README's db:migrate),
// so `db push` is the correct dev-parity way to materialise it.
execSync(`npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss`, {
  cwd: API_ROOT,
  stdio: "inherit",
  env: process.env,
});

/* eslint-disable @typescript-eslint/no-var-requires */
async function main() {
  const { createApp } = await import("../src/app");
  const { prisma } = await import("../src/db");
  const { signSession } = await import("../src/middleware/auth");
  const { seedBaseConfig } = await import("../src/domain/demoSeed");

  let pass = 0;
  let fail = 0;
  function check(name: string, cond: boolean) {
    if (cond) {
      pass++;
      console.log(`  ok  ${name}`);
    } else {
      fail++;
      console.error(`FAIL  ${name}`);
    }
  }

  const en = JSON.parse(fs.readFileSync(path.join(API_ROOT, "../web/src/i18n/en.json"), "utf8"));
  const zhHK = JSON.parse(fs.readFileSync(path.join(API_ROOT, "../web/src/i18n/zh-HK.json"), "utf8"));
  const zhCN = JSON.parse(fs.readFileSync(path.join(API_ROOT, "../web/src/i18n/zh-CN.json"), "utf8"));
  function checkTranslated(key: string) {
    check(`i18n has "${key}" in en/zh-HK/zh-CN`, key in en && key in zhHK && key in zhCN);
  }

  await seedBaseConfig();

  const products = await prisma.product.findMany({ where: { active: true }, take: 1 });
  if (products.length === 0) throw new Error("seedBaseConfig() produced no active products — cannot continue");
  const product = products[0];

  const user = await prisma.user.create({ data: { email: "test-programme-flow@asclepios.test" } });
  await prisma.productOwnership.create({ data: { userId: user.id, productId: product.id, acquiredVia: "DEMO_SEED" } });
  await prisma.tagScore.create({ data: { userId: user.id, tag: "RACING_THOUGHTS", severity: 3, source: "CURRENT_STATE" } });
  // Level 2 (maxSteps=3) so Tonight has room for PRODUCT + BREATHING + MUSIC
  // together — needed to exercise all three reviewable step types below.
  await prisma.reviewSnapshot.create({
    data: {
      userId: user.id,
      type: "SEVEN_DAY",
      periodStart: new Date(Date.now() - 7 * 86400000),
      periodEnd: new Date(),
      findingsJson: JSON.stringify({ adherence: { level: "HIGH" } }),
      actionCode: "CONTINUE",
    },
  });

  const token = signSession(user.id, "MEMBER");
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  async function api(method: string, urlPath: string, body?: unknown) {
    const r = await fetch(`${base}${urlPath}`, {
      method,
      headers: authHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await r.json().catch(() => null);
    return { status: r.status, json };
  }

  try {
    // --- 1. Browse state (not enrolled) -----------------------------------
    const list = await api("GET", "/programmes");
    check("GET /programmes returns 200", list.status === 200);
    const quickstart = list.json.programmes.find((p: any) => p.code === "PRG_7NIGHT_QUICKSTART");
    check("7-Night Quick Start present, not enrolled", !!quickstart && quickstart.enrolled === false);
    check("goals present", Array.isArray(quickstart.goals) && quickstart.goals.length > 0);
    check("improvementAreas present", Array.isArray(quickstart.improvementAreas) && quickstart.improvementAreas.length > 0);
    checkTranslated("programme.PRG_7NIGHT_QUICKSTART.name");
    checkTranslated("programme.PRG_7NIGHT_QUICKSTART.description");
    checkTranslated("programme.PRG_7NIGHT_QUICKSTART.whoFor");
    for (const g of quickstart.goals) checkTranslated(`programme.goal.${g}`);
    for (const tg of quickstart.improvementAreas) checkTranslated(`tag.${tg}`);

    const detailBrowse = await api("GET", "/programmes/PRG_7NIGHT_QUICKSTART?locale=en");
    check("GET /programmes/:code (not enrolled) returns enrolled:false", detailBrowse.json.enrolled === false);

    // --- 2. Enrol -----------------------------------------------------------
    const enroll = await api("POST", "/programmes/PRG_7NIGHT_QUICKSTART/enroll", {});
    check("enroll succeeds", enroll.status === 200 && enroll.json.enrolled === true);

    // --- 3. Day 1 theme/why/how + linked content ----------------------------
    let detail = (await api("GET", "/programmes/PRG_7NIGHT_QUICKSTART?locale=en")).json;
    check("enrolled, currentDay 1", detail.enrolled === true && detail.currentDay === 1);
    check("today present with a theme", !!detail.today && typeof detail.today.themeCode === "string");
    checkTranslated(`programme.day.${detail.today.themeCode}.title`);
    checkTranslated(`programme.day.${detail.today.themeCode}.why`);
    checkTranslated(`programme.day.${detail.today.themeCode}.how`);
    check("today has linked content", !!detail.today.content && !!detail.today.content.bodyMarkdown);
    check("review not due on day 1", detail.reviewDue === false);
    check("no step preferences in effect yet", Object.keys(detail.currentStepPreferences).length === 0);

    // --- 4. Done/Skip survive a simulated reload -----------------------------
    await api("POST", "/programmes/PRG_7NIGHT_QUICKSTART/day/1/log", { status: "DONE" });
    detail = (await api("GET", "/programmes/PRG_7NIGHT_QUICKSTART?locale=en")).json; // simulated reload
    check("Day 1 DONE survives reload", detail.today.status === "DONE");
    check("progress reflects 1 done", detail.progress.done === 1);

    await api("POST", "/programmes/PRG_7NIGHT_QUICKSTART/day/1/log", { status: "SKIPPED" });
    detail = (await api("GET", "/programmes/PRG_7NIGHT_QUICKSTART?locale=en")).json; // simulated reload
    check("Day 1 SKIPPED survives reload (overwrites DONE)", detail.today.status === "SKIPPED");
    check("progress reflects 0 done after switching to SKIPPED", detail.progress.done === 0);

    // --- 5. Tonight before any review: PRODUCT + BREATHING + MUSIC all present
    let tonight = (await api("GET", "/tonight?locale=en")).json;
    const codesBefore = tonight.steps.map((s: any) => s.stepCode).sort();
    check("Tonight shows PRODUCT+BREATHING+MUSIC before any review", JSON.stringify(codesBefore) === JSON.stringify(["BREATHING", "MUSIC", "PRODUCT"]));
    check("no paused steps before any review", (tonight.pausedStepCodes ?? []).length === 0);

    // --- 6. Submit review: REMOVE MUSIC, ADJUST BREATHING, KEEP PRODUCT ------
    const review1 = await api("POST", "/programmes/PRG_7NIGHT_QUICKSTART/review", {
      decisions: [
        { stepCode: "MUSIC", decision: "REMOVE" },
        { stepCode: "BREATHING", decision: "ADJUST", note: "Try box breathing instead" },
        { stepCode: "PRODUCT", decision: "KEEP" },
      ],
    });
    check("review submission succeeds", review1.status === 200 && review1.json.reviewed === 3);

    detail = (await api("GET", "/programmes/PRG_7NIGHT_QUICKSTART?locale=en")).json;
    check("review not due immediately after submitting", detail.reviewDue === false);
    check("currentStepPreferences reflects MUSIC:REMOVE", detail.currentStepPreferences.MUSIC?.decision === "REMOVE");
    check("currentStepPreferences reflects BREATHING:ADJUST", detail.currentStepPreferences.BREATHING?.decision === "ADJUST");
    check("currentStepPreferences reflects PRODUCT:KEEP", detail.currentStepPreferences.PRODUCT?.decision === "KEEP");

    // --- 7. Tonight reflects the real consequence ----------------------------
    tonight = (await api("GET", "/tonight?locale=en")).json;
    const codesAfterRemove = tonight.steps.map((s: any) => s.stepCode).sort();
    check("MUSIC actually removed from Tonight", !codesAfterRemove.includes("MUSIC"));
    check("PRODUCT and BREATHING still present", codesAfterRemove.includes("PRODUCT") && codesAfterRemove.includes("BREATHING"));
    check("MUSIC reported as paused (it would otherwise have appeared)", (tonight.pausedStepCodes ?? []).includes("MUSIC"));
    const breathingStep = tonight.steps.find((s: any) => s.stepCode === "BREATHING");
    check("BREATHING carries the ADJUST note", breathingStep?.adjustmentNote === "Try box breathing instead");

    // --- 8. KEEP reverses a prior REMOVE -------------------------------------
    await api("POST", "/programmes/PRG_7NIGHT_QUICKSTART/review", { decisions: [{ stepCode: "MUSIC", decision: "KEEP" }] });
    tonight = (await api("GET", "/tonight?locale=en")).json;
    check("KEEP restores MUSIC to Tonight", tonight.steps.some((s: any) => s.stepCode === "MUSIC"));
    check("no paused steps after reversing REMOVE", (tonight.pausedStepCodes ?? []).length === 0);

    // --- 9. Review cadence fires again once due ------------------------------
    const enrollmentRow = await prisma.programmeEnrollment.findFirstOrThrow({ where: { userId: user.id, programme: { code: "PRG_7NIGHT_QUICKSTART" } } });
    await prisma.programmeEnrollment.update({ where: { id: enrollmentRow.id }, data: { lastReviewedAt: new Date(Date.now() - 8 * 86400000) } });
    detail = (await api("GET", "/programmes/PRG_7NIGHT_QUICKSTART?locale=en")).json;
    check("review due again once reviewFrequencyDays has elapsed", detail.reviewDue === true);

    // --- 10. Completion + 7-night -> 30-day continuation ---------------------
    await prisma.programmeEnrollment.update({ where: { id: enrollmentRow.id }, data: { startedAt: new Date(Date.now() - 8 * 86400000) } });
    detail = (await api("GET", "/programmes/PRG_7NIGHT_QUICKSTART?locale=en")).json;
    check("programme reports complete once lengthDays has elapsed", detail.isComplete === true);
    check("nextProgrammeCode points to the 30-day reset", detail.nextProgrammeCode === "PRG_30DAY_RESET");
    const continueEnroll = await api("POST", "/programmes/PRG_30DAY_RESET/enroll", {});
    check("continuation enrol into 30-Day Sleep Reset succeeds", continueEnroll.status === 200 && continueEnroll.json.enrolled === true);

    // --- 11. Regression smoke: other Fix #5 surfaces still respond ----------
    const wallpapers = await api("GET", "/wallpapers");
    check("GET /wallpapers still responds 200 (Fix #5.3 regression check)", wallpapers.status === 200);
    const musicLib = await api("GET", "/music/tracks");
    check("GET /music/tracks still responds 200 (Music Library regression check)", musicLib.status === 200);
    const prefs = await api("GET", "/preferences");
    check("GET /preferences still responds 200", prefs.status === 200);
    const tonightAgain = await api("GET", "/tonight?locale=en");
    check("GET /tonight still responds 200 after all review changes", tonightAgain.status === 200);
  } finally {
    server.close();
    await prisma.$disconnect();
    fs.rmSync(dbFile, { force: true });
    fs.rmSync(`${dbFile}-journal`, { force: true });
  }

  console.log(`\n${pass}/${pass + fail} checks passed.`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
