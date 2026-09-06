# Asclepios Sleep — Launch Customer Service Operating Package V1

Owner: Amanda
Status: ACTIVE DESIGN CHECKPOINT — launch-operating baseline
Priority: Gate 6 Customer Service / business-launch readiness

## Purpose
Create one controlled customer-service operating baseline so Asclepios can support customers from first commercial order without improvising product, payment, delivery, return/refund or safety answers.

This package does not replace final legal/regulatory review, merchant/refund policy, fulfilment SLA or final product IFU. Unknown commercial facts stay PENDING rather than being guessed.

---

## 1. CS operating principle

CUSTOMER CONTACT -> IDENTIFY CASE TYPE -> LINK CUSTOMER / ORDER / SKU -> USE APPROVED KNOWLEDGE -> TAKE PERMITTED ACTION -> ESCALATE EXCEPTION IF NEEDED -> RECORD OUTCOME -> FEED REPEATED SIGNALS BACK TO PRODUCT / OPERATIONS / GROWTH.

Rules:
- Never invent product claims, delivery promises, refund entitlements or medical advice.
- Use canonical Product Knowledge Objects for product/use answers.
- Use canonical order/payment/fulfilment state for transaction answers.
- Customer Service may request operational/financial actions under policy but must not rewrite immutable payment/order history.
- Safety concerns override selling/conversion goals.

---

## 2. Launch contact categories

Every contact should be classified into one primary category and optional secondary tag.

1. PRE_SALE_PRODUCT — what product is / suitability / differences / stock / price.
2. PRODUCT_USE — how to use / routine / comfort / adherence.
3. PRODUCT_SAFETY — breathing concern / allergy / adverse use / contraindication uncertainty.
4. PAYMENT — failed payment / duplicate-looking charge / receipt / payment status.
5. ORDER_STATUS — confirmation / order not found / amendment request.
6. FULFILMENT — picking / dispatch / tracking / carrier delay.
7. LOST_DAMAGED — lost parcel / damaged parcel / wrong or missing item.
8. CANCELLATION — cancellation before fulfilment where policy permits.
9. RETURN — return eligibility / instructions / receipt.
10. REFUND — refund request / pending / mismatch.
11. ACCOUNT_MEMBERSHIP — account / QR / activation / entitlement.
12. APP_TECHNICAL — sign-in / PWA / app flow / bug.
13. COMPLAINT — service/product/reputational complaint.
14. PRIVACY_CONSENT — data/marketing consent request; route to authorised privacy process.

---

## 3. Minimum CS case record

Required fields:
`case_id`, `created_at`, `customer_id?`, `customer_email_or_contact_ref`, `order_id?`, `sku?`, `lot_batch?`, `category`, `secondary_tag?`, `severity`, `status`, `channel`, `customer_message`, `approved_knowledge_ref?`, `assigned_role`, `next_action`, `due_at?`, `exception_id?`, `resolution_code?`, `resolution_note?`, `closed_at?`.

Case status:
OPEN -> ACKNOWLEDGED -> ACTIONING -> WAITING_CUSTOMER / WAITING_OPERATIONS / WAITING_FINANCE / WAITING_PROVIDER -> RESOLVED.
REOPENED is available when the customer returns with the same unresolved problem.

Never delete a case to hide history.

---

## 4. Severity / escalation map

### P0 CRITICAL
Examples:
- breathing restriction, gasping/choking, significant allergic reaction or serious product-safety complaint;
- suspected recall/lot issue or multiple similar adverse-use reports;
- material privacy/security incident surfaced through CS.

Action:
- stop promotional troubleshooting;
- tell customer to discontinue relevant product use where the approved product object requires it;
- preserve SKU/lot/order evidence;
- open/link CommerceException P0;
- route to Amanda/approved safety or professional process;
- do not diagnose or tell customer to continue use.

### P1 URGENT
Examples:
- paid order not found/stranded;
- lost/damaged delivery with material customer impact;
- fulfilment rejection;
- refund/payment mismatch;
- high-risk reputational complaint.

