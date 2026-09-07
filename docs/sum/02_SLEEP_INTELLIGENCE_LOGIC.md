# SUM Logic Pack 02 — Asclepios Sleep Intelligence

Status: binding v1  
Parent: `00_SUM_OPERATING_ECOSYSTEM.md`

## 1. Purpose

This pack defines the differentiated Asclepios Sleep service logic. The back-end may be complex; the customer experience must remain simple.

Core product rule:

> Complexity belongs to the system, not the user.

The user should usually need to answer only:
- What should I do tonight?
- Did it help?

## 2. Customer-facing loop

ASSESS
→ identify dominant needs
→ generate Tonight's Plan (1–3 actions)
→ user completes or skips actions
→ sleep/wake experience
→ Morning Check-in
→ update adherence/response state
→ adjust next recommendation
→ 7-day review
→ 28-day reassessment
→ repeat.

## 3. Four-domain model

Use the same four domains consistently:

1. RHYTHM — timing, light, routine, behavioural rhythm
2. CALM — mental downshift, breathing, relaxation, sound
3. BODY — physical state, comfort, breathing-related support, gut/body signals
4. SUPPORT — Asclepios products and other approved support modules

Do not invent alternate domain names ad hoc.

## 4. Levels and programmes

Each domain may progress through Level 1 / 2 / 3 according to user state and response.

Programme layers:
- immediate Tonight's Plan;
- short 7-day adaptation cycle;
- 28-day reassessment / structured programme;
- optional deeper educational modules.

The programme must not feel like homework. Lessons should appear as short, context-relevant interventions connected to a real user need.

## 5. Tonight's Plan contract

Customer output:
- maximum 1–3 primary actions;
- clear ordering/timing;
- one dominant goal;
- no unrelated selling;
- products appear only when relevant to the plan and permitted by ownership/entitlement/claims rules;
- every action has a reason code internally.

Minimum internal object:

- plan_id
- user_id
- generated_at
- decision_version
- dominant_domain
- action_code
- action_rank
- source_rule_id
- product_sku_id if relevant
- entitlement_required
- duration_estimate
- completion_state
- safety_state

## 6. Product integration

Physical product is not a detached advertisement.

Approved product state should be available to the decision engine through canonical product/ownership/entitlement records.

Flow:

qualifying purchase
→ delivery / QR code
→ activation
→ entitlement / product ownership state
→ Sleep Intelligence may use that state
→ Tonight's Plan can include relevant product support
→ user response feeds back into later plans.

The engine must not recommend a product merely because it is sold. Product inclusion requires a versioned rule and approved claim/safety boundary.

## 7. Current product families

Canonical initial families should be taken from the authoritative product catalogue in the repo/library, not from stale drafts.

Current repo documentation identifies three Phase 1 products/families and flags that DAY MODE is a daytime product that does not fit a Tonight-only model. SUM therefore requires a daytime routine/state extension rather than forcing it into the night loop.

## 8. Decision inputs

Potential input classes:
- initial assessment;
- current profile snapshot;
- recent morning check-ins;
- adherence;
- recent response trend;
- time/local routine context;
- product ownership/entitlement;
- programme state;
- safety flags;
- previous recommendation history;
- user preferences;
- content availability/version.

## 9. Decision outputs

- domain priority;
- strategy state;
- Tonight action set;
- reminder vs maintain vs change;
- educational content hook;
- product support hook where permitted;
- escalation/safety state;
- review/reassessment requirement.

## 10. Determinism and versioning

Same state + same configuration/version should produce the same decision unless a deliberately non-deterministic feature is explicitly introduced.

Every decision must preserve:
- decision version;
- input snapshot/reference;
- rule/config version;
- output;
- explanation/reason codes.

This permits replay, audit and debugging.

## 11. Safety boundary

Safety rules outrank product recommendation, engagement and AI output.

No content or recommendation may claim to diagnose, treat, solve or cure sleep apnoea or other conditions beyond approved product/content claims.

AI/free text, when introduced, may support language interpretation/tag extraction but must not silently override safety/product/strategy rules.

## 12. Observability events

Minimum events:
- assessment_started
- assessment_completed
- profile_updated
- tonight_plan_requested
- tonight_plan_generated
- tonight_plan_failed
- tonight_action_started
- tonight_action_completed
- tonight_action_skipped
- sleep_session_started
- sleep_session_completed
- morning_checkin_submitted
- adherence_calculated
- response_state_changed
- seven_day_review_generated
- reassessment_28d_generated
- product_support_inserted
- safety_escalation_triggered

Each event must carry user/session/decision version references as appropriate.

## 13. Health checks

GREEN only when all relevant tests pass:
- assessment persists and produces a profile;
- Tonight endpoint produces 1–3 valid actions;
- safety test overrides ordinary recommendation;
- user action completion persists;
- morning check-in affects subsequent state;
- 7-day review can be generated from real history;
- 28-day reassessment uses real trend comparison, not stub state;
- product entitlement can be consumed when activated;
- no unentitled premium/product-only action leaks to ineligible user.

## 14. Known gaps to close

From current repo evidence:
- 28-day pattern-change handling is not fully implemented;
- QR activation is wired at data/service level but not fully live in UI/business chain;
- payment is not connected to entitlement;
- analytics events exist as a model but are not comprehensively emitted;
- DAY MODE needs a daytime routine concept instead of being forced into Tonight.

These are operational gaps, not reasons to rebuild the existing vertical slice.

## 15. Recovery logic

If plan generation fails:
1. preserve last known safe plan state;
2. do not fabricate recommendations;
3. log failure and exact decision inputs/version;
4. retry only if transient;
5. offer a safe minimal fallback routine if explicitly versioned and approved;
6. create exception for deterministic rule/config/data failure.

If entitlement state is uncertain, default to not granting restricted benefit until canonical state is reconciled.

## 16. Acceptance test

A real staged user should be able to complete:

Account
→ Assessment
→ Tonight's Plan
→ action completion / Sleep Player
→ Morning Check-in
→ changed state/recommendation
→ 7-day review

and, for a qualifying product path:

Order
→ QR activation
→ entitlement
→ product state visible to Sleep Intelligence
→ relevant Tonight/Day support
→ feedback
→ later recommendation.

Both loops must be observable and replayable.