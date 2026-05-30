# Transformation Proposal
## Northshore Diagnostic Group

**Prepared by:** Binary-Blender (Agicore + TAO practice)
**Prepared for:** Mara Volkov, COO, Northshore Diagnostic Group
**Date:** 2026-05-30
**Engagement Type:** Fixed-Price Organizational Transformation
**Document Status:** Fictional case study illustrating the TAO + Accelerando deployment pattern. All organizations, individuals, and figures are illustrative.

---

## Executive Summary

Northshore Diagnostic Group (NDG) is a regional diagnostic-and-primary-care network operating three sites across upstate New York, with 340 employees and approximately $52M in annual revenue. NDG currently spends **$2.34M per year on enterprise software** — most of it on a hosted Epic Community Connect seat licensed through a larger health system, plus an aging RIS, several niche specialty tools, and a SaaS patchwork accumulated over the past decade. Any non-trivial configuration change to the Epic stack takes 6 to 18 months and incurs change-order fees averaging $42,000 per request. The clinical and operations teams have learned to work around the software rather than through it.

This proposal replaces the existing enterprise stack with the **Accelerando deployment** — an 18-module open-source AI-native enterprise platform built on the Agicore DSL — wrapped in the **TAO (Transformative AI Operations) program** which prepares the workforce to operate the new stack with AI augmentation from Day 1. The deployment runs **14 weeks** end-to-end, including data migration, training, and go-live.

**The headline numbers:**

| Metric | Current State | After Transformation | Delta |
|---|---:|---:|---:|
| Annual enterprise-software spend | $2,340,000 | $312,000 | −86.7% |
| Time-to-config-change | 6–18 months | <72 hours (most changes) | −98% |
| Implementation cost | $1.4M–$2.8M (Epic equivalent) | $385,000 | −82% to −86% |
| Implementation timeline | 14–22 months (Epic equivalent) | 14 weeks | −83% to −89% |
| Five-year total cost of ownership | ~$13.1M | ~$1.94M | **−85%** |

**The five-year savings net of all transformation costs: $11.16M.**

We are willing to put a portion of our fee at risk against these outcomes — fee structure detail in §7.

---

## 1. The Client

### 1.1 Profile

- **Name:** Northshore Diagnostic Group, P.C.
- **Headquarters:** Syracuse, NY
- **Sites:** Syracuse (primary), Rochester (secondary), Albany (satellite)
- **Founded:** 1987 as a single-radiologist practice; multi-modality and multi-site since 2008
- **Ownership:** Physician-owned partnership, 14 partner physicians, leadership operating committee
- **Headcount:** 340 (62 physicians/NPs/PAs, 47 radiology techs, 34 lab techs, 28 RNs, balance administrative/operational/IT)
- **Annual revenue:** ≈ $52M
- **Service mix:** ~55% outpatient imaging (CT/MR/US/Mammography/X-ray), ~25% outpatient lab, ~20% primary care satellite clinics
- **Payer mix:** ~38% commercial, ~29% Medicare, ~18% Medicaid, ~15% self-pay/other
- **Patient volume:** ~187,000 annual encounters
- **Annual studies/results:** ~94,000 imaging studies, ~310,000 lab orders

### 1.2 Leadership

- **CEO:** Dr. Henry Park (founder-physician, semi-retired, advisory role)
- **COO:** Mara Volkov (15 years at NDG, primary engagement sponsor)
- **CMO:** Dr. Saskia Ahmadi (radiology lead)
- **CFO:** Jordan Talbot
- **CIO:** None — IT is a 4-person department reporting to CFO; this is part of the diagnostic
- **General Counsel:** Outside counsel (Karras & Lim LLP)

### 1.3 Strategic Pressure

NDG's leadership has identified three converging pressures that motivate the transformation:

1. **Cost pressure.** Reimbursement from commercial payers has been flat to declining for four years; Medicare rates compressed 3.7% over the same period. The $2.34M annual enterprise-software spend has become structurally untenable.

2. **Talent pressure.** The 2024 radiology hire took 11 months to close. Younger physicians evaluating NDG specifically cite the antiquated EMR experience as a friction point — the practice cannot compete for talent on tools alone.

3. **Quality pressure.** HEDIS measure performance for the primary-care satellite clinics dropped 4 percentage points across two consecutive measurement years. The current stack cannot surface care gaps at encounter open; population-health work has been a quarterly retrospective rather than a daily operational discipline.

The COO's framing in the discovery call: *"We need to come out of this in two years with software that is cheaper, faster, and that our physicians actually want to use. The current stack is the reverse of all three."*

---

## 2. Current State

### 2.1 The Enterprise Stack

| System | Vendor | Annual Cost | Role | Comments |
|---|---|---:|---|---|
| Epic Community Connect | Hosted by Crouse Health System | $1,847,000 | EHR, MyChart, basic RIS | Hosted seat — limited configuration control |
| GE Centricity RIS | GE Healthcare | $138,000 | RIS overlay (legacy) | Last upgrade 2017 |
| Sunquest LIS | Sunquest Information Systems | $96,000 | Lab information | Modern but isolated |
| Modernizing Medicine (specialty) | Modernizing Medicine | $54,000 | Pain-management specialty docs | Single specialty |
| Salesforce (provider CRM) | Salesforce | $72,000 | Provider referral relationship | Underutilized |
| ADP HCM | ADP | $43,000 | HR / payroll | Out of scope for this project |
| QuickBooks Enterprise + add-ons | Intuit | $24,000 | Accounting GL | Out of scope (Phase 2) |
| HealthStream | HealthStream | $31,000 | Compliance training (HIPAA, OSHA) | In scope for replacement |
| Press Ganey | Press Ganey | $19,000 | Patient experience surveys | Out of scope |
| Misc SaaS (PHQ-9 scoring, e-rx add-ons, etc.) | various | $16,000 | Niche utilities | In scope for consolidation |
| **Total** | | **$2,340,000** | | |

### 2.2 Cost-Beyond-License

Beyond direct license fees, the IT department spends approximately **2.4 FTE-equivalent worth of time** on integration plumbing — HL7 maintenance, the GE Centricity bridge to Epic, the Sunquest-to-Epic interface, the Salesforce/Epic data sync. At a fully-loaded IT-staff cost of $135,000 per FTE, this represents **$324,000 per year** of staff time consumed by stack maintenance rather than enabling work.

