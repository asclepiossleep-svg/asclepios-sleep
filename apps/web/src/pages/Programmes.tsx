import { useEffect, useState } from "react";
import { t, getLocale } from "../i18n";
import { api } from "../api/client";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";
import { STEP_REVIEW_DECISIONS, type StepReviewDecision } from "@asclepios/shared";

interface ProgrammeSummary {
  code: string;
  lengthDays: number;
  enrolled: boolean;
  currentDay: number | null;
  isComplete: boolean;
  goals: string[];
  improvementAreas: string[];
  nextProgrammeCode: string | null;
}

interface ProgrammeDay {
  dayNumber: number;
  themeCode: string;
  status: "DONE" | "SKIPPED" | null;
  content: { title: string; bodyMarkdown: string } | null;
}

interface ProgrammeDetail extends ProgrammeSummary {
  reviewFrequencyDays: number;
  today: ProgrammeDay | null;
  progress: { done: number; total: number };
  reviewDue: boolean;
  reviewableSteps: string[];
  currentStepPreferences: Record<string, { decision: StepReviewDecision; note: string | null }>;
}

const badgeStyle = { fontSize: "0.75rem", border: "1px solid var(--color-border)", borderRadius: "999px", padding: "0.15rem 0.6rem" };

/**
 * Fix #5.6 (5 Sep 2026) — rebuilt from a bare enrol + day-count bar into a
 * guided journey: overview/who-for/goals (browse state), then today's
 * theme/why/how + content slot, Done/Skip, overall progress, and a
 * KEEP/REMOVE/ADJUST routine-step review when one is due (enrolled state).
 * All journey structure (per-day theme, content slot, goals, improvement
 * areas, review cadence) comes from GET /programmes[/:code] — this
 * component only resolves *codes* to display text via i18n
 * (programme.<code>.*, programme.goal.<code>, programme.day.<code>.*,
 * tag.<code>), same pattern the rest of the app already uses. Continuity
 * from the 7-Night Quick Start into the 30-Day Sleep Reset is a plain
 * re-enrol once nextProgrammeCode's programme is complete.
 */
