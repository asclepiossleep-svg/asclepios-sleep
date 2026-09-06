# Asclepios Sleep — CS Knowledge & Macro Schema V1

Owner: Amanda
Status: IMPLEMENTATION-READY DESIGN
Purpose: represent approved CS answers as reusable structured data for website help, human agents and future AI first-line support without duplicating product truth.

## 1. Principle
Macros are presentation/routing objects, not independent sources of truth.

Every macro must point back to an approved source such as a Product Knowledge Object, commercial policy, order-state rule or operations rule. If the source changes, affected macros must be reviewed/versioned.

## 2. Required fields

```yaml
cs_macro:
  macro_id: CS-ST-SAFETY-BREATHING-001
  version: 1
  status: approved|draft|retired
  language: en|zh-HK|zh-CN
  category: PRODUCT_SAFETY
  sku_scope: [sleep_tape]
  intent_keys:
    - cannot_breathe
    - breathing_restricted
    - woke_gasping
  severity: P0
  source_refs:
    - docs/product/SLEEP_TAPE_PRODUCT_KNOWLEDGE_OBJECT_V1.md#4
  answer_mode: locked|templated|agent_guided
  customer_response: "Remove the product immediately if breathing feels restricted. Do not try to push through breathing difficulty or retry while breathing is restricted. If the breathing problem is severe or ongoing, seek urgent medical help."
  internal_actions:
    - create_or_link_cs_case
    - record_sku_and_lot_if_available
    - create_commerce_exception_P0
    - route_to_safety_process
  prohibited_actions:
    - encourage_retry
    - diagnose_cause
    - make_treatment_claim
  required_context:
    - sku
  optional_context:
    - lot_batch
    - order_id
  escalation_role: Amanda_or_approved_safety_lead
  owner_decision_required: false
  last_reviewed_at: 2026-09-07
```

## 3. Controlled answer modes
- `locked`: safety/legal/high-risk wording; AI/agent should not freely rewrite meaning.
- `templated`: stable factual answer with controlled variables such as order ID or tracking state.
- `agent_guided`: approved reasoning points where a trained agent may phrase naturally without changing policy/claims.

P0 safety, payment-security and privacy macros default to `locked`.

## 4. Core launch macros

### CS-ST-PRODUCT-ROLE-001
Category: PRE_SALE_PRODUCT
Mode: agent_guided
Intent: what does Sleep Tape do?
Response points:
- gentle physical cue for suitable adults to help keep lips together during sleep;
- bedtime-routine accessory;
- not treatment for sleep/breathing disorder.
Source: Sleep Tape Product Knowledge Object §1/§9.

### CS-ST-SNORING-001
Category: PRODUCT_SAFETY / PRE_SALE_PRODUCT
Mode: locked
Intent: will it stop/fix snoring?
Response:
"We should not promise that. Snoring has many causes and can sometimes be a sign of obstructive sleep apnoea. Sleep Tape is not a substitute for assessment or treatment of persistent or problematic snoring."
Escalation trigger: witnessed pauses, choking/gasping, marked daytime sleepiness or suspected OSA.
Source: Sleep Tape Product Knowledge Object §9.

### CS-ST-OSA-001
Category: PRODUCT_SAFETY
Mode: locked
Intent: diagnosed/suspected OSA; replace CPAP/oral appliance?
Response:
"Do not use Sleep Tape as a replacement for CPAP, an oral appliance or another prescribed treatment. If you have diagnosed or suspected sleep apnoea, seek clinical advice about suitability rather than self-treating with mouth tape."
Source: Sleep Tape Product Knowledge Object §4/§9.

### CS-ST-BLOCKED-NOSE-001
Category: PRODUCT_SAFETY
Mode: locked
Intent: blocked nose/current congestion.
Response:
"Do not use Sleep Tape while your nose is blocked or breathing comfortably through your nose is not possible."
Source: Sleep Tape Product Knowledge Object §4/§9.

### CS-ST-BREATHING-001
Category: PRODUCT_SAFETY
Mode: locked
Severity: P0
Intent: cannot breathe/breathing restricted/gasping.
Response:
"Remove it immediately. Do not try to force yourself to continue or retry while breathing feels restricted. If breathing difficulty is severe or ongoing, seek urgent medical help."
Internal: preserve SKU/lot/order context; P0 exception; safety route.
Source: Sleep Tape Product Knowledge Object §4/§10.

### CS-ST-SKIN-001
Category: PRODUCT_SAFETY
Mode: locked
Intent: rash/irritation/swelling.
Response:
"Stop using the product and do not reapply it to irritated skin. Significant swelling, breathing difficulty or a serious allergic reaction needs appropriate medical care."
Internal: record SKU/lot; quality signal; escalate significant/repeated reaction.
Source: Sleep Tape Product Knowledge Object §4/§9/§10.

