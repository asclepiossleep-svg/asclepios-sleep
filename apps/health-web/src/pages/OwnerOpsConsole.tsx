import { useMemo, useState } from "react";
import {
  actionLabel,
  applyDemoAction,
  applyExceptionAction,
  buildExceptionQueue,
  canApplyExceptionAction,
  canCompleteDemoRefund,
  canResolveFulfilmentException,
  collectInvariantViolations,
  DELIVERY_STATUS_LABELS,
  DEMO_ORDERS,
  DemoActionName,
  DemoEvent,
  DemoException,
  DemoOrder,
  ENTITLEMENT_STATUS_LABELS,
  EXCEPTION_OWNER_ROLE_LABELS,
  EXCEPTION_OWNER_ROLES,
  EXCEPTION_STATUS_LABELS,
  EXCEPTION_TYPE_LABELS,
  ExceptionOwnerRole,
  FULFILMENT_STATUS_LABELS,
  INVENTORY_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PROVIDER_ACK_NOT_CONNECTED,
  summarize,
  summarizeExceptions,
  SUPPORT_STATUS_LABELS,
} from "../data/opsConsole";
import "../styles/ops-console.css";

export default function OwnerOpsConsole() {
  const [orders, setOrders] = useState<DemoOrder[]>(DEMO_ORDERS);
  const [selectedId, setSelectedId] = useState<string>(DEMO_ORDERS[2].id);
  const [events, setEvents] = useState<DemoEvent[]>([]);

  const [exceptions, setExceptions] = useState<DemoException[]>(() => buildExceptionQueue(DEMO_ORDERS));
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [draftOwnerRole, setDraftOwnerRole] = useState<ExceptionOwnerRole | "">("");
  const [retryNote, setRetryNote] = useState("");
  const [reconcileNote, setReconcileNote] = useState("");

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? orders[0], [orders, selectedId]);
  const summary = useMemo(() => summarize(orders), [orders]);
  const invariantViolations = useMemo(() => collectInvariantViolations(orders), [orders]);

  const selectedException = useMemo(
    () => exceptions.find((e) => e.id === selectedExceptionId) ?? null,
    [exceptions, selectedExceptionId]
  );
  const exceptionSummary = useMemo(() => summarizeExceptions(exceptions), [exceptions]);

  function runAction(action: DemoActionName) {
    const { orders: nextOrders, event } = applyDemoAction(orders, selected.id, action);
    if (!event) return;
    setOrders(nextOrders);
    setEvents((prev) => [...prev, event]);
  }

  function selectException(exc: DemoException) {
    setSelectedExceptionId(exc.id);
    setDraftOwnerRole(exc.ownerRole ?? "");
    setRetryNote("");
    setReconcileNote("");
  }

  function runAssignOwner() {
    if (!selectedException || draftOwnerRole === "") return;
    const { exceptions: next, event } = applyExceptionAction(exceptions, selectedException.id, {
      action: "ASSIGN_OWNER",
      ownerRole: draftOwnerRole,
    });
    if (!event) return;
    setExceptions(next);
    setEvents((prev) => [...prev, event]);
  }

  function runRecordRetry() {
    if (!selectedException) return;
    const { exceptions: next, event } = applyExceptionAction(exceptions, selectedException.id, {
      action: "RECORD_RETRY",
      note: retryNote,
    });
    if (!event) return;
    setExceptions(next);
    setEvents((prev) => [...prev, event]);
    setRetryNote("");
  }

  function runReconcile() {
    if (!selectedException) return;
    const { exceptions: next, event } = applyExceptionAction(exceptions, selectedException.id, {
      action: "RECONCILE",
      note: reconcileNote,
    });
    if (!event) return;
    setExceptions(next);
    setEvents((prev) => [...prev, event]);
    setReconcileNote("");
  }

  return (
    <div className="ooc-root">
      <div className="ooc-banner">
        <strong>Internal preview — not a production page.</strong> This is the bounded v0 slice of the
        Owner Operations Console (issue #26). Every order below is a deterministic DEMO record — no
        real customer, order, payment, inventory, courier or entitlement system is connected. Status
        actions below update in-memory React state for this browser tab only — nothing here is written
        to a database, Shopify or git. Reload this page and every action resets to the seed data.
      </div>

      <div className="ooc-header">
        <h1>Owner Operations Console</h1>
        <span className="ooc-header-meta">v0 — DEMO dataset, local/session-only actions</span>
      </div>

      {invariantViolations.length > 0 && (
        <div className="ooc-invariant-warning" role="alert">
          <strong>Data integrity warning —</strong> this demo data is contradictory and needs review. Actions
          here never hide inconsistencies:
          <ul>
            {invariantViolations.map((v, i) => (
              <li key={i}>
                <span className="ooc-list-id">{v.orderId}</span> — {v.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ooc-summary">
        <div className="ooc-summary-card">
          <div className="ooc-summary-value">{summary.ordersNeedingAction}</div>
          <div className="ooc-summary-label">Orders needing action</div>
        </div>
        <div className="ooc-summary-card">
          <div className="ooc-summary-value">{summary.fulfilmentExceptions}</div>
          <div className="ooc-summary-label">Fulfilment exceptions</div>
        </div>
        <div className="ooc-summary-card">
          <div className="ooc-summary-value">{summary.returnsRefundsPending}</div>
          <div className="ooc-summary-label">Returns / refunds pending</div>
        </div>
      </div>

      <div className="ooc-layout">
        <div className="ooc-list" aria-label="Demo orders" role="table">
          <div className="ooc-list-head" role="row">
            <span>Order</span>
            <span>Product</span>
            <span>Order</span>
            <span>Fulfilment</span>
            <span>Support</span>
          </div>
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              role="row"
              className={`ooc-list-row ${o.id === selected.id ? "is-selected" : ""}`.trim()}
              onClick={() => setSelectedId(o.id)}
            >
              <span className="ooc-list-id">{o.id}</span>
              <span>{o.productName}</span>
              <span className={`ooc-chip status-${o.orderStatus}`}>{ORDER_STATUS_LABELS[o.orderStatus]}</span>
              <span className={`ooc-chip fulfilment-${o.fulfilmentStatus}`}>{FULFILMENT_STATUS_LABELS[o.fulfilmentStatus]}</span>
              <span className={`ooc-chip support-${o.supportStatus}`}>{SUPPORT_STATUS_LABELS[o.supportStatus]}</span>
            </button>
          ))}
        </div>

        <section className="ooc-detail">
          <div className="ooc-detail-header">
            <div>
              <h2>{selected.id}</h2>
              <div className="ooc-detail-sub">{selected.customerLabel} — {selected.productName}</div>
            </div>
          </div>

          <div className="ooc-chain">
            <div className="ooc-chain-step">
              <div className="ooc-chain-label">Order</div>
              <span className={`ooc-chip status-${selected.orderStatus}`}>{ORDER_STATUS_LABELS[selected.orderStatus]}</span>
            </div>
            <div className="ooc-chain-step">
              <div className="ooc-chain-label">Payment</div>
              <span className={`ooc-chip payment-${selected.paymentStatus}`}>{PAYMENT_STATUS_LABELS[selected.paymentStatus]}</span>
            </div>
            <div className="ooc-chain-step">
              <div className="ooc-chain-label">Inventory</div>
              <span className={`ooc-chip inventory-${selected.inventoryStatus}`}>{INVENTORY_STATUS_LABELS[selected.inventoryStatus]}</span>
            </div>
            <div className="ooc-chain-step">
              <div className="ooc-chain-label">Fulfilment</div>
              <span className={`ooc-chip fulfilment-${selected.fulfilmentStatus}`}>{FULFILMENT_STATUS_LABELS[selected.fulfilmentStatus]}</span>
            </div>
            <div className="ooc-chain-step">
              <div className="ooc-chain-label">Delivery</div>
              <span className={`ooc-chip delivery-${selected.deliveryStatus}`}>{DELIVERY_STATUS_LABELS[selected.deliveryStatus]}</span>
            </div>
            <div className="ooc-chain-step">
              <div className="ooc-chain-label">Entitlement</div>
              <span className={`ooc-chip entitlement-${selected.entitlementStatus}`}>{ENTITLEMENT_STATUS_LABELS[selected.entitlementStatus]}</span>
            </div>
            <div className="ooc-chain-step">
              <div className="ooc-chain-label">Support</div>
              <span className={`ooc-chip support-${selected.supportStatus}`}>{SUPPORT_STATUS_LABELS[selected.supportStatus]}</span>
            </div>
          </div>

          {selected.deliveryNote && (
            <div className="ooc-section">
              <h3>Delivery / exception note</h3>
              <p>{selected.deliveryNote}</p>
            </div>
          )}

          {selected.supportNote && (
            <div className="ooc-section">
              <h3>Support / return / refund note</h3>
              <p>{selected.supportNote}</p>
            </div>
          )}

          <div className="ooc-section">
            <h3>Timeline (DEMO)</h3>
            <ul className="ooc-timeline">
              {selected.timeline.map((ev, i) => (
                <li key={i}>
                  <span className="ooc-timeline-at">{ev.at}</span> — {ev.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="ooc-section ooc-not-yet">
            <h3>Honest status: demo-only vs. requires integration</h3>
            <ul>
              <li>Demo-only now: every field on this page, including status chips, the timeline and the three summary counts above.</li>
              <li>Requires persistence later: any action button here must become a real write to a canonical order/support record instead of local React state.</li>
              <li>Requires integration later: order/payment truth from the checkout+payment provider, inventory truth from the SKU/location ledger, fulfilment/courier truth from the 3PL handoff, and entitlement/activation truth from the QR/activation service.</li>
              <li>Never shown here: price, stock quantity, tax, SKU/barcode, courier name, warehouse, shipping dimensions or any real customer data — these stay unconfirmed per docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md.</li>
            </ul>
          </div>

          <div className="ooc-actions">
            <button
              type="button"
              className="ooc-action-btn"
              disabled={!canResolveFulfilmentException(selected)}
              onClick={() => runAction("RESOLVE_FULFILMENT_EXCEPTION")}
            >
              Resolve fulfilment exception (local only)
            </button>
            <button
              type="button"
              className="ooc-action-btn"
              disabled={!canCompleteDemoRefund(selected)}
              onClick={() => runAction("COMPLETE_DEMO_REFUND")}
            >
              Complete demo refund (local only)
            </button>
          </div>
        </section>
      </div>

      <div className="oeq-root">
        <div className="ooc-header">
          <h2>Exception ownership &amp; reconciliation queue</h2>
          <span className="ooc-header-meta">DEMO · derived from the orders above · LOCAL_PREVIEW_ONLY</span>
        </div>

        <div className="ooc-summary">
          <div className="ooc-summary-card">
            <div className="ooc-summary-value">{exceptionSummary.open}</div>
            <div className="ooc-summary-label">Open</div>
          </div>
          <div className="ooc-summary-card">
            <div className="ooc-summary-value">{exceptionSummary.retryRecorded}</div>
            <div className="ooc-summary-label">Retry recorded</div>
          </div>
          <div className="ooc-summary-card">
            <div className="ooc-summary-value">{exceptionSummary.reconciled}</div>
            <div className="ooc-summary-label">Reconciled</div>
          </div>
        </div>

        <div className="ooc-layout">
          <div className="oeq-list" aria-label="Demo exceptions" role="table">
            <div className="ooc-list-head oeq-list-row" role="row">
              <span>Exception</span>
              <span>Order</span>
              <span>Type</span>
              <span>Owner</span>
              <span>Status</span>
              <span>Provider ack</span>
            </div>
            {exceptions.map((exc) => (
              <button
                key={exc.id}
                type="button"
                role="row"
                className={`ooc-list-row oeq-list-row ${exc.id === selectedExceptionId ? "is-selected" : ""}`.trim()}
                onClick={() => selectException(exc)}
              >
                <span className="ooc-list-id">{exc.id}</span>
                <span className="ooc-list-id">{exc.orderId}</span>
                <span>{EXCEPTION_TYPE_LABELS[exc.type]}</span>
                <span className={`ooc-chip oeq-owner-${exc.ownerRole ?? "UNASSIGNED"}`}>
                  {exc.ownerRole ? EXCEPTION_OWNER_ROLE_LABELS[exc.ownerRole] : "Unassigned"}
                </span>
                <span className={`ooc-chip oeq-status-${exc.status}`}>{EXCEPTION_STATUS_LABELS[exc.status]}</span>
                <span className="ooc-chip oeq-provider-ack">{PROVIDER_ACK_NOT_CONNECTED}</span>
              </button>
            ))}
            {exceptions.length === 0 && <p className="oeq-empty">No exceptions derived from the current demo orders.</p>}
          </div>

          <section className="ooc-detail">
            {!selectedException ? (
              <p className="oeq-empty">Select an exception on the left to assign an owner, record a retry, or reconcile it.</p>
            ) : (
              <>
                <div className="ooc-detail-header">
                  <div>
                    <h3>{selectedException.id}</h3>
                    <div className="ooc-detail-sub">
                      Order <span className="ooc-list-id">{selectedException.orderId}</span> —{" "}
                      {EXCEPTION_TYPE_LABELS[selectedException.type]}
                    </div>
                  </div>
                </div>

                <div className="ooc-chain">
                  <div className="ooc-chain-step">
                    <div className="ooc-chain-label">Status</div>
                    <span className={`ooc-chip oeq-status-${selectedException.status}`}>
                      {EXCEPTION_STATUS_LABELS[selectedException.status]}
                    </span>
                  </div>
                  <div className="ooc-chain-step">
                    <div className="ooc-chain-label">Owner</div>
                    <span className={`ooc-chip oeq-owner-${selectedException.ownerRole ?? "UNASSIGNED"}`}>
                      {selectedException.ownerRole ? EXCEPTION_OWNER_ROLE_LABELS[selectedException.ownerRole] : "Unassigned"}
                    </span>
                  </div>
                  <div className="ooc-chain-step">
                    <div className="ooc-chain-label">Provider ack</div>
                    <span className="ooc-chip oeq-provider-ack">{selectedException.providerAck}</span>
                  </div>
                  <div className="ooc-chain-step">
                    <div className="ooc-chain-label">Scope</div>
                    <span className="ooc-chip oeq-scope">{selectedException.scope}</span>
                  </div>
                </div>

                <div className="ooc-section">
                  <h3>Last local attempt</h3>
                  <p>{selectedException.lastAttemptAt ? `${selectedException.lastAttemptAt} · outcome SIMULATED_ONLY` : "Not yet attempted (local demo)."}</p>
                </div>

                <div className="ooc-section">
                  <h3>Next-action note</h3>
                  <p>{selectedException.nextActionNote}</p>
                </div>

                {selectedException.status === "RECONCILED" && (
                  <div className="ooc-section oeq-reconciled-banner">
                    <h3>Reconciled — retained for record</h3>
                    <p>{selectedException.reconciliationNote}</p>
                  </div>
                )}

                <div className="oeq-actions">
                  <div className="oeq-action-group">
                    <label htmlFor="oeq-owner-select">Assign / change demo owner role</label>
                    <div className="oeq-action-row">
                      <select
                        id="oeq-owner-select"
                        value={draftOwnerRole}
                        disabled={selectedException.status === "RECONCILED"}
                        onChange={(e) => setDraftOwnerRole(e.target.value as ExceptionOwnerRole | "")}
                      >
                        <option value="">Choose a role…</option>
                        {EXCEPTION_OWNER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {EXCEPTION_OWNER_ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="ooc-action-btn"
                        disabled={
                          draftOwnerRole === "" ||
                          !canApplyExceptionAction(selectedException, { action: "ASSIGN_OWNER", ownerRole: draftOwnerRole || "DEMO_OPS" })
                        }
                        onClick={runAssignOwner}
                      >
                        Assign owner
                      </button>
                    </div>
                  </div>

                  <div className="oeq-action-group">
                    <label htmlFor="oeq-retry-note">Record a local retry attempt (operator note required)</label>
                    <div className="oeq-action-row">
                      <textarea
                        id="oeq-retry-note"
                        rows={2}
                        placeholder="What did you try? (local demo note, outcome will be recorded as SIMULATED_ONLY)"
                        value={retryNote}
                        disabled={selectedException.status === "RECONCILED"}
                        onChange={(e) => setRetryNote(e.target.value)}
                      />
                      <button
                        type="button"
                        className="ooc-action-btn"
                        disabled={!canApplyExceptionAction(selectedException, { action: "RECORD_RETRY", note: retryNote })}
                        onClick={runRecordRetry}
                      >
                        Record retry (SIMULATED_ONLY)
                      </button>
                    </div>
                  </div>

                  <div className="oeq-action-group">
                    <label htmlFor="oeq-reconcile-note">Mark locally reconciled (reconciliation note required)</label>
                    <div className="oeq-action-row">
                      <textarea
                        id="oeq-reconcile-note"
                        rows={2}
                        placeholder="Reconciliation note (required) — retained visibly after reconciling"
                        value={reconcileNote}
                        disabled={selectedException.status === "RECONCILED"}
                        onChange={(e) => setReconcileNote(e.target.value)}
                      />
                      <button
                        type="button"
                        className="ooc-action-btn"
                        disabled={!canApplyExceptionAction(selectedException, { action: "RECONCILE", note: reconcileNote })}
                        onClick={runReconcile}
                      >
                        Mark reconciled
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ooc-section">
                  <h3>History ({selectedException.history.length})</h3>
                  {selectedException.history.length === 0 ? (
                    <p>No local actions taken on this exception yet.</p>
                  ) : (
                    <ul className="ooc-timeline">
                      {selectedException.history.map((h, i) => (
                        <li key={i}>
                          <span className="ooc-timeline-at">{h.at}</span> — {h.note}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <div className="ooc-events">
        <h3>Local event timeline ({events.length})</h3>
        <p className="ooc-events-note">
          Every action above and every exception-queue action below is recorded here with a generated event
          ID, timestamp, actor, and an exact before/after state snapshot, scope <code>LOCAL_PREVIEW_ONLY</code>.
          Reloading this page removes every event here and restores the original seeded demo orders and
          exception queue — every locally assigned owner, retry attempt and reconciliation note is discarded.
        </p>
        {events.length === 0 ? (
          <p>No demo actions taken yet this session.</p>
        ) : (
          <ul className="ooc-event-list">
            {events.map((ev) => (
              <li key={ev.id} className="ooc-event-item">
                <div className="ooc-event-head">
                  <span className="ooc-list-id">{ev.id}</span>
                  <span className="ooc-event-at">{ev.at}</span>
                </div>
                <div className="ooc-event-meta">
                  <strong>{actionLabel(ev.action)}</strong> — order{" "}
                  <span className="ooc-list-id">{ev.orderId}</span>
                  {ev.exceptionId && (
                    <>
                      {" "}
                      — exception <span className="ooc-list-id">{ev.exceptionId}</span>
                    </>
                  )}{" "}
                  — actor {ev.actor} — scope {ev.scope}
                </div>
                <details className="ooc-event-snapshot">
                  <summary>Before / after state snapshot</summary>
                  <pre>{JSON.stringify({ before: ev.before, after: ev.after }, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
