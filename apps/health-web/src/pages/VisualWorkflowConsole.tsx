import { useMemo, useState } from "react";
import {
  STATUS_LABELS,
  VISUAL_PAGES,
  VISUAL_VERSIONS,
  VersionStatus,
  VisualVersion,
} from "../data/visualWorkflowConsole";
import "../styles/visual-console.css";

interface LogEntry {
  at: string;
  message: string;
}

function PreviewMock({ kind }: { kind: "desktop" | "mobile" }) {
  return (
    <div className={`vwc-preview-mock ${kind}`} aria-hidden="true">
      <div className="vwc-mock-bar nav" />
      <div className="vwc-mock-bar hero" />
      <div className="vwc-mock-bar card-row">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export default function VisualWorkflowConsole() {
  const [versions, setVersions] = useState<VisualVersion[]>(VISUAL_VERSIONS);
  const [selectedId, setSelectedId] = useState<string>(VISUAL_VERSIONS[1]?.id ?? VISUAL_VERSIONS[0].id);
  const [log, setLog] = useState<LogEntry[]>([]);

  const selected = useMemo(() => versions.find((v) => v.id === selectedId) ?? versions[0], [versions, selectedId]);
  const comparisonTarget = useMemo(
    () => (selected.comparisonTargetId ? versions.find((v) => v.id === selected.comparisonTargetId) ?? null : null),
    [selected, versions]
  );

  const byPage = useMemo(
    () =>
      VISUAL_PAGES.map((page) => ({
        page,
        versions: versions.filter((v) => v.pageId === page.id),
      })),
    [versions]
  );

  function applyLocalStatus(nextStatus: VersionStatus, actionLabel: string) {
    const timestamp = new Date().toISOString();
    setVersions((prev) =>
      prev.map((v) => (v.id === selected.id ? { ...v, status: nextStatus, reviewStatus: `${actionLabel} (local only, ${timestamp})` } : v))
    );
    setLog((prev) => [
      { at: timestamp, message: `${actionLabel}: ${selected.pageId} / ${selected.versionLabel}` },
      ...prev,
    ].slice(0, 20));
  }

  return (
    <div className="vwc-root">
      <div className="vwc-banner">
        <strong>Internal preview — not a production page.</strong> This is the bounded v1 slice of the
        owner Visual Workflow Console (issue #131). Approve / Request changes / Mark reference only
        update in-memory React state for this browser tab only — nothing here is written to a database
        or to git. Reload this page and every action resets to the seed data below.
      </div>

      <div className="vwc-header">
        <h1>Visual Workflow Console</h1>
        <span className="vwc-header-meta">v1 — local/mock review state only</span>
      </div>

      <div className="vwc-layout">
        <nav className="vwc-list" aria-label="Page versions">
          {byPage.map(({ page, versions: pageVersions }) => (
            <div className="vwc-list-group" key={page.id}>
              <div className="vwc-list-group-title">{page.title}</div>
              {pageVersions.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`vwc-list-item ${v.id === selected.id ? "is-selected" : ""}`.trim()}
                  onClick={() => setSelectedId(v.id)}
                >
                  <span className="vwc-list-item-label">{v.versionLabel}</span>
                  <span className={`vwc-badge status-${v.status}`}>{STATUS_LABELS[v.status]}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <section className="vwc-detail">
          <div className="vwc-detail-header">
            <div>
              <h2>
                {VISUAL_PAGES.find((p) => p.id === selected.pageId)?.title} — {selected.versionLabel}
              </h2>
              <div className="vwc-version-id">version id: {selected.id}</div>
              <span className={`vwc-badge status-${selected.status}`}>{STATUS_LABELS[selected.status]}</span>
            </div>
            <div className="vwc-actions">
              <button
                type="button"
                className="vwc-action-btn approve"
                onClick={() => applyLocalStatus("APPROVED", "Approved")}
              >
                Approve version
              </button>
              <button
                type="button"
                className="vwc-action-btn reject"
                onClick={() => applyLocalStatus("REJECTED", "Requested changes")}
              >
                Request changes
              </button>
              <button
                type="button"
                className="vwc-action-btn reference"
                onClick={() => applyLocalStatus("REFERENCE_ONLY", "Marked reference only")}
              >
                Mark reference only
              </button>
            </div>
          </div>

          <div className="vwc-previews">
            <div className="vwc-preview-frame">
              <div className="vwc-preview-label">Desktop preview (schematic mock, not final design)</div>
              <PreviewMock kind="desktop" />
            </div>
            <div className="vwc-preview-frame">
              <div className="vwc-preview-label">Mobile preview (schematic mock, not final design)</div>
              <PreviewMock kind="mobile" />
            </div>
          </div>

          <div className="vwc-section">
            <h3>Design notes</h3>
            <p>{selected.designNotes}</p>
          </div>

          <div className="vwc-section">
            <h3>Source / reference list</h3>
            <ul className="vwc-source-list">
              {selected.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="vwc-section">
            <h3>Comparison target (previous version)</h3>
            <p className="vwc-comparison">
              {comparisonTarget
                ? `${comparisonTarget.versionLabel} — ${STATUS_LABELS[comparisonTarget.status]}`
                : "No previous version linked for comparison."}
            </p>
          </div>

          <div className="vwc-section">
            <h3>Review status</h3>
            <p>{selected.reviewStatus}</p>
          </div>

          <div className="vwc-log">
            <h3>Session action log (local only)</h3>
            {log.length === 0 ? (
              <p>No actions taken yet this session.</p>
            ) : (
              <ul>
                {log.map((entry, i) => (
                  <li key={i}>
                    {entry.at} — {entry.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