### CS-ST-FALLING-OFF-001
Category: PRODUCT_USE
Mode: agent_guided
Intent: tape falls off.
Response points:
- skin clean/dry;
- follow pack-specific application once final IFU is locked;
- never recommend improvised stronger/full occlusion;
- repeated compliant failure -> possible quality case.
Source: Sleep Tape Product Knowledge Object §6/§10.

### CS-ST-CHILD-001
Category: PRODUCT_SAFETY
Mode: locked
Intent: can child use?
Response:
"We cannot recommend paediatric use unless the final product instructions and safety review explicitly support it."
Dependency: final age policy/IFU.
Source: Sleep Tape Product Knowledge Object §10.

### CS-PAY-FAILED-001
Category: PAYMENT
Mode: templated
Intent: payment failed.
Response points:
- failed payment is not a fulfilment-ready order;
- retry only through approved checkout;
- never request card details in CS.
Internal: verify no fulfilment exists.
Source: Launch CS Operating Package §9.

### CS-PAY-NOORDER-001
Category: PAYMENT
Mode: locked/templated
Severity: P1
Intent: charged/paid but no order found.
Customer response:
"We can see a payment/order mismatch and are reconciling it before any fulfilment action. We will not create a duplicate order while that check is in progress."
Internal: reconcile provider event and canonical order; stop fulfilment; P1 exception.

### CS-FUL-DELAY-001
Category: FULFILMENT
Mode: templated
Intent: not dispatched/tracking stalled.
Variables: `order_id`, `fulfilment_state`, `tracking_state`.
Rule: answer from actual state; SLA breach -> P2 exception; do not invent ETA.

### CS-FUL-LOST-001
Category: LOST_DAMAGED
Mode: templated
Severity: P1
Intent: carrier says lost / parcel missing beyond confirmed process.
Internal: link order+shipment+carrier; P1 exception; replacement/refund only under final policy/authority.

### CS-RET-ELIGIBILITY-001
Category: RETURN
Mode: locked until policy final
Intent: can I return this?
Response: final customer wording PENDING approved return/legal policy.
Rule: macro must remain `draft` and cannot be surfaced as definitive entitlement before policy approval.

### CS-REF-PENDING-001
Category: REFUND
Mode: templated
Intent: refund pending.
Rule: respond from canonical Refund/Payment states. State mismatch -> P1 reconciliation; never trigger duplicate refund.

### CS-ACT-CODE-001
Category: ACCOUNT_MEMBERSHIP
Mode: templated
Intent: QR/activation code not working.
Internal checks: code state, SKU/order, redeemed/invalid/expired-if-applicable/system-error. Never expose code secrets or manufacture entitlement outside approved admin process.

## 5. Macro publication gate
A macro may move `draft -> approved` only when:
- source reference exists and is approved for that use;
- wording does not exceed claim/evidence boundary;
- required final commercial facts are known;
- escalation and prohibited actions are defined for safety/financial cases;
- EN/ZH-HK/ZH-CN versions preserve meaning;
- any variable comes from canonical system data, not agent invention.

## 6. Retirement/change control
When Product Knowledge, IFU, commercial policy or legal/claims position changes:
1. identify affected macros by `source_refs`;
2. create new version;
3. move old version to `retired` after replacement is approved;
4. preserve previous version for audit;
5. update website help/AI retrieval cache so retired macro is not served.

## 7. AI retrieval rule
AI should retrieve by intent + category + SKU + language + status=`approved`.
Ranking preference:
1. exact SKU/intent;
2. exact category + safety severity;
3. general commerce macro.

Never retrieve `draft` or `retired` macro for customer-facing answer. P0 macros should return locked response/action set with minimal generative variation.

## 8. Minimum launch implementation
A heavyweight helpdesk is not required. Launch-sufficient implementation can be:
- versioned macro dataset/table;
- CSCase records;
- CommerceException linkage;
- simple internal lookup/search;
- website FAQ/help rendering from approved macros/product knowledge;
- future AI retrieval over approved objects only.

## 9. Acceptance criteria
- Sleep Tape safety intents map to locked approved answers.
- Commerce/payment intents route to canonical transaction state.
- Draft return/refund-policy content cannot masquerade as approved policy.
- Every macro has traceable source refs.
- Retired macros are excluded from retrieval.
- Safety/financial macros have explicit prohibited actions.
- Localised versions preserve safety meaning rather than translating loosely.
