import { useEffect, useState } from "react";
import { api } from "../api/client";
import { t } from "../i18n";
import { ActionCode } from "@asclepios/shared";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";

interface ReviewResult {
  actionCode: ActionCode;
  explanation: string;
  findings: {
    adherence: { ratio: number; level: string };
    response: { direction: string };
    routineCompletionRatio: number;
  };
}

interface ProgressTrend {
  hasEnoughData: boolean;
  days: { date: string; score: number }[];
  currentScore: number | null;
  trendDirection: "IMPROVED" | "WORSENED" | "STEADY" | null;
  focusArea: "SLEEP_RATING" | "NIGHT_WAKING" | "MORNING_ENERGY" | null;
  checkinCount: number;
}

const ACTION_CODES = [
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

function actionLabel(code: string): string {
  return (ACTION_CODES as readonly string[]).includes(code) ? t(`review.action.${code}`) : code;
}

export default function Review() {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [trend, setTrend] = useState<ProgressTrend | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  function load() {
    setLoadFailed(false);
    setResult(null);
    api.post<ReviewResult>("/review/7-day").then(setResult).catch(() => setLoadFailed(true));
    api.get<ProgressTrend>("/review/trend").then(setTrend).catch(() => {});
  }

  useEffect(load, []);

  if (loadFailed) {
    return (
      <div className="screen">
        <PageHeader title={t("review.title")} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-start" }}>
          <p className="muted">{t("review.loadError")}</p>
          <button className="muted" onClick={load}>
            {t("setup.retry")}
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="screen">
        <p className="muted">{t("review.crunching")}</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="screen">
      <PageHeader title={t("review.title")} />

      <div className="card">
        <h2>{actionLabel(result.actionCode)}</h2>
        <p className="muted">{result.explanation}</p>
      </div>

      <div className="card">
        <p>
          {t("review.adherence")}: {(result.findings.adherence.ratio * 100).toFixed(0)}% ({result.findings.adherence.level})
        </p>
        <p>
          {t("review.responseTrend")}: {result.findings.response.direction}
        </p>
        <p>
          {t("review.routineCompletion")}: {(result.findings.routineCompletionRatio * 100).toFixed(0)}%
        </p>
      </div>

      {trend && (
        <div className="card">
          <h2>{t("review.sleepScoreTitle")}</h2>
          {trend.hasEnoughData ? (
            <>
              <p style={{ fontSize: "2.5rem", fontWeight: 700, margin: "0.25rem 0" }}>{trend.currentScore}</p>
              {trend.trendDirection && <p className="muted">{t(`review.trend.${trend.trendDirection.toLowerCase()}`)}</p>}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "48px", margin: "0.75rem 0" }}>
                {trend.days.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.score}`}
                    style={{
                      flex: 1,
                      height: `${Math.max(6, d.score)}%`,
                      background: "var(--color-primary)",
                      borderRadius: "2px",
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
              {trend.focusArea && (
                <p className="muted">
                  {t("review.trend.focusTitle")}: {t(`review.trend.focus.${trend.focusArea}`)}
                </p>
              )}
            </>
          ) : (
            <p className="muted">{t("review.trend.notEnoughData")}</p>
          )}
          <p className="muted" style={{ fontSize: "0.75rem" }}>
            {t("review.sleepScoreNote")}
          </p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
