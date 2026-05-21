# Agicore — Next Capabilities
## Phase 7: Adaptive Intelligence Layer

**Synthesized from:** 11 idea factory documents  
**Status:** Phase 5 & 6 complete (34 declaration types, 1,500+ tests). This document defines what comes next.

---

## Phase 15 — What Was Just Implemented (May 2026)

### LOG declaration (Phase 12)
File-based Rust logger using `std::fs` only — zero Cargo dependencies. Five levels (trace/debug/info/warn/error), three targets (file/stdout/both), configurable rotation. Generates `src-tauri/src/logger.rs` with `init_logger()`, `log()`, and 5 macros (`log_trace!` through `log_error!`). See `LOGGING.md`.

### MACRO + MACRO_REGISTRY (Phase 13)
Cross-app capability exposure. MACRO declares a named parameterized capability with PARAMS and an ACTION delegate. MACRO_REGISTRY declares what this app EXPOSES and what it INVOKES from other apps with BINDING directives. Generates `src-tauri/src/macros.rs` stubs and `src/lib/macros.ts` typed wrappers. See `MACROS.md`.

### Embedded stack — Phase 14 (May 2026)
Full robotics and sensor array support: ACTUATOR (motor/servo/relay/LED/neopixel with SAFE_STATE and WATCHDOG), PLATFORM (cross-compile targets: rpi5/rpi4/esp32s3/stm32h7/stm32f4/x86), NULLCLAW (678KB Zig agent binary — providers, tools, personality), BRAIN_BODY (UART framed protocol with heartbeat, watchdog, E-stop). All existing embedded declarations (NODE/SENSOR/ZONE) gained codegen. See `EMBEDDED.md` and `NULLCLAW.md`.

### SKILLDOC governed cognition infrastructure — Phase 15 (May 2026)
Skill docs are now first-class deployable artifacts. Each SKILLDOC compiles to:
- `scaffold/skilldocs/<name>.md` — deployable signed markdown with YAML frontmatter
- `scaffold/skilldocs/<name>.json` — governance manifest for provisioning/audit pipelines
- `src/lib/skilldocs.ts` — TypeScript registry with `matchSkillDocs()` (governance-aware, filters by REQUIRE clearance), `buildSkillDocContext()` (respects EXECUTE_ONLY/DISALLOW), `isOperationPermitted()`, `skillDocDomains()`

Governance fields: SIGNED_BY, REQUIRE (clearance levels), EXECUTE_ONLY (operation allowlist), DISALLOW (operation denylist), AUDIT (none/errors/all_access/all_actions). COMPRESSION targets: SEMANTIC_DENSITY, INTENT_PRESERVATION, TOKEN_EFFICIENCY. See `SKILLDOCS.md`.

**Test count after Phase 15:** 720 parser + 968 compiler + 34 validator = **1,722 passing, 0 failed**

---

## Phase 7 Summary

The core DSL grammar is stable. The next leap adds **runtime intelligence adaptation**, **async event orchestration**, and **semantic economic coordination** — three capability dimensions that turn Agicore from a systems-authoring tool into a self-optimizing operational platform.

---

## What Was Just Implemented (Phase 7.1)

### EVENT declaration
Named async events as first-class DSL citizens. Any workflow, reasoner, or pipeline can subscribe. Makes distributed async orchestration composable.

```agi
EVENT ImageBatchRejected {
  DESCRIPTION "Fires when a batch of generated images fails QC validation"
  PAYLOAD {
    batch_id: string
    rejection_reason: string
    attempt_count: int
  }
  SUBSCRIBERS [PromptRefinementWorkflow, AuditLogger]
  IDEMPOTENT true
  TTL 3600
}
```

**Gap it fills:** TRIGGER fires specific targets directly. CHANNEL routes packets point-to-point. EVENT is the pub/sub layer — declare once, multiple subscribers, loosely coupled.

---

### NBVE declaration
Non-Blocking Variant Evaluation. Runs a shadow AI model alongside production, governed by SPC thresholds. When the shadow consistently meets quality, it can be promoted — reducing AI costs without risking workflow stability.

