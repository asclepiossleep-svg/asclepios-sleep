/**
 * Lane C — PRODUCT-SLEEP-SESSION-CONTINUITY-130.
 *
 * Deterministic, real-HTTP proof that POST /sleep-session/start is
 * atomic/idempotent: concurrent tabs/taps for the same user must never
 * create two ACTIVE SleepSession rows. Boots the actual Express app
 * (`createApp()` — the same app both `npm run dev` and the Vercel handler
 * use) against a disposable SQLite database and drives it over real HTTP
 * with `fetch`, firing truly concurrent requests via `Promise.all`.
 *
 * Run with: npm run test:sleep-session-concurrency (from apps/api).
 */
import path from "node:path";
import fs from "node:fs";
import { execSync } from "node:child_process";

const API_ROOT = path.join(__dirname, "..");
const dbFile = path.join(API_ROOT, `.test-sleep-session-concurrency-${Date.now()}.db`);
process.env.DATABASE_URL = `file:${dbFile}`;
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-sleep-session-concurrency-secret";
process.env.DEMO_DISABLED = "true";

// No committed migrations for the sqlite dev schema (see README's
// db:migrate) — `db push` is the correct dev-parity way to materialise a
// fresh disposable file before any PrismaClient opens it.
execSync(`npx prisma db push --schema=prisma/schema.prisma --skip-generate --accept-data-loss`, {
  cwd: API_ROOT,
  stdio: "inherit",
  env: process.env,
});

async function main() {
  const { createApp } = await import("../src/app");
  const { prisma } = await import("../src/db");
  const { signSession } = await import("../src/middleware/auth");

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

  const user = await prisma.user.create({ data: { email: "test-sleep-session-concurrency@asclepios.test" } });
  const deviceSession = await prisma.deviceSession.create({ data: { userId: user.id, deviceLabel: "test-sleep-session-concurrency" } });
  const token = signSession(user.id, "MEMBER", deviceSession.id);
  const authHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const app = createApp();
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  async function startSleep() {
    const r = await fetch(`${base}/sleep-session/start`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ sleepAudioDurationMode: "FIXED", presetLabel: "20 min" }),
    });
    return { status: r.status, json: await r.json() };
  }

  try {
    // Fire N genuinely concurrent "start" calls for the same user — the
    // shape of a double-tap or a second open tab racing the first.
    const CONCURRENCY = 10;
    const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => startSleep()));

    check("all concurrent /start calls succeeded (200)", results.every((r) => r.status === 200));

    const sessionIds = new Set(results.map((r) => r.json.session.id));
    check("all concurrent /start calls converged on the same session id", sessionIds.size === 1);

    const resumedFlags = results.map((r) => r.json.resumed as boolean);
    check("exactly one of the concurrent calls created the session (resumed=false)", resumedFlags.filter((r) => r === false).length === 1);
    check("the rest resumed the same session instead of creating a new one (resumed=true)", resumedFlags.filter((r) => r === true).length === CONCURRENCY - 1);

    const rowsAfterConcurrentStart = await prisma.sleepSession.findMany({ where: { userId: user.id } });
    check(
      `the DB has exactly one SleepSession row after ${CONCURRENCY} concurrent starts (found ${rowsAfterConcurrentStart.length})`,
      rowsAfterConcurrentStart.length === 1
    );
    check("that row is ACTIVE", rowsAfterConcurrentStart[0]?.status === "ACTIVE");

    // A later, non-concurrent /start call (e.g. reopening the app) must
    // still resume rather than duplicate, while the session is in progress.
    const sequentialResume = await startSleep();
    check("a later sequential /start call resumes, not duplicates", sequentialResume.json.resumed === true && sequentialResume.json.session.id === rowsAfterConcurrentStart[0].id);
    const rowsAfterSequentialResume = await prisma.sleepSession.findMany({ where: { userId: user.id } });
    check("row count is still exactly one after the sequential resume", rowsAfterSequentialResume.length === 1);

    // Idempotency must not become permanent: once the session actually
    // ends, the next /start is a genuinely new night, not a stale resume.
    const activeId = rowsAfterConcurrentStart[0].id;
    const stopRes = await fetch(`${base}/sleep-session/${activeId}/stop`, { method: "POST", headers: authHeaders });
    check("stopping the active session succeeds", stopRes.status === 200);

    const afterStop = await startSleep();
    check("a new /start after the session ended creates a fresh session (resumed=false)", afterStop.json.resumed === false);
    check("the fresh session has a different id than the ended one", afterStop.json.session.id !== activeId);

    const rowsAfterNewNight = await prisma.sleepSession.findMany({ where: { userId: user.id } });
    check("the DB now has exactly two rows total (one ENDED, one ACTIVE)", rowsAfterNewNight.length === 2);
    check(
      "exactly one of those two rows is ACTIVE",
      rowsAfterNewNight.filter((s) => s.status === "ACTIVE").length === 1
    );
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
