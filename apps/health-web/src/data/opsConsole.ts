// DEMO data for the owner-facing Operations Console (issue #26, v0 slice).
// This is NOT a production data source: no order/payment/inventory/
// fulfilment/entitlement/support system is wired yet, so every record here
// is a static DEMO seed and every action in the console mutates an
// in-memory copy only (see OwnerOpsConsole.tsx). Reloading the page resets
// everything back to this seed.
//
// Status vocabulary is taken verbatim from the canonical commerce docs
// already agreed for this product (docs/company/
// COMMERCE_C1_SCHEMA_IMPLEMENTATION_SPEC_V1.md §3 for OrderStatus/
// PaymentStatus, docs/company/CANONICAL_COMMERCE_DATA_REPORTING_MAP_V1.md
// §3 for Fulfilment/Shipment/Return/Refund field shape) rather than
// invented here, so a future real implementation can reuse these names
// without a rename. Inventory/fulfilment/delivery/entitlement statuses are
// qualitative labels only: per docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md,
// price, stock quantity, tax, SKU/barcode, courier, warehouse and shipping
// dimensions are never invented ahead of owner confirmation, so no numeric
// stock or real commercial fields appear here.

export type OrderStatus =
  | "DRAFT"
  | "PAYMENT_PENDING"
  | "PAID"
  | "FULFILMENT_QUEUED"
  | "PICKING"
  | "DISPATCHED"
  | "DELIVERED"
  | "PAYMENT_FAILED"
  | "ON_HOLD"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "LOST_DAMAGED";

export type PaymentStatus = "INITIATED" | "AUTHORISED" | "PAID" | "FAILED" | "CANCELLED" | "PARTIALLY_REFUNDED" | "REFUNDED";

// Qualitative only — no InventoryPosition.available/committed/on_hand
// numbers are invented, per docs/sum/10_PRODUCT_TRUTH_GOVERNANCE.md.
export type InventoryStatus = "NOT_COMMITTED" | "COMMITTED" | "BACKORDER_FLAGGED" | "RELEASED";

// Mirrors the Fulfilment model's queued_at/accepted_at/picking_at/
// dispatched_at/delivered_at timestamps (CANONICAL_COMMERCE_DATA_REPORTING_MAP_V1 §3).
export type FulfilmentStatus = "NOT_QUEUED" | "QUEUED" | "ACCEPTED" | "PICKING" | "DISPATCHED" | "DELIVERED" | "REJECTED";

// Mirrors the Shipment model's status + exception_code (same doc).
export type DeliveryStatus = "NOT_DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | "DELAYED" | "EXCEPTION";

// ActivationCode/Membership status is not canonically enumerated yet
// (same doc §3) — these are illustrative, not drawn from a fixed vocabulary.
export type EntitlementStatus = "NOT_ISSUED" | "ACTIVATION_PENDING" | "ACTIVATED" | "EXPIRED";

// Combines CSCase + Return + Refund into one v0 "support" lane. The refund
// sub-states reuse canonical RefundStatus naming (REQUESTED/PENDING/
// SUCCEEDED) from COMMERCE_C1_SCHEMA_IMPLEMENTATION_SPEC_V1 §3.
export type SupportStatus = "NONE" | "CASE_OPEN" | "RETURN_REQUESTED" | "REFUND_PENDING" | "REFUND_SUCCEEDED";

export const PHASE1_PRODUCT_NAMES = ["SLEEPTAPE™ Nasal Strips", "DAY MODE™", "REST & SLEEP MODE™"] as const;
export type Phase1ProductName = (typeof PHASE1_PRODUCT_NAMES)[number];

export interface TimelineEvent {
  at: string;
  label: string;
}

export interface DemoOrder {
  id: string;
  customerLabel: string;
  productName: Phase1ProductName;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  inventoryStatus: InventoryStatus;
  fulfilmentStatus: FulfilmentStatus;
  deliveryStatus: DeliveryStatus;
  deliveryNote: string | null;
  entitlementStatus: EntitlementStatus;
  supportStatus: SupportStatus;
  supportNote: string | null;
  timeline: TimelineEvent[];
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  PAYMENT_PENDING: "Payment pending",
  PAID: "Paid",
  FULFILMENT_QUEUED: "Fulfilment queued",
  PICKING: "Picking",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  PAYMENT_FAILED: "Payment failed",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  REFUND_PENDING: "Refund pending",
  REFUNDED: "Refunded",
  LOST_DAMAGED: "Lost / damaged",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  INITIATED: "Initiated",
  AUTHORISED: "Authorised",
  PAID: "Paid",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  NOT_COMMITTED: "Not committed",
  COMMITTED: "Committed",
  BACKORDER_FLAGGED: "Backorder flagged",
  RELEASED: "Released",
};

