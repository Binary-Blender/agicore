# Agicore

**A deterministic systems-authoring platform for AI-native organizations.**

Agicore separates AI intelligence from runtime execution. AI handles interpretation, planning, and generation. Deterministic runtimes handle execution, validation, and reliability. The boundary between them is a DSL.

```
Human Intent
    |
AI Compiler / Orchestration
    |
Agicore DSL (constraint boundary)
    |
Deterministic Runtime
    |
Validated System
```

This is not an agent framework. It is not a chatbot. It is not no-code.

It is infrastructure for building AI-generated systems you can actually trust.

---

## Core Principle

> AI is never trusted at runtime.

AI is used at **build time** for interpretation, translation, and system generation. The output is constrained by a DSL, validated by tests, and executed deterministically. Every decision is traceable. Every output is reproducible.

---

## The Architecture

Agicore is built around a DSL that acts as an intermediate representation between human intent and executable systems:

```
APP home_academy {
  TITLE "Home Academy"
  WINDOW 1200x800 frameless
  DB academy.db
}

ENTITY Student {
  name: string
  grade: string
  active: bool = true
}

ACTION generate_lesson {
  INPUT  student_id: string, subject: string
  OUTPUT lesson: Lesson
  AI     "Generate a lesson plan for {{student}} on {{subject}}"
}

VIEW StudentList {
  ENTITY Student
  LAYOUT table
  ACTIONS create, edit, delete
}

TEST student_crud {
  GIVEN Student { name: "Alice", grade: "5th" }
  EXPECT create -> id IS NOT NULL
  EXPECT get_by_id -> name == "Alice"
}
```

The DSL compiles to working applications with full type safety, database schemas, API layers, UI scaffolds, and test suites. Two compilers verify correctness: `cargo build` + `tsc --noEmit`. If it builds, it works.

---

## Evolutionary Lineage

Agicore is the 4th generation of an AI-native development architecture. Each generation solved a different class of problem:

### 1G -- AI Native Coding Standards
Process thinking. Eight golden rules for AI-maintainable software. Metadata-driven, schema-first, deterministic generation patterns. PromptCore: a structured language for AI orchestration.

### 2G -- Web Development Stack
Infrastructure thinking. Workflow systems, orchestration patterns, reusable architecture for AI-assisted web application delivery.

### 3G -- NovaSyn
Platform thinking. A mature ecosystem of 9+ interoperable Electron applications sharing a common runtime: schema-first SQLite, single Zustand stores, 5-layer IPC bridge, shared vault, macro registry, cross-app orchestration. Zero-defect philosophy: rigid patterns, type-verified wiring, if `tsc --noEmit` passes it works.

### 4G -- Agicore
Systems-language thinking. The NovaSyn architecture generalized into a DSL-driven platform. Tauri replaces Electron (5MB apps instead of 200MB). The DSL replaces manual wiring. Expert systems join application development as first-class compilation targets. The platform becomes recursive: AI generates systems that generate systems.

---

## Repository Structure

