import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { t } from "../i18n";
import PageHeader from "../components/PageHeader";

/**
 * Doc 05 §5 / Doc 06 §8 — Morning Check-in: <=3 primary actions. "Add
 * Details" is optional and collapsed by default (Doc 05 §5: only shown when
 * the user wants to add more, or a rule triggers it).
 */
export default function MorningCheckin() {
  const [sleepRating, setSleepRating] = useState<number | null>(null);
  const [nightWakingCount, setNightWakingCount] = useState<"0" | "1" | "2" | "3+" | null>(null);
  const [morningEnergy, setMorningEnergy] = useState<"POOR" | "AVERAGE" | "GOOD" | null>(null);
  const [showAddDetails, setShowAddDetails] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | undefined>((location.state as any)?.sessionId);

  useEffect(() => {
    if (sessionId) return;
    // A9 fix — location.state is gone on refresh/reopen; recover the
    // session that's actually waiting on a check-in instead.
    api.get<{ sessionId: string | null }>("/checkin/pending-session").then((r) => {
      if (r.sessionId) setSessionId(r.sessionId);
    });
  }, [sessionId]);

  const canSubmit = sleepRating && nightWakingCount && morningEnergy;

  async function submit() {
    await api.post("/checkin", { sessionId, sleepRating, nightWakingCount, morningEnergy });
    navigate("/tonight");
  }

  return (
    <div className="screen">
      <PageHeader title={t("checkin.title")} />

      <div className="card">
        <p>{t("checkin.sleepRating")}</p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setSleepRating(n)} style={sleepRating === n ? { borderColor: "var(--color-primary)" } : {}}>
              {n}★
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p>{t("checkin.nightWaking")}</p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["0", "1", "2", "3+"] as const).map((n) => (
            <button key={n} onClick={() => setNightWakingCount(n)} style={nightWakingCount === n ? { borderColor: "var(--color-primary)" } : {}}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p>{t("checkin.energy")}</p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setMorningEnergy("POOR")} style={morningEnergy === "POOR" ? { borderColor: "var(--color-primary)" } : {}}>
            {t("checkin.energy.poor")}
          </button>
          <button onClick={() => setMorningEnergy("AVERAGE")} style={morningEnergy === "AVERAGE" ? { borderColor: "var(--color-primary)" } : {}}>
            {t("checkin.energy.average")}
          </button>
          <button onClick={() => setMorningEnergy("GOOD")} style={morningEnergy === "GOOD" ? { borderColor: "var(--color-primary)" } : {}}>
            {t("checkin.energy.good")}
          </button>
        </div>
      </div>

      {!showAddDetails && (
        <button onClick={() => setShowAddDetails(true)} className="muted">
          {t("checkin.addDetails")}
        </button>
      )}

      <button className="primary" onClick={submit} disabled={!canSubmit}>
        {t("checkin.submit")}
      </button>
    </div>
  );
}