**Total true annual enterprise-software cost: ~$2.66M.**

### 2.3 Configuration-Change Velocity

Across the 18 months preceding this engagement, NDG submitted 31 change requests against the Epic Community Connect stack. Of those:

- 9 were completed (median: 11 months end-to-end, average change-order fee $42,000)
- 14 were delayed past 12 months and still pending
- 8 were declined as out-of-scope for the hosted seat (would require migration to a full Epic license, ~$8M)

The leadership team's effective response has been to stop requesting changes for anything that isn't safety-critical. Operational improvement work that would normally flow through the EHR routes instead through Excel workbooks, manual spreadsheet handoffs, and per-site adaptations that drift from each other over time.

### 2.4 The Quality Signal

Two trends concentrate the urgency:

- **HEDIS performance:** colorectal screening compliance dropped from 71% to 64% across two measurement years; diabetic eye-exam compliance dropped from 68% to 59%; controlled-substance prescribing compliance is now within 2 points of triggering a payer audit.
- **Critical-finding ack times:** measured against an internal target of <30 minutes (well within the Joint Commission window), median acknowledgement time on radiology critical findings has drifted from 22 minutes to 47 minutes since the Sunquest-Epic interface degraded in mid-2025.

Neither trend is a software fault per se — the underlying clinical work is good. They are symptoms of a stack that cannot surface the right information at the right moment in the workflow.

---

## 3. The Transformation

### 3.1 The Two-Pillar Approach

The transformation has two pillars that proceed in parallel:

**Pillar A — TAO (the workforce side).** TAO is the four-step program documented in the Binary-Blender User's Manual: Book Creation Skills → AI WIN-WIN → Training Courses → NovaSyn Chat. It prepares every employee at NDG to operate alongside AI-augmented workflows. The TAO rollout starts in Week 1 and runs in parallel with the Accelerando build.

**Pillar B — Accelerando (the system side).** Accelerando is the 18-module open-source enterprise platform built on the Agicore DSL. Of the 18 modules, **15 are directly relevant to NDG's workflows** (the three exceptions: ERP-procurement, full manufacturing modules, eliza desktop). The deployment uses the `accelerando_config` self-configuration advisor to apply the Healthcare-Provider-HIPAA template plus radiology-specific overlays, then customizes against NDG's actual data, payer contracts, and operating discipline.

### 3.2 The Module Map

| Accelerando Module | NDG Use | Replaces |
|---|---|---|
| `accelerando_clinical` | Encounter documentation, CDS, critical-finding routing, HCC capture | Epic clinical (Community Connect) |
| `accelerando_scheduling` | Appointment booking, recall, no-show intervention, waitlist | Epic scheduling + custom Excel workbooks |
| `accelerando_radiology` | RIS, modality worklist, peer review, dose stewardship | GE Centricity RIS + Epic radiology |
| `accelerando_pharmacy` | (light — for e-rx integration to external pharmacy) | Epic e-rx |
| `accelerando_population_health` | HEDIS, care gaps, HCC recapture, risk stratification | (no current system — manual quarterly) |
| `accelerando_patient_portal` | Patient self-service, results, secure messaging | Epic MyChart |
| `accelerando_billing` | Claims, denial management, payment posting, hardship policy | Epic PB + Centricity billing |
| `accelerando_interchange` | HL7v2 + X12 + FHIR external exchanges | Custom HL7 bridges, Quest interface |
| `accelerando_oie` | Cross-domain organizational intelligence | (no current system) |
| `accelerando_lms` | HIPAA + OSHA + role-specific compliance training | HealthStream |
| `accelerando_qms` | NCR/CAPA, audit readiness, ISO discipline | (manual + spreadsheets) |
| `accelerando_pi_coe` | Continuous-improvement kaizen | (none — periodic outside consultants) |
| `accelerando_es` | Governance rules, credit/clinical/compliance gates | (scattered — partial in Epic) |
| `accelerando_legal` | Legal hold, data-hygiene scans (light footprint at NDG scale) | (none — handled by outside counsel ad hoc) |
| `accelerando_chatbot` | Front-line patient question routing | (none — phone queue only) |
| `accelerando_config` | Self-configuration advisor (deployment tool) | (n/a) |