```
agicore/
|
|-- README.md                  # You are here
|-- BUILD_WITH_AI.md           # Builder's guide — start here when building an app
|-- START_HERE_WITH_AI.md      # AI-assisted exploration guide (architecture / philosophy)
|-- EVOLVING.md                # How to extend the framework when it's missing something
|-- TECH_STACK.md              # Exact pinned versions for all dependencies
|-- CODING_STANDARDS.md        # Naming conventions, generated structure, anti-patterns
|-- PHILOSOPHY.md              # Core architectural philosophy
|-- ROADMAP.md                 # Development roadmap
|-- TESTING.md                 # TEST declarations and generated Rust integration tests
|-- VAULT.md                   # VAULT declaration: shared cross-app asset storage
|-- CHANNEL.md                 # CHANNEL + PACKET: typed SQLite-backed message queues
|-- LOGGING.md                 # LOG declaration: file-based Rust logger (no new deps)
|-- MACROS.md                  # MACRO + MACRO_REGISTRY: cross-app capability exposure
|-- EMBEDDED.md                # NODE, SENSOR, ZONE, ACTUATOR, PLATFORM, BRAIN_BODY: robots + IoT
|-- NULLCLAW.md                # NullClaw agent runtime: tool bindings, providers, safety
|-- SKILLDOCS.md               # SKILLDOC governance: signed skill docs, clearance, audit
|-- LICENSE                    # MIT
|
|-- dsl/                       # DSL grammar specification
|-- core/                      # Parser, validator, runtime, test runner
|   |-- parser/
|   |-- validator/
|   |-- runtime/
|   +-- test-runner/
|-- compiler/                  # AI compiler (natural language -> DSL)
|   +-- ai-compiler/
|
|-- history/                   # Evolutionary lineage (1G -> 4G)
|   |-- 1g-coding-standards/
|   |-- 2g-web-stack/
|   |-- 3g-novasyn/
|   |-- promptcore/
|   +-- agicore-foundation/
|
|-- examples/                  # Compact .agi demos of individual DSL features
|-- apps/                      # Real applications built on Agicore
|   +-- novasyn-chat/          # First flagship: multi-provider AI chat client
|-- docs/                      # Technical documentation
+-- prompts/                   # AI compiler prompt templates
```

---

## Reference Applications

### NovaSyn Chat 2.0 — Desktop AI Client

The `apps/novasyn-chat/` directory contains the first real application built on Agicore — a multi-provider AI chat client generated from a single `.agi` source file. **This application is proven working end-to-end.**

Verified features (all from generated code):
- Multi-provider streaming AI responses (Anthropic, OpenAI, Google, xAI)
- Encrypted API key storage and runtime model selection
- Conversation history with session management
- Folder-based knowledge organization with context injection
- Tag management and exchange library for reuse
- Semantic "Send To" transitions (save conversations to exchanges, folders, or documents)
- Frameless window with system tray and global hotkey

The app drives Agicore's evolution: every bug encountered while building it became a framework fix; every hand-extension is a codegen candidate. The commit history tracks framework hardening alongside the app's development.

See [`apps/novasyn-chat/README.md`](apps/novasyn-chat/README.md) for setup and architecture notes.

---

### The Accelerando Stack — Twelve `.agi` Files, One Enterprise Platform

```
accelerando_erp.agi          →  ERP/CRM web service         (Axum + React + PostgreSQL)
accelerando_billing.agi      →  Medical billing engine       (Axum + React, self-updating rules)
accelerando_legal.agi        →  eDiscovery + legal hygiene   (Axum + React, 6 connectors)
accelerando_lms.agi          →  Compliance training LMS      (Axum + React, daily micro-assessment)
accelerando_pi_coe.agi       →  Process improvement CoE      (Axum + React, TPS/Six Sigma/anti-backslide)
accelerando_qms.agi          →  Quality management system    (Axum + React, ISO 9001:2015)
accelerando_oie.agi          →  Intelligence layer           (Tauri desktop, AI reasoning)
accelerando_es.agi           →  Governance layer             (Tauri desktop, deterministic rules)
accelerando_chatbot.agi      →  Customer service chatbot     (Axum + React, web)
accelerando_eliza.agi        →  Operator interface           (Tauri desktop, macro executor)
accelerando_config.agi       →  Self-configuration advisor   (Tauri desktop, configuration ES)
accelerando_interchange.agi  →  Standard interchange layer   (Axum web service)
```

**`apps/accelerando-erp/`** — Full-spec ERP/CRM (web target):
- 32 entities across 10 modules: CRM, Finance/GL, Sales, Service, Procurement, Inventory, Manufacturing, Projects, HR
- 12 STAGES state machines: Lead pipeline, Opportunity funnel, Invoice approval, PO lifecycle, and more
- 32 business actions with EMIT telemetry — full coverage of the Accelerando service catalog
- Compiles to: Axum REST API, React frontend, PostgreSQL, multi-stage Docker, JWT auth, row-level tenant isolation

