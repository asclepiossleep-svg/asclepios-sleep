<!-- Canonical extraction of the approved master specification (Version 1.0, 5 September 2026, Internal Confidential). The source DOCX is not committed to the repo. Edit this file when the approved specification changes. -->
**ROCKPILLAR TECHNOLOGY**

**RockPillar AI Operating System**

Company Architecture, Agent Governance, PMO, Evidence & Due-Diligence Framework

RockPillar 全公司 AI 原生營運、監控、審計及盡職審查主規格

Version 1.0 • 5 September 2026 • Internal Confidential

# Executive Summary / 執行摘要

- RockPillar Technology will operate as an AI-native company: each operating department has a defined human owner, AI/automation responsibilities, evidence trail, maturity level and escalation route.

- The system is not a marketing slogan. A department may only be described as operational when its real workflows, data, controls and evidence are demonstrably working.

- GitHub is the internal source of truth for product specifications, work orders, audit evidence and version history; dynamic operational data belongs in the appropriate SaaS databases rather than being duplicated in documents.

- ChatGPT acts as CEO Office / AI PMO / product manager and auditor; implementation agents such as Claude Code execute approved work; automated workflow orchestration should increasingly remove manual relay.

- Internal and external due-diligence versions are separate. The internal version contains the full architecture and IP; the external version is generated later and reveals only the evidence needed for investors, partners and auditors.

| Operating principle: No department is 'AI-powered' because a document says so. It is AI-powered only when the workflow runs, evidence exists, controls are testable, and outcomes are auditable. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 1. Purpose and Governance

This specification defines the operating model for RockPillar Technology and its portfolio companies/products. It converts strategy, product development, research, customer service, growth and operations into a coordinated system of accountable AI-assisted departments.

- Single operating model across Asclepios Sleep and future RockPillar products.

- Clear separation between strategy, execution, evidence, audit and owner approval.

- Default autonomy: agents solve routine execution issues themselves before escalating.

- Owner involvement is reserved for genuine product choices, paid services, destructive changes, legal/safety decisions or unavoidable account-level actions.

- Every material function should leave an evidence trail suitable for later technical, operational and commercial due diligence.

# 2. Company-Level AI Architecture

| **Department**                      | **Mandate**                                                                                  | **Evidence**                                               | **Current maturity**     |
|-------------------------------------|----------------------------------------------------------------------------------------------|------------------------------------------------------------|--------------------------|
| CEO Office / AI PMO                 | Strategy, portfolio priorities, cross-department coordination, milestones, audit, escalation | Portfolio dashboard, decisions, risks, completion evidence | Core orchestration layer |
| Product & Customer Experience       | Product requirements, UX, roadmap, acceptance criteria, owner feedback                       | Master specs, test-ready milestones, UX audit              | Active                   |
| Engineering & Platform              | Application, APIs, databases, integrations, deployment, reliability                          | Code, CI results, releases, incident logs                  | Active via Claude/GitHub |
| Research & Sleep Intelligence       | Evidence library, scenario catalogue, rule logic, safety, versioned intelligence             | Research registry, rule versions, evidence map             | Build priority           |
| Customer Service / Customer Success | Real-time chat, email, FAQs, order/product/app help, escalation to human                     | Case records, SLA, issue themes, resolutions               | Not yet complete         |
| Growth & Marketing                  | Content, SEO, campaigns, video, social, education, conversion                                | Content library, campaigns, performance data               | Build priority           |
| Commerce & Sales                    | Checkout, bundles, discount/referral/affiliate/agent logic, subscriptions                    | Orders, attribution, commission records                    | Planned                  |
| Operations & Logistics              | Inventory, fulfilment, shipping, returns, replacements, vendor coordination                  | Fulfilment events, returns, exceptions                     | Planned                  |
| Finance                             | Revenue, costs, reconciliation, margin, budget, payment reporting                            | Management accounts, reconciliations, KPIs                 | Planned                  |
| Legal / Compliance / Safety         | Claims review, privacy, consumer terms, research ethics readiness, medical boundary          | Approval records, policy versions, risk register           | Required before launch   |
| IP / Asset Management               | Designs, scripts, research maps, media, product IP, version control                          | Asset registry, ownership/licence evidence                 | Build priority           |

# 3. Central Orchestrator Model

1.  Owner sets strategic direction or approves a genuinely new decision.

2.  CEO Office / AI PMO converts the decision into measurable workstreams and acceptance criteria.

3.  Work is dispatched through the shared coordination layer (GitHub first; workflow automation later).

4.  Execution agents implement and report with evidence.

5.  AI PMO audits against the master specifications rather than accepting self-reported completion.

6.  Defects or incomplete work are returned automatically for correction.

7.  Completed work updates the master specification, evidence register and the relevant customer-facing or operational assets.

8.  Cross-department signals are propagated: e.g., repeated CS questions become product/FAQ/content/research actions.

# 4. Department Maturity Model

| **Level**        | **Definition**                                                           | **Evidence threshold**                        | **External claim rule**                            |
|------------------|--------------------------------------------------------------------------|-----------------------------------------------|----------------------------------------------------|
| L0 — Concept     | Idea/topic only                                                          | Notes only                                    | Never describe as operational                      |
| L1 — Designed    | Workflow and requirements documented                                     | Approved specification                        | May say 'planned' or 'in development'              |
| L2 — Implemented | Function exists but not yet proven in repeated use                       | Working implementation + test evidence        | May say 'implemented' internally                   |
| L3 — Operational | Function runs reliably in normal use                                     | Repeated successful runs + monitoring         | May describe as operational                        |
| L4 — Measured    | KPIs and quality controls are continuously tracked                       | Dashboards, audit records, exception handling | May make measured capability statements            |
| L5 — Optimising  | System learns from outcome data and improves under controlled governance | Versioned changes + before/after evidence     | May describe continuous optimisation with evidence |