export const FULFILMENT_STATUS_LABELS: Record<FulfilmentStatus, string> = {
  NOT_QUEUED: "Not queued",
  QUEUED: "Queued",
  ACCEPTED: "Accepted",
  PICKING: "Picking",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  REJECTED: "Rejected",
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  NOT_DISPATCHED: "Not dispatched",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  DELAYED: "Delayed",
  EXCEPTION: "Exception",
};

export const ENTITLEMENT_STATUS_LABELS: Record<EntitlementStatus, string> = {
  NOT_ISSUED: "Not issued",
  ACTIVATION_PENDING: "Activation pending",
  ACTIVATED: "Activated",
  EXPIRED: "Expired",
};

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  NONE: "None",
  CASE_OPEN: "Case open",
  RETURN_REQUESTED: "Return requested",
  REFUND_PENDING: "Refund pending",
  REFUND_SUCCEEDED: "Refund succeeded",
};

// Seven DEMO orders, each illustrating a different point in the SUM
// whole-system operating loop (docs/sum/00 §2): order -> payment ->
// inventory -> fulfilment -> courier/delivery -> entitlement/activation ->
// support/return/refund. Customer labels are placeholders, never real
// customer data.
export const DEMO_ORDERS: DemoOrder[] = [
  {
    id: "DEMO-ORD-1001",
    customerLabel: "Demo Customer A",
    productName: "SLEEPTAPE™ Nasal Strips",
    orderStatus: "DELIVERED",
    paymentStatus: "PAID",
    inventoryStatus: "COMMITTED",
    fulfilmentStatus: "DELIVERED",
    deliveryStatus: "DELIVERED",
    deliveryNote: "Clean happy-path reference run — no exceptions at any stage.",
    entitlementStatus: "ACTIVATED",
    supportStatus: "NONE",
    supportNote: null,
    timeline: [
      { at: "Day 0", label: "Order placed, payment captured" },
      { at: "Day 0", label: "Inventory committed, order queued for fulfilment" },
      { at: "Day 1", label: "Fulfilment accepted, shipment dispatched" },
      { at: "Day 3", label: "Delivered" },
      { at: "Day 3", label: "QR activation succeeded, entitlement activated" },
    ],
  },
  {
    id: "DEMO-ORD-1002",
    customerLabel: "Demo Customer B",
    productName: "DAY MODE™",
    orderStatus: "FULFILMENT_QUEUED",
    paymentStatus: "PAID",
    inventoryStatus: "COMMITTED",
    fulfilmentStatus: "QUEUED",
    deliveryStatus: "NOT_DISPATCHED",
    deliveryNote: null,
    entitlementStatus: "NOT_ISSUED",
    supportStatus: "NONE",
    supportNote: null,
    timeline: [
      { at: "Day 0", label: "Order placed, payment captured" },
      { at: "Day 0", label: "Inventory committed, fulfilment handoff queued" },
    ],
  },
  {
    id: "DEMO-ORD-1003",
    customerLabel: "Demo Customer C",
    productName: "REST & SLEEP MODE™",
    orderStatus: "ON_HOLD",
    paymentStatus: "PAID",
    inventoryStatus: "COMMITTED",
    fulfilmentStatus: "REJECTED",
    deliveryStatus: "EXCEPTION",
    deliveryNote: "Fulfilment handoff was not acknowledged within the expected window — needs owner/ops review.",
    entitlementStatus: "NOT_ISSUED",
    supportStatus: "CASE_OPEN",
    supportNote: "Customer opened a case asking where their order is.",
    timeline: [
      { at: "Day 0", label: "Order placed, payment captured" },
      { at: "Day 1", label: "Fulfilment handoff requested" },
      { at: "Day 4", label: "No fulfilment acknowledgement received — order placed on hold" },
      { at: "Day 4", label: "Support case opened by customer" },
    ],
  },
  {
    id: "DEMO-ORD-1004",
    customerLabel: "Demo Customer D",
    productName: "SLEEPTAPE™ Nasal Strips",
    orderStatus: "DISPATCHED",
    paymentStatus: "PAID",
    inventoryStatus: "COMMITTED",
    fulfilmentStatus: "DISPATCHED",
    deliveryStatus: "DELAYED",
    deliveryNote: "Courier tracking shows an in-transit delay — not yet delivered.",
    entitlementStatus: "ACTIVATION_PENDING",
    supportStatus: "NONE",
    supportNote: null,
    timeline: [
      { at: "Day 0", label: "Order placed, payment captured" },
      { at: "Day 1", label: "Fulfilment accepted, shipment dispatched" },
      { at: "Day 2", label: "Delivery delay reported in transit" },
    ],
  },
  {
    id: "DEMO-ORD-1005",
    customerLabel: "Demo Customer E",
    productName: "DAY MODE™",
    orderStatus: "RETURN_REQUESTED",
    paymentStatus: "PAID",
    inventoryStatus: "COMMITTED",
    fulfilmentStatus: "DELIVERED",
    deliveryStatus: "DELIVERED",
    deliveryNote: null,
    entitlementStatus: "ACTIVATED",
    supportStatus: "RETURN_REQUESTED",
    supportNote: "Customer requested a return after delivery; refund not yet processed.",
    timeline: [
      { at: "Day 0", label: "Order placed, payment captured" },
      { at: "Day 2", label: "Delivered, entitlement activated" },
      { at: "Day 6", label: "Customer requested a return" },
    ],
  },
  {
    id: "DEMO-ORD-1006",
    customerLabel: "Demo Customer F",
    productName: "REST & SLEEP MODE™",
    orderStatus: "REFUNDED",
    paymentStatus: "REFUNDED",
    inventoryStatus: "RELEASED",
    fulfilmentStatus: "NOT_QUEUED",
    deliveryStatus: "NOT_DISPATCHED",
    deliveryNote: null,
    entitlementStatus: "NOT_ISSUED",
    supportStatus: "REFUND_SUCCEEDED",
    supportNote: "Customer cancelled before fulfilment; refund succeeded and inventory released.",
    timeline: [
      { at: "Day 0", label: "Order placed, payment captured" },
      { at: "Day 1", label: "Customer requested cancellation before fulfilment handoff" },
      { at: "Day 1", label: "Refund succeeded, inventory released" },
    ],
  },
  {
    id: "DEMO-ORD-1007",
    customerLabel: "Demo Customer G",
    productName: "SLEEPTAPE™ Nasal Strips",
    orderStatus: "PAYMENT_FAILED",
    paymentStatus: "FAILED",
    inventoryStatus: "BACKORDER_FLAGGED",
    fulfilmentStatus: "NOT_QUEUED",
    deliveryStatus: "NOT_DISPATCHED",
    deliveryNote: null,
    entitlementStatus: "NOT_ISSUED",
    supportStatus: "CASE_OPEN",
    supportNote: "Customer followed up after payment capture failed; order is stuck pending owner/ops review.",
    timeline: [
      { at: "Day 0", label: "Order placed, payment capture failed" },
      { at: "Day 0", label: "Inventory flagged on backorder pending payment resolution" },
      { at: "Day 2", label: "Support case opened by customer" },
    ],
  },
];

export interface OrderSummary {
  ordersNeedingAction: number;
  fulfilmentExceptions: number;
  returnsRefundsPending: number;
}

export function summarize(orders: DemoOrder[]): OrderSummary {
  const fulfilmentExceptions = orders.filter(
    (o) => o.fulfilmentStatus === "REJECTED" || o.deliveryStatus === "EXCEPTION"
  ).length;
  const returnsRefundsPending = orders.filter(
    (o) => o.supportStatus === "RETURN_REQUESTED" || o.supportStatus === "REFUND_PENDING"
  ).length;
  const ordersNeedingAction = orders.filter(
    (o) =>
      o.orderStatus === "ON_HOLD" ||
      o.orderStatus === "PAYMENT_FAILED" ||
      o.fulfilmentStatus === "REJECTED" ||
      o.deliveryStatus === "EXCEPTION" ||
      o.supportStatus === "CASE_OPEN" ||
      o.supportStatus === "RETURN_REQUESTED" ||
      o.supportStatus === "REFUND_PENDING"
  ).length;
  return { ordersNeedingAction, fulfilmentExceptions, returnsRefundsPending };
}
