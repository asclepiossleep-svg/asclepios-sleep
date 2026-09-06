# Asclepios Sleep Intelligence — Research Registry V1

Status: ACTIVE / BUILDING
Owner: Amanda
Purpose: convert external sleep evidence into structured, auditable inputs for the Asclepios Sleep Intelligence engine and parallel education/marketing production.

## 1. Operating rule
Research is not stored as loose notes only. Each useful source must become a structured evidence object that can connect to:
- question/scenario logic;
- corroboration/confidence rules;
- safety rules;
- behaviour-management strategies;
- product guidance/claim boundaries;
- education content;
- marketing/video scripts.

Research does NOT directly become a clinical claim. Evidence quality, population, limits and applicability must be recorded.

## 2. Evidence object schema
Each verified source should record:
- Evidence ID
- Topic
- Source title
- Institution / journal / guideline body
- Year
- Source type: guideline / systematic review / RCT / cohort / review / consensus / physiology / other
- Population
- Exposure/intervention
- Outcome(s)
- Key finding (paraphrased)
- Strength / quality note
- Limitations
- Applicability to consumer sleep management
- Safety implication
- Asclepios scenario tags
- Behaviour rule candidates
- Product relevance
- Claim status: internal-only / education-safe / marketing-review-required / prohibited
- Language/content opportunities
- Source URL/DOI
- Verification date
- Reviewer
- Version

## 3. Initial evidence lanes
These are the first research lanes to build and verify. They are not yet treated as completed evidence entries.

### R01 — Insomnia / behavioural sleep management
Targets:
- chronic insomnia behavioural treatment guidance;
- stimulus control / sleep restriction / CBT-I components;
- sleep diary / tracking standards;
- persistence and escalation thresholds.

### R02 — Caffeine
Targets:
- timing before sleep;
- dose-response;
- individual sensitivity;
- non-coffee caffeine sources: tea, cola, energy drinks, chocolate, desserts, pre-workout.

### R03 — Circadian rhythm / light
Targets:
- morning/day light;
- evening light;
- irregular schedules;
- travel/time-zone logic;
- wake-time anchoring.

### R04 — Stress / hyperarousal / racing thoughts
Targets:
- behavioural indicators that can corroborate or contradict a direct self-label such as “I am not stressed”;
- pre-sleep cognitive arousal;
- rumination / phone checking / tension / inability to switch off.

### R05 — Breathing / snoring / nasal obstruction / sleep apnoea safety
Targets:
- red flags;
- screening/referral logic;
- witnessed apnoea, choking/gasping, severe snoring + symptoms, daytime sleepiness;
- mouth-tape claim boundaries;
- nasal breathing / obstruction physiology.

### R06 — Alcohol
Targets:
- sleep onset vs sleep architecture/fragmentation;
- timing/amount patterns;
- behavioural recommendations and claim limits.

### R07 — Meals / reflux / digestion
Targets:
- late meals;
- reflux symptoms;
- bloating/digestion and sleep disruption;
- meal timing advice boundaries.

### R08 — Menopause / female life stage
Targets:
- hot flushes/night sweats;
- sleep disruption;
- perimenopause/menopause branching;
- safe non-diagnostic management support.

### R09 — Pain / nocturia / medical-context modifiers
Targets:
- sleep disruption patterns;
- when routine optimisation is insufficient;
- referral / body-check logic.

### R10 — Gut-brain / probiotics / sleep
Targets:
- systematic reviews/meta-analyses;
- effect-size uncertainty;
- strain specificity;
- conservative “may support” wording;
- product-claim boundaries.

## 4. Intelligence translation pipeline
SOURCE
-> EVIDENCE OBJECT
-> TAGS
-> SCENARIO / QUESTION TRIGGER
-> CONFIDENCE / CORROBORATION RULE
-> SAFETY CHECK
-> STRATEGY CANDIDATE
-> ACTION / CONTENT / PRODUCT
-> USER RESPONSE
-> OUTCOME / HISTORY
-> RULE REVIEW

## 5. Corroboration examples to operationalise
Direct self-report must not always be accepted as final truth.

Example A — “I am not stressed”
Possible corroborating signals:
- racing thoughts;
- repeated phone checking;
- inability to switch off;
- muscle tension;
- rumination;
- waking with active thoughts.
Result: confidence in “low stress” may be reduced, prompting targeted follow-up rather than contradiction.

Example B — “I sleep well”
Possible corroborating signals:
- long sleep latency;
- multiple awakenings;
- early waking;
- dry mouth / morning headache;
- unrefreshed waking;
- excessive daytime sleepiness;
- nocturia;
- irregular sleep timing.
Result: perceived sleep quality and objective/behavioural quality may be separated.

## 6. Strategy output vocabulary
- CONTINUE
- REMIND
- SIMPLIFY
- OPTIMISE
- ASK_MORE
- CHANGE_ROUTINE
- RECOMMEND_CONTENT
- ADD_PRODUCT
- REPLACE_PRODUCT
- REASSESS
- ESCALATE

Adherence and response must remain separate.

## 7. Safety boundary
Asclepios supports sleep management and behavioural guidance; it does not diagnose or treat disease.
Red flags override optimisation. Examples include concerning breathing events, dangerous daytime sleepiness, chest pain/breathing difficulty, severe persistent insomnia, and other approved escalation patterns.
Sleep tape must never be described as OSA treatment.

## 8. Parallel marketing output
Every research object that is appropriate for public education should be assessed for reuse as:
- 20–30 sec short;
- 45–60 sec explainer;
- 2–3 min founder/product explainer;
- website article;
- FAQ;
- app education card;
- CS answer;
- product-page evidence/support copy.

Core positioning:
“Research-backed sleep intelligence, made simple for tonight.”

Marketing must distinguish:
- what published research supports;
- what Asclepios infers from its management logic;
- what remains uncertain;
- what requires medical assessment.

## 9. Build tracker
Current state on 2026-09-06:
- Registry schema: BUILT V1
- Evidence lanes: BUILT V1
- Corroboration framework: BUILT V1
- Verified external evidence records: NOT YET COMPLETE
- Scenario/rule library populated from verified research: IN PROGRESS
- Marketing script objects generated from verified evidence: NEXT

## 10. First milestone acceptance
V1 first milestone is complete only when:
1. verified sources are entered across the initial priority lanes;
2. each source has explicit applicability/limitations;
3. at least one real app scenario maps evidence -> question -> rule -> strategy;
4. at least one marketing/video package traces back to the same evidence object;
5. safety/claim review is explicit;
6. owner can inspect the registry and see what is verified vs planned.

## Version log
- V1 — 2026-09-06: persistent research registry structure and first build tracker created.
