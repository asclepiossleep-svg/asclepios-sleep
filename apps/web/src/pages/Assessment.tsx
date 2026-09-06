import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { t } from "../i18n";
import BackButton from "../components/BackButton";

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
interface FocusArea {
  tag: string;
  severity: number;
  frequency: number;
  impact: number;
  composite: number;
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
  const [topFocusAreas, setTopFocusAreas] = useState<FocusArea[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const navigate = useNavigate();

  function start() {
    setLoadFailed(false);
    api
      .post<{ id: string }>("/assessment/start", { type: "INITIAL" })
      .then((a) => setAssessmentId(a.id))
      .catch(() => setLoadFailed(true));
  }

  useEffect(start, []);

  useEffect(() => {
    if (assessmentId) loadNext(assessmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  async function loadNext(id: string) {
    setLoadFailed(false);
    try {
      const res = await api.get<{ done: boolean; question?: Question; topFocusAreas?: FocusArea[] }>(`/assessment/${id}/next`);
      if (res.done) {
        setTopFocusAreas(res.topFocusAreas ?? []);
        setDone(true);
      } else {
        setQuestion(res.question ?? null);
      }
    } catch {
      setLoadFailed(true);
    }
  }

  function retry() {
    if (assessmentId) loadNext(assessmentId);
    else start();
  }

  async function answer(optionId: string) {
    if (!assessmentId || !question) return;
    setAnswerError(false);
    try {
      await api.post(`/assessment/${assessmentId}/answer`, { questionId: question.id, answerOptionId: optionId });
      loadNext(assessmentId);
    } catch {
      setAnswerError(true);
    }
  }

  if (done) {
    return (
      <div className="screen">
        <h1>{t("assessment.allSet")}</h1>
        <p className="muted">{t("assessment.allSetSubtitle")}</p>

        {topFocusAreas.length > 0 && (
          <div className="card">
            <p>
              <strong>{t("assessment.topFocusAreas.title")}</strong>
            </p>
            <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
              {topFocusAreas.map((f) => (
                <li key={f.tag}>{t(`tag.${f.tag}`)}</li>
              ))}
            </ol>
          </div>
        )}

        <button className="primary" onClick={() => navigate("/tonight")}>
          {t("assessment.continue")}
        </button>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="screen">
        <BackButton />
        <p className="muted">{t("assessment.loadError")}</p>
        <button className="muted" onClick={retry}>
          {t("setup.retry")}
        </button>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="screen">
        <BackButton />
        <p className="muted">{t("assessment.loading")}</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackButton />
      <h1>{question.text}</h1>
      {answerError && <p style={{ color: "var(--color-danger)" }}>{t("assessment.answerError")}</p>}
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
