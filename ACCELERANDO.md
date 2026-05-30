# The Accelerando Stack — Complete Reference

**Eighteen `.agi` files. One enterprise platform.**

> **Sources moved.** The `.agi` source files for every app described below now live in the [agicore-examples](https://github.com/Binary-Blender/agicore-examples) repo under `accelerando/`. This document remains in the main Agicore repo as the architectural narrative — the *why* of the suite. Path references throughout the doc point at the new location.

This document is the canonical reference for the Accelerando application suite — a complete AI-native enterprise platform built on the Agicore DSL. Each app is a single `.agi` source file that compiles to a running web service or desktop application. Every AI invocation happens at build time or in scheduled batch. Nothing trusts an LLM at runtime.

---

## The Architecture

```
// ── Enterprise Core ──────────────────────────────────────────────────────
accelerando_erp.agi              →  ERP/CRM web service              PORT 3000  Axum + React + PostgreSQL
accelerando_billing.agi          →  Medical billing engine            PORT 3003  Axum + React
accelerando_legal.agi            →  eDiscovery + legal hygiene        PORT 3004  Axum + React
accelerando_lms.agi              →  Compliance training LMS           PORT 3005  Axum + React
accelerando_pi_coe.agi           →  Process improvement CoE           PORT 3006  Axum + React
accelerando_qms.agi              →  Quality management system         PORT 3007  Axum + React
accelerando_interchange.agi      →  Standard interchange layer        PORT 3002  Axum web service
accelerando_config.agi           →  Self-configuration advisor        Tauri desktop
accelerando_chatbot.agi          →  Customer service chatbot          PORT 3001  Axum + React
accelerando_eliza.agi            →  Operator interface                Tauri desktop
accelerando_es.agi               →  Governance layer                  Tauri desktop
accelerando_oie.agi              →  Intelligence layer                Tauri desktop

// ── EMR / Healthcare Stack ────────────────────────────────────────────────
accelerando_scheduling.agi       →  Patient scheduling engine         PORT 3008  Axum + React
accelerando_clinical.agi         →  Clinical documentation + CDS      PORT 3009  Axum + React
accelerando_radiology.agi        →  RIS + DICOM + peer review         PORT 3010  Axum + React
accelerando_pharmacy.agi         →  E-prescribing + PDMP + formulary  PORT 3011  Axum + React
accelerando_population_health.agi →  Care gaps + risk + HEDIS/MIPS   PORT 3012  Axum + React
accelerando_patient_portal.agi   →  Patient self-service portal       PORT 3013  Axum + React
```

### Cross-App Integration — Enterprise Core

```
Interchange ──→ ERP (external messages become ERP records)
Billing ──→ Interchange (837 claims out, 835 remittances in via X12)
PI CoE ←──→ QMS (CAPAToPICoEPacket, NCRFromPICoEPacket — bidirectional)
Legal ──→ ERP (legal hold suspends ERP record deletion)
Chatbot ──→ OIE (EscalationPacket — customer escalations as intelligence)
Eliza ──→ OIE (MacroPacket — every operator action as telemetry)
ES ──→ OIE (rule-firing patterns as meta-intelligence)
Config ──→ ERP (template application updates ERP module configuration)
LMS ──→ ES (compliance scores feed governance rules — low HIPAA score flags PHI access)
QMS ──→ PI CoE (recurring root cause triggers Kaizen event)
```

### Cross-App Integration — EMR Stack

```
Scheduling ──→ Clinical (AppointmentConfirmedPacket — pre-populate encounter)
Scheduling ──→ Billing (expected revenue on confirmation, removed on cancellation)
Scheduling ──→ Patient Portal (appointment view, recall notifications)
Scheduling ←── Clinical (ReferralPacket — specialty routing)
Scheduling ←── Population Health (high-risk no-show alerts for risk scoring)

Clinical ──→ Pharmacy (PrescriptionPacket exactly_once — every medication order)
Clinical ──→ Radiology (imaging orders via CPOE)
Clinical ──→ Billing (NewEncounterPacket — charge capture)
Clinical ──→ Population Health (encounter data — care gap closure, registry updates)
Clinical ──→ Patient Portal (result releases, CCD, critical finding notifications)
Clinical ──→ Interchange (CCDPacket for external transitions of care)
Clinical ←── Pharmacy (PDMPHighRiskPacket — pharmacist flags high-risk patients)
Clinical ←── Radiology (FinalReportPacket, CriticalFindingAlertPacket)
Clinical ←── Population Health (care gap alerts at encounter open, HCC recapture alerts)

Radiology ──→ DICOM Gateway (ModalityWorklistPacket)
Radiology ──→ Clinical (FinalReportPacket, CriticalFindingAlertPacket exactly_once)
Radiology ──→ Patient Portal (result delivery after provider release)
Radiology ──→ ES/Governance (DoseAlertPacket for high-dose events)

Pharmacy ──→ Clinical (DispenseConfirmationPacket, PDMPHighRiskPacket)
Pharmacy ──→ Billing (DispenseConfirmationPacket for claims)
Pharmacy ←── Clinical (PrescriptionPacket exactly_once)
Pharmacy ←── Patient Portal (RefillRequestPacket)

Population Health ──→ Clinical (HCCRecapturePacket, care gap alerts at encounter open)
Population Health ──→ Patient Portal (CareGapOpenedPacket — patient-facing reminders)
Population Health ──→ ES/Governance (HighRiskPatientPacket, QualityMeasureReportPacket)
Population Health ←── Clinical (encounter data updates registries)
Population Health ←── Scheduling (no-show data for risk scoring)

Patient Portal ──→ Clinical (portal messages, ResultViewedPacket)
Patient Portal ──→ Pharmacy (RefillRequestPacket)
Patient Portal ──→ Scheduling (AppointmentRequestPacket)
Patient Portal ←── Clinical (result releases, CCD, care gap alerts, critical notifications)
Patient Portal ←── Scheduling (appointment confirmations, cancellations, recall reminders)
Patient Portal ←── Population Health (care gap outreach, care plan access)
```

---

## App 1 — ERP/CRM

**File:** `agicore-examples/accelerando/erp/accelerando_erp.agi`  
**Port:** 3000  
**Target:** Axum + React + PostgreSQL + Docker  
**Auth:** JWT, 8h expiry, row-level tenant isolation

### What It Does
Full-spec ERP/CRM covering 10 business modules. The data backbone of the Accelerando platform — every other app either feeds data into it or reads from it.

### Entities (32)
Across 10 modules:
- **CRM:** Lead, Contact, Account, Opportunity
- **Finance/GL:** Invoice, Payment, GLAccount, JournalEntry
- **Sales:** SalesOrder, SalesOrderLine, PriceList
- **Service:** ServiceTicket, SLA
- **Procurement:** PurchaseOrder, POLine, Vendor
- **Inventory:** InventoryItem, Warehouse, StockMovement
- **Manufacturing:** WorkOrder, BillOfMaterials, ProductionRun
- **Projects:** Project, Milestone, TimeEntry
- **HR:** Employee, Department, PayrollRun
- **Config:** TenantConfig

### STAGES State Machines (12)
Lead pipeline, Opportunity funnel, Invoice approval, PO lifecycle, ServiceTicket workflow, WorkOrder lifecycle, Project phases, and more.

### Key Design Decisions
- 32 business actions with `EMIT` telemetry — every significant state change emits typed telemetry to OIE
- Row-level tenant isolation — multi-tenant from the ground up
- `SINGLETON` entities for per-tenant configuration (TenantConfig)
- All financial entities have TIMESTAMPS for audit trail compliance

---

## App 2 — Medical Billing

**File:** `agicore-examples/accelerando/billing/accelerando_billing.agi`  
**Port:** 3003  
**Target:** Axum + React + Docker  
**Auth:** JWT, 8h expiry, row-level tenant isolation

### What It Does
Complete medical billing lifecycle: eligibility verification → pre-submission scrubbing → claim submission → remittance posting → denial management → appeals → self-updating rule library.

The core insight: medical billing looks non-deterministic because the rules change constantly. It isn't. The rules are published. The problem is rules discovery and maintenance, not execution. AI reads 835 denial patterns → writes RULE proposals → human confirms → ES executes forever.

### Entities (8)
`PayerContract`, `FeeScheduleEntry`, `ClaimRecord`, `ClaimLine`, `DenialRecord`, `AppealRecord`, `RemittanceFile`, `PayerRule`

The `PayerRule` entity is the self-updating rule library. Each record contains:
- `dsl_text`: a valid Agicore RULE declaration, AI-generated from denial pattern analysis
- `status`: `pending_review` → human confirms → `active`
- `denial_count` and `confidence`: statistical provenance

### STAGES
`ClaimRecord`: draft → validated → submitted → adjudicated → appealed / paid / written_off

### Modules (8)
| Module | Purpose |
|---|---|
| EligibilityEngine | 271 response parsing, patient responsibility calculation at TOS |
| ClaimAdjudicationEngine | Pre-submission scrubbing: modifiers, CCI edits, timely filing |
| FeeScheduleEngine | Contracted rate lookup, contractual adjustment calculation |
| AuthorizationEngine | Prior auth tracking, expiry enforcement |
| DenialsEngine | CO/OA/PR/PI routing — each group maps to a deterministic action |
| RemittanceEngine | 835 processing (8-step workflow — the most complex in the stack) |
| ContractEngine | `contract_freshness` SCORE with decay — halts claims on expired contracts |
| PatternIntelligence | THE FEEDBACK LOOP — denial rate detection, AI rule generation |

### Key Rules (pre-seeded)
| Rule | Payer | Denials | Confidence |
|---|---|---|---|
| `bcbs_modifier_25_same_day_em_procedure` | BCBS | 847 | 96% |
| `medicare_cci_office_visit_bundled_with_injection` | Medicare | 312 | 94% |
| `bcbs_j301_requires_allergy_workup_documentation` | BCBS | 156 | 91% |

### Key Workflows
`post_remittance_835` — 8 steps: parse → match → detect patterns → post payments → route denials → update patient balance → flag patterns → trigger AI analysis

### Pre-Seeded Payer Contracts
BCBS (180-day filing), Medicare (365-day filing), Medicaid (90-day filing)

---

## App 3 — Super Eliza Customer Service Chatbot

**File:** `agicore-examples/accelerando/chatbot/accelerando_chatbot.agi`  
**Port:** 3001  
**Target:** Axum + React + Docker  
**Auth:** JWT, row-level tenant isolation

### What It Does
A deterministic customer service chatbot where AI runs exactly once at build time. `GenerateChatbot` reads your product documentation, FAQs, and policy documents and generates PATTERN declarations. At runtime, only deterministic pattern matching executes. The LLM never touches a customer conversation.

**The slogan:** *"Our chatbot will never call your customer a racial slur."* Verified. Deterministic. Auditable.

### Modules (6)
| Module | Key Content |
|---|---|
| ConversationEngine | ConversationContext FACT — shared conversation state across all modules |
| BillingSupport | Billing inquiry patterns, payment plan responses |
| OrderManagement | Order status, return initiation, shipping patterns |
| TechnicalSupport | Product support patterns, escalation triggers |
| AccountManagement | Account update, password reset, subscription patterns |
| SafetyNet | PRIORITY 100 safety rules — what the bot can never say or promise |

### Key SafetyNet Rules
```
never_promise_delivery_without_order  (PRIORITY 100)
never_promise_refund_without_verification  (PRIORITY 100)
escalate_high_frustration  (PRIORITY 95)
never_engage_abusive_language  (PRIORITY 100)
```

### Integration
`EscalationPacket` CHANNEL → OIE — every customer escalation emits signed telemetry. OIE reasons over escalation patterns as organizational intelligence.

### AI Actions
- `GenerateChatbot` — build-time only: reads docs → generates 200–2,000+ PATTERN declarations
- `AnalyzeConversationPatterns` — batch: identifies gaps in PATTERN coverage from unmatched conversations

---

## App 4 — Super Eliza Operator Interface

**File:** `agicore-examples/accelerando/eliza/accelerando_eliza.agi`  
**Target:** Tauri desktop, 1400×900, frameless  
**Auth:** JWT, role-based

### What It Does
A macro executor with a conversational interface. Natural language → PATTERN match → deterministic WORKFLOW execution. Every multi-step ERP operation compiled to a named recipe. Push a button, get a cookie. The button happens to speak.

**The famous exchange:**
> "Are you AI?" — No.  
> "Are you human?" — No.  
> "What are you?" — A very articulate button.

### Modules (6)
`MacroEngine` (master executor with confirmation gate), `AccessControl` (role enforcement at PRIORITY 100), `CRMEliza`, `SalesEliza`, `ServiceEliza`, `FinanceEliza`

### Workflows (20, 66 steps total)
Representative examples:

| Workflow | Steps | Requires Confirmation | Permission |
|---|---|---|---|
| `qualify_lead` | 5 | No | sales_rep+ |
| `close_opportunity` | 6 | Yes | sales_manager+ |
| `create_invoice` | 5 | No | finance+ |
| `month_end_close` | 5 | Yes | controller+ |
| `post_depreciation` | 3 | Yes | controller+ |
| `process_payroll` | 5 | Yes | hr_manager+ |
| `emergency_refund` | 4 | Yes | customer_service_manager+ |

### Key Rules
```
block_execution_pending_confirmation (PRIORITY 100)
role_insufficient_for_action (PRIORITY 100)
```

No operator can be talked past a role gate. No workflow requiring confirmation executes without it.

### AI Actions
- `GenerateEliza` — build-time: reads SOPs → generates PATTERN + WORKFLOW DSL
- `ExplainWorkflow` — on request: plain-English explanation of what a workflow does

### Integration
`MacroPacket` CHANNEL → OIE — every executed macro emitted as signed telemetry (365-day TTL)

---

## App 5 — Configuration Intelligence

**File:** `agicore-examples/accelerando/config/accelerando_config.agi`  
**Target:** Tauri desktop  
**Auth:** JWT

### What It Does
Self-configuring ERP. ERP customization looks infinite — it isn't. It's a combinatorial space over ~20 industry verticals × 5 size tiers × 10 regulatory frameworks × 50 workflow patterns. SAP's implementation consultants navigate this manually, charging $500k and 6 months. The knowledge is encodable. It is now encoded.

**Two-phase model:**
- **Phase 1 (once, AI):** `ConductSetupInterview` → `MatchConfigurationTemplate` → `ApplyKnownConfiguration`
- **Phase 2 (ongoing, deterministic):** ES monitors `ConfigurationProfile` FACT → fires RULEs when business state changes → recommends known configurations

### The Template Library (13 pre-compiled configurations)

| Template | Users |
|---|---|
| `growth_small_to_medium` | **1,247** |
| `saas_small` | 847 |
| `professional_services_small` | 634 |
| `retail_small` | 445 |
| `manufacturing_small` | 523 |
| `gdpr_overlay` | 273 |
| `manufacturing_medium` | 298 |
| `government_contractor` | 156 |
| `healthcare_hipaa` | 189 |
| `sox_overlay` | 94 |
| + 3 others | — |

Usage counts are provenance: *"1,247 companies at your stage use this configuration."*

### Key Fact
`ConfigurationProfile` — the ERP's self-knowledge:
- `industry`, `employee_tier`, `revenue_tier`, `approval_complexity`
- `has_inventory`, `has_manufacturing`, `has_multi_warehouse`
- `compliance_sox`, `compliance_hipaa`, `compliance_government`, `compliance_gdpr`
- `active_modules`, `setup_complete`, `matched_template_id`
- `PERSISTENT`

### Key Rule
```
healthcare_requires_hipaa (PRIORITY 100)
```
If you're in healthcare and HIPAA isn't configured, this fires before you touch a patient record. It cannot be skipped.

### Advisory Modules (6)
`ConfigurationEngine`, `IndustryAdvisor`, `GrowthAdvisor`, `ComplianceAdvisor`, `WorkflowAdvisor`, `IntegrationAdvisor`

`ComplianceAdvisor` performs gap detection across SOX, HIPAA, government contracting, and GDPR. Every gap has a name. Every gap has a deterministic fix.

---

## App 6 — Standard Interchange Layer

**File:** `agicore-examples/accelerando/interchange/accelerando_interchange.agi`  
**Port:** 3002  
**Target:** Axum web service + Docker  
**Auth:** JWT, row-level tenant isolation

### What It Does
Every standard data interchange format in one module. The manufacturing interfaces from the 90s (EDI X12). The HL7 interfaces from healthcare. The same envelope, different transaction sets. Every spec validation rule encoded as a named Agicore RULE.

### Five Interchange Standards

| Standard | Use Case | Transport |
|---|---|---|
| HL7 v2.x | Hospital ADT, orders, lab results | MLLP (TCP) or HTTP |
| HL7 FHIR R4 | Modern clinical data | REST/HTTPS |
| ANSI X12 EDI | Supply chain + healthcare claims | AS2/SFTP |
| UN/EDIFACT | International/European supply chain | SFTP |
| RosettaNet PIPs | High-tech manufacturing (semiconductor, aerospace) | HTTPS + digital signatures |

### ANSI X12 Transaction Sets

**Supply chain:**
| Set | Name | Direction |
|---|---|---|
| 850 | Purchase Order | Inbound |
| 810 | Invoice | Inbound |
| 856 | Advance Ship Notice | Inbound |
| 855 | PO Acknowledgment | Outbound |
| 997 | Functional Acknowledgment | Outbound (every inbound set) |

**Healthcare:**
| Set | Name | Direction |
|---|---|---|
| 837P | Healthcare Claim | Outbound |
| 835 | Remittance Advice | Inbound |
| 270/271 | Eligibility Inquiry/Response | Bidirectional |

### Key Rules

**The deduplication rule** — encoded as PRIORITY 100:
```
reject_duplicate_message: is_duplicate == true → FLAG
```
X12 partners retransmit on timeout. Deduplicate by control_number + partner_id + transaction_type within 24h. Still send the 997 — so retransmission stops — but the ERP doesn't double-process. This bug has cost companies millions.

**The 997 rule:**
```
x12_always_send_997: isa_validated == true AND requires_ack == true → SendFunctionalAcknowledgment
```
Every inbound X12 transaction set requires a 997. No exceptions.

### Architecture
- 13 typed PACKETs (HL7ADT, HL7ORM, HL7ORU, FHIRResource, X12_850/810/856/997/837/835/270, EDIFACT, RosettaNet)
- 17 CHANNELs (bidirectional per standard)
- 6 MODULEs (InterchangeEngine, HL7Module, FHIRModule, X12Module, EDIFACTModule, RosettaNetModule)
- 9 WORKFLOWs (all follow: validate → deduplicate → transform → apply → acknowledge)
- 6 pre-seeded TradingPartners across all standards

---

## App 7 — eDiscovery and Legal Hygiene

**File:** `agicore-examples/accelerando/legal/accelerando_legal.agi`  
**Port:** 3004  
**Target:** Axum + React + Docker  
**Auth:** JWT, `ADMISSIBILITY legal_only` on HygieneAlertPackets, row-level tenant isolation

### What It Does
Two layers:
1. **Reactive (eDiscovery):** When litigation happens — holds, collection, privilege review, production, chain of custody
2. **Proactive (Legal Hygiene):** Stop creating the documents that lose cases. AI runs once at build time to generate PATTERN declarations. At runtime, deterministic pattern matching scans every communication before it proliferates.

### Connector Architecture (6 sources)
| Connector | Source | Captures |
|---|---|---|
| Exchange | Microsoft 365 / Graph API | Email, calendar, contacts |
| Gmail | Google Workspace / Gmail API | Email, labels, threads |
| Slack | Slack API | Messages, DMs, channels, reactions |
| OneDrive | Microsoft 365 / Graph API | Files, SharePoint documents |
| Google Drive | Drive API | Files, shared documents |
| ERP | Accelerando internal | Contracts, invoices, HR, billing |

### The Two Pet Peeve Rules

**"Stop documenting non-compliance":**
```
PATTERN known_noncompliance_language {
  MATCH "we are aware that|despite our policy|we have known since|
         although not standard practice|not in compliance with our own"
  SCORE legal_risk_score -= 20
  ASSERT HygieneContext.documents_known_noncompliance = true
}

RULE self_incrimination_critical {
  WHEN HygieneContext.documents_known_noncompliance == true
  THEN FLAG "documented_noncompliance_legal_review_required"
  PRIORITY 100
}
```

**"Stop putting this stuff in email":**
```
PATTERN litigation_anticipation_language {
  MATCH "if this goes to court|when we get sued|legal exposure|
         our lawyers will|potential liability|if deposed|settlement exposure"
  SCORE legal_risk_score -= 15
  ASSERT HygieneContext.litigation_anticipation_in_email = true
}
```

**Cover-up language** (the worst one, −25 risk score):
```
PATTERN cover_up_language {
  MATCH "don't put this in writing|delete this email|no paper trail|
         keep this between us|call me don't email"
  SCORE legal_risk_score -= 25
  ASSERT HygieneContext.cover_up_language_detected = true
  PRIORITY 100
}
```

Attempting to suppress evidence is worse than the underlying issue.

### The Legal Risk Score
`legal_risk_score` — no decay. Risk doesn't expire without action. At 50, outside counsel is notified. At 25, immediate action required.

### Legal Hold Enforcement
```
block_deletion_during_hold (PRIORITY 100) — deletion during active hold = spoliation
notify_custodians_within_24h (PRIORITY 100)
privilege_log_before_production (PRIORITY 100) — production blocked without privilege log
```

### Modules (6) + REASONER
`LegalHoldEngine`, `LegalHygieneAdvisor` (5 PATTERNs, 5 RULEs, legal_risk_score SCORE), `DocumentReviewEngine`, `ProductionEngine`, `ConnectorEngine`, `RetentionEngine`

`legal_risk_reasoner` — weekly batch, reads accumulated flags → plain-English advisory memo

### Pre-Seeded Retention Policies
Email (7yr), Contracts (10yr), Financial (7yr/IRS), HR (7yr/EEOC), Compliance (10yr), General (5yr)

---

## App 8 — Compliance Training LMS

**File:** `agicore-examples/accelerando/lms/accelerando_lms.agi`  
**Port:** 3005  
**Target:** Axum + React + Docker  
**Auth:** JWT, row-level tenant isolation

### What It Does
Daily micro-assessment LMS with spaced repetition and real-time knowledge scoring. Annual compliance training is not just ineffective — in high-stakes domains, it is actively dangerous. Ebbinghaus (1885): humans forget 70% of new information within a week without reinforcement. Annual training proves attendance. This system proves knowledge.

**Model:** 3 questions. 60 seconds. Every day.

### Spaced Repetition Algorithm (`SelectDailyQuestions`)
1. Weakest domains prioritized (ComplianceScore sorted by current_score ASC)
2. Missed subtopics targeted (ComplianceScore.weak_subtopic)
3. Miss-weighted question selection (times_served - times_correct DESC)
4. Adaptive difficulty: consecutive_correct drives easy → medium → hard progression

### Knowledge Scoring (Exponential Moving Average)
```
new_score = (current_score × 0.85) + (result × 100 × 0.15)
```
One wrong answer doesn't crater the score. Consistent failure reliably drives it below threshold.

### Gamification
| Mechanic | Detail |
|---|---|
| Streaks | Daily completion; 2 freeze credits per period |
| Points | 10 per correct + streak_bonus + perfect_bonus + speed_bonus; no decay |
| Badges | Streak milestones (7/30/90/365d), points milestones, Perfect Week, Comeback |
| Leaderboards | By department — public compliance scores create positive peer pressure |

### Refresher System
Score below threshold → `AssignRefresher` → 5-minute module targeting the specific failed subtopic. Not the 2-hour general course. The exact concept that failed.

### Pre-Seeded Compliance Domains (10)

| Domain | Basis | Passing | Critical |
|---|---|---|---|
| HIPAA Privacy | 45 CFR Part 164 Subpart E | 80 | 65 |
| HIPAA Security | 45 CFR Part 164 Subpart C | 80 | 65 |
| OSHA General Safety | 29 CFR Part 1910 | 75 | 60 |
| Sexual Harassment Prevention | Title VII | 80 | 65 |
| Cybersecurity Awareness | NIST SP 800-50 | 75 | 60 |
| Data Privacy (GDPR/CCPA) | GDPR Art 5 | 75 | 60 |
| Anti-Bribery / FCPA | 15 U.S.C. § 78dd | 80 | 65 |
| SOX Financial Controls | SOX §302/404 | 75 | 60 |
| Insider Trading Prevention | SEC Rule 10b-5 | 85 | 70 |
| Code of Business Conduct | Internal | 75 | 60 |

### AI Actions (build-time only)
- `GenerateQuestions` — reads training content → scenario-based questions with explanations (the explanation is the teaching moment — displayed immediately after a wrong answer)
- `GenerateTrainingModule` — reads regulatory requirements → 5-minute targeted refresher module

### Audit Export
Per-employee, per-domain, per-question assessment history. Proves knowledge retention, not attendance. Exportable for regulatory submission.

### Modules (6)
`AdaptiveAssessmentEngine`, `ComplianceTracker` (org_compliance SCORE), `GamificationEngine` (learner_points SCORE), `RefresherEngine`, `CurriculumEngine`, `ReportingEngine`

`compliance_intelligence_reasoner` — weekly: systemic gap detection, content effectiveness, cross-department pattern analysis

---

## App 9 — Process Improvement Center of Excellence

**File:** `agicore-examples/accelerando/pi-coe/accelerando_pi_coe.agi`  
**Port:** 3006  
**Target:** Axum + React + Docker  
**Auth:** JWT, row-level tenant isolation

### What It Does
TPS. Six Sigma. Kaizen. And a system that will not let you backslide six months later.

The improvement part is not the hard part. Getting people in a room for 4 days, mapping the value stream, building an action list — that's easy. The hard part is six months later. The action items nobody completed. The control plan nobody reads. The champion who got promoted. This system does not move on.

### The Anti-Backslide Core

`improvement_sustainability` SCORE with **1-point/week decay:**
```
INITIAL 100 → drifting at 70 (15 weeks) → regressed at 50 (50 weeks)
```
With no sustaining activity, you hit the "drifting" threshold in approximately the same timeframe real-world backsliding becomes visible. Active sustainability checks reset the clock.

**Five backslide failure modes tracked as booleans in `SustainabilityContext`:**

| Flag | What It Catches | Priority |
|---|---|---|
| `check_overdue` | Nobody scheduled follow-up | 85 |
| `metric_regression_detected` | Metric drifting back toward baseline | 82–100 |
| `control_audit_overdue` | Control plan not being audited | 90 |
| `champion_reassigned` | Person who drove it left — ownership gap | 88 |
| `standardized_work_drifted` | People stopped following the SWI | 83 |

### Automatic Sustainability Schedule
On every Kaizen close: `CreateSustainabilityChecks` schedules checks at **30 days, 60 days, 90 days, 6 months, and annually.** Assigned to the Kaizen champion. Reminders fire 7 days before each. Missed checks escalate to champion + sponsor.

### Metric Drift Detection
```
regression_pct = (current_avg - target) / (baseline - target)
< 15%  → minor  → review control plan
15–50% → major  → sustainability review required
≥ 50%  → critical → KaizenRegressionAlert emitted immediately
```
Nelson Rules also applied (Rules 1, 2, 3) — trend toward regression is flagged 3–4 weeks before threshold crossing.

### 5S Score
`five_s_score` with **3-point/week decay.** From world class (90), you'd hit "declining" (60) in 10 weeks without a 5S audit. Reflects reality.

### TPS Principles as Expert System Rules

| Rule | Clause | Priority |
|---|---|---|
| `jidoka_stop_line` | Andon + defect above threshold → stop line | 100 |
| `overproduction_kanban_violated` | WIP above kanban limit | 85 |
| `takt_time_violation` | Cycle time above takt → flow at risk | 83 |
| `smed_opportunity` | Changeover above target | 75 |
| `tpm_schedule_missed` | PM schedule overdue | 90 |
| `heijunka_violation` | Production leveling broken | 80 |

### DMAIC Tollgate Enforcement
```
control_phase_gate (PRIORITY 95):
  solution_validated == true AND control_plan_complete == false
  → FLAG "control_plan_required_before_closure"
```
A project cannot close without a control plan. This is the most commonly skipped step. Not here.

### Key AI Actions
- `GenerateKaizenCharter` — problem statement → 4-day event charter with explicit scope (scope creep kills Kaizens)
- `GenerateControlPlan` — improvement description → control plan with specific reaction steps ("investigate" is not a reaction plan)
- `GenerateStandardWork` — process description → SWI with reasons for key points (operators who understand why follow the standard)
- `AnalyzeDriftPattern` — metric series → regression classification + root cause hypothesis
- `SuggestImprovementOpportunities` — waste observations → ranked project list (quick wins build the culture for harder improvements)

### Entities (14)
`ValueStream`, `ImprovementProject`, `KaizenEvent`, `ActionItem`, `ProcessMetric`, `MetricReading`, `ControlPlan`, `ControlAudit`, `StandardWork`, `WasteObservation`, `SustainabilityCheck`, `BeltCertification`, `LessonsLearned`, `FiveSSurvey`

### 8 TIMWOODS Wastes Pre-Seeded
All 8 wastes as observation templates including: *"Rework station exists — rework is designed into the process."* (the sharpest one)

### Modules (7)
`KaizenEngine`, `SustainabilityEngine` (the core), `TPSEngine`, `SixSigmaEngine`, `MetricsEngine`, `ReplicationEngine`, `COEManagement`

`process_intelligence_reasoner` — weekly: systemic patterns, value stream redesign signals, replication opportunities, regression risks

### Integration with QMS
`NCRTriggerPacket` → QMS when defect patterns warrant nonconformance  
`CAPAToPICoEPacket` ← QMS when CAPA recurring root cause warrants Kaizen event

---

## App 10 — Quality Management System

**File:** `agicore-examples/accelerando/qms/accelerando_qms.agi`  
**Port:** 3007  
**Target:** Axum + React + Docker  
**Auth:** JWT, row-level tenant isolation

### What It Does
ISO 9001:2015 — every clause enforced. A real QMS is a closed loop: nonconformance → root cause → corrective action → effectiveness check → closure. Most implementations break the loop at effectiveness check. This system enforces every link.

### Clause Coverage

| Clause | Subject | Module |
|---|---|---|
| 7.5 | Documented information | DocumentControlEngine |
| 7.1.5 | Measurement equipment calibration | CalibrationEngine |
| 8.2.1 | Customer communication | CustomerFeedbackEngine |
| 8.4 | External providers (supplier control) | SupplierQualityEngine |
| 8.7 | Control of nonconforming outputs | NonConformanceEngine |
| 9.1.2 | Customer satisfaction monitoring | CustomerFeedbackEngine |
| 9.2 | Internal audit | AuditEngine |
| 9.3 | Management review | ManagementReviewEngine |
| 10.2 | Nonconformance and corrective action | CorrectiveActionEngine |

### The CAPA Loop
```
NCR created → root cause analysis required → CAPA initiated → implementation →
effectiveness check at 90 days → effective? → closed / ineffective → new CAPA
```

If ineffective: `CAPAContext.ineffective_capas += 1` → new CAPA triggered, root cause revisit required  
If recurring root cause (2nd occurrence): `systemic_issue_detected = true` → `ReferToPICoE`

### Key PRIORITY 100 Rules

| Rule | Clause | What It Catches |
|---|---|---|
| `obsolete_document_in_use` | 7.5 | Obsolete revision in use on shop floor |
| `out_of_tolerance_equipment_in_use` | 7.1.5 | Uncalibrated measurement equipment active |
| `unapproved_supplier` | 8.4 | Purchasing from non-approved supplier |
| `auditor_independence_violated` | 9.2.2(b) | Auditor auditing own work |
| `critical_ncr_immediate_response` | 8.7 | Critical nonconformance open |

### Calibration — The Retroactive Review Rule
```
RULE retroactive_measurement_review {
  WHEN CalibrationContext.measurements_with_expired_cal == true
  THEN FLAG "measurements_taken_with_expired_calibration_review_required"
  SEVERITY critical
  PRIORITY 95
}
```
Clause 7.1.5.2(d): when equipment is found out-of-tolerance, every measurement taken since last known-good calibration is flagged for retroactive review. Most QMS implementations don't enforce this. This one does.

### Management Review — Required Inputs and Outputs Enforced
`ReviewContext.required_inputs_documented` and `required_outputs_documented` tracked as boolean FACTs. Review cannot close without both. `GenerateManagementReviewPackage` drafts the input document and output decisions from live QMS data — because a management review that doesn't produce decisions is a compliance exercise.

### Key AI Actions
- `GenerateNCRReport` — NCR data → ISO-compliant nonconformance report with objective evidence
- `GenerateAuditReport` — audit data → ISO 19011 format (*"Record 12345 does not contain required field Y"* is a finding; *"not doing X"* is not)
- `ScheduleInternalAuditProgram` — annual audit schedule ensuring all clauses covered, independence maintained
- `GenerateManagementReviewPackage` — live QMS data → Clause 9.3.2 input + 9.3.3 draft outputs

### Pre-Seeded Documents (13)
`QM-001` Quality Manual through `QF-004` Management Review Minutes Template — all ISO 9001 mandatory documents with correct clause references and document numbers.

### Modules (8)
`DocumentControlEngine`, `NonConformanceEngine`, `CorrectiveActionEngine`, `AuditEngine` (audit_program_health SCORE), `ManagementReviewEngine`, `SupplierQualityEngine`, `CalibrationEngine`, `CustomerFeedbackEngine` (customer_satisfaction SCORE)

`quality_intelligence_reasoner` — monthly: NCR trends, CAPA effectiveness rates, complaint patterns → management review input per Clause 9.3.2

---

## App 11 — Expert System (Governance Layer)

**File:** `agicore-examples/accelerando/es/accelerando_es.agi`  
**Target:** Tauri desktop  
**Auth:** JWT

### What It Does
Deterministic governance. The ES asks: *"What should happen right now?"*  
The OIE asks: *"What is happening?"*  
These are different questions and require different systems.

### Governance Modules (6)
| Module | Key Rules |
|---|---|
| CreditControl | Credit limit enforcement, overdue AR escalation |
| ApprovalMatrix | Purchase and expense approval routing by amount |
| SLAEnforcement | Service ticket SLA breach detection |
| LeadScoring | Lead qualification rules |
| InventoryControl | Reorder point, safety stock |
| FinancialControls | Journal approval, reconciliation |

**34 RULEs, 7 FACTs, 2 SCOREs, 5 STATE machines, 5 PATTERNs**

Every ES decision emits telemetry → OIE reasons over rule-firing patterns as meta-intelligence. The ES is governance. The OIE watches the ES watch the business.

---

## App 12 — Organizational Intelligence Engine

**File:** `agicore-examples/accelerando/oie/accelerando_oie.agi`  
**Target:** Tauri desktop  
**Auth:** JWT

### What It Does
AI reasoning layer over all telemetry streams. The OIE asks: *"What is happening?"* — probabilistic, retrospective, retrospective. AI is always involved. Nothing the OIE says executes anything — it surfaces intelligence.

### REASONERs (4)
| Reasoner | Schedule | What It Analyzes |
|---|---|---|
| `daily_batch_reasoner` | Daily | Yesterday's telemetry from all apps |
| `weekly_trend_reasoner` | Weekly | 7-day patterns across value streams |
| `on_demand_reasoner` | Triggered | Specific escalations (chatbot, Eliza, ES) |
| `personal_coach_reasoner` | Weekly | Per-user performance patterns |

### QC_MESH
4 independent evaluators, majority consensus, exceeds 5σ quality detection.

### ESCALATION_CHAIN + NBVE
Statistical model quality governance under telemetry load: dynamic model escalation with SPC-triggered role promotion, stability-window de-escalation, cooldown enforcement.

---

## Integration Map — CHANNEL Topology

```
accelerando_interchange → accelerando_erp
  (external messages → ERP records)

accelerando_erp → accelerando_oie
  (EMIT telemetry on every significant state change)

accelerando_billing → accelerando_interchange
  (837P claims outbound, 835 remittance inbound)

accelerando_chatbot → accelerando_oie
  (EscalationPacket — customer escalations as intelligence)

accelerando_eliza → accelerando_oie
  (MacroPacket — every executed operator workflow as telemetry)

accelerando_es → accelerando_oie
  (rule-firing patterns as meta-intelligence)

accelerando_pi_coe ←→ accelerando_qms
  (CAPAToPICoEPacket: recurring NCR → Kaizen trigger)
  (NCRFromPICoEPacket: defect pattern → NCR creation)

accelerando_legal → (all apps)
  (legal hold suspends record deletion across all connected data sources)

accelerando_lms → accelerando_es
  (ComplianceScore below threshold → ES governance flags)
  (HIPAA score critical → PHI access governance rule fires)

accelerando_config → accelerando_erp
  (template application updates ERP module configuration)

accelerando_pi_coe → accelerando_qms
  (ReplicationPacket: sustained improvement → lessons learned distribution)
  (KaizenRegressionAlert: critical regression → leadership notification)
```

---

## Design Principles Common to All Apps

**AI at build time. Determinism at runtime.**  
Every app follows the same boundary: AI interprets, generates, analyzes. The ES, WORKFLOWs, and deterministic ACTIONs execute. No LLM adjudicates a claim, matches a chatbot pattern, or fires a governance rule at runtime.

**Pre-computed booleans in FACTs.**  
Every complex condition (CCI edit check, takt time comparison, regression detection, privilege waiver risk) is pre-computed as a boolean FACT field by an ACTION IMPL. RULEs act on simple boolean comparisons — valid DSL, instant evaluation, no ambiguity.

**Named everything.**  
Every flag has a name. Every RULE has a name. Every error has a name. `hl7_missing_pid_segment` is not "parsing failed." `bcbs_modifier_25_same_day_em_procedure` is not "claim rejected." Names are the audit trail.

**Decay encodes reality.**  
`improvement_sustainability` decays because improvements decay. `five_s_score` decays faster because 5S decays faster. `contract_freshness` decays because contracts go stale. The decay rate is calibrated to the real-world rate at which things degrade without active maintenance.

**PRIORITY encodes urgency.**  
PRIORITY 100: system cannot proceed (deletion during hold, unapproved supplier, auditor independence violation). PRIORITY 95: immediate human action required. PRIORITY 85–90: scheduled intervention required. PRIORITY 60–80: advisory. The numbers are not arbitrary.

**Effectiveness is verified.**  
CAPA effectiveness checks. Kaizen sustainability checks. LMS knowledge scores. Legal hygiene follow-up. Every improvement or corrective action is verified to have held, on a schedule, with escalation if it hasn't. The system does not move on.

---

## App 13 — Patient Scheduling

**File:** `agicore-examples/accelerando/scheduling/accelerando_scheduling.agi`
**Port:** 3008
**Target:** Axum + React

### What It Does

Full patient access lifecycle: provider template enforcement, appointment booking with double-booking prevention, waitlist management with priority sorting, recall campaign tracking, and no-show analytics.

### Key Rules

| Rule | Priority | What It Enforces |
|---|---|---|
| `double_booking_prevention` | 100 | `ValidateSlot` before write — slot conflict blocked |
| `resource_conflict_prevention` | 100 | Room and equipment cannot double-book |
| `high_priority_recall_critical` | 92 | Clinically urgent recall overdue → provider escalation |
| `high_priority_waitlist` | 88 | Priority patient on waitlist → expedite notification |
| `provider_daily_capacity` | 85 | Max patients per day enforced before booking |

### Key Actions

| Action | Type | Purpose |
|---|---|---|
| `FindAvailableSlots` | Deterministic | Template + exception + existing appt awareness |
| `ValidateSlot` | Deterministic | Pre-write double booking check |
| `GenerateRecallMessages` | AI (claude-haiku) | Personalized per patient, reason, attempt number |
| `OptimizeScheduleTemplate` | AI (claude-sonnet) | Utilization + no-show patterns → template recommendations |

### Entities
Provider, ScheduleTemplate, AppointmentType, Appointment, WaitlistEntry, RecallTask, Room, ScheduleException, NoShowRecord

### Packets Out
AppointmentConfirmedPacket → clinical, billing, portal | AppointmentCancelledPacket | RecallDuePacket → portal | NoShowAlertPacket → clinical, population health

---

## App 14 — Clinical Documentation and CDS

**File:** `agicore-examples/accelerando/clinical/accelerando_clinical.agi`
**Port:** 3009
**Target:** Axum + React

### What It Does

Patient chart, CPOE, clinical decision support. Covers the full encounter lifecycle: open → vitals → orders → notes → sign. Drug safety, allergy checking, screening reminders, and critical result management.

### Key Rules

| Rule | Priority | What It Enforces |
|---|---|---|
| `critical_allergy_alert` | 100 | Allergy conflict blocks medication order |
| `controlled_without_pdmp` | 100 | Controlled substance cannot proceed without PDMP |
| `critical_result_unreviewed` | 100 | Unacknowledged critical result — immediate review |
| `hypertensive_emergency` | 100 | SBP ≥ 180 → immediate intervention |
| `oxygen_sat_critical` | 100 | SpO₂ < 90% → immediate assessment |
| `major_drug_interaction` | 98 | Major DDI → clinical review required |
| `stat_order_overdue` | 95 | STAT order unfulfilled at 60 min → escalate |

### Key Actions

| Action | Type | Purpose |
|---|---|---|
| `CheckAllergyConflict` | Deterministic | RxNorm cross-sensitivity, not just name match |
| `CheckDrugInteractions` | Deterministic | All active meds + new drug |
| `CheckPDMPRequirement` | Deterministic | 3-day validity window, blocks if stale |
| `CheckScreeningDue` | Deterministic | USPSTF criteria at encounter open |
| `GenerateClinicalNote` | AI (claude-sonnet) | SOAP draft from encounter data — provider signs |
| `SuggestDifferential` | AI (claude-sonnet) | Ranked differential with ICD-10 and reasoning |
| `GenerateReferralLetter` | AI (claude-sonnet) | Clinical summary for specialist |
| `GenerateCCDDocument` | AI (claude-sonnet) | FHIR or CDA continuity of care document |

### Entities
Patient, Encounter, Problem, Medication, Allergy, Vital, ClinicalNote, Order, Result, Referral, CarePlan, Immunization, ClinicalAlert

### Packets Out
NewEncounterPacket → billing, population health | PrescriptionPacket → pharmacy (exactly_once) | ReferralPacket → scheduling | CriticalResultPacket → radiology, portal (exactly_once) | CCDPacket → interchange, portal

---

## App 15 — Radiology Information System

**File:** `agicore-examples/accelerando/radiology/accelerando_radiology.agi`
**Port:** 3010
**Target:** Axum + React

### What It Does

RIS with DICOM Modality Worklist integration, structured reporting, critical finding communication tracking (60-minute ACR guideline), peer review with concordance scoring, and dose tracking against diagnostic reference levels.

### Key Rules

| Rule | Priority | What It Enforces |
|---|---|---|
| `critical_finding_communication` | 100 | 60-min communication deadline (ACR guideline) |
| `contrast_allergy_blocked` | 100 | Contrast allergy → consent + premedication required |
| `creatinine_not_checked` | 98 | IV contrast without creatinine check → AKI risk |
| `reviewer_independence` | 100 | Radiologist cannot peer review own study |
| `report_missing_impression` | 95 | Report without impression section blocked from signing |
| `dose_exceeds_drl_significantly` | 97 | 3× DRL → immediate physics review |
| `stat_imaging_overdue` | 97 | STAT not started at 60 min → escalate |

### Key Actions

| Action | Type | Purpose |
|---|---|---|
| `CheckContrastScreening` | Deterministic | Allergy + creatinine before contrast |
| `IdentifyCriticalFindings` | AI (claude-sonnet) | Scans report text — flags for radiologist |
| `EvaluateDoseAgainstDRL` | Deterministic | ACR DRL comparison, alert if exceeded |
| `SelectStudiesForPeerReview` | Deterministic | 5% random selection per RADPEER |
| `GenerateRadiologyReport` | AI (claude-sonnet) | Structured report draft — radiologist signs |
| `SelectImagingProtocol` | AI (claude-sonnet) | Protocol selection from clinical indication |

### Entities
ImagingOrder, Study, RadiologyReport, CriticalFinding, PeerReview, DoseRecord, Modality, ImagingProtocol

### Packets Out
ModalityWorklistPacket → DICOM gateway | CriticalFindingAlertPacket → clinical, portal (exactly_once) | FinalReportPacket → clinical, portal | DoseAlertPacket → ES/governance

---

## App 16 — Pharmacy and E-Prescribing

**File:** `agicore-examples/accelerando/pharmacy/accelerando_pharmacy.agi`
**Port:** 3011
**Target:** Axum + React

### What It Does

NCPDP SCRIPT e-prescribing (including EPCS for controlled substances), real-time formulary checking against pharmacy benefits, mandatory PDMP integration, prior authorization workflow, and two-point drug safety checking at order entry and at dispense.

### Key Rules

| Rule | Priority | What It Enforces |
|---|---|---|
| `controlled_without_pdmp` | 100 | No controlled substance without PDMP query |
| `controlled_must_be_electronic` | 100 | EPCS required — paper blocked |
| `contraindicated_at_dispense` | 100 | Contraindicated combo → dispense blocked |
| `allergy_at_dispense` | 100 | Allergy conflict → dispense blocked |
| `controlled_early_refill` | 100 | State law early refill compliance |
| `opioid_benzo_combo` | 99 | Opioid + benzo → high overdose risk alert |
| `high_mme` | 96 | > 90 MME/day (CDC 2022 guideline) |
| `doctor_shopping` | 97 | Multiple prescribers detected — mandatory notification |

### Key Actions

| Action | Type | Purpose |
|---|---|---|
| `QueryPDMP` | Deterministic | ASAP standard state PDMP query |
| `EvaluatePDMPResponse` | Deterministic | Doctor shopping, MME, benzo combo flags |
| `CheckFormulary` | Deterministic | Real-time tier, PA, step therapy, quantity |
| `CheckInteractionsAtDispense` | Deterministic | Second interaction check at fill |
| `GeneratePARequest` | AI (claude-sonnet) | Payer-specific clinical criteria narrative |
| `TransmitPrescription` | Deterministic | NCPDP SCRIPT 10.6 / 2017071 |

### Entities
Prescription, DispensedMedication, FormularyEntry, PriorAuthorization, PDMPQuery, DrugInteractionRecord, RefillRequest, PharmacyBenefit

### Seed Data
4 formulary entries (generic → specialty tier 5) demonstrating coverage tier structure

---

## App 17 — Population Health Management

**File:** `agicore-examples/accelerando/population-health/accelerando_population_health.agi`
**Port:** 3012
**Target:** Axum + React

### What It Does

Care gap identification using HEDIS logic, multi-model risk stratification, disease registry management (6 conditions), quality measure calculation (HEDIS + MIPS), personalized outreach campaigns, care management enrollment, and HCC recapture for risk adjustment revenue.

### Key Rules

| Rule | Priority | What It Enforces |
|---|---|---|
| `post_discharge_no_followup` | 95 | 7-day follow-up not scheduled → 30-day readmission risk |
| `high_risk_no_care_manager` | 93 | High-risk patient not enrolled in care management |
| `measure_below_benchmark` | 90 | Quality measure below 50th percentile → escalation |
| `ckd_egfr_declining` | 87 | CKD registry eGFR trending down → nephrology referral |
| `diabetes_uncontrolled` | 85 | A1C uncontrolled → intensify management |
| `measure_below_target` | 82 | HEDIS measure below target → improvement plan |
| `hcc_recapture` | 83 | HCC codes need annual recapture → RAF revenue at risk |

### Key Actions

| Action | Type | Purpose |
|---|---|---|
| `RunHEDISCareGapLogic` | Deterministic | HEDIS measures → open care gap records |
| `StratifyRiskPanel` | Deterministic | RAF, Charlson, ED risk, admit risk |
| `CalculateQualityMeasures` | Deterministic | Live numerator/denominator calculation |
| `IdentifyHCCRecaptureDue` | Deterministic | Prior-year HCC codes not yet recaptured |
| `GenerateOutreachMessages` | AI (claude-haiku) | Personalized per patient, gap, channel |
| `GeneratePopulationReport` | AI (claude-sonnet) | Executive population health summary |

### Entities
PopulationCohort, CareGap, DiseaseRegistry, QualityMeasure, RiskScore, OutreachCampaign, CareManagementEnrollment, HCCCode

### Seed Data
6 disease registry cohorts (Diabetes, HTN, CHF, COPD, CKD, High Risk) | 6 quality measures (HbA1c Control, Colorectal, Breast, Blood Pressure, FUH, Influenza)

---

## App 18 — Patient Portal

**File:** `agicore-examples/accelerando/patient-portal/accelerando_patient_portal.agi`
**Port:** 3013
**Target:** Axum + React

### What It Does

Patient self-service: secure messaging with SLA enforcement, result delivery with safety holds (critical results never auto-release), appointment self-scheduling, refill requests with controlled substance blocking, health summary generation in plain language, and proxy access management with NIST IAL2 identity verification.

### Key Rules

| Rule | Priority | What It Enforces |
|---|---|---|
| `critical_result_never_auto_release` | 100 | Critical results: provider must release manually |
| `abnormal_result_requires_review` | 100 | Abnormal results: held until provider review on record |
| `controlled_via_portal_blocked` | 100 | Controlled substance refill via portal blocked |
| `account_locked` | 95 | Account locked after 5 failed logins — IAL2 to unlock |
| `urgent_message_unresponded` | 92 | Urgent portal message → on-call escalation at 4h |
| `high_risk_no_care_manager` | 93 | (via population health integration) |
| `message_response_sla` | 80 | 2-business-day response SLA → breach flag |
| `proxy_expired` | 82 | Proxy access expired → renew or revoke |
| `identity_not_verified` | 85 | IAL2 not complete → non-clinical access only |

### Key Actions

| Action | Type | Purpose |
|---|---|---|
| `CheckResultReleaseEligibility` | Deterministic | Critical/abnormal holds before portal write |
| `ValidatePortalAccountAccess` | Deterministic | Active, unlocked, verified, MFA cleared |
| `RouteMessageToProvider` | Deterministic | Categorize and route to correct inbox |
| `ValidateRefillRequest` | Deterministic | Active, not controlled, pharmacy on file |
| `GeneratePatientHealthSummary` | AI (claude-sonnet) | Plain language, 8th-grade reading level, preferred language |

### Entities
PortalAccount, SecureMessage, ResultRelease, AppointmentRequest, RefillRequest, HealthSummary, ConsentRecord, HealthGoal

---

## Total Scale

| Metric | Count |
|---|---|
| `.agi` source files | 18 |
| Entities | ~185 |
| Modules | ~85 |
| RULEs | ~250 |
| WORKFLOWs | ~120 |
| ACTIONs | ~215 |
| PACKETs | ~65 |
| CHANNELs | ~75 |
| Pre-seeded data records | ~130 |
| Lines of DSL | ~24,000 |

One enterprise platform. Zero runtime hallucination. Every decision traceable.

---

## The Backbone Pattern — what makes Accelerando the killer app

The architecture above describes the eighteen apps. The pattern below describes what they share. This is the layer the fiction names directly — Cole reading the README at 11:31 AM in *Carry* Ch 8, Ana mapping forty-three million in SaaS rent at 2:47 AM in *The Chocolate Wars* Ch 7. Adoption of this pattern is what turns a "suite of integrated apps" into "one operating system that eats the apps it replaces."

### The four contracts every module ships

| Contract | What the module declares | Where the substrate lives |
|---|---|---|
| **Spine emission** | `ACTION Emit<X>Packet` + `WORKFLOW emit_<x>_packet` firing on state transitions | Canonical `PACKET` + `CHANNEL` + `AUTHORITY` declared once in `accelerando_interchange.agi` |
| **Spine consumption** | `TRIGGER` on a spine `CHANNEL` + matching `PACKET` + filter, `FIRES WORKFLOW` | Same canonical interchange schema |
| **Operator taste** | One `SKILLDOC` per module encoding judgment that survives staff turnover, `SIGNED_BY AccelerandoAuthority`, `AUDIT all_actions` | Markdown body lives in `skilldocs/<module>_<surface>.md` |
| **Andon governance** | One `MUTATION_POLICY` per module: TIER 1 NBVE shadow auto-deploy, TIER 3 reviewed, TIER 5 ORDERED `[cfo, cto, board_chair]` | Andon Loop substrate from `agicore` core; reference [`ANDON_LOOP.md`](ANDON_LOOP.md) |

### The cross-Accelerando packet catalog (canonical in Interchange)

| Packet | Publishers | Consumers |
|---|---|---|
| `PurchaseOrderPacket` | ERP (approval), Interchange (inbound X12 850) | Billing, OIE, Interchange-outbound |
| `InvoicePacket` | ERP (vendor invoice), Billing (claim assembly) | Billing, OIE, ERP (AR) |
| `ClaimAcceptedPacket` | Billing | ERP (AR), OIE |
| `PaymentRecordedPacket` | Billing | ERP (close receivable), OIE (DSO) |
| `IntelligenceOpportunityPacket` | OIE | Eliza, ES, operator dashboards |
| `EscalationPacket` | Chatbot, Eliza | OIE, ES |

Every spine packet carries `tenant_id`, `source_module`, `PROVENANCE`, `LINEAGE`, `SIGNATURES`, `ADMISSIBILITY`, and a TTL appropriate to its domain. The `AccelerandoBus` LEDGER is the hash-chained audit log for the whole spine.

### Reference implementation status

| Module | Emits | Consumes | SKILLDOC | MUTATION_POLICY | Status |
|---|---|---|---|---|---|
| `interchange` | (spine declarations, REASONERs) | (spine REASONERs) | `accelerando_spine_routing` | `accelerando_spine_policy` | **Reference** |
| `erp` | `PurchaseOrderPacket`, `InvoicePacket` | `PaymentRecordedPacket`, inbound `PurchaseOrderPacket` | `erp_procurement_taste` | `erp_policy` | **Reference** |
| `billing` | `InvoicePacket` (claim), `ClaimAcceptedPacket`, `PaymentRecordedPacket` | `InvoicePacket` (start-claim) | `billing_collections_stance` | `billing_policy` | **Reference** |
| `oie` | `IntelligenceOpportunityPacket` (via `cross_module_opportunity_reasoner`) | All spine channels | `oie_insight_standards` (pre-existing) | `oie_policy` | **Reference** |
| `clinical` | `NewEncounterPacket`, `PrescriptionPacket`, `ReferralPacket`, `CriticalResultPacket`, `CCDPacket` (local, pre-existing) | `AppointmentConfirmedPacket`, `PDMPHighRiskPacket`, `FinalReportPacket`, `CriticalFindingAlertPacket`, `CareGapAlertPacket`, `HCCRecapturePacket`, `DispenseConfirmationPacket` | `clinical_documentation_taste` | `clinical_policy` (4-of-4 TIER 5: CMO/CFO/CTO/board chair) | **Reference** |
| `scheduling` | `AppointmentConfirmedPacket`, `AppointmentCancelledPacket`, `RecallDuePacket`, `NoShowAlertPacket` (local, pre-existing) | `AppointmentRequestPacket`, `HighRiskNoShowPacket` | `scheduling_discipline` | `scheduling_policy` | **Reference** |
| `pharmacy` | `DispenseConfirmationPacket`, `PDMPHighRiskPacket`, `PriorAuthRequestPacket` (local, pre-existing) | `PrescriptionPacket` (from Clinical), `RefillRequestPacket` (from Patient Portal) | `pharmacy_dispensing_stance` | `pharmacy_policy` (4-of-4 TIER 5) | **Reference** |
| `radiology` | `ModalityWorklistPacket`, `FinalReportPacket`, `CriticalFindingAlertPacket`, `DoseAlertPacket` (local, pre-existing) | `ImagingOrderPacket` (from Clinical) | `radiology_reading_discipline` | `radiology_policy` (4-of-4 TIER 5) | **Reference** |
| `population-health` | `CareGapOpenedPacket`, `HighRiskPatientPacket`, `QualityMeasureReportPacket`, `HCCRecapturePacket` (local), `HighRiskNoShowPacket` | `InboundEncounterSignalPacket`, `InboundNoShowSignalPacket` | `population_health_attribution` | `population_health_policy` (4-of-4 TIER 5) | **Reference** |
| `patient-portal` | `PortalMessagePacket`, `RefillRequestPacket`, `AppointmentRequestPacket`, `ResultViewedPacket` (local, pre-existing) | Appointment confirmations, final reports, care gaps, dispense confirmations | `patient_portal_release_discipline` | `patient_portal_policy` (4-of-4 TIER 5) | **Reference** |
| `es` | `GovernanceDecisionPacket` | `InboundIntelligenceOpportunityPacket` (from OIE) | `es_governance_stance` | `es_policy` (4-of-4 TIER 5: GC/CFO/CTO/board chair) | **Reference** |
| `eliza` | `MacroPacket` (every operator action) | — | `eliza_operator_taste` | `eliza_policy` | **Reference** |
| `legal` | `LegalHoldNoticePacket`, `HygieneAlertPacket` (local, pre-existing) | — | `legal_hold_discipline` | `legal_policy` (4-of-4 TIER 5: GC/CFO/CTO/board chair) | **Reference** |
| `lms` | `ComplianceScorePacket` (to ES governance) | — | `lms_curriculum_taste` | `lms_policy` | **Reference** |
| `qms` | `CAPAToPICoEPacket`, `AuditReadinessPacket` (local, pre-existing) | `NCRFromPICoEPacket` (from PI CoE) | `qms_root_cause_discipline` | `qms_policy` (4-of-4 TIER 5: QD/CFO/CTO/board chair) | **Reference** |
| `pi-coe` | `ReplicationPacket`, `KaizenRegressionAlert`, `NCRTriggerPacket` (local, pre-existing) | `CAPAToPICoEPacket` (from QMS) | `pi_coe_kaizen_discipline` | `pi_coe_policy` | **Reference** |
| `chatbot` | `EscalationPacket` (local, pre-existing, matches escalation_spine) | — | `chatbot_de_escalation_taste` | `chatbot_policy` | **Reference** |
| `config` | `ConfigurationAppliedPacket` (to every reconfigured module) | — | `config_advisor_taste` | `config_policy` | **Reference** |

### All 19 modules now ship the four contracts

Every module in the suite — `interchange`, `erp`, `billing`, `oie`, plus the EMR stack (`clinical`, `scheduling`, `pharmacy`, `radiology`, `population-health`, `patient-portal`) plus the enterprise governance/operator/admin tier (`es`, `eliza`, `legal`, `lms`, `qms`, `pi-coe`, `chatbot`, `config`) — declares its own `SKILLDOC`, `MUTATION_POLICY`, `REASONER` pair, and at least one spine-channel emit or consume.

Across the 18 wired modules plus the interchange spine: 18 `SKILLDOC` declarations, 18 `MUTATION_POLICY` declarations (each with the canonical TIER 1 NBVE auto / TIER 3 reviewed / TIER 5 ORDERED `[..., cfo, cto, board_chair]` pattern; healthcare-tier modules add a CMO/Medical-Director seat at TIER 5; legal and ES add a General-Counsel seat), 41 `REASONER` declarations on the spine, 32 inbound `TRIGGER` declarations, and 17 canonical spine PACKETs + 17 spine CHANNELs in `accelerando_interchange.agi`. The suite is no longer a collection of integrated apps. It is one operating system.

This is what *Carry* Ch 8 names when Cole reads the README at 11:31 AM Wednesday and says *"This is the substrate."* It is what *The Chocolate Wars* Ch 9 names when Ana finishes the eighteen-`.agi`-file Accelerando build sprint at MrBeast LLC and the empire stops being thirteen LLCs holding hands by force of Jimmy's attention.

### How a module owner adopts the pattern

1. **Identify which spine packets your module produces and consumes.** Use the catalog above. If you need a new spine PACKET, declare it canonically in `accelerando_interchange.agi`, not in your module file.
2. **Add `ACTION Emit<Packet>` + `WORKFLOW emit_<packet>`** per outbound packet, fired on the right `STAGES` transition.
3. **Add a `TRIGGER`** per inbound packet, `WHEN` clause filtering on `source_module` or payload predicates, `FIRES WORKFLOW <handler>`.
4. **Declare one `SKILLDOC`** for your module's load-bearing judgment surface (procurement-taste, collections-stance, scheduling-discipline, etc.). Body in `skilldocs/<module>_<surface>.md`. `SIGNED_BY AccelerandoAuthority`, `AUDIT all_actions`.
5. **Declare one `MUTATION_POLICY`** with TARGETS = your module's WORKFLOWs, TIER 1 NBVE auto, TIER 3 reviewed `[<your_lead>, <peer_lead>]`, TIER 5 ORDERED `[cfo, cto, board_chair]`, `LEDGER AccelerandoBus`.
6. **Optional: add a module-scoped `REASONER`** that consumes its own spine traffic and emits `IntelligenceOpportunityPacket` for cross-domain findings.

That's the pattern. The fiction does this in 45 days at Carrick (*Carry* Ch 8) and 12 weeks at MrBeast LLC (*Chocolate Wars* Ch 8–10). The reference implementation lives in the four modules above; the other fifteen are a straight propagation pass.
