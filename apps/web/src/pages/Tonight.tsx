import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import { t } from "../i18n";
import BottomNav from "../components/BottomNav";

interface TonightStep {
  stepCode: string;
  productId?: string;
  productName?: string;
}

function stepLabel(step: TonightStep): string {
  if (step.stepCode === "PRODUCT") return `${t("tonight.step.useProduct")} ${step.productName ?? ""}`.trim();
  if (step.stepCode === "BREATHING") return t("tonight.step.breathing");
  if (step.stepCode === "MUSIC") return t("tonight.step.music");
  return step.stepCode;
}

/**
 * Doc 01 §2/§4 — night home: "夜晚首頁突出 Tonight's Plan + START SLEEP" and
 * never more than 1-3 steps, however many products the user owns.
 */
export default function Tonight() {
  const [steps, setSteps] = useState<TonightStep[]>([]);
  const [stepStatus, setStepStatus] = useState<Record<string, "DONE" | "SKIPPED">>({});
  const { user, logout } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    api.get<{ steps: TonightStep[] }>("/tonight").then((r) => setSteps(r.steps));
  }, []);

  async function mark(step: TonightStep, status: "DONE" | "SKIPPED") {
    setStepStatus((s) => ({ ...s, [step.stepCode]: status }));
    await api.post("/tonight/log-step", { stepCode: step.stepCode, status, productId: step.productId });
  }

  async function startSleep() {
    const res = await api.post<{ session: { id: string } }>("/sleep-session/start", {
      sleepAudioDurationMode: "FIXED",
      presetLabel: "1 hr",
      sleepAudioId: "AUD_MOON_LAKE_01",
      wallpaperId: user?.wallpaperId ?? "WALL_MOON_LAKE_04",
      wakeStyle: "NORMAL",
      snoozeMinutes: 10,
    });
    navigate(`/player/${res.session.id}`);
  }

  return (
    <div className="screen">
      <h1>{t("tonight.title")}</h1>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {steps.length === 0 && <p className="muted">{t("tonight.loadingPlan")}</p>}
        {steps.map((step) => (
          <div key={step.stepCode} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <span>{stepLabel(step)}</span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => mark(step, "DONE")} style={stepStatus[step.stepCode] === "DONE" ? { borderColor: "var(--color-primary)" } : {}}>
                {t("tonight.done")}
              </button>
              <button onClick={() => mark(step, "SKIPPED")} style={stepStatus[step.stepCode] === "SKIPPED" ? { borderColor: "var(--color-danger)" } : {}}>
                {t("tonight.skip")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="primary" onClick={startSleep}>
        {t("tonight.startSleep")}
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "auto" }}>
        <Link to="/review" className="muted">
          {t("tonight.review")}
        </Link>
        <Link to="/assessment" className="muted">
          {t("tonight.newQuestion")}
        </Link>
        <button onClick={logout}>{t("tonight.logout")}</button>
      </div>

      <BottomNav />
    </div>
  );
}
