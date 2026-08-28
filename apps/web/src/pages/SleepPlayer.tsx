import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { t } from "../i18n";
import { SNOOZE_MINUTES } from "@asclepios/shared";

/**
 * Supplement 07 §10-16 — Sleep Player / Wake Engine screen. Full-screen
 * wallpaper, no technical detail (percentages, volume curves) surfaced to
 * the user — only feelings/presets, per §14.
 */
export default function SleepPlayer() {
  const { sessionId } = useParams();
  const [woken, setWoken] = useState(false);
  const navigate = useNavigate();

  async function imAwake() {
    await api.post(`/sleep-session/${sessionId}/wake`);
    setWoken(true);
  }

  async function snooze(minutes: number) {
    await api.post(`/sleep-session/${sessionId}/snooze`, { minutes });
  }

  async function goToCheckin() {
    await api.post(`/sleep-session/${sessionId}/stop`);
    navigate("/checkin", { state: { sessionId } });
  }

  return (
    <div
      className="screen"
      style={{
        justifyContent: "space-between",
        background: "radial-gradient(circle at top, var(--color-accent) 0%, var(--color-bg) 70%)",
        minHeight: "100vh",
      }}
    >
      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <p className="muted">{t("player.windDown")}</p>
        <h1>{t("player.trackName")}</h1>
      </div>

      {!woken ? (
        <button className="primary" onClick={imAwake} style={{ width: "100%" }}>
          {t("player.imAwake")}
        </button>
      ) : (
        <div className="card">
          <p>{t("player.snoozeQuestion")}</p>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {SNOOZE_MINUTES.map((m) => (
              <button key={m} onClick={() => snooze(m)}>
                {m} {t("player.minutesSuffix")}
              </button>
            ))}
          </div>
          <button className="primary" onClick={goToCheckin} style={{ width: "100%" }}>
            {t("player.continueToCheckin")}
          </button>
        </div>
      )}
    </div>
  );
}
