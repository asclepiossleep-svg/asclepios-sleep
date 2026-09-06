# Asclepios Sleep — Payment & Order Operations Control V1

Status: ACTIVE DRAFT — launch architecture ready; provider/account/fees/tax settings remain owner/commercial decisions.
Owner: Amanda / CEO Office
Purpose: make the commercial order path operational before final stock arrives, so the system can be tested end-to-end and activated quickly once products, merchant accounts and fulfilment are ready.

## 1. Launch principle
Physical stock arriving must not be the point at which commerce architecture starts.
The target state is:
VISITOR -> PRODUCT -> CART -> CHECKOUT -> PAYMENT ATTEMPT -> ORDER -> CONFIRMATION -> FULFILMENT -> TRACKING -> DELIVERY -> RETURN/REFUND/CS -> REPORTING.

All pre-launch testing must work safely without pretending a real payment or real stock transaction has occurred.

## 2. Canonical order lifecycle
Order states:
- DRAFT
- CART_READY
- CHECKOUT_STARTED
- PAYMENT_PENDING
- PAYMENT_AUTHORISED
- PAYMENT_FAILED
- ORDER_CONFIRMED
- FULFILMENT_HOLD
- READY_TO_FULFIL
- FULFILMENT_ACCEPTED
- SHIPPED
- DELIVERED
- RETURN_REQUESTED
- RETURN_IN_TRANSIT
- RETURN_RECEIVED
- REFUND_PENDING
- REFUNDED
- CANCELLED
- MANUAL_REVIEW

No UI should expose technical codes directly; customer-facing copy should translate these into calm plain language.

## 3. Payment state machine
Payment states:
- NOT_STARTED
- INITIATED
- REQUIRES_CUSTOMER_ACTION
- AUTHORISED
- CAPTURED
- FAILED
- CANCELLED
- PARTIALLY_REFUNDED
- REFUNDED
- DISPUTED

Rules:
1. An order must not be marked confirmed solely because the customer tapped Pay.
2. The canonical order confirmation requires trusted payment success evidence from the payment provider or approved test adapter.
3. Duplicate callbacks/webhooks must be idempotent.
4. A browser refresh or user Back action must not accidentally create a second order.
5. Payment failure must preserve the cart and allow calm retry.
6. Unknown/ambiguous payment state goes to MANUAL_REVIEW; never guess success.
7. Refund state must be linked to the original payment transaction.

## 4. Provider abstraction
Commerce UI and order logic must not be tightly coupled to one processor.
Required provider interface concept:
- createPaymentIntent/order payment session
- confirm/authorise
- capture where applicable
- retrieve status
- refund full/partial
- verify webhook/event signature
- map provider event -> canonical payment state

Initial implementation may use a safe TEST / PLACEHOLDER adapter until an approved merchant account is connected.

Do not hard-code a final provider, fee, settlement currency, tax setting or production credential before approval.

## 5. Checkout data minimum
Customer:
- email
- name
- optional phone only where operationally useful

Shipping:
- recipient
- address line(s)
- city
- postal code
- country
- delivery method

Order:
- SKU/product reference
- quantity
- unit price snapshot
- subtotal
- discount snapshot if any
- shipping snapshot
- tax snapshot
- total
- currency
- order status
- payment status
- fulfilment status
- timestamps

Every confirmed order stores a price/fee/tax snapshot; historical orders must not change when catalogue pricing changes later.

## 6. Stock and sale availability
Product availability states:
- DRAFT
- COMING_SOON
- WAITLIST_ONLY
- AVAILABLE
- LOW_STOCK
- OUT_OF_STOCK
- PAUSED
- DISCONTINUED

Rules:
- COMING_SOON must not look purchasable.
- AVAILABLE requires stock/fulfilment readiness and approved commercial settings.
- OUT_OF_STOCK retains product education and optional restock interest capture.
- Do not oversell merely because website inventory is stale; reservation/deduction rules must be explicit before production launch.

## 7. Customer-visible checkout journey
1. Product page — understand product, suitability/safety, price when approved.
2. Add to cart.
3. Cart — quantity, subtotal, clear edit/remove.
4. Checkout — contact + shipping.
5. Delivery choice — only actual available services.
6. Payment.
7. Processing state — prevent repeated tapping.
8. Confirmation — unique order reference, summary, what happens next.
9. Tracking/status page or email link.