```agi
NBVE LinkedInCommentOptimizer {
  DESCRIPTION "Shadow-tests Qwen3-72B against Claude Sonnet for LinkedIn comments"
  PRODUCTION "claude-sonnet-4-20250514"
  SHADOW "Qwen/Qwen3-72B"
  SPC {
    WINDOW 50
    CONFIDENCE 0.95
    ACCURACY_THRESHOLD 0.90
    STABILITY_THRESHOLD 0.92
    DEFECT_RATE_MAX 0.05
  }
  METRICS [semantic_accuracy, workflow_stability, human_acceptance_rate, token_cost]
  PROMOTION auto
  FALLBACK production
}
```

**Why this matters:** This is the most strategically unique thing in Agicore. No other AI DSL has industrial SPC quality control governing model tier transitions. NBVE is how organizations progressively migrate expensive frontier calls to cheaper specialized models without gambling on production stability.

---

### CONTRACT declaration
Machine-readable service agreements between identities. Generates TypeScript schema + Rust persistence. Non-custodial — Agicore coordinates, external providers handle money.

```agi
CONTRACT MusicCommission {
  DESCRIPTION "Custom synthwave intro commission"
  PARTIES {
    client: Identity
    provider: Identity
  }
  TERMS {
    delivery_deadline: "14d"
    revisions: 2
    usage: "commercial"
  }
  DELIVERABLES {
    audio_file: REQUIRED
    commercial_license: REQUIRED
  }
  PAYMENT {
    METHOD ach
    AMOUNT 50
    CURRENCY "USD"
    RELEASE on_acceptance
    RECURRING false
  }
  GOVERNANCE {
    SIGNED_BY both
    DISPUTE optional
  }
  TIMESTAMPS
}
```

---

## Phase 7.2 — Next Up

### REPUTATION declaration
SPC-driven trust scoring tied to CONTRACT execution history. Decays over time, builds with consistent delivery. Enables measurable trust instead of engagement-based popularity.

```agi
REPUTATION CreatorReliability {
  METRICS {
    on_time_delivery: float
    acceptance_rate: float
    dispute_rate: float
    revision_rate: float
  }
  SPC {
    MATURING_THRESHOLD 50
    MATURE_THRESHOLD 100
    REQUIRED_CONFIDENCE 0.95
  }
  DECAY {
    enabled true
    half_life "180d"
  }
}
```

**Source:** `Agicore Semantic Commerce & Contract Infrastructure.md`

---

### SUBSCRIPTION declaration
Recurring creator support with payment coordination. Complements CONTRACT for ongoing relationships vs one-time commissions.

```agi
SUBSCRIPTION CreatorSupport {
  PROVIDER CreatorProfile
  SUBSCRIBER CreatorProfile
  TERMS {
    amount: 5
    interval: monthly
    perks: ["premium_feed", "private_chat"]
  }
  PAYMENT {
    METHOD ach
    AUTO_RENEW true
  }
}
```

---

### DISPUTE declaration
Structured conflict resolution workflow for CONTRACT disagreements.

```agi
DISPUTE ContractReview {
  CONTRACT MusicCommission
  STATES {
    opened
    under_review
    resolved
    escalated
  }
  RESOLUTION {
    refund
    revision
    partial_acceptance
    cancellation
  }
}
```

---

## Phase 7.3 — Codegen Completions

Several declarations are fully parsed but have limited codegen output. These need full compiler implementations:

| Declaration | Current Codegen | Target |
|---|---|---|
| ACTION | Partial | Full Tauri command + TypeScript invoke wrapper |
| ROUTER | Partial | BabyAI routing decision tree + fallback chain |
| COMPILER | Stub | Full session-to-session semantic extraction pipeline |
| VAULT | Partial | Encrypted key rotation + audit log Rust implementation |
| EVENT | Stub (just added) | Tauri event bus registration + TypeScript listener hooks |
| NBVE | Stub (just added) | Runtime shadow execution harness + SPC metric collection |
| CONTRACT | Stub (just added) | Full contract lifecycle state machine + SQLite schema |

---

## Phase 8 — Distributed Orchestration

### Phase 8.1 — Distributed Semantic Compute (complete — commit `8e63fb8`)

- [x] NODE gains `ENDPOINT`, `CAPABILITY` (multi), `TRUST_LEVEL` — becomes a network participant
- [x] CHANNEL gains `OVERFLOW_TO` — overflow routing to named fallback channel/node
- [x] New `MESH` declaration — ties nodes into trusted compute meshes with authority, packet types, and a trustLevel-sorted route() helper
- [x] Generated: `migrations/mesh.sql` (mesh_topology + mesh_routing_log), `src/lib/mesh.ts` (config const + routing fn)
- [x] Emits endpoint/capabilities/trust_level in both TypeScript interfaces and Rust structs