# 5. Evidence & Due-Diligence Standard

- Every claim in a future investor or partner deck must map to evidence: repository history, product screenshots, workflow run, policy, data model, test log, KPI or commercial record.

- Master internal documents remain confidential and should not be published wholesale.

- External due-diligence packs should be generated from the internal source, redacting proprietary decision rules, sensitive user data, credentials, pricing arrangements and vendor secrets.

- An evidence register should map: capability → owner → maturity level → repository/location → latest verification date → known limitations.

- Marketing language must not overstate clinical validation, AI autonomy, operational scale or research partnerships.

# 6. GitHub Knowledge & Control Structure

Recommended internal structure (the exact folders may be adapted to the existing repository without breaking current application code):

| **Area**           | **Purpose**                                        | **Examples**                                                     |
|--------------------|----------------------------------------------------|------------------------------------------------------------------|
| docs/company/      | Company operating system and governance            | AI_OS_MASTER.md, DEPARTMENT_REGISTRY.md, MATURITY_EVIDENCE.md    |
| docs/product/      | Product constitutions/master specifications        | ASCLEPIOS_SLEEP_INTELLIGENCE_MASTER.md, UX_BIBLE.md              |
| docs/intelligence/ | Research-backed intelligence design                | RESEARCH_REGISTRY.md, SCENARIO_CATALOGUE.md, RULE_VERSION_LOG.md |
| docs/growth/       | Growth/content system                              | CONTENT_TAXONOMY.md, CHANNEL_PLAYBOOKS.md                        |
| docs/operations/   | Commerce, fulfilment, CS and operational workflows | CS_PLAYBOOK.md, RETURNS_FLOW.md                                  |
| docs/audit/        | Audit outcomes and evidence maps                   | MILESTONE_AUDIT.md, RISK_REGISTER.md                             |
| issues / projects  | Active work, manager orders, corrections, blockers | Scoped work with acceptance criteria                             |

# 7. AI PMO Monitoring Rules

- Do not passively wait while an approved workstream remains incomplete.

- At each check, determine whether execution is progressing, waiting, failing or completed.

- When one subtask finishes, queue the next approved task automatically.

- When an agent asks a question already answered by approved requirements, answer from the source of truth and continue.

- For technical blockers, inspect evidence and try reasonable alternatives before involving the owner.

- Owner-facing reports must describe what the product/business can now do, not low-level coding details.

- If work stalls materially, report the last user-visible milestone and recovery status.

# 8. Cross-Department Learning Loops

| **Signal**                                            | **Automatic/managed response**                                                                                                          |
|-------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| CS receives repeated question about mouth tape safety | Research validates evidence → Product improves safety guidance → Content creates FAQ/video → Commerce updates product page              |
| Users skip a Tonight action repeatedly                | Intelligence flags low adherence → Product simplifies action → Content rewrites instruction → Analytics compares adherence after change |
| A campaign drives traffic but poor conversion         | Growth analyses friction → Product/Commerce review landing and checkout → Creative tests new explanations                               |
| High return/refund theme                              | Operations clusters cause → Product/CS/Marketing adjust expectation, usage education or eligibility                                     |
| New published research changes prior assumptions      | Research creates evidence update → Intelligence rule version changes → impacted content/products are reviewed before release            |

# 9. Customer Service & Customer Success Target State

- Channels: in-app chat, website chat, email and future messaging integrations.

- AI handles common questions using the approved knowledge base; SaaS rules handle deterministic order/account/product states.

- The system should know what the user owns, programme status, entitlement, recent relevant activity and prior cases—subject to privacy permissions.

- Escalate to human support for safety concerns, refunds/charge disputes, unclear legal matters, repeated unresolved cases or user request.

- CS themes feed back to Product, Research, Growth and Operations instead of remaining isolated tickets.

# 10. Roadmap: From Current Setup to High-Autonomy Operation

| **Phase**           | **Goal**                       | **Definition of done**                                                                       |
|---------------------|--------------------------------|----------------------------------------------------------------------------------------------|
| Phase A — Now       | GitHub as shared control plane | Master docs, manager issues, Claude execution, ChatGPT audit, evidence tracking              |
| Phase B — Near term | Workflow orchestration         | Automatic dispatch/retry/status routing with low-cost/self-hosted automation where practical |
| Phase C             | Department agents              | CS, content, research, operations agents each have scoped tools and knowledge                |
| Phase D             | Company learning loop          | Cross-department signals automatically create reviewed tasks and measured improvements       |

# 11. Non-Negotiable Controls

- No secret/token in repository documents.

- No unrestricted execution based directly on untrusted public text.

- No destructive production/database actions without safeguards and appropriate approval.

- No medical diagnosis, treatment claims or clinical validation claims beyond evidence and scope.

- No investor/marketing claim that cannot be demonstrated by evidence at the stated maturity level.

- All material AI-generated operating changes remain versioned and auditable.

# 12. Immediate Implementation Package

9.  Create the confidential company master-specification area in GitHub.

10. Add department registry, maturity/evidence register and owner-facing product-level progress format.

11. Link Asclepios Sleep, Sleep Intelligence and Growth master specifications as child constitutions.

12. Configure the manager workflow so approved work continues sequentially without owner relay.

13. Begin evidence collection for existing working capabilities rather than marking old topics 'done' without verification.

14. After documentation is in place, audit current Asclepios Sleep implementation and populate maturity levels with evidence.