Action: same operating-cycle ownership; create/link commerce exception where transaction state is affected.

### P2 ACTION
Examples:
- delayed dispatch/tracking issue;
- normal return awaiting processing;
- ordinary product-use question not involving safety;
- account/activation problem.

Action: standard queue with accountable role and due state.

### P3 SIGNAL
Examples:
- repeated FAQ or confusion theme;
- recurring usability complaint;
- repeated product suitability question.

Action: resolve individual customer normally, then aggregate into Product/UX/Growth insight; do not auto-change public claims.

---

## 5. Customer identification / verification

Before exposing order-specific information or changing an order request:
- use authenticated account context where available;
- otherwise require a reasonable combination such as order reference plus matching contact/email/postcode according to final security policy;
- never ask for full payment-card details, password or one-time authentication codes;
- never put secrets/payment credentials into tickets or free-text notes.

CS should see only the customer/order/product information needed for support, not unnecessary health/intelligence or financial-account data.

---

## 6. Response source hierarchy

Use sources in this order:
1. Final approved SKU/pack IFU and commercial policy.
2. Canonical Product Knowledge Object / implementation field map.
3. Canonical order/payment/fulfilment events.
4. Approved fulfilment/carrier/refund policy.
5. Approved CS macros derived from the above.

If none contains the answer, say the fact is being checked; do not infer it from marketing copy or another SKU.

---

## 7. Sleep Tape CS knowledge — launch baseline

Source of truth: `docs/product/SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md`.

### A. “What does Sleep Tape do?”
Approved answer logic:
- gentle physical cue to help suitable adults keep lips together during sleep;
- part of bedtime routine;
- not a treatment for sleep/breathing disorder.

### B. “Will it stop my snoring?”
- do not promise efficacy;
- snoring has multiple causes and may sometimes signal OSA;
- if persistent loud snoring plus witnessed pauses, choking/gasping or marked daytime sleepiness, route toward clinical assessment rather than product selling.

### C. “I have sleep apnoea / CPAP — can this replace it?”
- no;
- never advise replacement of CPAP, oral appliance or prescribed treatment;
- route suitability question to clinical advice.

### D. “My nose is blocked tonight.”
- do not use tonight while nasal breathing is uncomfortable/blocked.

### E. “I feel I cannot breathe / I woke gasping.”
- remove immediately;
- do not encourage retry while breathing is restricted;
- urgent/emergency care where severe or ongoing according to normal emergency guidance;
- record P0 safety case, SKU/lot when available.

### F. “The tape irritated my skin.”
- stop use and do not reapply to irritated skin;
- record SKU/lot and reaction description;
- significant swelling, breathing difficulty or serious allergic response requires medical care;
- repeated lot-linked complaints -> product-quality/safety escalation.

### G. “It keeps falling off.”
- check skin is clean/dry and use pack-specific placement;
- do not advise stronger improvised tape/full occlusion;
- repeated compliant failure may indicate quality issue.

### H. “Can my child use it?”
- do not recommend until final age policy/IFU/safety review explicitly permits paediatric use.
- This remains an owner/regulatory product dependency, not a CS judgement.

### I. “Is it scientifically proven to improve sleep?”
- evidence remains limited/mixed;
- Asclepios positions it as behavioural sleep-routine accessory, not a proven treatment or guaranteed sleep improvement.

### J. “Can I use it every night?”
- only while it remains comfortable and suitable, with no breathing/skin problem;
- repeated irritation, anxiety or sleep disruption is a reason to stop.

---

## 8. Magnesium CS boundary — pre-formulation

Source: `docs/product/MAGNESIUM_PRODUCT_KNOWLEDGE_OBJECT_V1.md`.

