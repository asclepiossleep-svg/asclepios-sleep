import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { t } from "../i18n";

interface AnswerOption {
  id: string;
  code: string;
  label: string;
}
interface Question {
  id: string;
  text: string;
  answerOptions: AnswerOption[];
}

/**
 * Doc 02 §8 — Scripted Conversation. Every message is a Question/Template/
 * Action node; there is no free-text box in V1 (AI-light). The component
 * never branches on question content itself — it only renders whatever the
 * Question Engine returns, so new questions/branches are a backend config
 * change, never a redeploy (Doc 01 §5).
 */
export default function Assessment() {
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.post<{ id: string }>("/assessment/start", { type: "INITIAL" }).then((a) => setAssessmentId(a.id));
  }, []);

  useEffect(() => {
    if (assessmentId) loadNext(assessmentId);
  }, [assessmentId]);

  async function loadNext(id: string) {
    const res = await api.get<{ done: boolean; question?: Question }>(`/assessment/${id}/next`);
    if (res.done) {
      setDone(true);
    } else {
      setQuestion(res.question ?? null);
    }
  }

  async function answer(optionId: string) {
    if (!assessmentId || !question) return;
    await api.post(`/assessment/${assessmentId}/answer`, { questionId: question.id, answerOptionId: optionId });
    loadNext(assessmentId);
  }

  if (done) {
    return (
      <div className="screen">
        <h1>{t("assessment.allSet")}</h1>
        <p className="muted">{t("assessment.allSetSubtitle")}</p>
        <button className="primary" onClick={() => navigate("/tonight")}>
          {t("assessment.continue")}
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="screen">
        <p className="muted">{t("assessment.loading")}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>{question.text}</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {question.answerOptions.map((o) => (
          <button key={o.id} className="primary" onClick={() => answer(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