UX rules:
- no forced app login to buy physical products unless later approved for a clear reason;
- never lose cart on ordinary Back/refresh;
- form errors must explain exactly what needs fixing;
- mobile keyboard/input types should match field type;
- older-user readable text and touch targets;
- no dead-end payment failure screen.

## 8. Order confirmation content
Confirmation must contain:
- success/received message only when canonical success is known;
- order reference;
- purchased items;
- delivery address summary;
- amount paid or safe test wording in non-production mode;
- expected next step;
- how to get help;
- no invented dispatch date.

If fulfilment timing is not yet known, say the order is received and that tracking/dispatch confirmation will follow.

## 9. Exception control
### Payment failed
- preserve cart;
- show retry/change method;
- do not create duplicate confirmed order;
- repeated failure -> CS/support option.

### Customer charged but confirmation missing
- payment lookup by provider transaction + customer/order correlation;
- do not ask customer to pay again until status is checked;
- MANUAL_REVIEW if unresolved.

### Duplicate payment suspicion
- freeze duplicate fulfilment;
- correlate transactions/orders;
- refund/cancel according to verified state;
- log incident.

### Price changed during checkout
- use explicit price snapshot policy;
- if checkout session expired, clearly ask customer to review updated total before paying.

### Address issue after payment
- if not yet handed to fulfilment, controlled amendment path;
- once shipped, do not pretend editable; route to carrier/CS rules.

### Stock conflict after payment
- FULFILMENT_HOLD;
- notify operations;
- customer receives a clear resolution path: delay, substitute only with consent, or refund.

### Webhook/provider outage
- orders remain PAYMENT_PENDING / MANUAL_REVIEW;
- reconciliation job checks provider state;
- no automatic fulfilment from uncertain payment.

## 10. Refund/cancellation control
Cancellation eligibility depends on fulfilment state and commercial policy.

Minimum operational controls:
- customer cancellation request logged;
- staff/automation verifies shipment state;
- refund amount calculated from policy + actual order snapshot;
- payment refund initiated once;
- refund provider reference stored;
- customer notified;
- order status reconciled.

Never mark REFUNDED merely because refund was requested.

## 11. Daily reconciliation
Daily automated/operational checks should reconcile:
- confirmed orders vs successful captured payments;
- captured payments without confirmed order;
- refunds requested vs refunds completed;
- fulfilment released only for trusted payment state;
- duplicate transactions;
- orders stuck in PAYMENT_PENDING;
- orders stuck in FULFILMENT_HOLD;
- failed webhook/event processing.

Exceptions produce an owner/operations dashboard alert, not silent failure.

## 12. Launch dashboard metrics
Minimum business view:
- visits -> product views -> add-to-cart -> checkout-started -> payment-success -> order-confirmed conversion;
- gross orders and net paid orders;
- payment failure rate;
- average order value;
- refund rate;
- fulfilment hold count;
- orders awaiting shipment;
- delivery exceptions;
- CS cases per 100 orders;
- stock cover / low-stock alerts when inventory is live.

No metric should claim revenue until successful payment/capture rules are defined.

## 13. Test mode acceptance
Before production payment activation, a safe test flow must allow:
- successful mock payment;
- failed payment;
- customer cancels payment;
- double-click Pay;
- refresh during payment;
- duplicate event callback;
- payment succeeds but browser closes before confirmation;
- stock becomes unavailable between cart and checkout;
- refund flow;
- order-status refresh/reopen.

All test orders must be unmistakably non-production and excluded from real operational/revenue reporting.

## 14. Production launch gate
Do not turn on real paid checkout until all are true:
- final saleable SKU identity confirmed;
- price/currency/tax policy confirmed;
- merchant/payment account approved and connected;
- production credentials secured outside repository;
- webhook/event verification live;
- return/refund policy approved;
- shipping services/fees/zones approved;
- fulfilment handoff tested;
- stock availability source defined;
- order emails/CS route tested;
- reconciliation tested;
- owner approves production payment activation.

## 15. Implementation handoff priorities
Rex implementation order:
1. catalogue/product shell independent of final stock;
2. cart persistence;
3. checkout shell;
4. canonical Order + Payment states;
5. safe test payment adapter;
6. confirmation/status UX;
7. exception/retry UX;
8. fulfilment handoff hooks;
9. reconciliation/reporting hooks;
10. production provider connection only after owner/commercial approval.

Definition of Done remains UX-first: technical states alone are insufficient; the actual staging journey must be obvious and recoverable for a first-time mobile user.