Until final formula, elemental dose, ingredients, directions, label and claims are locked:
- CS must NOT answer exact dose/formulation questions from assumption;
- do not claim it treats insomnia, anxiety, deficiency or another condition;
- use only approved high-level product positioning currently present in the Product Knowledge Object;
- ingredient allergy, medicine interaction, pregnancy/breastfeeding, medical-condition or dose-safety questions that depend on the final product must remain PENDING / professional advice rather than guessed;
- once final label facts arrive, Amanda must produce versioned CS macros before launch.

---

## 9. Payment / order macros — logic, not provider-specific promises

### Payment failed
Customer-facing logic:
- confirm that a failed payment does not mean the order is fulfilment-ready;
- invite retry only through approved checkout flow;
- never ask customer to send card details through CS.

Internal check:
PAYMENT_FAILED/CANCELLED vs canonical Order state; ensure no fulfilment instruction exists.

### “I was charged but I cannot find my order.”
Internal:
- search payment/provider reference + customer contact;
- if payment appears paid/authorised without canonical order, P1 exception: stop fulfilment and reconcile before creating or refunding anything;
- avoid manually creating duplicate orders without reconciliation.

Customer:
- acknowledge payment/order mismatch and state it is being reconciled; do not promise dispatch until canonical paid order exists.

### Duplicate-looking charge
- inspect payment events/settlement status;
- do not issue automatic refund merely from customer screenshot or duplicate-looking authorisation;
- route Finance/Commerce when actual duplicate capture or mismatch is confirmed.

### Order confirmation missing
- verify canonical order exists and contact information;
- resend/re-present confirmation only from canonical order data;
- if paid order missing, treat as P1 mismatch.

---

## 10. Fulfilment / delivery macros

### Not dispatched yet
- answer from actual fulfilment state, not generic expectation;
- if SLA exceeded, open/link P2 fulfilment exception;
- if customer promise materially at risk, CS owns communication while Ops owns provider resolution.

### Tracking not moving
- distinguish label-created vs carrier-accepted vs transit exception where provider data permits;
- stale beyond SLA -> P2; carrier lost/damaged indication -> P1.

### Lost parcel
- open Lost/Damaged case + P1 commerce exception;
- preserve order, shipment, carrier reference;
- replacement/refund follows final policy and delegated authority, not agent improvisation.

### Damaged / wrong / missing item
Capture:
- order ID, SKU, affected quantity;
- packaging/product photographs where customer can reasonably provide them;
- lot/batch for consumables where available;
- whether product itself is opened/used/compromised;
- customer requested outcome.

For hygiene/safety-sensitive products, never promise returned stock will be resold.

---

## 11. Cancellation / return / refund control

Final eligibility/windows/cost allocation remain dependent on approved commercial/legal policy and cannot be invented here.

Operational rules already fixed:
- CS may initiate/request cancellation/return/refund under policy;
- immutable payment records cannot be edited by CS;
- refund mismatch -> REFUND_PENDING/P1 reconciliation;
- no duplicate refunds;
- returned consumables remain quarantined until disposition rule decides restock/disposal;
- reason codes must be recorded so Product/Ops can learn from return patterns.

Suggested reason-code families:
`CHANGED_MIND`, `ORDER_ERROR`, `DELIVERY_DELAY`, `LOST`, `DAMAGED_IN_TRANSIT`, `WRONG_ITEM`, `MISSING_ITEM`, `PRODUCT_DEFECT`, `SKIN_OR_COMFORT`, `SAFETY_CONCERN`, `NOT_SUITABLE`, `OTHER`.

---

## 12. QR / membership / activation support

Customer flow should link physical product -> activation code/QR -> entitlement/membership where configured.

CS checks:
1. identify SKU/order where available;
2. validate activation-code state without revealing underlying secrets;
3. distinguish invalid, already-redeemed, expired (if policy includes expiry), wrong-product and system-error states;
4. never manufacture a manual entitlement outside approved admin process;
5. repeated code failures by batch/SKU -> P1/P2 product/operations exception depending scale.

Customer should not need to understand internal entitlement objects.

---

## 13. Tone and conduct standard

CS voice should be calm, plain-language, non-defensive and non-medicalised.

