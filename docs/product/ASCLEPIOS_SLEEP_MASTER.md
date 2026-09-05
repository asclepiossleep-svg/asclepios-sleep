[ASCLEPIOS_SLEEP_MASTER.md](https://github.com/user-attachments/files/31871661/ASCLEPIOS_SLEEP_MASTER.md)
**ROCKPILLAR TECHNOLOGY**

**Asclepios Sleep Intelligence Master Specification**

Research-Backed Dynamic Assessment, Personalisation, Safety & Learning Logic

Asclepios Sleep 睡眠智能：研究為本的動態評估、個人化、風險篩查及持續學習主規格

Version 1.0 • 5 September 2026 • Internal Confidential

# Executive Summary / 執行摘要

- Asclepios Sleep is a sleep-management system, not a generic questionnaire, meditation app or diagnostic service.

- The intelligence is SaaS/rule-led first: stable, auditable and inexpensive. AI is used selectively for language, clarification and explanation—not as the source of safety or core decisions.

- A user’s direct self-description is useful but not sufficient. The system should triangulate subjective answers with detailed behavioural, symptom, demographic and historical signals to understand the likely situation more accurately.

- The user model is dynamic: stable core profile + current state + longitudinal history + adherence + response. The system must keep updating rather than treating onboarding as a one-time truth.

- Published clinical guidance and peer-reviewed research are integrated into a versioned research registry. As evidence evolves, the intelligence can be updated without rebuilding the app.

- The system may screen for factors that can affect sleep and recommend medical evaluation when appropriate, but it does not diagnose disease.

| Customer-facing proposition: Research-backed sleep intelligence, made simple for tonight. / 研究支持的睡眠智能，把複雜睡眠科學變成今晚就做得到的簡單計劃。 |
|------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 1. Product Identity

- Brand/logo: ASCLEPIOS.

- App/product name: Asclepios Sleep.

- Descriptor: Personalised Sleep Management System.

- Avoid 'Sleeping Management'.

- The app experience should answer: 'What should I do tonight?' rather than make users manage a complex dashboard.

# 2. Intelligence Philosophy

The system should behave like a careful sleep consultant: direct where appropriate, but never over-reliant on the user’s labels. Many users do not recognise their own stress, sleep fragmentation, caffeine exposure, menopause-related symptoms, breathing problems or behavioural patterns. Therefore, the system gathers multiple signals and progressively narrows the scenario.

| **Layer**     | **Purpose**                      | **Examples**                                                                                                            |
|---------------|----------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| Core Profile  | Relatively stable background     | Age band, sex-related biology where relevant, known conditions, baseline routine, products owned, timezone              |
| Current State | What is happening now            | Recent sleep onset, awakenings, stress signals, congestion, pain, digestion, menstrual/menopause context where relevant |
| History       | Longitudinal pattern             | Recurring triggers, typical sleep window, adherence history, prior responses                                            |
| Adherence     | What was actually done           | Actions completed/skipped, product use, music/routine use                                                               |
| Response      | What changed afterwards          | Quality, awakenings, energy, subjective improvement/worsening                                                           |
| Confidence    | How certain the system should be | Direct report + corroborating questions + repeated pattern                                                              |

# 3. Dynamic Assessment — Not a One-Time Questionnaire

1.  Start with a compact baseline skeleton: demographics relevant to sleep, known health context, routine, main complaint and product ownership.

2.  Ask direct questions when they are meaningful.

3.  When a direct answer is vulnerable to poor self-awareness, add behavioural or symptom-based corroboration rather than accepting the label as fact.

4.  Use answer-dependent branching: irrelevant questions should not appear.

5.  Build a provisional situation model with confidence scores/tags rather than a diagnosis.

6.  During daily/weekly use, ask only the few follow-up questions needed to update the current state.

7.  Use history to distinguish one-off events from persistent patterns.

8.  After an intervention, compare adherence and response before deciding whether to continue, simplify, optimise or reassess.

# 4. Example: Triangulating Rather Than Trusting a Label

| **User says**              | **Do not conclude**       | **Corroborating signals**                                                                                                 |
|----------------------------|---------------------------|---------------------------------------------------------------------------------------------------------------------------|
| “I’m not stressed.”        | No stress/arousal issue   | Racing thoughts, jaw/shoulder tension, checking phone repeatedly, difficulty switching off, early waking, work rumination |
| “I sleep quite well.”      | Sleep is healthy          | Sleep latency, awakenings, unrefreshing sleep, morning headache, nocturia, daytime sleepiness, inconsistent timing        |
| “I only drink one coffee.” | Low caffeine exposure     | Tea, cola, energy drinks, chocolate, coffee ice cream, pre-workout, timing and quantity                                   |
| “I just snore.”            | Benign snoring            | Witnessed apnoea, choking/gasping, morning headache, sleepiness, resistant hypertension, obesity/overweight, diabetes     |
| “My stomach is fine.”      | No digestive contribution | Late heavy meals, reflux, bloating, nocturnal discomfort, bowel pattern change, meal timing                               |

# 5. Adaptive Question Domains

| **Domain**                 | **Signals to collect**                                                                                                                                                 |
|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Sleep pattern              | Sleep onset, awakenings, early waking, total opportunity, irregular schedule, naps, shift work                                                                         |
| Breathing / airway         | Snoring, mouth breathing, nasal blockage, waking dry mouth, choking/gasping, witnessed pauses, morning headache                                                        |
| Arousal / stress           | Racing thoughts, inability to switch off, body tension, worry loops, emotional activation                                                                              |
| Circadian / light          | Late light/screen exposure, morning light, schedule drift, travel/timezone                                                                                             |
| Caffeine / stimulants      | Coffee, tea, cola, energy drinks, chocolate, coffee-flavoured foods, supplements/pre-workout, timing                                                                   |
| Food / digestion           | Meal timing, late heavy meals, reflux, bloating, gut discomfort, alcohol                                                                                               |
| Pain / physical discomfort | Musculoskeletal pain, nocturia, temperature discomfort, illness symptoms                                                                                               |
| Female life-stage context  | When relevant: menstrual cycle issues, pregnancy context, perimenopause/menopause symptoms, hot flushes/night sweats                                                   |
| Known health context       | Known diabetes, hypertension, arrhythmia, thyroid disease, asthma, reflux, mood disorders, neurological conditions—only insofar as relevant to sleep management/safety |
| Environment                | Noise, temperature, partner/pet disturbance, bedding, light                                                                                                            |
| Behaviour / routine        | Bedtime activities, time in bed awake, exercise timing, work habits                                                                                                    |
| Products / interventions   | Owned products, eligibility, adherence, tolerance, perceived response                                                                                                  |

# 6. Demographic & Conditional Logic

- Age and sex-related biology should be collected only when they materially improve relevance/safety.

- Do not show menopause questions to an 18-year-old or male user. Use age/sex/reproductive context to gate questions.

- Do not assume menopause at a specific age; ask appropriate transition/status questions only within sensible eligibility logic.

- Questions about known diseases should be framed as background that may affect sleep management, not as a medical diagnostic intake.

- Sensitive questions should explain why they are asked and allow 'prefer not to say' where appropriate.

# 7. Core Tag / Scenario Model

- SLEEP_ONSET

- NIGHT_WAKING

- EARLY_WAKING

- UNREFRESHING_SLEEP

- IRREGULAR_SCHEDULE

- RACING_THOUGHTS

- STRESS_AROUSAL

- LATE_CAFFEINE

- SCREEN_LIGHT

- CIRCADIAN_MISALIGNMENT

- NASAL_DISCOMFORT

- MOUTH_BREATHING

- SNORING

- OSA_RISK

- PAIN

- DIGESTIVE_DISCOMFORT

- LATE_HEAVY_MEAL

- NOCTURIA

- TEMPERATURE_VASOMOTOR

- LOW_MORNING_ENERGY

- DAYTIME_SLEEPINESS

- ENVIRONMENTAL_DISTURBANCE

# 8. Decision Engine

| USER ENTRY → INTENT ROUTER → QUESTION ENGINE → ANSWER/TAG MAPPER → SEVERITY/CONFIDENCE → CURRENT STATE + CORE PROFILE + HISTORY → SAFETY → ADHERENCE → RESPONSE → STRATEGY → ACTION/CONTENT/PRODUCT → NEW DATA → LOOP |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

| **Strategy**      | **When used**                                                               |
|-------------------|-----------------------------------------------------------------------------|
| CONTINUE          | Good adherence and acceptable/improving response                            |
| REMIND            | Relevant action is being forgotten but burden is acceptable                 |
| SIMPLIFY          | Low adherence suggests too much complexity                                  |
| OPTIMISE          | Good adherence but response can likely improve through timing/method change |
| ASK_MORE          | Confidence is too low or signals conflict                                   |
| CHANGE_ROUTINE    | Current behavioural plan is not working or schedule changed                 |
| RECOMMEND_CONTENT | User needs a short explanation or technique                                 |
| ADD_PRODUCT       | Persistent eligible need where a product is genuinely relevant              |
| REPLACE_PRODUCT   | Appropriate only when response/tolerance and product logic support it       |
| REASSESS          | Persistent poor outcome despite adherence                                   |
| ESCALATE          | Safety/red-flag or persistent problem requires healthcare evaluation        |

# 9. Products as Interventions, Not Advertising

- Owned product → guide correct use, record adherence, integrate into routine, observe response; do not keep selling it.

- Not owned → recommendation only when need is persistent, product is eligible and the recommendation is proportionate.

- Low adherence is not evidence of product failure.

- Good adherence + improvement → continue.

- Good adherence + poor response → optimise, ask more, reassess or stop.

- Product education lives primarily on the Asclepios Health commerce/content site; the sleep app links out to a new page/tab so the active sleep-management state is preserved.

# 10. App State Persistence & Trust

- Every meaningful setting or answer should autosave promptly.

- Leaving the app for Research or Product pages must not erase wake time, sleep time, music, duration, current assessment or programme state.

- Returning users should resume the relevant place in the flow rather than being dumped at login/home without context.

- Active sleep-session state must be recoverable after accidental navigation, refresh or app relaunch where technically feasible.

- The user should always understand: am I still in tonight’s plan, is the alarm active, and what happens next?

# 11. Alarm, Voice & Settings Experience

| **Area**   | **Required behaviour**                                                                                                                                |
|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| Alarm/wake | Clear wake time, active state, ring behaviour, Stop, Snooze, I'm Awake, graceful fallbacks for PWA limitations                                        |
| Settings   | Language after login, timezone/travel, wake/sleep settings, music/audio defaults, wallpaper, voice preferences, accessibility and notifications       |
| Voice      | Optional gentle multilingual greeting/reminder voices; adult female/male and other tasteful personas; childlike voices only if appropriate and opt-in |
| Language   | English, zh-HK, zh-TW, zh-CN; user can change after login without losing state                                                                        |

# 12. Safety, Screening & Referral — Not Diagnosis

The system may identify patterns consistent with factors that can disrupt sleep and may recommend a medical review. It must not claim to diagnose diabetes, heart disease, sleep apnoea, menopause-related disease, neurological disease or other conditions.

- Red-flag patterns override ordinary optimisation.

- Examples: witnessed breathing pauses; choking/gasping; severe snoring with symptoms; unexplained excessive daytime sleepiness; chest pain; breathing difficulty; new concerning neurological symptoms; severe persistent insomnia; dangerous occupational sleepiness.

- Persistent poor sleep despite good adherence should trigger reassessment and, when appropriate, a recommendation to speak to a GP/sleep clinician or obtain a general health check.

- Known conditions are inputs to sleep-management relevance and safety, not targets for the app to treat.

- Sleep tape/mouth tape requires conservative eligibility and OSA/airway screening; it is not an OSA treatment.

# 13. Research-Backed Intelligence Framework

Research is stored as versioned evidence objects, not as marketing decoration. Each evidence object should record the source, population, outcome, limitations, strength/quality notes, supported claims, unsupported claims, and which questions/rules/content/products depend on it.

| **Evidence object** | **Fields**                                                                       |
|---------------------|----------------------------------------------------------------------------------|
| Source              | Citation, DOI/URL, institution/journal, date                                     |
| Evidence type       | Guideline, RCT, systematic review, consensus, mechanistic research               |
| Population          | Age/sex/context; inclusion/exclusion                                             |
| Finding             | What the source actually supports                                                |
| Limitations         | What cannot be concluded                                                         |
| System use          | Question, tag, strategy, safety rule, content or product education               |
| Claim status        | Internal only / approved for public education / legal-scientific review required |
| Versioning          | Added, reviewed, superseded, retired                                             |

# 14. Verified Initial Research Anchors (V1)

| **Anchor**                                      | **What it supports**                                                                                                                                                                | **Use in Asclepios**                                                                                                           |
|-------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| AASM chronic insomnia guideline (2021)          | CBT-I is strongly recommended; brief therapies, stimulus control, sleep restriction and relaxation have conditional support; sleep hygiene alone should not be the whole treatment. | Supports behavioural-programme logic; prevents over-reliance on generic 'sleep hygiene'.                                       |
| Consensus Sleep Diary (Carney et al., 2012)     | Standardised prospective self-monitoring framework developed by sleep experts with user input.                                                                                      | Supports daily/weekly structured sleep tracking.                                                                               |
| Drake et al., JCSM 2013 caffeine timing         | 400 mg caffeine at bedtime, 3h or 6h before bedtime disrupted sleep versus placebo.                                                                                                 | Supports time-aware caffeine logic and non-coffee caffeine education.                                                          |
| NICE NG202 OSAHS                                | Lists symptoms and higher-risk comorbidities for when to suspect OSAHS.                                                                                                             | Supports conservative airway risk screening and referral prompts.                                                              |
| STOP-Bang validation literature                 | Validated screening approach for OSA risk in populations; not a diagnosis.                                                                                                          | Supports structured OSA risk screen, adapted carefully to consumer context.                                                    |
| Harvard Sleep Medicine circadian/light research | Light timing/intensity/wavelength can affect circadian resetting, melatonin suppression and alerting; programme also studies menopause-related sleep disruption.                    | Supports light/circadian and life-stage logic.                                                                                 |
| Nasal breathing / nasal obstruction reviews     | Nasal obstruction can worsen sleep-disordered breathing; nasal breathing has physiologic relevance; evidence does not justify claiming mouth tape treats OSA.                       | Supports nasal-breathing education and safety limits.                                                                          |
| Nasal nitric oxide physiology                   | Higher exhaled NO during nasal versus mouth breathing and substantial nasal contribution to exhaled NO have been demonstrated.                                                      | Supports careful education about nasal NO physiology—not claims that tape itself creates NO or guarantees higher blood oxygen. |
| Probiotic/sleep evidence reviews                | Recent RCT reviews/meta-analysis suggest small or uncertain improvements in some subjective/objective sleep outcomes; certainty is limited.                                         | Supports cautious gut-brain/sleep education; no treatment or guaranteed-effect claim.                                          |

Internal R&D note: these are starting anchors, not the final evidence base. Public-facing claims should only use wording that the underlying evidence directly supports and should undergo appropriate legal/scientific review.

# 15. Reference List — Initial Verified Sources

- Edinger JD et al. Behavioral and psychological treatments for chronic insomnia disorder in adults: an American Academy of Sleep Medicine clinical practice guideline. J Clin Sleep Med. 2021;17(2):255–262. DOI: 10.5664/jcsm.8986.

- Carney CE et al. The consensus sleep diary: standardizing prospective sleep self-monitoring. Sleep. 2012;35(2):287–302. DOI: 10.5665/sleep.1642.

- Drake C et al. Caffeine effects on sleep taken 0, 3, or 6 hours before going to bed. J Clin Sleep Med. 2013;9(11):1195–1200. DOI: 10.5664/jcsm.3170.

- NICE. Obstructive sleep apnoea/hypopnoea syndrome and obesity hypoventilation syndrome in over 16s (NG202), current guidance.

- Chung F et al. STOP-Bang validation literature; systematic review/meta-analysis in general population and commercial drivers. Sleep Breath. 2021. PMID: 33507478.

- Harvard Medical School Division of Sleep Medicine. Circadian Physiology and Photobiology Translational Research Program; research on light, circadian resetting, melatonin suppression and menopausal sleep disruption.

- Pevernagie DA et al. Sleep, breathing and the nose. Sleep Med Rev. 2005;9(6):437–451. DOI: 10.1016/j.smrv.2005.02.002.

- Lundberg JO et al./related human physiology literature: nasal contribution to exhaled nitric oxide. Am J Respir Crit Care Med. PMID: 8564139.

- Sivamaruthi BS et al. The Impact of Probiotic Supplementation on the Sleep Quality of Humans: a review of randomized blinded controlled studies. Curr Pharm Des. 2025. PMID: 40337962.

- Zhu et al. Effects of probiotic supplementation on subjective and objective sleep outcomes: updated systematic review and meta-analysis of 39 randomized controlled trials. 2026. PMID: 42238098.

# 16. Research Update Lifecycle

9.  Research scout identifies relevant new guideline/study.

10. Evidence reviewer records finding, population and limitations.

11. Map affected scenarios/questions/rules/content/products.

12. Draft intelligence change with version number and test cases.

13. Safety/claim review for any medical or commercial implication.

14. Release to staging; compare behaviour against prior version.

15. Promote if accepted; preserve previous rule/evidence version for audit.

# 17. Future Research Partner Mode (B2R — Separate from B2C)

- Future private capability for universities/research organisations, not part of the ordinary consumer app.

- Researchers define their own protocol, questions and monitoring schedule; Asclepios should not force the consumer intelligence logic into external research design.

- Potential tools: participant registration/invitation, consent workflow, study-specific questionnaires, adherence/events, secure export and role-based access.

- Keep architecture extensible now, but do not overbuild before the core B2C product and commercial launch.

- Any real research use will require appropriate ethics, consent, privacy/data-protection and study governance.

# 18. Data Efficiency & SaaS Storage Principles

- Do not store repeated generated prose as the primary history. Store structured events/tags/values and generate summaries when needed.

- Separate current-state tables from immutable/event history where practical.

- Use codes/IDs for reusable questions, answers, products, actions and research references.

- Store content/media once and reference it; avoid duplicate assets in app and website.

- Periodically derive compact longitudinal summaries for faster decision logic while retaining the underlying auditable events according to retention policy.

- Use appropriate SaaS/object storage for dynamic data and media; GitHub is for source/specs, not user history or large audio/media assets.

# 19. Programme & Habit-Change Logic

- The goal is to build, test, review and simplify routines—not to make the user complete endless tasks.

- 7-Night Quick Start → establish a small baseline routine and learn high-signal patterns.

- 30-Day Sleep Reset → build routine, track, review, simplify and personalise.

- KEEP = useful/tolerable element remains.

- REMOVE = low-value burden is removed.

- ADJUST = timing, intensity or method changes.

- Daily recommendations should be few, relevant and tied to the current scenario rather than a generic checklist.

# 20. Acceptance Standard for Intelligence V1

16. A baseline assessment exists with conditional branching and no obviously irrelevant questions.

17. The system can distinguish stable profile, current state and longitudinal history.

18. At least the initial research anchors are represented in a versioned evidence registry.

19. Major scenario domains and safety overrides are encoded and testable.

20. Tonight can receive scenario/strategy outputs without asking the user to repeat the full assessment.

21. Product eligibility/adherence/response logic is integrated.

22. Leaving/returning to product/research content does not erase active user state.

23. Language and settings can be changed after login.

24. Persistent poor outcome can trigger reassessment/referral messaging without diagnosing.

25. The architecture allows new questions, scenarios and evidence to be added without a frontend rewrite.