**`apps/accelerando-oie/`** — Organizational Intelligence Engine (AI layer):
- 4 REASONERs: daily batch, weekly trend, on-demand, personal coach
- QC_MESH: 4 independent evaluators, majority consensus, exceeds 5σ quality detection
- ESCALATION_CHAIN + NBVE: statistical model quality governance under telemetry load
- OIE asks: *"What is happening?"* — AI, probabilistic, retrospective

**`apps/accelerando-es/`** — Expert System (governance layer):
- 6 governance MODULEs: CreditControl, ApprovalMatrix, SLAEnforcement, LeadScoring, InventoryControl, FinancialControls
- 7 FACTs, 34 RULEs, 2 SCOREs, 5 STATE machines, 5 PATTERNs
- ES asks: *"What should happen right now?"* — deterministic, instantaneous, auditable
- ES decisions feed back as telemetry — OIE reasons over rule-firing patterns as meta-intelligence

**`apps/accelerando-chatbot/`** — Super Eliza Customer Service (chatbot layer):
- 5 MODULE governance domains: ConversationEngine, BillingSupport, OrderManagement, TechnicalSupport, AccountManagement, SafetyNet
- 28 PATTERNs (demo) → 200–2,000+ in production via `GenerateChatbot` AI build-time action
- 20 RULEs encode safety policies — including `never_promise_refund_without_verification` and `escalate_high_frustration`
- AI runs **once at build time** to generate PATTERNs from docs; zero LLM at runtime
- Chatbot escalations emit signed `EscalationPacket` telemetry to OIE
- *"Our chatbot will never call your customer a racial slur."* Verified. Deterministic. Auditable.

**`apps/accelerando-eliza/`** — Super Eliza Operator Interface (macro executor):
- 6 MODULEs: MacroEngine, AccessControl, CRMEliza, SalesEliza, ServiceEliza, FinanceEliza
- 20 WORKFLOWs, 66 workflow steps — every ERP SOP compiled to a deterministic recipe
- Natural language triggers compiled from SOPs via `GenerateEliza` AI build-time action
- Role-based permission gates at PRIORITY 100 — no operator can be talked past them
- *"Are you AI?" "No." "Are you human?" "No." "What are you?" "A very articulate button."*

**`apps/accelerando-config/`** — Configuration Intelligence (self-customizing ERP):
- 6 advisory MODULEs: ConfigurationEngine, IndustryAdvisor, GrowthAdvisor, ComplianceAdvisor, WorkflowAdvisor, IntegrationAdvisor
- 13 pre-compiled configuration templates in the SEED library (1,247 companies use `growth_small_to_medium`)
- Phase 1: AI-guided intake → match known template → apply deterministically
- Phase 2: ES monitors ConfigurationProfile FACT → fires RULEs when business state changes → recommends known configurations
- Compliance gap detection: SOX, HIPAA, government contracting, GDPR — every gap has a name and a deterministic fix
- *"What SAP charges $500k and 6 months to configure, Accelerando Config does in a conversation."*

