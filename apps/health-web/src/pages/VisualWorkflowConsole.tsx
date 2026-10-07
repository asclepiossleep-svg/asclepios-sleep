import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  DecisionRecord,
  LocalSourceRecord,
  SOURCE_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  SourceType,
  STATUS_LABELS,
  VISUAL_PAGES,
  VISUAL_VERSIONS,
  VersionStatus,
  VisualVersion,
} from "../data/visualWorkflowConsole";
import "../styles/visual-console.css";

const SOURCE_TYPE_OPTIONS: SourceType[] = ["URL_REFERENCE", "FILE_REFERENCE", "SCREENSHOT_REFERENCE"];

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

  // Local source-intake state (v3 slice, issue #131). Metadata/provenance
  // only — no fetch/upload/image-generation/checksum logic lives here.
  const [sourceRecords, setSourceRecords] = useState<LocalSourceRecord[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sourceTypeInput, setSourceTypeInput] = useState<SourceType>("URL_REFERENCE");
  const [sourceLabelInput, setSourceLabelInput] = useState("");
  const [sourceOriginInput, setSourceOriginInput] = useState("");
  const [sourceProvenanceInput, setSourceProvenanceInput] = useState("");
  const sourceCounterRef = useRef(1);

  const selected = useMemo(() => versions.find((v) => v.id === selectedId) ?? versions[0], [versions, selectedId]);

  // A pending owner review note is scoped to the version it was written for.
  // selectVersion() below clears it in the same update as changing
  // selectedId so a new version can never render with another version's
  // note; this effect is defense-in-depth only, not the correctness path.
  useEffect(() => {
    setReviewNote("");
  }, [selectedId]);

  function selectVersion(id: string) {
    setReviewNote("");
    setSelectedId(id);
  }

  const comparisonTarget = useMemo(
    () => (selected.comparisonTargetId ? versions.find((v) => v.id === selected.comparisonTargetId) ?? null : null),
    [selected, versions]
  );

  const selectedVersionSource = useMemo(
    () => (selected.sourceId ? sourceRecords.find((s) => s.sourceId === selected.sourceId) ?? null : null),
    [selected, sourceRecords]
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
      sourceId: null,
      comparisonTargetId: selected.id,
      reviewStatus: `Draft — created locally from ${selected.id}, not yet submitted for owner review`,
    };
    setVersions((prev) => [...prev, draft]);
    selectVersion(newId);
    setLog((prev) =>
      [{ at: timestamp, message: `Created next DRAFT version ${newId} from ${selected.id} (local only)` }, ...prev].slice(0, 20)
    );
  }

  const sourceFormIncomplete =
    sourceLabelInput.trim().length === 0 || sourceOriginInput.trim().length === 0 || sourceProvenanceInput.trim().length === 0;

  function createSourceRecord(e: FormEvent) {
    e.preventDefault();
    if (sourceFormIncomplete) return;
    const n = sourceCounterRef.current;
    sourceCounterRef.current = n + 1;
    const timestamp = new Date().toISOString();
    const sourceId = `source-session-${n}`;
    const record: LocalSourceRecord = {
      sourceId,
      sourceType: sourceTypeInput,
      label: sourceLabelInput.trim(),
      originText: sourceOriginInput.trim(),
      provenanceNotes: sourceProvenanceInput.trim(),
      createdAt: timestamp,
      status: "UNVERIFIED_REFERENCE",
    };
    setSourceRecords((prev) => [record, ...prev]);
    setSelectedSourceId(sourceId);
    setSourceLabelInput("");
    setSourceOriginInput("");
    setSourceProvenanceInput("");
    setLog((prev) => [{ at: timestamp, message: `Added local source record ${sourceId} (${record.label}, local only)` }, ...prev].slice(0, 20));
  }

  function createDraftFromSelectedSource() {
    if (!selectedSourceId) return;
    const sourceRecord = sourceRecords.find((s) => s.sourceId === selectedSourceId);
    if (!sourceRecord) return;
    const n = draftCounterRef.current;
    draftCounterRef.current = n + 1;
    const timestamp = new Date().toISOString();
    const newId = `${selected.pageId}-source-draft-session-${n}`;
    // Lineage carries both sourceId and comparisonTargetId; status is always
    // DRAFT regardless of the parent version's status (never inherits
    // APPROVED).
    const draft: VisualVersion = {
      id: newId,
      pageId: selected.pageId,
      versionLabel: `New DRAFT ${n} (from source ${sourceRecord.label})`,
      status: "DRAFT",
      createdAt: timestamp,
      designNotes:
        "Editable local draft note — describe what changed from the parent version and the linked source. This text only exists in this browser tab and resets on reload.",
      sources: [...selected.sources],
      sourceId: sourceRecord.sourceId,
      comparisonTargetId: selected.id,
      reviewStatus: `Draft — created locally from source ${sourceRecord.sourceId} and parent ${selected.id}, not yet submitted for owner review`,
    };
    setVersions((prev) => [...prev, draft]);
    selectVersion(newId);
    setLog((prev) =>
      [
        { at: timestamp, message: `Created next DRAFT version ${newId} from source ${sourceRecord.sourceId} and parent ${selected.id} (local only)` },
        ...prev,
      ].slice(0, 20)
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
    const sourceId = selected.sourceId;
    const sourceType = sourceId ? sourceRecords.find((s) => s.sourceId === sourceId)?.sourceType ?? null : null;

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
        sourceId,
        sourceType,
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
        <strong>Internal preview — not a production page.</strong> This is a DRAFT v2/v3 slice of the
        owner Visual Workflow Console (issue #131) for explicit owner review — it does not replace or
        re-approve the v1 console or any legacy Health screen. Approve / Request changes / Mark
        reference only now require a non-empty owner review note and create a local structured
        decision record below. "Create next DRAFT version" creates a new in-memory version. The
        <strong> LOCAL_PREVIEW_ONLY Source Intake</strong> panel below records provenance metadata
        only — it never fetches URLs, uploads/reads files, generates images, or touches any existing
        asset bytes/manifest/SHA. Nothing on this page is written to a database, git, or the network —
        reload this page and every action (including source records, new drafts, edited notes and
        decision records) resets to the seed data.
      </div>

      <div className="vwc-header">
        <h1>Visual Workflow Console</h1>
        <span className="vwc-header-meta">v3 draft — local/mock review state only</span>
      </div>

      <section className="vwc-section vwc-source-intake-section">
        <div className="vwc-source-intake-badge">LOCAL_PREVIEW_ONLY — Source Intake</div>
        <h3>Local source intake</h3>
        <p className="vwc-source-intake-disclaimer">
          Records provenance metadata only. No URL is fetched, no file is uploaded or read, no image is
          generated, and no checksum/manifest/asset byte is computed or touched by this panel.
        </p>
        <form className="vwc-source-form" onSubmit={createSourceRecord}>
          <label className="vwc-source-field">
            <span>Source type</span>
            <select value={sourceTypeInput} onChange={(e) => setSourceTypeInput(e.target.value as SourceType)}>
              {SOURCE_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {SOURCE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="vwc-source-field">
            <span>Label</span>
            <input
              type="text"
              value={sourceLabelInput}
              onChange={(e) => setSourceLabelInput(e.target.value)}
              placeholder="Human-readable label"
              aria-label="Source label"
            />
          </label>
          <label className="vwc-source-field">
            <span>Source / origin</span>
            <input
              type="text"
              value={sourceOriginInput}
              onChange={(e) => setSourceOriginInput(e.target.value)}
              placeholder="URL, filename, or screenshot description (text only — not fetched/uploaded)"
              aria-label="Source origin text"
            />
          </label>
          <label className="vwc-source-field vwc-source-field-wide">
            <span>Provenance / review notes</span>
            <textarea
              value={sourceProvenanceInput}
              onChange={(e) => setSourceProvenanceInput(e.target.value)}
              rows={2}
              placeholder="Where this came from and why it's relevant to the versions above..."
              aria-label="Source provenance notes"
            />
          </label>
          <button type="submit" className="vwc-action-btn create-source" disabled={sourceFormIncomplete}>
            Add local source record
          </button>
          {sourceFormIncomplete && (
            <p className="vwc-note-hint vwc-source-field-wide">
              Fill in label, source/origin and provenance notes to add a source record.
            </p>
          )}
        </form>

        {sourceRecords.length === 0 ? (
          <p>No local source records yet this session.</p>
        ) : (
          <ul className="vwc-source-record-list">
            {sourceRecords.map((s) => (
              <li key={s.sourceId}>
                <button
                  type="button"
                  className={`vwc-source-record ${s.sourceId === selectedSourceId ? "is-selected" : ""}`.trim()}
                  onClick={() => setSelectedSourceId(s.sourceId)}
                >
                  <div className="vwc-source-record-header">
                    <span className="vwc-source-record-label">{s.label}</span>
                    <span className="vwc-badge status-UNVERIFIED_REFERENCE">{SOURCE_STATUS_LABELS[s.status]}</span>
                  </div>
                  <div className="vwc-version-id">source id: {s.sourceId}</div>
                  <div className="vwc-source-record-meta">
                    {SOURCE_TYPE_LABELS[s.sourceType]} — {s.originText}
                  </div>
                  <div className="vwc-source-record-meta">{s.provenanceNotes}</div>
                  <div className="vwc-source-record-meta">created {s.createdAt}</div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="vwc-actions">
          <button
            type="button"
            className="vwc-action-btn create-draft-from-source"
            disabled={!selectedSourceId}
            onClick={createDraftFromSelectedSource}
          >
            Create DRAFT from selected source (parent: {selected.id})
          </button>
        </div>
        {!selectedSourceId && (
          <p className="vwc-note-hint">
            Select a local source record above, and a parent version in the list below, to enable this.
          </p>
        )}
      </section>

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
                  onClick={() => selectVersion(v.id)}
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

            <div className="vwc-source-provenance">
              <div className="vwc-compare-column-title">Selected version source provenance</div>
              {selectedVersionSource ? (
                <div className="vwc-source-provenance-detail">
                  <div className="vwc-version-id">source id: {selectedVersionSource.sourceId}</div>
                  <span className="vwc-badge status-UNVERIFIED_REFERENCE">
                    {SOURCE_STATUS_LABELS[selectedVersionSource.status]}
                  </span>
                  <p>
                    {SOURCE_TYPE_LABELS[selectedVersionSource.sourceType]} — {selectedVersionSource.originText}
                  </p>
                  <p>{selectedVersionSource.provenanceNotes}</p>
                  <p>created {selectedVersionSource.createdAt}</p>
                </div>
              ) : (
                <p>No local source record linked to this version.</p>
              )}
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
                      <span>source_id</span>
                      <code>{d.sourceId ?? "null"}</code>
                      <span>source_type</span>
                      <code>{d.sourceType ?? "null"}</code>
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
