import { useMemo, useRef, useState } from "react";
import {
  DecisionRecord,
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

function VersionPreviewColumn({
  title,
  version,
  emptyMessage,
}: {
  title: string;
  version: VisualVersion | null;
  emptyMessage: string;
}) {
  if (!version) {
    return (
      <div className="vwc-compare-column vwc-compare-empty">
        <div className="vwc-compare-column-title">{title}</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="vwc-compare-column">
      <div className="vwc-compare-column-title">{title}</div>
      <div className="vwc-version-id">version id: {version.id}</div>
      <span className={`vwc-badge status-${version.status}`}>{STATUS_LABELS[version.status]}</span>
      <div className="vwc-compare-previews">
        <div className="vwc-preview-frame">
          <div className="vwc-preview-label">Desktop (schematic mock)</div>
          <PreviewMock kind="desktop" />
        </div>
        <div className="vwc-preview-frame">
          <div className="vwc-preview-label">Mobile (schematic mock)</div>
          <PreviewMock kind="mobile" />
        </div>
      </div>
      <div className="vwc-compare-notes">
        <h4>Design notes</h4>
        <p>{version.designNotes}</p>
      </div>
    </div>
  );
}

export default function VisualWorkflowConsole() {
  const [versions, setVersions] = useState<VisualVersion[]>(VISUAL_VERSIONS);
  const [selectedId, setSelectedId] = useState<string>(VISUAL_VERSIONS[1]?.id ?? VISUAL_VERSIONS[0].id);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [reviewNote, setReviewNote] = useState("");
  const [copiedDecisionId, setCopiedDecisionId] = useState<string | null>(null);
  const draftCounterRef = useRef(1);

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

  function updateDesignNote(nextNote: string) {
    setVersions((prev) => prev.map((v) => (v.id === selected.id ? { ...v, designNotes: nextNote } : v)));
  }

  function createNextDraft() {
    const n = draftCounterRef.current;
    draftCounterRef.current = n + 1;
    const timestamp = new Date().toISOString();
    const newId = `${selected.pageId}-draft-session-${n}`;
    const draft: VisualVersion = {
      id: newId,
      pageId: selected.pageId,
      versionLabel: `New DRAFT ${n} (from ${selected.versionLabel})`,
      status: "DRAFT",
      createdAt: timestamp,
      designNotes:
        "Editable local draft note — describe what changed from the parent version. This text only exists in this browser tab and resets on reload.",
      sources: [...selected.sources],
      comparisonTargetId: selected.id,
      reviewStatus: `Draft — created locally from ${selected.id}, not yet submitted for owner review`,
    };
    setVersions((prev) => [...prev, draft]);
    setSelectedId(newId);
    setLog((prev) =>
      [{ at: timestamp, message: `Created next DRAFT version ${newId} from ${selected.id} (local only)` }, ...prev].slice(0, 20)
    );
  }

  function commitReviewAction(nextStatus: VersionStatus, actionLabel: string) {
    const note = reviewNote.trim();
    if (!note) return;
    const timestamp = new Date().toISOString();
    const decisionId = `decision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const previousStatus = selected.status;
    const comparisonTargetId = selected.comparisonTargetId;
    const selectedVersionId = selected.id;

    setVersions((prev) =>
      prev.map((v) =>
        v.id === selectedVersionId ? { ...v, status: nextStatus, reviewStatus: `${actionLabel} (local only, ${timestamp})` } : v
      )
    );
    setDecisions((prev) => [
      {
        decisionId,
        selectedVersionId,
        comparisonTargetId,
        previousStatus,
        newStatus: nextStatus,
        reviewNote: note,
        timestamp,
        scope: "LOCAL_PREVIEW_ONLY",
      },
      ...prev,
    ]);
    setLog((prev) => [{ at: timestamp, message: `${actionLabel}: ${selected.pageId} / ${selected.versionLabel}` }, ...prev].slice(0, 20));
    setReviewNote("");
  }

  function copyDecisionJSON(record: DecisionRecord) {
    const text = JSON.stringify(record, null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setCopiedDecisionId(record.decisionId);
          setTimeout(() => setCopiedDecisionId((cur) => (cur === record.decisionId ? null : cur)), 2000);
        })
        .catch(() => {});
    }
  }

  function downloadDecisionsJSON() {
    const blob = new Blob([JSON.stringify(decisions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visual-console-decisions-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const noteEmpty = reviewNote.trim().length === 0;

  return (
    <div className="vwc-root">
      <div className="vwc-banner">
        <strong>Internal preview — not a production page.</strong> This is a DRAFT v2 slice of the owner
        Visual Workflow Console (issue #131) for explicit owner review — it does not replace or
        re-approve the v1 console or any legacy Health screen. Approve / Request changes / Mark
        reference only now require a non-empty owner review note and create a local structured
        decision record below. "Create next DRAFT version" creates a new in-memory version. Nothing
        here is written to a database, git, or the network — reload this page and every action
        (including new drafts, edited notes and decision records) resets to the seed data.
      </div>

      <div className="vwc-header">
        <h1>Visual Workflow Console</h1>
        <span className="vwc-header-meta">v2 draft — local/mock review state only</span>
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
              <button type="button" className="vwc-action-btn create-draft" onClick={createNextDraft}>
                Create next DRAFT version
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
            {selected.status === "DRAFT" ? (
              <textarea
                className="vwc-note-input vwc-design-note-input"
                value={selected.designNotes}
                onChange={(e) => updateDesignNote(e.target.value)}
                rows={3}
                aria-label="Editable local design note for this draft version"
              />
            ) : (
              <p>{selected.designNotes}</p>
            )}
          </div>

          <div className="vwc-section">
            <h3>Source / reference list</h3>
            <ul className="vwc-source-list">
              {selected.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="vwc-section vwc-compare-section">
            <h3>Side-by-side comparison</h3>
            <p className="vwc-compare-disclaimer">
              Schematic layout comparison only — this is not a pixel diff and does not represent final
              design fidelity.
            </p>
            <div className="vwc-compare-grid">
              <VersionPreviewColumn title="Selected version" version={selected} emptyMessage="No version selected." />
              <VersionPreviewColumn
                title="Comparison target"
                version={comparisonTarget}
                emptyMessage="No comparison target linked for this version."
              />
            </div>
          </div>

          <div className="vwc-section">
            <h3>Review status</h3>
            <p>{selected.reviewStatus}</p>
          </div>

          <div className="vwc-section vwc-review-note-section">
            <h3>Owner review note (required for Approve / Request changes / Mark reference only)</h3>
            <textarea
              className="vwc-note-input"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              placeholder="Write the owner's review note here before committing a review action..."
              aria-label="Owner review note"
            />
            <div className="vwc-actions vwc-review-actions">
              <button
                type="button"
                className="vwc-action-btn approve"
                disabled={noteEmpty}
                onClick={() => commitReviewAction("APPROVED", "Approved version")}
              >
                Approve version
              </button>
              <button
                type="button"
                className="vwc-action-btn reject"
                disabled={noteEmpty}
                onClick={() => commitReviewAction("REJECTED", "Requested changes")}
              >
                Request changes
              </button>
              <button
                type="button"
                className="vwc-action-btn reference"
                disabled={noteEmpty}
                onClick={() => commitReviewAction("REFERENCE_ONLY", "Marked reference only")}
              >
                Mark reference only
              </button>
            </div>
            {noteEmpty && <p className="vwc-note-hint">Enter a review note to enable these actions.</p>}
          </div>

          <div className="vwc-section vwc-decisions-section">
            <div className="vwc-decisions-header">
              <h3>Local decision records ({decisions.length})</h3>
              {decisions.length > 0 && (
                <button type="button" className="vwc-action-btn download" onClick={downloadDecisionsJSON}>
                  Download all as JSON
                </button>
              )}
            </div>
            {decisions.length === 0 ? (
              <p>No review actions committed yet this session.</p>
            ) : (
              <ul className="vwc-decision-list">
                {decisions.map((d) => (
                  <li key={d.decisionId} className="vwc-decision-record" data-decision-id={d.decisionId}>
                    <div className="vwc-decision-grid">
                      <span>decision_id</span>
                      <code>{d.decisionId}</code>
                      <span>selected_version_id</span>
                      <code>{d.selectedVersionId}</code>
                      <span>comparison_target_id</span>
                      <code>{d.comparisonTargetId ?? "null"}</code>
                      <span>previous_status</span>
                      <code>{d.previousStatus}</code>
                      <span>new_status</span>
                      <code>{d.newStatus}</code>
                      <span>timestamp</span>
                      <code>{d.timestamp}</code>
                      <span>scope</span>
                      <code>{d.scope}</code>
                    </div>
                    <div className="vwc-decision-note">
                      <strong>Review note:</strong> {d.reviewNote}
                    </div>
                    <button type="button" className="vwc-action-btn copy" onClick={() => copyDecisionJSON(d)}>
                      {copiedDecisionId === d.decisionId ? "Copied!" : "Copy JSON"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