**`apps/accelerando-interchange/`** — Standard Interchange Layer (every industry's wire formats):
- 5 interchange standards: HL7 v2.x, HL7 FHIR R4, ANSI X12 EDI, UN/EDIFACT, RosettaNet PIPs
- 13 typed PACKET declarations, 17 bidirectional CHANNELs, 9 processing WORKFLOWs, 28 ACTIONs
- Every spec validation rule encoded as a named Agicore RULE — `hl7_missing_pid_segment`, `x12_850_missing_beg_segment`, `edifact_missing_bgm_segment`
- Deduplication by interchange control number — the bug that costs companies millions encoded as one RULE
- *"The manufacturing interfaces you built in the 90s? EDI X12. The HL7 interfaces from healthcare? Same envelope. One module."*

**`apps/accelerando-billing/`** — Medical Billing Engine (the hardest rules-based domain, solved):
- 8 governance MODULEs: EligibilityEngine, ClaimAdjudicationEngine, FeeScheduleEngine, AuthorizationEngine, DenialsEngine, RemittanceEngine, ContractEngine, PatternIntelligence
- 11 WORKFLOWs covering full claim lifecycle: eligibility → scrub → submit → remittance → denial → appeal → close
- Self-updating rule library: 835 denials → `AnalyzeDenialPatterns` AI → `GeneratePayerRule` AI → human confirms → ES executes forever
- Pre-seeded with real denial knowledge: BCBS modifier 25 rule (847 denials, 96% confidence), Medicare CCI bundling (312 denials, 94% confidence)
- CO/OA/PR/PI denial routing — every group code maps to a deterministic action, no biller judgment required
- *"The insurance companies have had claims editing software for decades. Now the providers do too."*

**`apps/accelerando-legal/`** — eDiscovery and Legal Hygiene (stop creating the documents that lose cases):
- Two layers: reactive eDiscovery (holds, collection, privilege review, production) + proactive legal hygiene (pattern scanning before documents proliferate)
- 6 connectors: Exchange, Gmail, Slack, OneDrive, Google Drive, ERP — every source an organization has
- 5 hygiene PATTERNs — including the two that account for 80% of preventable litigation loss: documented non-compliance language and litigation anticipation in unprotected channels
- `legal_risk_score` SCORE with no decay — risk doesn't expire without action; at 50 counsel is notified, at 25 immediate action required
- `legal_risk_reasoner` REASONER — weekly plain-English advisory memo: "this is what you're doing that ends badly in court"
- Deletion suspension enforced during legal holds at PRIORITY 100 — spoliation is not an accident this system allows
- *"The organizations that lose cases they should have won almost never lose on the facts. They lose on the paper trail they created."*

**`apps/accelerando-lms/`** — Compliance Training LMS (daily micro-assessment, real-time knowledge scoring):
- Daily 3-question micro-assessments using spaced repetition: weakest domains, missed subtopics, and miss-weighted questions — each learner's questions are different
- Exponential moving average scoring: consistent failure reliably drives the score below threshold, one bad day does not
- Wrong answer → 5-minute targeted refresher on that exact subtopic, not a 2-hour general review
- Gamification: streaks (with 2 freeze credits), points, badges, department leaderboards — the Duolingo model applied to OSHA
- 10 pre-seeded compliance domains: HIPAA Privacy, HIPAA Security, OSHA, Sexual Harassment, Cybersecurity, GDPR/CCPA, FCPA, SOX, Insider Trading, Code of Conduct
- `GenerateQuestions` + `GenerateTrainingModule` — AI at build time, deterministic at runtime; question bank and refresher content generated from regulatory requirements, not written manually
- Audit export: per-employee, per-domain, per-question assessment history — proves knowledge retention, not attendance
- *"Annual compliance training proves attendance. This system proves knowledge. There is a difference, and in some industries that difference is a body count."*

**`apps/accelerando-pi-coe/`** — Process Improvement Center of Excellence (TPS, Six Sigma, anti-backslide):
- Full TPS knowledge encoded as expert system rules: Jidoka (stop-the-line), Kanban/overproduction detection, Takt time monitoring, SMED, TPM, Heijunka — not a document library, a governance system
- `improvement_sustainability` SCORE with 1-point/week decay — at 15 weeks of no sustaining activity the system flags drift (exactly when real-world backsliding begins)
- 5 backslide failure modes tracked: missed checks, metric regression, control audit overdue, champion reassigned, standard work drifted
- Automatic 30/60/90 day + 6-month + annual sustainability checks scheduled on every Kaizen close — the system will not let you move on
- `five_s_score` SCORE with 3-point/week decay — reflects the real rate at which 5S degrades without the 5th S
- DMAIC tollgate enforcement: control plan required before project closure, no exceptions
- `AnalyzeDriftPattern` AI classifies regression (minor/major/critical), identifies pattern (habit drift vs. step-change vs. seasonal), recommends intervention
- *"The purpose of a Kaizen is not to have a Kaizen. The purpose is to have a permanently better process."*

**`apps/accelerando-qms/`** — ISO 9001:2015 Quality Management System (every clause enforced, no theater):
- 8 modules mapped to ISO 9001:2015 clauses: document control (7.5), nonconformance (8.7), CAPA with effectiveness verification (10.2), internal audit with independence enforcement (9.2), management review with required inputs/outputs (9.3), supplier quality (8.4), calibration with retroactive review (7.1.5), customer feedback (8.2.1)
- CAPA effectiveness check mandatory at 90 days — ineffective CAPAs trigger new root cause analysis + PI CoE referral
- Recurring root cause detection: same problem twice → `systemic_issue_detected` → `ReferToPICoE` — because if the corrective action didn't prevent recurrence it wasn't corrective
- Auditor independence enforced at PRIORITY 100 — auditors cannot audit their own work
- Calibration retroactive review: when equipment is found out-of-tolerance, all measurements taken since last known-good calibration are flagged for review (Clause 7.1.5.2(d))
- 13 core ISO 9001 required documents pre-seeded: Quality Manual, 8 procedures, 4 forms — all with correct clause references
- *"A CAPA with no effectiveness check is theater. This system enforces the loop."*

The twelve apps are coherent: Interchange receives external messages → Billing processes claims → Legal governs all data under hold → LMS ensures every employee's knowledge is current → QMS captures every nonconformance and drives it to root cause → PI CoE eliminates systemic problems permanently and enforces improvement sustainability → Config advisor configures the ERP → ERP stores data → ES enforces internal policy → Chatbot serves customers → Eliza executes operator workflows → OIE surfaces intelligence across all telemetry streams. Every action in every layer is auditable. Nothing trusts an LLM at runtime.

See [`apps/accelerando-erp/README.md`](apps/accelerando-erp/README.md), [`apps/accelerando-billing/README.md`](apps/accelerando-billing/README.md), [`apps/accelerando-legal/README.md`](apps/accelerando-legal/README.md), [`apps/accelerando-lms/README.md`](apps/accelerando-lms/README.md), [`apps/accelerando-pi-coe/README.md`](apps/accelerando-pi-coe/README.md), [`apps/accelerando-qms/README.md`](apps/accelerando-qms/README.md), [`apps/accelerando-oie/README.md`](apps/accelerando-oie/README.md), [`apps/accelerando-es/README.md`](apps/accelerando-es/README.md), [`apps/accelerando-chatbot/README.md`](apps/accelerando-chatbot/README.md), [`apps/accelerando-eliza/README.md`](apps/accelerando-eliza/README.md), [`apps/accelerando-config/README.md`](apps/accelerando-config/README.md), and [`apps/accelerando-interchange/README.md`](apps/accelerando-interchange/README.md).

---

## Philosophy

Most AI systems today blur the line between generation and execution. They generate at runtime, which means they hallucinate at runtime.

Agicore draws a hard boundary:

- **Build time**: AI interprets, plans, translates, generates. Uncertainty is useful here.
- **Run time**: Deterministic systems execute validated logic. Correctness is required here.

This separation comes from Toyota Production System thinking applied to AI workflows: build quality in, don't inspect it out. Constrain the space of possible behavior rather than trying to convince a model to behave.

The result is systems that are:
- **Predictable** -- same input, same output
- **Explainable** -- every decision traceable
- **Testable** -- AI generates validation suites alongside systems
- **Composable** -- modules snap together through shared semantics
- **Evolvable** -- AI regenerates and revalidates as requirements change

---

## How Agicore Evolves

Agicore does not evolve through centralized roadmap planning. It evolves through **operational pressure** — real applications stress the framework, gaps surface as structured feature requests, and framework sessions close those gaps across every layer (lexer, parser, codegen, tests) before returning to the application. The loop repeats.

This model exists because AI collapses the cost of implementing a well-specified primitive. What remains expensive — and what this model demands — is the discipline to specify gaps precisely rather than work around them silently.

The workflow:

1. **Build a real application** — treat it as a framework stress test, not a demo
2. **Detect friction** — missing primitives, repeated patterns, rejected syntax
3. **Write a structured feature request** — syntax proposal, expected output, which app needs it
4. **Open a framework session** — implement across lexer → types → parser → codegen → tests
5. **Return to the application** — now with the primitive it needs, expressed in the DSL

Phase 8 was triggered entirely by writing `benders_killer_app.agi`. Six gaps surfaced, were documented in a single feature request file, and were implemented in one session: `ACTION IMPL`, `ACTION PATTERN`, `PREFERENCE`, union output types, `ACTION EMIT`, and `ENTITY SINGLETON`. Parser gained 22 tests, compiler gained 35. One conversation.

See [EVOLVING.md](EVOLVING.md) for the full methodology, the feature request template, and why this approach wasn't practical before AI.

---

## Status — MVP Complete (May 2026)

**The full pipeline works end-to-end.** A single `.agi` file compiles to a running Tauri application. The reference app has been tested in production: API key entry, multi-provider streaming AI responses, conversation history, folder-based knowledge, tag management, and exchange library all work from generated code.

| Layer | Tests | Status |
|---|---|---|
| Parser | 763 passing | Complete |
| Compiler | 1,181 passing | Complete |
| Static Validator | 34 passing | Complete |
| **Total** | **1,978 passing** | **0 failures** |

The DSL covers 53 declaration types across 9 layers:

- **Application:** APP, ENTITY, ACTION, VIEW, AI_SERVICE, TEST, PREFERENCE
- **Orchestration:** WORKFLOW, PIPELINE, QC, VAULT, STAGES
- **Expert System:** RULE, FACT, STATE, PATTERN, SCORE, MODULE
- **Cooperative Intelligence:** ROUTER, SKILL, SKILLDOC, REASONER, TRIGGER, LIFECYCLE, BREED, COGNITION_ROLE, ESCALATION_CHAIN, QC_MESH
- **Semantic Infrastructure:** PACKET, AUTHORITY, CHANNEL, IDENTITY, FEED
- **Ambient Intelligence:** NODE, SENSOR, ZONE
- **Semantic Operating Environment:** SESSION, COMPILER
- **Adaptive Intelligence:** EVENT, NBVE, CONTRACT, REPUTATION, SUBSCRIPTION, DISPUTE
- **Deployment:** TARGET, AUTH, TENANT

**What the compiler generates from a single `.agi` file:**

- SQLite migration with all entity tables, indexes, timestamps, and seed rows
- Rust Tauri commands for full CRUD, relationships, and custom operations
- TypeScript invoke wrappers with correct signatures (auto-generated via specta)
- Zustand store with entity state, current-entity navigation, and AI model selection
- React components: list views, form modals, AI chat with streaming, model picker, API key modal
- Expert system runtime (RULE/FACT/STATE/PATTERN/SCORE) and orchestration engine (WORKFLOW/PIPELINE with BFS parallel execution and SPC sampling)
- ROUTER with multi-tier fallback and per-tier circuit breakers
- ESCALATION_CHAIN dynamic model escalation engine with SPC-triggered role promotion, stability-window de-escalation, and cooldown enforcement; NBVE CHAIN field wires shadow runners to chain engines
- COMPILER semantic transitions ("Send To" — save conversations to exchanges, folders, or documents)
- Tauri configuration, capabilities ACL, tray icon, global hotkey, system tray
- Static validation before generation: 12 semantic checks, errors abort, warnings continue

---

## Community & Resources

**Free training and community:** [TAO — Tactical AI Orchestration on Skool](https://www.skool.com/tao-tactical-ai-orchestration-4733)

**Tools and skill documents:** [Binary Blender](https://binary-blender.myshopify.com/)

See [COMMUNITY.md](COMMUNITY.md) for details.

---

## Contributing

This project is designed for human + AI collaborative exploration. Point Claude Code at this repo and ask it questions. Generate modules. Trace patterns. Synthesize systems.

If this direction resonates with you, open an issue or start a discussion. We are looking for people who think in systems, not just code.

---

## License

MIT. Open source helped build this ecosystem. Agicore contributes back.