Three modules **out of scope** for the initial deployment: full ERP procurement (NDG's $52M revenue doesn't require Accelerando ERP — QuickBooks stays for Phase 1), eliza desktop operator interface (low-leverage at NDG headcount), and the heaviest legal-hold features (NDG's matter volume is too low to justify full deployment).

### 3.3 The TAO Layer

The TAO program runs alongside the system deployment with specific role-based paths:

| Role Cohort | Headcount | TAO Track |
|---|---:|---|
| Radiologists | 14 | Mastering AI Prompts → Strategic AI → Stop Being the Bottleneck (radiologist remix) |
| Primary-care physicians | 18 | Mastering AI Prompts → Strategic AI → Stop Being the Bottleneck (PCP remix) |
| Mid-level providers (NP/PA) | 30 | Same as PC physicians, lighter |
| Radiology techs | 47 | Mastering AI Prompts → Bottleneck (tech-specific) |
| Lab techs | 34 | Mastering AI Prompts only |
| RNs | 28 | Mastering AI Prompts → Strategic AI |
| Schedulers / patient-services | 41 | Mastering AI Prompts → Patient-facing scenario remix |
| Billing / RCM | 22 | Full TAO stack — they will be heavy AI users for denial management |
| IT staff | 4 | Full TAO + Agicore-author training (they become the in-house customization team) |
| Leadership / management | 18 | AI WIN-WIN strategic foundation; Blueprint Audit |
| Compliance / quality | 8 | Full TAO + QMS skill doc deep-dive |
| Operational support | 76 | Mastering AI Prompts only |

NovaSyn Chat (the local-first AI tool) is distributed organization-wide on Day 30 once API keys are provisioned.

### 3.4 The Operator-Judgment Capture

A distinctive element of the Accelerando deployment: across the 14-week engagement we capture NDG's institutional operator-judgment into **18 signed SKILLDOC artifacts**. These are markdown documents — 2,000–5,000 words each — that encode the clinical, billing, scheduling, and governance discipline of the practice into deployable cognition modules. Examples specific to NDG:

- `ndg_clinical_documentation_taste` — CDS alert-fatigue calibration, HCC documentation prompts, critical-finding routing cadence per Dr. Ahmadi's signed standards
- `ndg_billing_collections_stance` — hardship-program triggers, payment-plan thresholds, payer-denial response priority (signed by CFO + RCM lead)
- `ndg_radiology_reading_discipline` — peer-review sampling per ACR practice parameters, dose stewardship per Dr. Ahmadi + medical-physicist input
- `ndg_population_health_attribution` — HEDIS measure attribution rules, HCC priors, equity guardrails (signed by CMO + quality director)

Each SKILLDOC is signed by the appropriate domain authority and governance-locked under the Andon Loop's TIER-5 ordered approval. AI assistance throughout the practice is constrained by these signed artifacts — meaning the system can never propose work that violates the practice's own published policies without a documented approval trail.

This is the institutional knowledge that lives in three or four key people today and survives staff turnover only by accident. We make it portable, signed, and deployable.

---

## 4. Phase Plan

The 14-week engagement is structured in five phases. The TAO rollout and Accelerando build run in parallel from Week 1, then converge at go-live.

### 4.1 Phase 0 — Pre-Engagement (Weeks −2 to 0)

Before the engagement formally begins:

- **Discovery interviews** (3 days on-site): COO, CMO, CFO, IT lead, 2 radiologists, 2 PCPs, 2 schedulers, 2 billers, 1 RN, 1 compliance officer.
- **Data inventory:** identify every database, file share, paper file, and Excel workbook that holds operational data; classify by criticality and migration tier.
- **Contract negotiation:** finalize the engagement statement of work, fee structure, success-fee milestones, and ownership terms (NDG owns all custom SKILLDOCs and `.agi` configurations as work-for-hire).
- **Vendor coordination:** notify Crouse Health System (Epic host), GE Healthcare, Sunquest, HealthStream of the planned transition with appropriate termination-notice timing.

**Deliverable:** Signed SOW, data-migration plan, vendor-transition schedule.

### 4.2 Phase 1 — Foundation (Weeks 1–3)

**TAO Pillar:**
- **Week 1:** AI WIN-WIN leadership session (5 half-day workshops with leadership team — Dr. Ahmadi, Mara Volkov, Jordan Talbot, plus 12 partner physicians and the operating committee). Output: NDG's Blueprint Audit document with prioritized AI-integration plan.
- **Week 2:** NovaSyn Chat distribution to leadership; first cohort (radiologists + IT staff) starts Mastering AI Prompts.
- **Week 3:** Training-content remixing — all selected courses remixed with NDG voice, NDG examples, NDG terminology; first EPUBs built and loaded onto Kindle Paperwhites distributed to leadership.

**Accelerando Pillar:**
- **Week 1:** Initial-configuration intake interview. The `accelerando_config` module runs the intake workflow and selects `healthcare_provider_hipaa` template with `radiology_specialty_overlay` and `multi_site_distributed` profile. Confidence: 0.94 — auto-applies with explicit operator confirmation per the `config_advisor_taste` SKILLDOC.
- **Week 2:** Spine (`accelerando_interchange`) deployment. Set up HL7v2 trading partners (Quest Diagnostics, the three referral health systems, the DICOM gateway). Set up X12 trading partners (top 8 payers covering 91% of claim volume). Verify AccelerandoBus ledger appending correctly.
- **Week 3:** Clinical module deployment in shadow mode (read-only — pulls Epic data via FHIR, mirrors to Accelerando clinical store; no write-back yet). This is the "shadow" mode the MUTATION_POLICY substrate's TIER 1 NBVE pattern is designed for.

**Deliverables (Phase 1):**
- Blueprint Audit document (NDG-signed)
- Leadership trained on AI WIN-WIN frameworks
- Accelerando interchange spine live and verified
- Clinical module shadowing Epic — 7 days of side-by-side data verification

### 4.3 Phase 2 — Vertical Slice (Weeks 4–6)

The first end-to-end vertical slice goes live, exercising the spine pattern across three modules: scheduling, clinical, and radiology. This is the proof-of-substrate for the deployment.

**Accelerando Pillar:**
- **Week 4:** Scheduling module live. Patient-portal scheduling, recall, no-show prediction. Initial dual-write to Epic continues for 14 days as fallback.
- **Week 5:** Radiology module live. RIS, modality worklist, critical-finding routing. The cross-spine `imaging_order_spine` → `final_report_spine` → `critical_finding_spine` loop becomes the primary path; Centricity RIS held warm for 30-day rollback window.
- **Week 6:** Clinical module live (write-back enabled). Encounter documentation, CDS firing, HCC prompts, care-gap surfacing. Epic held warm for 60-day rollback window.

**TAO Pillar:**
- **Week 4:** Radiologists + PCPs cohort completes Mastering AI Prompts and starts Strategic AI.
- **Week 5–6:** Stop Being the Bottleneck (role-specific remixes) deployed to radiologists, PCPs, schedulers.
- **Throughout:** NovaSyn Chat usage telemetry on the Tauri client surfaces high-leverage adoption patterns; the OIE intelligence reasoner consumes this and proposes targeted training reinforcement for cohorts trailing the median engagement.

**Deliverables (Phase 2):**
- Scheduling + Clinical + Radiology live with full cross-spine packet flow
- 30 SKILLDOC drafts (3-day intensive operator-judgment-capture workshops)
- 60-day Epic + Centricity rollback window armed but unused

### 4.4 Phase 3 — Horizontal Expansion (Weeks 7–10)

The remaining modules go live in two-week bursts.

**Weeks 7–8:**
- Billing module live. Claims (X12 837), denials, payment posting, the `billing_collections_stance` SKILLDOC governs all collections workflow. Old Epic billing held warm for 90-day window.
- Patient Portal module live. Replaces MyChart progressively — patients log in via single-sign-on bridge for the transition period.
- Pharmacy module live (light footprint — primarily e-rx routing to external pharmacies via Surescripts).

**Weeks 9–10:**
- Population Health module live. HEDIS measures recomputed from migrated encounter data; care gaps and HCC alerts begin flowing to clinical at encounter open.
- OIE (Organizational Intelligence Engine) live. Cross-domain reasoners — `cross_module_opportunity_reasoner`, `weekly_spine_kaizen` — begin daily/weekly cycles. First IntelligenceOpportunityPackets surface to the operations dashboard.
- LMS module live. HealthStream-equivalent content imported and migrated; existing compliance training currency preserved (no employee loses currency from the migration).
- QMS and PI CoE modules live. NCR workflow active for the first quality event of Q3.

**TAO Pillar (continuing):**
- **Week 7–10:** Role-specific remixed training courses deployed to all remaining cohorts. Kindle Paperwhites distributed to every clinical staff member with the role-relevant training library pre-loaded.

**Deliverables (Phase 3):**
- All 15 in-scope Accelerando modules live
- Full spine flow active (no Epic-side fallback required for normal operation)
- All 18 SKILLDOC documents signed and governance-locked
- TAO training cohorts complete (90%+ training completion across all role groups)

### 4.5 Phase 4 — Decommission & Optimization (Weeks 11–14)

The final phase decommissions the legacy stack and optimizes the new substrate against observed traffic patterns.

- **Week 11:** Epic Community Connect contract notice formally delivered to Crouse Health System (60-day notice per existing agreement → final decommission date is approximately Week 19, ~5 weeks after engagement close).
- **Week 12:** Centricity, Sunquest, HealthStream, and Modernizing Medicine all enter decommission mode. Final data archives captured and migrated to the Accelerando audit ledger (`AccelerandoBus`).
- **Week 13:** First full month of Accelerando-only operation. The Andon Loop (`MUTATION_POLICY`) substrate begins surfacing mutation proposals. NDG's TIER-1 NBVE shadow window catches and promotes ~30–50 small rule refinements (threshold tunes for CDS alerts, care-gap surfacing priorities) per the kaizen reasoners.
- **Week 14:** Engagement close-out. Operating committee review. Success-metric measurement against baseline. Final handover to NDG's IT team (now four Agicore-trained authors who can extend the system themselves).

**Deliverables (Phase 4):**
- Legacy stack decommissioned
- 90-day post-go-live operations review document
- Success-metric scorecard against baseline
- IT team certified as Agicore authors (they own the system going forward)

---

## 5. Timeline & Milestones

```
Week:  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
       │  1  │  2  │  3  │  4  │  5  │  6  │  7  │  8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14  │
       └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
TAO:    [─── AI WIN-WIN ──][─── Mastering AI Prompts ──][── Strategic AI / Bottleneck ──]
        ───── NovaSyn Chat rollout ────────────────────────────────────────────────────────►

Spine:  [Intake│Spine │Clin-shadow]
                       ▲
                       └─ Healthcare-Provider-HIPAA template applied (Week 3)

Slice:                  [Sched │Rad-live │Clin-write]
                                                    ▲
                                                    └─ Vertical-slice live (Week 6)

Horiz:                                              [Billing+Portal+Rx][PopHealth+OIE+LMS+QMS]
                                                                                       ▲
                                                                                       └─ All 15 modules live (Week 10)

Decom:                                                                            [Notice│Archive│Sole-op│Close]
                                                                                                            ▲
                                                                                                            └─ Engagement close (Week 14)
                                                                                                            Final decom (~Week 19)
```

**Critical milestones:**

| Date (Week-relative) | Milestone | Owner |
|---|---|---|
| Week 0, Day 0 | SOW signed; engagement begins | Mara Volkov + Binary-Blender |
| Week 1, Day 5 | Blueprint Audit document signed | NDG leadership |
| Week 2, Day 3 | Interchange spine live; first HL7 message processed end-to-end | Binary-Blender + IT |
| Week 3, Day 5 | Clinical shadow mode active, 100% mirror verified | Binary-Blender |
| Week 6, Day 5 | Vertical slice (Sched + Rad + Clin) live in production | NDG go-live committee |
| Week 10, Day 5 | All 15 modules live; SKILLDOCs all signed | Binary-Blender + domain leads |
| Week 11, Day 0 | Epic decommission notice delivered | NDG CFO + outside counsel |
| Week 14, Day 5 | Engagement close; IT certified; handover complete | All |
| Week 19 (~5 weeks post-close) | Final legacy decommission | NDG IT |
| Week 26 (3 months post-close) | First post-engagement scorecard review | NDG ops committee |
| Week 52 (1 year post-close) | First annual transformation review | NDG leadership |

---

## 6. Cost Breakdown

### 6.1 Engagement Cost (Delivered)

| Line Item | Hours | Rate | Cost |
|---|---:|---:|---:|
| Lead engineer (Christopher Bender + co-lead) — 14 weeks | 560 | $300 | $168,000 |
| Domain consultants (clinical, billing, RCM specialists — 3 part-time) | 280 | $185 | $51,800 |
| Data migration engineer — 8 weeks | 320 | $175 | $56,000 |
| TAO program lead — 10 weeks | 200 | $165 | $33,000 |
| Training-content remixing (per cohort, 12 cohorts) | 96 | $125 | $12,000 |
| SKILLDOC capture workshops (3 days × 6 sessions) | 144 | $175 | $25,200 |
| Compliance + legal coordination (Karras & Lim review of HIPAA configurations) | 40 | $245 | $9,800 |
| Project management + ops | 120 | $115 | $13,800 |
| Travel, expenses, on-site time | — | — | $15,400 |
| **Total professional services** | | | **$385,000** |

### 6.2 Tooling and License Cost (Delivered)

| Line Item | One-Time | Annual |
|---|---:|---:|
| Kindle Paperwhite × 340 employees ($110 each, bulk) | $37,400 | — |
| Anthropic API (Claude) — organization plan for staff usage | — | $86,000 |
| OpenAI API (GPT-4) — secondary for redundancy | — | $42,000 |
| Hosting — self-hosted Tauri builds + AccelerandoBus on internal NDG servers | — | $0 (uses existing infra) |
| External Cloudflare R2 (LTS audit-ledger backup) | — | $7,200 |
| Agicore framework (open-source) | $0 | $0 |
| Accelerando suite (open-source) | $0 | $0 |
| Surescripts e-rx integration (replaces existing — net-zero) | — | $24,000 |
| Misc — domain certificates, monitoring | — | $4,800 |
| Initial Kindle content preload (one-time labor included in §6.1) | — | — |
| **Total tooling** | **$37,400** | **$164,000** |

### 6.3 Year-One Total Investment

| Category | Amount |
|---|---:|
| Engagement (one-time professional services) | $385,000 |
| Kindle hardware (one-time) | $37,400 |
| Year-one tooling/API/hosting | $164,000 |
| Subtotal (year-one cash outlay) | **$586,400** |
| Year-one Epic + legacy stack run-off (Months 1–4 of overlap) | $585,000 |
| **Year-one total investment** | **$1,171,400** |

### 6.4 Savings Analysis

**Current run-rate cost (annual):** $2.66M (including IT staff time consumed by stack maintenance)
**Post-transformation run-rate cost (annual):** $312,000 license/API/hosting + $135,000 reallocated IT staff time (now enabling work) = $447,000 enabling spend; the IT-time savings are $324,000 - $135,000 = $189,000/yr returned to operational capacity.

**Net annual savings:** $2.66M − $312,000 = **$2.348M per year**

**Five-year savings net of all transformation costs:**

| Year | Cash Outlay | Savings vs Status Quo | Net |
|---|---:|---:|---:|
| Year 1 | $1,171,400 | $1,755,000 (8-mo. savings) | +$583,600 |
| Year 2 | $312,000 | $2,348,000 | +$2,036,000 |
| Year 3 | $312,000 | $2,348,000 | +$2,036,000 |
| Year 4 | $312,000 | $2,348,000 | +$2,036,000 |
| Year 5 | $312,000 | $2,348,000 | +$2,036,000 |
| **Five-year cumulative** | **$2,419,400** | **$11,147,000** | **+$8,727,600** |

**Five-year cumulative ROI: 360% on cash outlay; or equivalently, $11.16M of avoided expense vs current trajectory.**

### 6.5 Comparison to Traditional Approach

| Approach | Implementation Cost | Timeline | Annual Run Rate | 5-Year TCO |
|---|---:|---:|---:|---:|
| Status quo (extend current stack) | $0 | n/a | $2,660,000 | $13,300,000 |
| Migrate to full Epic license (alternative considered by NDG) | $1,800,000–$2,800,000 (one-time) | 14–22 months | $1,650,000 | $9,840,000–$10,850,000 |
| **Accelerando + TAO (this proposal)** | **$1,171,400 (year-one)** | **14 weeks** | **$312,000** | **$1,941,400** |

The Accelerando approach is **5.0×–5.6× cheaper** over 5 years than the full-Epic alternative, and **6.8× cheaper** than the status-quo trajectory.

### 6.6 Fee Structure

Binary-Blender proposes a partial-success-fee structure to align our financial outcome with NDG's transformation outcome:

| Component | Amount | Trigger |
|---|---:|---|
| Base fee — paid on schedule | $250,000 | $50K signing, $100K at Week 6 vertical-slice go-live, $100K at Week 14 engagement close |
| At-risk fee — paid on success | $135,000 | 90 days post-go-live, paid in two parts: |
| ↳ Tranche A: $65,000 | | All 15 modules live, no Epic-side fallback used in normal operation, 90-day post-go-live ops review accepted |
| ↳ Tranche B: $70,000 | | At 365 days post-go-live, annual transformation review shows: (a) >50% reduction in critical-finding ack times, (b) >5 pt improvement in primary-care HEDIS measures, (c) <$500K total annual enterprise-software spend, (d) >85% TAO training completion rate |

If any tranche fails, that portion of the fee is forfeit. Tranche B is forfeit in full if any of (a)–(d) are missed; partial credit is not standard but is negotiable based on specific cause.

**Total engagement value at success: $385,000.** Of that, **35% is at risk against measurable outcomes.**

---

## 7. Risk Mitigation

### 7.1 Identified Risks

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| **Data migration loss or corruption** | High | Low | Dual-write Epic + Accelerando for 60-day overlap; daily reconciliation reports; PHI integrity verified at packet-by-packet level via AccelerandoBus hash chain |
| **Clinical disruption at go-live** | High | Low | Vertical-slice (Phase 2) is dry-run; clinicians shadow the new system in Week 4–5 before write-back at Week 6; Epic warm-failback available throughout Phase 2–3 |
| **HIPAA / regulatory non-compliance** | Critical | Very Low | All workflows reviewed by Karras & Lim LLP; HIPAA-Privacy-Officer SKILLDOC signed by NDG's privacy officer before any patient-facing module goes live; audit ledger immutable per Andon Loop substrate |
| **TAO training underadoption** | Medium | Medium | NovaSyn Chat usage telemetry surfaces low-adoption cohorts to OIE; targeted training reinforcement; manager-driven engagement program for trailing cohorts |
| **Operator resistance (physicians, schedulers)** | High | Medium | Physician champion model (Dr. Ahmadi for radiology, identified PCP champion); training in role-specific cohorts not all-staff; explicit operator-veto on all AI-proposed work; UI design preserves familiar workflow patterns |
| **Vendor pushback during decommission** | Medium | High | Decommission timing arranged to align with contract-renewal windows; Crouse Health System notified at SOW signing; 60-day notice provided per existing contract |
| **Integration with external systems (Quest, referrals)** | Medium | Low | All external HL7/X12 trading partners tested in Phase 1 before any production traffic; established partners (Quest, Surescripts) have stable interfaces |
| **Customization beyond template** | Low | Medium | NDG-specific deviations captured in Agicore DSL by IT team during engagement; deviations are auditable; drift detection via `config_advisor_taste` SKILLDOC |
| **Compliance training currency lapse during LMS migration** | High | Low | Training records imported with currency preserved; no employee loses HIPAA/OSHA/state-mandated training currency from the migration |
| **Cost overrun on engagement** | Medium | Low | Fixed-price engagement; any scope expansion handled via signed change order; Binary-Blender absorbs cost overrun within original scope |

### 7.2 Pre-Engagement Risk Reduction

We require the following completed before engagement Week 1:

1. **Privacy-officer review** of the proposed HIPAA-compliance configuration (template `healthcare_provider_hipaa`). NDG retains right to require modifications.
2. **Crouse Health System notification** of intent to terminate Epic Community Connect at engagement Week 11 — 60-day notice gives final decommission date alignment.
3. **Data-classification inventory** of all PHI-containing systems, with criticality tier (Tier 1: clinical, Tier 2: billing, Tier 3: operational, Tier 4: archival).
4. **Physician-leadership endorsement** of the transformation (CEO + CMO + Operating Committee) recorded in board meeting minutes.

### 7.3 Rollback Plan

At any point through Week 14, NDG retains the option to halt the engagement and restore the status-quo. Our rollback plan:

- **Through Week 6:** Epic Community Connect remains the source of truth. Accelerando shadowing only. Rollback is a configuration toggle (no data loss).
- **Weeks 6–10:** Dual-write with 60-day Epic warm-failback. Rollback within this window restores Epic primary and decommissions Accelerando; engagement is paused; NDG pays for work completed.
- **Weeks 11–14:** Epic decommission notice is reversible (Crouse confirmation required); Accelerando data export available in standard FHIR + HL7 formats for portability if NDG elects to migrate to a different system.

Our financial commitment: if NDG halts the engagement for any reason in Weeks 1–6, Binary-Blender refunds 75% of fees paid to date. After Week 6 (post-vertical-slice live), the engagement is considered substantively committed and standard pro-rata applies.

---

## 8. Success Metrics

We will measure outcomes against the following baseline metrics, captured during Phase 0:

### 8.1 Operational Metrics

| Metric | Baseline (current) | Target (90d post-go-live) | Target (365d) |
|---|---:|---:|---:|
| Median critical-finding ack time (minutes) | 47 | ≤25 | ≤15 |
| HEDIS colorectal screening compliance | 64% | 68% | 72% |
| HEDIS diabetic eye-exam compliance | 59% | 65% | 70% |
| Controlled-substance prescribing compliance (PDMP-checked %) | 78% | 95% | 99% |
| HCC recapture rate (year-over-year continuity) | 71% | 80% | 85% |
| No-show rate, primary care | 18.4% | 14% | 12% |
| No-show rate, imaging | 9.2% | 6.5% | 5% |
| Mean denial-to-payment cycle (claims) | 39 days | 28 days | 22 days |
| Net collection rate | 91% | 93% | 95% |

### 8.2 Operator Experience Metrics

| Metric | Baseline | Target (90d) | Target (365d) |
|---|---:|---:|---:|
| Physician documentation time per encounter (median minutes) | 8.2 | 6.0 | 5.0 |
| Scheduling staff calls handled per shift | 47 | 65 | 80 |
| Billing denial resolution time per claim | 23 minutes | 15 minutes | 10 minutes |
| Physician satisfaction with EHR (5-pt scale, internal survey) | 2.1 | 3.5 | 4.0 |
| Operator self-reported AI-assistance value (1-10) | n/a | 7 | 8 |
| % of staff actively using NovaSyn Chat weekly | 0% | 60% | 85% |

### 8.3 Financial Metrics

| Metric | Baseline | Target (90d) | Target (365d) |
|---|---:|---:|---:|
| Monthly enterprise-software spend | $195,000 | $97,500 (overlap period) | $26,000 |
| IT-staff time on stack maintenance (FTE-equivalent) | 2.4 | 1.2 | 0.6 |
| Annual cumulative savings | $0 | $585,000 (8-mo) | $2,348,000 |

### 8.4 Quality / Governance Metrics

| Metric | Baseline | Target |
|---|---:|---:|
| MUTATION_POLICY proposals deployed via NBVE TIER 1 | n/a | ≥30/quarter |
| MUTATION_POLICY proposals escalated to TIER 3 | n/a | <5/quarter (target — low TIER 3 traffic indicates good calibration) |
| SKILLDOC currency (revision freshness <12 months) | n/a | 100% |
| Hash-chain integrity check (daily ledger verification pass rate) | n/a | 100% |

We will produce a written 90-day post-go-live operations review with measurement against every metric above. The 365-day annual review repeats this measurement and provides recommendations for the next year's work.

---

## 9. Comparative Analysis vs Traditional Approach

The following side-by-side compares this engagement against the alternative NDG was actively evaluating (migration to full Epic license).

| Dimension | Full Epic License | Accelerando + TAO |
|---|---|---|
| **Year 1 cash outlay** | $1.8M–$2.8M (impl) + $1.65M (annual) = $3.45M–$4.45M | $1.17M total |
| **Implementation timeline** | 14–22 months | 14 weeks (3.5 months) |
| **Time-to-first-value** | 8–12 months | 6 weeks (vertical slice) |
| **5-year TCO** | $9.84M–$10.85M | $1.94M |
| **Configuration-change velocity** | 6–18 months per change | <72 hours per change |
| **Customization control** | Vendor-gated (Epic Community Connect) | Source-available, customer-owned |
| **Data ownership** | Epic-hosted (legal access OK, technical access limited) | NDG-owned, hosted on NDG infrastructure |
| **AI integration** | Bolt-on (Epic Cognitive Computing module — additional cost, separate roadmap) | Native to substrate from Day 1 |
| **Vendor lock-in** | High (5-7 year contract; migration cost prohibitive) | None (open-source, MIT license; full data portability) |
| **Workforce AI-readiness** | Not addressed | TAO program included; 340 employees trained |
| **Audit trail** | Epic audit logs (vendor-managed) | AccelerandoBus hash-chained ledger (cryptographically verifiable) |
| **Hardware** | Vendor-spec workstations recommended | Existing NDG hardware (Tauri runs on Windows/Mac/Linux) |
| **Decommission risk** | High (sticky data, custom workflows) | Low (export in FHIR/HL7 standard formats) |

---

## 10. Appendix A — Module-Level Deployment Detail

### A.1 Clinical Module

**Replaces:** Epic clinical workflow, Centricity RIS clinical bits, Modernizing Medicine specialty docs

**Configuration:**
- HIPAA Privacy + Security applied via `healthcare_provider_hipaa` template
- CDS rules imported from Epic via FHIR; reviewed by Dr. Ahmadi for false-positive rate; tuned per `ndg_clinical_documentation_taste` SKILLDOC
- Critical-finding routing applies Joint Commission timed-alert framework (5/15/60 minute bands)
- HCC recapture priors signed by CMO + medical-director-equivalent

**Data migration:**
- 187,000 historical encounters migrated as read-only (full clinical history preserved)
- Active problem lists, medication lists, allergy lists migrated as live records
- Critical-result history migrated with timed-alert audit preserved

### A.2 Scheduling Module

**Replaces:** Epic Cadence + custom Excel scheduling workbooks

**Configuration:**
- 11 provider schedule templates configured (per-physician templates, including 4 partial-FTE schedules)
- Recall workflows per `ndg_scheduling_discipline` SKILLDOC — non-punitive no-show stance honored
- High-risk-no-show prediction model uses 24 months of NDG no-show history as training signal

**Data migration:**
- Future-dated appointments (8 weeks forward) migrated
- Patient recall lists migrated with currency preserved
- Provider templates rebuilt from Epic schedules (not migrated as-is — opportunity to clean up legacy schedule patterns)

### A.3 Radiology Module

**Replaces:** GE Centricity RIS + Epic radiology

**Configuration:**
- DICOM gateway integration (existing infrastructure preserved — Accelerando connects to it)
- Modality worklist generation per ACR practice parameters
- Peer-review sampling: 8% random (per ACR for cross-sectional), with first-30-days-new-hire at 100%
- Dose stewardship thresholds per medical physicist input (adult + pediatric tables)
- Critical-finding communication per `ndg_radiology_reading_discipline` SKILLDOC (signed by Dr. Ahmadi)

**Data migration:**
- Historical study list migrated as read-only (8 years of imaging history)
- Active worklist migrated at go-live (week-of cutover)
- Peer-review history migrated for ongoing concordance scoring continuity

### A.4 Billing Module

**Replaces:** Epic Professional Billing + Centricity billing

**Configuration:**
- 8 payer contracts loaded (covering 91% of claim volume); top 3 payer custom edit rules per current denial patterns
- Hardship-detection per `ndg_billing_collections_stance` SKILLDOC (200% FPL threshold, sliding-scale 200-400% FPL, dual-eligible carve-outs, NSA compliance)
- Patient payment-plan structures up to $25K with no interest; >$25K requires operator review
- No-litigation policy embedded (NDG operating-committee decision)

**Data migration:**
- 7 years AR history migrated (statutory retention)
- Active AR transferred to Accelerando; aging clocks preserved
- Bad-debt write-off history migrated for SOX-compliant retention

### A.5 Patient Portal Module

**Replaces:** Epic MyChart

**Configuration:**
- 21st Century Cures Act information-blocking compliance via default-release per `ndg_patient_portal_release_discipline` SKILLDOC
- Adolescent-confidentiality protections per NY state law
- Domestic-violence safety markers honored
- Proxy access discipline per state minor/incapacity rules

**Data migration:**
- All active MyChart accounts migrated (~73,000 active patients with portal accounts)
- Account passwords reset on first login (security best practice)
- Historical secure messages preserved (regulatory retention)

### A.6 Population Health Module

**Replaces:** (no current system — manual quarterly retrospective spreadsheets)

**Configuration:**
- HEDIS measure set 2026 loaded
- MIPS measures applicable to NDG's specialty mix loaded
- HCC priors signed by CMO + quality director
- Equity guardrails per `ndg_population_health_attribution` SKILLDOC

**Data migration:**
- 24 months historical encounter data ingested into risk-stratification model (cold-start period suppressed)
- Existing care-management enrollment list migrated

### A.7 OIE (Organizational Intelligence) Module

**Replaces:** (no current system)

**Configuration:**
- `cross_module_opportunity_reasoner` activated to read all spine channels
- Daily, weekly, and on-demand reasoner cadences configured
- InsightPacket surfacing thresholds: dashboard headline at confidence × impact ≥0.40
- QC mesh: 4-evaluator consensus (claude-opus, gpt-4o, gemini-pro, mistral-large)
- Anti-fatigue throttling: 8 GLOBAL-scope surfaces/day; 5 TEAM-scope; 5 USER-scope

### A.8 LMS Module

**Replaces:** HealthStream

**Configuration:**
- HIPAA Privacy + Security curricula imported from HealthStream catalog (NY state-required versions)
- OSHA general + healthcare-specific imported
- Role-specific curricula: clinical, billing, scheduling, IT
- Annual refresher cadence preserved; just-in-time intervention enabled (e.g., phishing-test failure → immediate refresher)

**Data migration:**
- All 340 employee training records imported with currency dates preserved
- 24 months historical completion records migrated (audit retention)

### A.9 QMS Module

**Replaces:** (manual spreadsheets + ad hoc processes)

**Configuration:**
- ISO 9001:2015 compliant NCR/CAPA workflow
- Healthcare-specific (Joint Commission alignment) overlay
- Customer complaint tracking activated for the first time at the integrated level
- `ndg_qms_root_cause_discipline` SKILLDOC signed by quality director

### A.10 PI CoE Module

**Replaces:** (none — periodic outside consultant engagement)

**Configuration:**
- DMAIC framework configured for clinical-process improvement projects
- 5S audit baseline established for all three sites
- Bidirectional NCR↔kaizen routing with QMS via spine

### A.11 ES (Expert System) Module

**Replaces:** Scattered governance rules (some in Epic, some in policy documents, some in nobody's head)

**Configuration:**
- Credit Control rules embedded for self-pay receivables management
- SLA Enforcement for critical-finding communication clocks
- Cross-module governance decisions emitted to spine
- General Counsel seat at TIER 5 (Karras & Lim — outside counsel)

### A.12 Legal Module

**Replaces:** (no current system — outside counsel manages ad hoc)

**Configuration:**
- Lightweight footprint at NDG scale
- Legal-hold workflow available but expected to be rarely invoked
- Hygiene alerts active for HIPAA-PHI hygiene scans

### A.13 Chatbot Module

**Replaces:** (none — phone queue routing only)

**Configuration:**
- Patient front-line question routing (appointment requests, prescription refills, results questions)
- Escalation triggers per `ndg_chatbot_de_escalation_taste` SKILLDOC
- High-stakes topic routing to human (medical urgency, financial dispute, account closure)
- No bot-pretending-human; explicit disclosure at session start

### A.14 Interchange Module

**The spine.** All cross-module packet routing flows through here. External interchange (X12, HL7v2, FHIR, EDIFACT, RosettaNet) preserved. Internal Accelerando spine (PurchaseOrderPacket, InvoicePacket, ClaimAcceptedPacket, PaymentRecordedPacket, IntelligenceOpportunityPacket, EscalationPacket, plus EMR-stack canonical packets) live from Phase 1.

### A.15 Pharmacy Module

**Replaces:** Epic e-rx component (Surescripts integration replaced like-for-like)

**Configuration:**
- Light footprint at NDG (no in-house pharmacy operation; e-rx routing only)
- PDMP integration active via state PDMP API
- MME thresholds per CDC guidelines, signed by CMO

### A.16 Config Module

**The deployment tool.** Used during engagement Week 1 to apply the `healthcare_provider_hipaa` template and successive overlays. Continues operating post-go-live to detect configuration drift and propose template updates.

---

## 11. Appendix B — TAO Track Detail

### B.1 AI WIN-WIN Leadership Track (Week 1)

5 half-day workshops with NDG leadership (Operating Committee + CMO + CFO + 12 partners):

- **Session 1: Good to 10x.** Establish shared understanding of AI multiplication. Each leader identifies one role/workflow in their domain where 10× output is achievable.
- **Session 2: Old Ideas, New Substrate.** Framework selection — which proven organizational pattern fits NDG? (Recommendation: physician-cooperative pattern with AI-as-multiplier; final selection is leadership's choice.)
- **Session 3: Blueprint Audit (clinical/radiology).** Department-by-department audit; current operations vs AI-augmented version; specific implementations.
- **Session 4: Blueprint Audit (operations/billing/scheduling).** Same for back-office functions.
- **Session 5: Implementation Plan.** Consolidate Sessions 3–4 outputs into NDG's specific transformation plan. Sign and adopt.

### B.2 Mastering AI Prompts (Weeks 2–6, role-specific cohorts)

8-module course remixed with NDG voice and examples:

1. The Prompt as a Specification
2. Constraints and Roles
3. Multi-Turn Dialogue Discipline
4. Document-Anchored Prompting
5. The Anti-Pattern Library (radiology version: "AI as Author" anti-pattern emphasized)
6. Iteration and Refinement
7. Skill Reuse and Composition
8. The 30-Day Practice Habit

### B.3 Strategic AI (Weeks 5–10, professional-staff cohorts)

10-module course:

1. AI as Operational Lever
2. Cognitive Allocation Discipline
3. The Two-Layer Decision (AI Proposes, Human Decides)
4. Audit Trail as Operating Discipline
5. The Trust Budget
6. Failure-Mode Reasoning
7. Tool Selection
8. The Half-Life of AI Outputs
9. Building Personal Skill Library
10. The Multi-Year Plan

### B.4 Stop Being the Bottleneck (Weeks 6–10, role-specific cohorts)

12-module course with role-specific remixes for:
- Radiology (read-cycle bottleneck patterns)
- Primary care (documentation-cycle bottleneck patterns)
- Scheduling (triage-and-routing bottleneck patterns)
- Billing/RCM (denial-cycle bottleneck patterns)

### B.5 NovaSyn Chat Deployment

- Week 2: Leadership team receives NovaSyn Chat installed and configured with organizational API keys.
- Week 3–4: IT cohort + clinical-champions cohort.
- Week 5–6: All radiologists + PCPs + NPs.
- Week 7+: All remaining clinical and operational staff with usage rolled out by cohort.

Usage telemetry (anonymized, aggregated) feeds the OIE intelligence reasoner — adoption patterns surface to leadership; cohorts trailing the median engagement receive targeted reinforcement.

---

## 12. Appendix C — Why Open Source

NDG's leadership team specifically asked about the trade-off of choosing an open-source platform (Agicore + Accelerando, MIT license) over a commercial alternative (full Epic license, or Athenahealth, or NextGen).

The case for open-source in this specific deployment:

1. **Cost.** Demonstrated in §6 — 5-year TCO is one-fifth of the commercial alternative.
2. **Customization velocity.** Configuration changes flow through NDG's own IT team (now Agicore-trained authors) in <72 hours. No vendor change-order process.
3. **Ownership.** Every line of `.agi` source, every SKILLDOC, every workflow lives in NDG's git repository. Survives our engagement, survives any future vendor relationship, survives organizational change.
4. **No vendor lock-in.** If NDG ever wants to leave Accelerando, the standard FHIR + HL7 + X12 export paths are available — no extraction fee, no contract negotiation.
5. **Community and inspectability.** Every change to Agicore itself is visible on the public GitHub repo (Binary-Blender/agicore). Security issues get fixed in public. The pipeline is auditable.
6. **AI-native from Day 1.** Commercial EHRs are bolting on AI as a 2025-2026 feature. Agicore was AI-native from inception — the MUTATION_POLICY substrate, the SKILLDOC contract, the kaizen reasoners are core, not afterthoughts.

The case against (honest accounting):

1. **No 1-800 vendor support.** Issues route to Binary-Blender during the engagement and to NDG's own IT team after. We provide post-engagement support contracts at standard rates if desired (commonly $84,000/year for ongoing platform updates and quarterly office hours — included in §6.2 hosting line as needed).
2. **Smaller user community.** Epic has tens of thousands of deployments. Agicore is newer. There are fewer pre-built peer integrations.
3. **Newer codebase.** Less battle-tested than 25-year-old vendor platforms. Mitigated by the substrate's open audit trail (AccelerandoBus hash-chained ledger) — every action is replayable and verifiable.

We believe the trade-offs favor open-source for NDG specifically given the cost pressure, customization needs, and physician-ownership control culture. We are happy to discuss alternative approaches if leadership concludes differently.

---

## 13. Engagement Acceptance

Acceptance of this proposal requires:

1. Signed SOW between NDG and Binary-Blender (template provided separately).
2. NDG board / operating-committee resolution authorizing the engagement.
3. NDG privacy-officer review and sign-off on the HIPAA-compliance configuration.
4. Initial payment ($50,000) per §6.6 fee schedule.

We are available for clarifying conversations through Mara Volkov's office. We can begin the engagement Phase 0 (pre-engagement discovery) within 14 days of SOW signing, with Phase 1 (Week 1 of the 14-week clock) commencing on the following Monday.

---

## Appendix D — About the Approach

**Agicore** is an open-source deterministic systems-authoring platform for AI-native organizations. Core principle: AI at build-time, determinism at runtime, DSL as constraint boundary. MIT licensed. Repository: github.com/Binary-Blender/agicore.

**Accelerando** is an 18-module enterprise application suite built on Agicore. Open source under MIT license. Repository: github.com/Binary-Blender/agicore-examples (in `accelerando/`).

**TAO (Transformative AI Operations)** is the workforce-readiness program — the four-step training and deployment toolkit that prepares an organization's people to operate the new substrate. Available from Binary-Blender at chrisbender999@gmail.com.

**The fictional case study above** is illustrative — the real engagement structure, fee model, deployment phases, and module map are all production-ready. Northshore Diagnostic Group is fictional; the playbook is real. Adapt the proposal to your organization by replacing the §1–§2 client profile and §6 numbers with your own, then let the §3–§9 transformation pattern carry forward.

The pattern is the substrate. The substrate is the leverage.

---

*Prepared in good faith. Specific commercial terms negotiable. Document version 1.0, dated 2026-05-30.*