Do:
- answer the actual question first;
- state what is known from the order/product record;
- give one clear next action;
- separate product support from medical diagnosis;
- acknowledge service failure without blaming customer or provider.

Do not:
- use exaggerated wellness/medical claims;
- pressure customer to keep using an uncomfortable product;
- blame the warehouse/carrier before facts are known;
- promise a refund/replacement outside policy/authority;
- quote internal severity codes to customers;
- expose internal AI/automation/provider details unnecessarily.

---

## 14. AI first-line support boundary

AI may:
- classify the case;
- retrieve approved FAQ/Product Knowledge;
- summarize canonical order/shipment status;
- draft a response from approved macros;
- identify likely escalation rule;
- detect repeated FAQ themes.

AI must not autonomously:
- diagnose or provide personalised medical treatment;
- create new health claims;
- override do-not-use/stop-use rules;
- alter payment records;
- issue a refund unless a separately approved deterministic workflow and authority model explicitly permits it;
- promise delivery or stock contrary to system record;
- conceal uncertainty where source data is missing.

For P0 safety language, use locked deterministic response/routing rather than generative improvisation wherever practical.

---

## 15. Feedback loop

Aggregate at least these CS signals:
- contacts per 100 orders by category;
- top pre-sale questions;
- top product-use questions;
- safety/adverse-use reports by SKU/lot;
- delivery exception rate;
- cancellation/return/refund reasons;
- activation failures;
- unresolved/reopened cases;
- repeated answer gaps where no approved knowledge exists.

Routing:
- repeated product question -> Amanda Product Knowledge review;
- repeated confusion -> UX/content review;
- repeated delivery issue -> Operations/3PL review;
- repeated product quality/lot issue -> P0/P1 supplier/QA review;
- repeated conversion objection -> Growth insight only after claims/safety review.

Do not automatically convert CS anecdotes into efficacy claims.

---

## 16. Launch acceptance tests

Before first commercial launch, prove:
1. Customer can find support from product/order surfaces without entering the sleep app.
2. Agent can locate customer + canonical order + SKU + shipment without asking customer to repeat known information.
3. Sleep Tape snoring/OSA question returns controlled non-treatment response.
4. Sleep Tape breathing-restriction report becomes P0 safety escalation and does not receive promotional troubleshooting.
5. Paid-but-no-order case becomes P1 reconciliation and cannot create duplicate fulfilment.
6. Carrier lost/damaged case links CS + order + shipment + exception.
7. Refund mismatch cannot double-refund.
8. Return reason and disposition are recorded.
9. QR/activation failure is traceable without exposing secrets.
10. CS cannot edit Product Knowledge/claims, immutable payment events or unrestricted customer health/intelligence data.
11. Repeated FAQ can generate a Product/Growth insight without auto-publishing new claims.
12. Unknown final commercial facts (return window, final shipping SLA, final product label facts) visibly remain configuration dependencies rather than being filled with placeholders presented as truth.

---

## 17. Remaining launch dependencies

Owner/account/legal/provider facts still needed before CS can be called fully launch-operational:
- final support channel(s)/inbox and staffing/ownership;
- final shipping services/SLA/customer promise;
- final cancellation/returns/refund policy and statutory/legal review;
- payment-provider live setup and exact customer-facing payment states;
- fulfilment-provider escalation contacts/process;
- final Sleep Tape IFU/material/age policy/pack identity;
- final magnesium formula/label/directions/claims;
- final privacy process/contact details.

These are grouped dependencies. Amanda should continue all unblocked preparation rather than interrupt Edmund piecemeal.

---

## 18. Next implementation boundary

Amanda next:
- translate this package into a compact CS macro/knowledge schema usable by website help, future AI first-line support and human agents;
- keep provider/policy-dependent fields configurable;
- create Rex engineering ticket only when CS/order data surfaces are ready to implement.

Rex engineering should not build a heavyweight ticketing/CRM platform merely to satisfy this package. A launch-sufficient case/knowledge/exception layer is the goal.