**Total after Phase 8.1: 41 declaration types, 800 parser + 1511 compiler + 34 validator = 2345 tests passing.**

### Phase 8.2 — EVENT-Driven Distributed Workflows (next)
- EVENT subscribers living on remote nodes
- PACKET as the transport across CHANNEL between nodes
- AUTHORITY governing cross-node packet admissibility

**Source:** `Agicore & Distributed Semantic Systems.md`

### Phase 8.3 — Cooperative Compute Accounting (future)
- Contribution = access, not speculation
- Compute contribution tracked in mesh_topology / routing_log

**Source:** `Agicore Cooperative Distributed Infrastructure.md`

---

## Phase 9 — Cognitive Hierarchy

The NBVE + SPC system enables this long-horizon direction:

**Tier 1 — Frontier Cognition:** Ambiguity collapse, novel reasoning, architecture synthesis  
**Tier 2 — Operational Cognition:** Workflow continuation, implementation, semantic elaboration  
**Tier 3 — Specialized Cognition:** Constrained workflows, style continuation, deterministic semantic tasks

NBVE is the mechanism by which Agicore progressively discovers which workflows can run at Tier 3 vs Tier 1, governed by SPC quality metrics. Over time this creates **self-optimizing cognition allocation** — the system learns where expensive models are necessary and where specialized local models are sufficient.

**Source:** `Agicore NBVE + SPC Cognitive Optimization System.md`

---

## Phase 10 — Spatial Operating Environment

Long-horizon UX direction. Not a near-term implementation target.

- AI-native workflow desktop (NeXTSTEP inspired)
- Sessions as spatial operational regions
- Semantic glyph system (workflow-centric iconography, not app-centric)
- Infinite canvas with graph-shaped workflow topology
- Wayland compositor integration

**Source:** `Agicore Spatial Semantic Desktop.md`, `Agicore Semantic Glyph Interface System.md`

---

## Idea Factory Status

| Document | Status | Action |
|---|---|---|
| `Agicore & Distributed Semantic Systems.md` | Phase 8 reference | Keep |
| `Agicore Containerized Runtime Architecture.md` | Long-horizon vision | Keep |
| `Agicore Cooperative Distributed Infrastructure.md` | Phase 8 reference | Keep |
| `Agicore Distributed Semantic Compute Infrastructure.md` | Phase 8 reference | Keep |
| `Agicore NBVE + SPC Cognitive Optimization System.md` | ✅ Phase 7.1 implemented | Keep as reference |
| `Agicore Semantic Commerce & Contract Infrastructure.md` | Phase 7.2 pending | Keep |
| `Agicore Semantic Glyph Interface System.md` | Phase 10 vision | Keep |
| `Agicore Spatial Semantic Desktop.md` | Phase 10 vision | Keep |
| `agicore_semantic_packets_and_distributed_orchestration 02.md` | Phase 8 reference | Keep |
| `ui_dsl_requirements_specification.md` | VIEW codegen enhancement target | Keep |
| `agicore_repo_master_plan.md` | Superseded by ROADMAP.md | Archived |
| `Agicore BabyAI Runtime Architecture.md` | Sprint 12 done | Archived |
| `semantic compounding systems.md` | Raw chat transcript | Archived |
| `novasyn_chat_p_2_p_semantic_creator_network_features.md` | BKA scope | Archived |
| `dimensional_geometry_universe_design_and_technical_architecture.md` | Game design, wrong folder | Archived |
| `agicore_semantic_packets_and_distributed_orchestration 01.md` | Superseded by 02 | Archived |

---

## The Central Strategic Insight

The idea factory consistently points at the same thing from different angles:

> Agicore is evolving from a systems-authoring DSL into **organizational cognition infrastructure**.

The shift:
- **Software** manages records, transactions, and workflows
- **Agicore** manages cognition allocation, semantic state transitions, and operational trust

The three most unique capabilities that no other platform has:
1. **NBVE + SPC** — industrial quality control governing AI tier transitions
2. **Semantic compiling** — `COMPILER` declarations that extract and enrich intent as it moves between SESSION types
3. **PACKET lineage** — portable operational intelligence with provenance, admissibility, and authority chains traveling with the data

These three together are the moat.
