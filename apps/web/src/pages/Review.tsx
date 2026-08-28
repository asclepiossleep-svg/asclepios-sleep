import { useEffect, useState } from "react";
import { api } from "../api/client";
import { t } from "../i18n";
import { ActionCode } from "@asclepios/shared";

interface ReviewResult {
  actionCode: ActionCode;
  explanation: string;
  findings: {
    adherence: { ratio: number; level: string };
    response: { direction: string };
    routineCompletionRatio: number;
  };
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

  useEffect(() => {
    api.post<ReviewResult>("/review/7-day").then(setResult);
  }, []);

  if (!result) {
    return (
      <div className="screen">
        <p className="muted">{t("review.crunching")}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>{t("review.title")}</h1>

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
    </div>
  );
}