export default function Programmes() {
  const [summaries, setSummaries] = useState<ProgrammeSummary[]>([]);
  const [details, setDetails] = useState<Record<string, ProgrammeDetail>>({});
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [reviewOpenFor, setReviewOpenFor] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, StepReviewDecision>>({});

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const r = await api.get<{ programmes: ProgrammeSummary[] }>("/programmes");
    setSummaries(r.programmes);
    await Promise.all(r.programmes.filter((p) => p.enrolled).map((p) => loadDetail(p.code)));
  }

  async function loadDetail(code: string) {
    const d = await api.get<ProgrammeDetail>(`/programmes/${code}?locale=${encodeURIComponent(getLocale())}`);
    setDetails((prev) => ({ ...prev, [code]: d }));
  }

  async function enroll(code: string) {
    setBusyCode(code);
    try {
      await api.post(`/programmes/${code}/enroll`, {});
      await load();
    } finally {
      setBusyCode(null);
    }
  }

  async function logDay(code: string, dayNumber: number, status: "DONE" | "SKIPPED") {
    await api.post(`/programmes/${code}/day/${dayNumber}/log`, { status });
    await loadDetail(code);
  }

  function openReview(code: string, steps: string[], currentStepPreferences: ProgrammeDetail["currentStepPreferences"]) {
    setReviewOpenFor(code);
    // Prefill from what's actually in effect right now rather than
    // resetting every step to KEEP on every review.
    setDecisions(Object.fromEntries(steps.map((s) => [s, currentStepPreferences[s]?.decision ?? ("KEEP" as StepReviewDecision)])));
  }

  async function submitReview(code: string) {
    const decisionList = Object.entries(decisions).map(([stepCode, decision]) => ({ stepCode, decision }));
    await api.post(`/programmes/${code}/review`, { decisions: decisionList });
    setReviewOpenFor(null);
    await loadDetail(code);
  }

  return (
    <div className="screen">
      <PageHeader title={t("programmes.title")} subtitle={t("programmes.subtitle")} />

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {summaries.map((p) => {
          const detail = details[p.code];
          return (
            <div key={p.code} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div>
                <strong style={{ fontSize: "1rem" }}>{t(`programme.${p.code}.name`)}</strong>
                <p className="muted" style={{ marginTop: "0.3rem" }}>
                  {t(`programme.${p.code}.description`)}
                </p>
              </div>

              {!p.enrolled && (
                <>
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>
                    <strong>{t("programmes.whoForLabel")}:</strong> {t(`programme.${p.code}.whoFor`)}
                  </p>
                  {p.goals.length > 0 && (
                    <div>
                      <p className="muted" style={{ margin: "0 0 0.3rem", fontSize: "0.8rem" }}>
                        {t("programmes.goalsLabel")}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                        {p.goals.map((g) => (
                          <span key={g} className="muted" style={badgeStyle}>
                            {t(`programme.goal.${g}`)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.improvementAreas.length > 0 && (
                    <div>
                      <p className="muted" style={{ margin: "0 0 0.3rem", fontSize: "0.8rem" }}>
                        {t("programmes.improvementLabel")}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                        {p.improvementAreas.map((tag) => (
                          <span key={tag} className="muted" style={badgeStyle}>
                            {t(`tag.${tag}`)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button className="primary" onClick={() => enroll(p.code)} disabled={busyCode === p.code}>
                    {t("programmes.start")}
                  </button>
                </>
              )}

              {p.enrolled && detail && !detail.isComplete && (
                <>
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {t("programmes.day")} {detail.currentDay} / {detail.lengthDays}
                  </p>
                  <div style={{ display: "flex", gap: "2px" }}>
                    {Array.from({ length: detail.lengthDays }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: "6px",
                          borderRadius: "3px",
                          background: detail.currentDay !== null && i < detail.currentDay ? "var(--color-primary)" : "var(--color-border)",
                        }}
                      />
                    ))}
                  </div>

                  {detail.today && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.6rem" }}>
                      <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                        {t("programmes.today")}
                      </p>
                      <strong>{t(`programme.day.${detail.today.themeCode}.title`)}</strong>
                      <p style={{ margin: 0, fontSize: "0.85rem" }}>
                        <strong>{t("programmes.why")}:</strong> {t(`programme.day.${detail.today.themeCode}.why`)}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.85rem" }}>
                        <strong>{t("programmes.how")}:</strong> {t(`programme.day.${detail.today.themeCode}.how`)}
                      </p>
                      {detail.today.content && (
                        <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                          <strong>{detail.today.content.title}</strong> — {detail.today.content.bodyMarkdown}
                        </p>
                      )}
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => logDay(p.code, detail.today!.dayNumber, "DONE")}
                          style={detail.today.status === "DONE" ? { borderColor: "var(--color-primary)" } : {}}
                        >
                          {t("tonight.done")}
                        </button>
                        <button
                          onClick={() => logDay(p.code, detail.today!.dayNumber, "SKIPPED")}
                          style={detail.today.status === "SKIPPED" ? { borderColor: "var(--color-danger)" } : {}}
                        >
                          {t("tonight.skip")}
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                    {t("tonight.progressLabel")}: {detail.progress.done} / {detail.progress.total}
                  </p>

                  {Object.keys(detail.currentStepPreferences).length > 0 && reviewOpenFor !== p.code && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.6rem" }}>
                      <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                        {t("programmes.inEffectLabel")}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                        {Object.entries(detail.currentStepPreferences).map(([step, pref]) => (
                          <span key={step} className="muted" style={badgeStyle}>
                            {t(`programmes.stepLabel.${step}`)}: {t(`programmes.decision.${pref.decision}`)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.reviewDue && reviewOpenFor !== p.code && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.6rem" }}>
                      <span style={{ fontSize: "0.85rem" }}>{t("programmes.reviewDueBanner")}</span>
                      <button className="primary" onClick={() => openReview(p.code, detail.reviewableSteps, detail.currentStepPreferences)}>
                        {t("programmes.startReview")}
                      </button>
                    </div>
                  )}

                  {reviewOpenFor === p.code && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.6rem" }}>
                      <strong>{t("programmes.review.title")}</strong>
                      <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                        {t("programmes.review.subtitle")}
                      </p>
                      {detail.reviewableSteps.map((step) => (
                        <div key={step} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem" }}>{t(`programmes.stepLabel.${step}`)}</span>
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            {STEP_REVIEW_DECISIONS.map((d) => (
                              <button
                                key={d}
                                onClick={() => setDecisions((prev) => ({ ...prev, [step]: d }))}
                                style={decisions[step] === d ? { borderColor: "var(--color-primary)", fontWeight: 600 } : {}}
                              >
                                {t(`programmes.decision.${d}`)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button className="primary" onClick={() => submitReview(p.code)}>
                        {t("programmes.review.submit")}
                      </button>
                    </div>
                  )}
                </>
              )}

              {p.enrolled && detail && detail.isComplete && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{t("programmes.completed")}</p>
                  {detail.nextProgrammeCode && (
                    <button className="primary" onClick={() => enroll(detail.nextProgrammeCode!)} disabled={busyCode === detail.nextProgrammeCode}>
                      {t("programmes.continueTo")} {t(`programme.${detail.nextProgrammeCode}.name`)}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
