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

const ACTION_LABEL: Record<string, string> = {
  CONTINUE: "Keep going",
  REMIND: "A gentle reminder",
  SIMPLIFY: "Let's simplify tonight",
  OPTIMISE: "Let's adjust how you use this",
  ASK_MORE: "A couple of quick questions",
  CHANGE_ROUTINE: "Let's try something different",
  RECOMMEND_CONTENT: "A short explainer might help",
  ADD_PRODUCT: "Worth considering an addition",
  REPLACE_PRODUCT: "Worth considering an alternative",
  REASSESS: "Time to re-check your profile",
  ESCALATE: "Please speak with a professional",
};

export default function Review() {
  const [result, setResult] = useState<ReviewResult | null>(null);

  useEffect(() => {
    api.post<ReviewResult>("/review/7-day").then(setResult);
  }, []);

  if (!result) {
    return (
      <div className="screen">
        <p className="muted">Crunching the last 7 days…</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>{t("review.title")}</h1>

      <div className="card">
        <h2>{ACTION_LABEL[result.actionCode] ?? result.actionCode}</h2>
        <p className="muted">{result.explanation}</p>
      </div>

      <div className="card">
        <p>Adherence: {(result.findings.adherence.ratio * 100).toFixed(0)}% ({result.findings.adherence.level})</p>
        <p>Response trend: {result.findings.response.direction}</p>
        <p>Routine completion: {(result.findings.routineCompletionRatio * 100).toFixed(0)}%</p>
      </div>
    </div>
  );
}
