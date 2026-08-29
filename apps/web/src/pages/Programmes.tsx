import { useEffect, useState } from "react";
import { t } from "../i18n";
import { api } from "../api/client";
import BottomNav from "../components/BottomNav";
import PageHeader from "../components/PageHeader";

interface ProgrammeStatus {
  code: string;
  lengthDays: number;
  enrolled: boolean;
  currentDay: number | null;
  isComplete: boolean;
}

/**
 * Requirement Recovery Matrix #20/#21 — the two named programmes (7-Night
 * Quick Start, 30-Day Sleep Reset). Deliberately simple V1: one card per
 * programme, "Start" if not enrolled, a Day X of Y progress bar if enrolled
 * (same bar-chart visual language as Review's Sleep Score trend). Free
 * self-enrolment — no payment gate exists yet (Milestone 4, needs Edmund's
 * decision on a provider).
 */
export default function Programmes() {
  const [programmes, setProgrammes] = useState<ProgrammeStatus[]>([]);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    api.get<{ programmes: ProgrammeStatus[] }>("/programmes").then((r) => setProgrammes(r.programmes));
  }

  async function enroll(code: string) {
    setBusyCode(code);
    await api.post(`/programmes/${code}/enroll`, {});
    await load();
    setBusyCode(null);
  }

  return (
    <div className="screen">
      <PageHeader title={t("programmes.title")} subtitle={t("programmes.subtitle")} />

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {programmes.map((p) => (
          <div key={p.code} className="card">
            <strong style={{ fontSize: "1rem" }}>{t(`programme.${p.code}.name`)}</strong>
            <p className="muted" style={{ marginTop: "0.3rem" }}>
              {t(`programme.${p.code}.description`)}
            </p>

            {!p.enrolled && (
              <button className="primary" onClick={() => enroll(p.code)} disabled={busyCode === p.code}>
                {t("programmes.start")}
              </button>
            )}

            {p.enrolled && (
              <div>
                <p style={{ margin: "0 0 0.4rem", fontWeight: 600 }}>
                  {p.isComplete ? t("programmes.completed") : `${t("programmes.day")} ${p.currentDay} / ${p.lengthDays}`}
                </p>
                <div style={{ display: "flex", gap: "2px" }}>
                  {Array.from({ length: p.lengthDays }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: "6px",
                        borderRadius: "3px",
                        background: p.currentDay !== null && i < p.currentDay ? "var(--color-primary)" : "var(--color-border)",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
