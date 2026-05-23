# The Andon Loop — Governed Expert System Evolution

**Status:** Architectural design — supersedes [`agicore_continual_harness_architecture_blueprint.md`](agicore_continual_harness_architecture_blueprint.md)

**Author trail:** Original "Continual Harness" blueprint posed the question; Christopher's inversion answered it. This document specifies the answer.

**Version:** 1.0 (design)

---

## Executive summary

The Andon Loop is a runtime + edit-time architecture for systems that combine deterministic operational guarantees with AI-driven improvement over time. It inverts the standard "AI agent" architecture by **moving the AI out of the runtime path entirely** and confining it to two edit-time roles: initial construction of a deterministic expert system, and on-demand intervention when the expert system pulls an andon cord.

**Standard agent architecture:**

```
INPUT → AI(reasoning, tool use, output) → OUTPUT
       (every request crosses the LLM boundary; every output is probabilistic)
```

**Continual Harness architecture (the prior blueprint):**

```
INPUT → AI ↔ tools ↔ memory ↔ harness_refiner → OUTPUT
       (the harness around the AI evolves; the AI is still in the runtime loop)
```

**The Andon Loop (this design):**

```
                    ┌─────────────────────────────────────────────┐
                    │  Build time                                   │
                    │  AI authors an expert system + defines        │
                    │  its own success metrics + failure modes      │
                    └────────────────────┬────────────────────────┘
                                          │
                                          ▼
INPUT  →  Deterministic ES (RULE/STATE/PATTERN/SCORE/STAGES/WORKFLOW)  →  OUTPUT
                                          │
                  (every action logged)   │
                                          ▼
                                  ┌──────────────────────┐
                                  │ Activity log         │
                                  └─────────┬────────────┘
                                            │
                          ┌─────────────────┴─────────────────┐
                          │                                     │
                          ▼                                     ▼
                  Andon pull                            Periodic review
                  (explicit failure)                     (AI vs SUCCESS_METRIC)
                          │                                     │
                          ▼                                     ▼
                  AI proposes fix                       AI proposes efficiency
                          │                                     │
                          ▼                                     ▼
                  Deterministic test                    NBVE shadow test
                          │                                     │
                  ┌───────┴───────┐                     ┌───────┴───────┐
                  ▼               ▼                     ▼               ▼
                Accept          Reject               Promote          Discard
                  │               │                     │               │
                  ▼               ▼                     ▼               ▼
              Deploy w/      Log (don't            Deploy w/      Log (don't
              full audit     repeat dead end)      audit chain    repeat dead end)
```

**The result:** A system where the audit trail is mechanical at runtime, AI participation is bounded and signed at edit time, and improvement happens continuously without ever putting an LLM in the load-bearing decision path.

This is what makes Agicore's "AI never at runtime" principle defensible at scale. Most "AI-author" systems still have AI sneaking back into runtime somewhere (retry logic, fallback handlers, classification edges). The Andon Loop eliminates those gaps.

---

## The core principle: deterministic foundation, AI evolution boundary

> Anything that can be expressed as a rule is a rule. Anything that can't be, pulls the andon cord.

The architecture's central commitment: the runtime makes no probabilistic decisions. Ever. When the runtime encounters a situation it can't decisively handle, it halts at a checkpoint, captures the failure case, and signals for AI intervention. The intervention is itself bounded — the AI proposes a deterministic mutation to the expert system, which is then verified mechanically before being applied.

This produces three properties most agent architectures cannot offer:

1. **Mechanical audit at runtime.** Every action the system takes traces to a named rule or transition. There is no "the AI decided" gap in the audit log.

2. **Bounded blast radius from AI mutations.** Mutations are proposed at edit time, verified deterministically, and applied with full provenance. A bad mutation can be rolled back exactly because the system that applied it is deterministic.

3. **Improvement without runtime risk.** Efficiency improvements (proposed by the AI from log review) are shadow-tested via NBVE alongside production. They never become load-bearing until they've proven equivalent-or-better.

The Toyota Production System inspired the name (andon cord = the operator's authority to stop the production line when they detect a defect), but the deeper inheritance is the **TPS quality discipline**: build quality in rather than inspecting it out, surface problems explicitly rather than masking them with retries, treat every defect as data for improvement rather than noise to suppress.

---

## Why this beats the prior Continual Harness blueprint

The prior blueprint asked the right question — "how do we build adaptive cognition systems without runtime chaos?" — but answered it by *governing* the AI in the loop. Adding telemetry, policy systems, mutation approvals, rollback infrastructure around the AI.

The problem with that answer: **governance around a non-deterministic core can only ever be best-effort.** If the AI is in the runtime decision path, it can still hallucinate, drift, contradict itself, or fail in ways the governance layer didn't anticipate. The governance becomes infinite-perimeter defense.

The Andon Loop answer is structural: **don't put the AI in the runtime path.** The governance problem collapses because there's nothing to govern at runtime — the deterministic expert system either has a rule for this input or it doesn't. If it does, the action is mechanical. If it doesn't, the andon pulls, and the AI is consulted under bounded, observable conditions.

| Dimension | Continual Harness | Andon Loop |
|---|---|---|
| AI position | In runtime loop | At edit boundary only |
| Audit story | "AI did X because policy P allowed it" | "Rule R fired because pattern P matched, with provenance" |
| Governance burden | Continuous (every runtime action) | Discrete (every mutation) |
| Failure mode | Drift, hallucination, contradiction | Andon pull (explicit, halting) |
| Improvement mechanism | Online harness refinement | Periodic AI review of logs → NBVE-tested mutations |
| Enterprise viability | Requires extensive guardrails | Default-defensible |
| Cost profile | AI on every request | AI on construction + andon + scheduled review |

The Andon Loop is also operationally cheaper. AI runs only when the expert system can't decide, or on a slow improvement cadence — both far less frequently than "every request."

---

## The architecture in detail

### Phase 1 — Build time

The AI authors an expert system targeting a domain. The expert system uses existing Agicore primitives:

- **RULE** for forward-chaining inferences (if conditions match, fire action)
- **STATE** for condition-driven state machines
- **PATTERN** for regex/text matching
- **SCORE** for certainty/weight tracking
- **STAGES** for explicit lifecycles
- **WORKFLOW** for sequenced operations
- **FACT** for working memory
- **MODULE** for composable bundles

Crucially, at build time the AI also declares:

1. **`SUCCESS_METRIC`** — what "good" looks like for this expert system. Used both as andon trigger (drops below threshold → pull) and as the target the improvement loop optimizes for.

2. **`ANDON_ON`** — explicit failure conditions that should halt rather than silently retry. Default andon conditions: no RULE matches an expected input pattern, STAGES transition guard fails, ACTION returns error variant, SCORE breaches threshold for sustained window.

3. **`ROLLBACK_BOUNDARY`** — for each WORKFLOW, the safe rollback envelope. Effects within the boundary roll back atomically on andon; effects outside trigger `COMPENSATING_ACTION`s.

4. **`MUTATION_TIER`** — what mutations the AI is authorized to propose, and what verification each tier requires.

This is the AI's most consequential contribution: not the rules themselves, but the **specification of what the rules don't know yet**. A well-built expert system is one that knows where its boundary is.

### Phase 2 — Runtime

The expert system executes deterministically. Every action emits to a telemetry channel (the OIE pattern Agicore already supports). The activity log captures:

- Every RULE evaluation (matched or not)
- Every STAGES transition (with from/to state)
- Every ACTION invocation (with inputs/outputs)
- Every SCORE adjustment
- Every CHANNEL message published
- Every external API call with response

The log is structured, queryable, and persistent. It serves three purposes: (1) audit, (2) andon analysis (when one pulls, the log is the AI's input), (3) periodic improvement review.

### Phase 3 — Andon time

An andon fires. The runtime:

1. Halts the affected workflow at its last checkpoint.
2. Rolls back any effects within the `ROLLBACK_BOUNDARY` of the current step.
3. Captures: failure_id, failure_category, input that triggered it, current state, recent activity log, mutation history of the relevant ES components.
4. Publishes an `AndonEvent` to the `andon_queue` channel.
5. A `TRIGGER WHEN { CHANNEL andon_queue }` fires the `andon_responder` REASONER.

The REASONER is the AI's intervention point. It:

1. Reads the captured state + activity log.
2. Reviews the mutation history (especially: previously-attempted fixes that failed for similar patterns — case-based reasoning to avoid rediscovering dead ends).
3. Categorizes the failure (no_rule_for_pattern, transition_violation, score_collapse, action_error, etc.).
4. Proposes a mutation typed by tier (see Mutation Tier System below).
5. Outputs a `MutationProposal` packet to the `proposal_queue`.

### Phase 4 — Test time

The deterministic verifier picks up the `MutationProposal` and:

1. Spins up a sandbox copy of the affected expert system components.
2. Applies the proposed mutation to the sandbox.
3. Replays the captured failure case against the sandbox — does the mutation resolve it?
4. Runs the regression suite (all prior test cases + recent successful workflows logged from production) against the sandbox — does the mutation break anything that worked before?
5. Records test results in `MutationLedger`.

If the failure case resolves AND no regression detected → mutation passes the deterministic test.

If either fails → mutation is rejected. The rejection is logged with the test evidence (so the AI sees it on next andon and doesn't propose the same fix again).

### Phase 5 — Deploy time

Approved mutations are applied to production. The application is itself a deterministic transaction:

1. Take an atomic snapshot of the current expert system.
2. Apply the mutation.
3. Run a smoke test (a small subset of regression suite) against the live system in an inert mode (read-only invocations).
4. If smoke test passes, the mutation is committed with a full audit entry to `MutationLedger`:
   - Proposal source: REASONER name + identity signature
   - Failure that triggered it: andon_event_id reference
   - Mutation content: the DSL diff
   - Test evidence: list of test cases + results
   - Approval chain: who signed off (deterministic test → governance auto-approve for low-tier mutations; human for high-tier)
   - Timestamp + signature
5. The halted workflow resumes from its checkpoint with the new rule in effect.

If the smoke test fails after deployment (unexpected interaction with live state), an immediate rollback is performed and a higher-tier andon pulls (this is a meta-andon — "my andon-response system failed").

### Phase 6 — Reject time

Failed mutations are logged with rejection cause:
- Did not resolve failure case
- Regression failure in test X
- Smoke test failure after deployment
- Governance rejection (tier above auto-approve)

The AI sees the rejection log on its next andon. This is **memory of dead ends** — prevents the AI from repeating its own failed reasoning.

### Phase 7 — Improvement time

Separate from andon: a scheduled REASONER reviews the activity log against the AI-declared `SUCCESS_METRIC`. Looks for:

- Steps that execute frequently but never affect downstream behavior (candidates for removal)
- Sequences that take longer than the metric target (candidates for restructuring)
- Rules that fire often but with low subsequent action diversity (candidates for consolidation)
- Workflows where outcomes vary in ways the metric doesn't capture (candidates for new SCOREs)

The REASONER proposes efficiency mutations. These go through **NBVE-style shadow testing**:

1. The candidate mutation is deployed in parallel to production (handles the same inputs, but its outputs are scored against production's outputs, not used downstream).
2. Run for `PROMOTION_WINDOW` cycles.
3. Compare: does the candidate's outputs match production's? When they differ, does the difference improve the `SUCCESS_METRIC`?
4. If yes for sustained window → promote candidate to production.
5. If no → reject and log.

This is exactly NBVE's existing pattern, extended from "model variants" to "rule/workflow variants."

---

## The four design questions, answered

### 1. What pulls the andon?

Andon should pull on **explicit failure to decide**, never on routine alternative outcomes. Specific triggers:

| Trigger | When | Rationale |
|---|---|---|
| `RULE no_match` | Input was expected to match at least one rule in a `MODULE` (declared via `EXPECTS_MATCH true`), and no rule matched | Silent no-match is the most insidious failure — it looks like "nothing to do" but actually means "we don't know what to do" |
| `STAGES_transition_guard_failed` | A state transition was attempted but the guard rejected it | The state machine is in a state it doesn't know how to leave |
| `ACTION_error_variant` | An action's output union resolved to an `error` variant (explicit failure type) | The action knew it couldn't succeed and signaled so |
| `SCORE_threshold_breach` | A SCORE crossed a `THRESHOLD ... THEN ANDON` clause | A quality/risk threshold was hit |
| `PATTERN_no_capture` | A PATTERN was expected to match (declared `REQUIRED true`) but didn't | The text didn't fit any known shape |
| `WORKFLOW_step_timeout` | A step exceeded its declared timeout | Something external is stuck; system can't decide if to retry/abandon |
| `EXTERNAL_response_unparseable` | An EDI message or API response didn't parse against its PACKET schema | Reality contradicted the schema |

What does NOT pull andon: a RULE firing with `THEN no_action` (an explicit "nothing to do here"), a STAGES transition deferred (waiting for more input), an action with a defined retry policy on its first retry, a SCORE below threshold but trending up.

The discipline: **routine alternatives are not failures.** Andon is for "I don't have a rule for this and I expected to."

### 2. What can safely be rolled back?

Rollback safety is determined by `ROLLBACK_BOUNDARY` declarations on WORKFLOW STEPs. The boundary defines what effects are reversible without external side effects:

```agicore
WORKFLOW process_order {
  STEP validate_order {
    ACTION validate
    ROLLBACK_BOUNDARY internal           # Pure compute + DB writes within app — fully reversible
  }
  STEP charge_payment {
    ACTION charge_card
    ROLLBACK_BOUNDARY external           # Hit an external API — needs compensating action
    COMPENSATING_ACTION refund_card
  }
  STEP ship_product {
    ACTION dispatch_warehouse
    ROLLBACK_BOUNDARY irreversible        # Truck is in motion — cannot undo
    ON_ANDON_ESCALATE human               # Human must decide; andon escalates to operator
  }
}
```

Three boundary types:

- **`internal`** — effects are confined to the app's own DB and channels. Rollback is a DB transaction abort + channel message recall. Safe and fast.
- **`external`** — effects reach an external system (API call, email send, EDI transmission). Rollback requires a `COMPENSATING_ACTION` (e.g., refund a charge, send a "please disregard" message). The compensating action itself must succeed; if it fails, escalate.
- **`irreversible`** — effects cannot be undone in any meaningful sense (physical shipment, irreversible state transition, time elapsed). Andon at such a step **does not roll back**; it escalates to a human and the workflow halts indefinitely until the human resolves.

A workflow's effective rollback envelope is "everything from the last `internal` or `external` boundary back to the last checkpoint, with compensating actions for `external` steps." `irreversible` boundaries create halt-and-escalate behavior; the AI cannot propose a fix that requires rolling back across one.

### 3. What can the AI propose at what tier?

The Mutation Tier System partitions proposed mutations by blast radius. Each tier has its own verification gate:

| Tier | Mutation type | Auto-deploy? | Verification |
|---|---|---|---|
| **T1 — Threshold tuning** | Adjust a SCORE THRESHOLD value, tweak a SCORE DECAY rate, modify a PATTERN regex within the same capture structure | Yes | Deterministic test (failure case + regression suite) |
| **T2 — Rule addition** | Add a new RULE (does not modify existing rules) | Yes | Deterministic test + 24h monitoring window |
| **T3 — Rule modification** | Modify CONDITIONS or THEN of an existing RULE | Yes (with shadow run) | Deterministic test + 7-day NBVE shadow run before full promotion |
| **T4 — Structural change** | Add/modify STAGES transitions, add new WORKFLOW STEP, modify ACTION INPUT/OUTPUT | Human approval required | Deterministic test + governance review + 14-day NBVE shadow |
| **T5 — Architectural change** | New WORKFLOW, new MODULE, new ENTITY, change to MUTATION_TIER itself | Human approval + signed off by governance authority | Deterministic test + full design review |

The AI declares the tier of every proposed mutation. If it under-declares (proposes a T2 change disguised as T1), the verifier detects this by comparing the mutation's actual scope to its declared scope, and rejects the proposal.

**Critically: the AI cannot propose changes to the MUTATION_TIER system itself.** That's a T5 architectural change with hard governance review. This prevents the obvious failure mode of "AI proposes 'all mutations are now T1', then proposes a destructive change at T1."

### 4. Memory of past andons

Every andon event and every mutation proposal is logged. The log is the AI's reference on future andons:

- **Same failure pattern, same fix attempted before, fix was rejected** → AI must propose a different fix (the system enforces this — if AI proposes a fix already in the rejection ledger for this failure category, the proposal is auto-rejected without test).
- **Same failure pattern, no prior fix attempts** → AI proposes fresh.
- **Different failure pattern that shares root cause with a prior failure** → AI is given the prior context as input and can propose either (a) extending the prior fix to cover this case, or (b) a separate fix.
- **Recurring failure pattern despite a previously-deployed fix** → meta-andon: the previously deployed fix didn't hold. Escalates to a higher tier; if the fix was T1-T3, it gets re-reviewed as T4.

The `MutationLedger` entity stores all this. Schema:

```
MutationLedger {
  mutation_id:         id
  proposed_at:         datetime
  proposed_by:         IdentityName              # signed REASONER identity
  triggered_by:        andon_event_id            # nullable for improvement-loop mutations
  failure_category:    string
  failure_pattern:     json                       # captured failure signature
  mutation_tier:       int (1-5)
  mutation_content:    json                       # DSL diff
  test_results:        json                       # regression suite outcomes
  approval_chain:      json                       # signature chain
  outcome:             "deployed" | "rejected" | "rolled_back"
  outcome_reason:      string
  effectiveness:       json                       # post-deploy metrics if deployed
  TIMESTAMPS
}
```

This is the cognitive equivalent of QMS's CAPA history. Past defects + fixes + outcomes inform present defects + fixes.

---

## The mutation policy DSL

To make all the above concrete, the AI authoring an expert system declares its mutation policy:

```agicore
MUTATION_POLICY production_orders {
  TARGETS [process_order, validate_inventory, allocate_warehouse]

  TIER 1 threshold_tuning {
    SCOPE   [SCORE_THRESHOLD, SCORE_DECAY, PATTERN_regex]
    AUTO_DEPLOY true
    REQUIRE  deterministic_test_pass
    REGRESSION_SUITE 24h_of_recent_workflows
  }

  TIER 2 rule_addition {
    SCOPE   [RULE_add]
    AUTO_DEPLOY true
    REQUIRE  deterministic_test_pass
    MONITORING_WINDOW 24h
    ROLLBACK_ON spc_drop OR error_spike
  }

  TIER 3 rule_modification {
    SCOPE   [RULE_modify_conditions, RULE_modify_then]
    AUTO_DEPLOY true_after_shadow
    REQUIRE  deterministic_test_pass
    NBVE_WINDOW 7d
    PROMOTION_THRESHOLD success_metric_improvement >= 0
  }

  TIER 4 structural {
    SCOPE   [STAGES_add_transition, WORKFLOW_add_step, ACTION_signature_change]
    AUTO_DEPLOY false
    REQUIRE  deterministic_test_pass AND governance_approval
    NBVE_WINDOW 14d
    APPROVAL_AUTHORITY OperationsLead
  }

  TIER 5 architectural {
    SCOPE   [WORKFLOW_add, MODULE_add, ENTITY_add, MUTATION_POLICY_modify]
    AUTO_DEPLOY false
    REQUIRE  full_design_review
    APPROVAL_AUTHORITY GovernanceCouncil
  }

  ANDON_RESPONDER andon_for_production_orders
  IMPROVEMENT_REASONER efficiency_review_for_production_orders
  LEDGER MutationLedger
}
```

The MUTATION_POLICY is itself a declaration. Changing it is a T5 mutation, requiring full governance review.

---

## DSL extensions (compact summary)

The Andon Loop adds the following surface to the DSL. Most are fields on existing declarations; a few are new declarations.

### New fields on existing declarations

| Declaration | Field | Purpose |
|---|---|---|
| `RULE` | `ANDON_ON no_match` | When this RULE is in a MODULE with `EXPECTS_MATCH true`, no-match pulls andon |
| `RULE` | `MUTATION_TIER n` | The minimum tier required to modify this rule |
| `STAGES` | `ANDON_ON guard_failure` | Failed transition guards pull andon |
| `WORKFLOW STEP` | `ROLLBACK_BOUNDARY internal | external | irreversible` | Rollback envelope |
| `WORKFLOW STEP` | `COMPENSATING_ACTION action_name` | Required when `ROLLBACK_BOUNDARY external` |
| `WORKFLOW STEP` | `ON_ANDON_ESCALATE human | tier_n_reasoner` | Required when `ROLLBACK_BOUNDARY irreversible` |
| `WORKFLOW STEP` | `TIMEOUT duration` | After which the step pulls andon |
| `ACTION` | `OUTPUT result: SuccessType \| ErrorType` | Explicit error variant (union type) — error variant pulls andon |
| `SCORE` | `THRESHOLD n THEN ANDON` | Score breaches trigger andon |
| `WORKFLOW` | `SUCCESS_METRIC score_name` | The metric the improvement loop optimizes |
| `MODULE` | `EXPECTS_MATCH true` | When set, any input that no rule matches pulls andon |
| `MODULE` | `MUTATION_POLICY policy_name` | The mutation policy governing this module's evolution |

### New declarations

| Declaration | Purpose |
|---|---|
| `MUTATION_POLICY` | Declares the tier system, auto-deploy rules, NBVE windows, approval authorities for a target set |
| `ANDON_RESPONDER` | Specialized REASONER pattern: input is `(AndonEvent, ActivityLog, MutationLedger excerpt)`; output is `MutationProposal` |
| `IMPROVEMENT_REASONER` | Specialized REASONER pattern: scheduled review of activity log against SUCCESS_METRIC; output is `EfficiencyProposal` |
| `MUTATION_LEDGER` | Singleton entity that stores all proposed mutations + outcomes (cognitive CAPA history) |
| `ANDON_EVENT` | Entity capturing each andon pull (failure pattern, captured state, activity log excerpt) |

### Auto-generated infrastructure

The compiler emits, in addition to the existing codegen:

- `andon_queue` CHANNEL with `AndonEvent` PACKET schema
- `proposal_queue` CHANNEL with `MutationProposal` PACKET schema
- `mutation_ledger` SQLite table with the schema above
- `andon_event` SQLite table with the failure pattern + capture
- Sandbox executor module: spins up a copy of the affected expert system components and runs the candidate mutation
- Regression suite collector: every successful workflow execution adds itself to the regression suite (capped at N most-recent + curated golden set)
- NBVE extension for rule/workflow variants (compares outputs against production for divergence detection)

This is a substantial surface but every piece is a natural extension of an existing primitive. No new primitive type needs invention.

---

## Mapping onto Accelerando — the recursive proof

The Andon Loop is the same pattern Accelerando's QMS + PI CoE already implements for manufacturing processes — applied recursively to the cognitive systems that operate businesses.

| Accelerando concept (for business processes) | Andon Loop concept (for expert systems) |
|---|---|
| NCR (Non-Conformance Report) | AndonEvent |
| Root cause analysis (5-Why, Fishbone) | REASONER review of activity log + state capture |
| CAPA (Corrective and Preventive Action) | MutationProposal |
| Effectiveness check (30-day verification) | Deterministic test + monitoring window |
| Management review (quarterly) | Improvement loop (scheduled efficiency review) |
| Internal audit | Mutation ledger periodic review |
| Document control (procedure versioning) | MutationLedger as version control for the expert system |
| PI CoE (DMAIC improvement projects) | IMPROVEMENT_REASONER + NBVE shadow testing |
| Anti-backslide (30/60/90-day checks) | MutationLedger effectiveness tracking |
| QMS closed loop discipline | The full Andon Loop |

This isn't a coincidence — both are applications of the **TPS quality discipline** to systems that produce work. The first generation (Accelerando QMS) applies it to manufacturing operations. The second generation (Andon Loop) applies it to the cognitive systems that operate any business.

That's not just a satisfying symmetry — it's a strong signal that the pattern is real. When the same architectural pattern naturally describes both a process layer and the cognition layer above it, the pattern has captured something fundamental about how reliable systems evolve.

---

## A worked example: customer-tier classification

Concrete walk-through to make the architecture tangible.

**Scenario:** A B2B SaaS company wants to automatically classify incoming customer accounts into tiers (`enterprise`, `mid_market`, `smb`, `startup`) based on signals from their CRM data. They want this deterministic at runtime, auditable, and improving over time.

**Build time — AI authors the expert system:**

```agicore
APP customer_classification {
  TITLE "Customer Tier Classification"
  DB    customers.db
}

ENTITY Customer {
  name:            string REQUIRED
  signed_up_at:    datetime
  monthly_revenue: float
  employee_count:  number
  industry:        string
  tier:            string = "unclassified"
  TIMESTAMPS
}

MODULE customer_tier_rules {
  EXPECTS_MATCH true
  MUTATION_POLICY classification_policy

  RULES [
    classify_enterprise,
    classify_mid_market,
    classify_smb,
    classify_startup
  ]
}

RULE classify_enterprise {
  WHEN Customer.employee_count > 1000
  OR   Customer.monthly_revenue > 50000
  THEN set_tier_enterprise
  PRIORITY 100
  MUTATION_TIER 2
}

RULE classify_mid_market {
  WHEN Customer.employee_count > 100
  AND  Customer.employee_count <= 1000
  THEN set_tier_mid_market
  PRIORITY 80
  MUTATION_TIER 2
}

RULE classify_smb {
  WHEN Customer.employee_count > 10
  AND  Customer.employee_count <= 100
  THEN set_tier_smb
  PRIORITY 60
  MUTATION_TIER 2
}

RULE classify_startup {
  WHEN Customer.employee_count <= 10
  THEN set_tier_startup
  PRIORITY 40
  MUTATION_TIER 2
}

ACTION set_tier_enterprise  { INPUT customer_id: id  OUTPUT customer: Customer }
ACTION set_tier_mid_market  { INPUT customer_id: id  OUTPUT customer: Customer }
ACTION set_tier_smb         { INPUT customer_id: id  OUTPUT customer: Customer }
ACTION set_tier_startup     { INPUT customer_id: id  OUTPUT customer: Customer }

SCORE classification_quality {
  INITIAL  1.0
  MIN      0.0
  MAX      1.0
  DECAY    0.01 PER 1d
  THRESHOLD 0.85 THEN ANDON         # if quality drops, andon pulls
}

WORKFLOW classify_new_customer {
  STEP load_customer    { ACTION load  ROLLBACK_BOUNDARY internal }
  STEP run_rules        { ACTION evaluate_rules  ROLLBACK_BOUNDARY internal }
  STEP commit_tier      { ACTION commit  ROLLBACK_BOUNDARY internal }
  SUCCESS_METRIC classification_quality
  TIMEOUT 5s
}

MUTATION_POLICY classification_policy {
  TARGETS [customer_tier_rules]
  TIER 1 threshold_tuning { ... auto-deploy after test ... }
  TIER 2 rule_addition    { ... auto-deploy after test ... }
  TIER 3 rule_modification { ... 7-day NBVE shadow ... }
  TIER 4 structural        { ... governance approval ... }
  ANDON_RESPONDER andon_classifier
  IMPROVEMENT_REASONER tier_efficiency_review
}

ANDON_RESPONDER andon_classifier {
  USES tier_classification_skilldoc
  INPUT  { event: AndonEvent, ledger: json }
  OUTPUT { proposal: MutationProposal }
  PROMPT """
    A customer was passed to the classification module but no rule matched.
    Examine the customer attributes + recent successful classifications.
    Propose either:
      - A new RULE (Tier 2) to handle this customer type
      - A modification to an existing rule (Tier 3) to broaden coverage
    Do NOT propose changes already in the rejection ledger for similar patterns.
  """
}

IMPROVEMENT_REASONER tier_efficiency_review {
  INPUT  { activity_log: json, metric: SCORE }
  OUTPUT { proposal: EfficiencyProposal }
  PROMPT """
    Review the past 30 days of classification activity.
    Look for: rules that fire frequently with low downstream variance
    (candidates for consolidation), classifications that get manually
    overridden often (candidates for rule refinement), latency outliers
    (candidates for restructuring).
    Propose efficiency mutations targeted at improving classification_quality.
  """
  SCHEDULE weekly
}
```

**Runtime — normal operation:**

A new customer arrives: `{ name: "Acme Corp", employee_count: 450, monthly_revenue: 12000, ... }`. The workflow runs:
- `load_customer` → loads from DB
- `run_rules` → `classify_mid_market` matches (employee_count > 100 and ≤ 1000) → `set_tier_mid_market` fires
- `commit_tier` → DB updated; Customer.tier = "mid_market"

Activity log: `[load_customer (12ms), run_rules → classify_mid_market matched → set_tier_mid_market called (3ms), commit_tier (8ms)]`. Total: 23ms. Classification_quality score: unchanged (1.0).

**Runtime — andon scenario:**

A weird new customer arrives: `{ name: "Solo Consultant LLC", employee_count: 1, monthly_revenue: 80000, ... }`. The workflow runs:
- `load_customer` → loads
- `run_rules` → `classify_enterprise` matches (monthly_revenue > 50000) → fires set_tier_enterprise

Wait — does that make sense? A 1-employee consultant making $80k/month is "enterprise"? The system doesn't know it shouldn't be. The classification commits.

But this happens 5 more times in the next week (one-person consulting firms with high revenue). The improvement loop catches it during the weekly review — `tier_efficiency_review` notices that "enterprise"-tagged accounts with employee_count < 10 are being manually re-tiered by sales 5 out of 6 times.

The improvement REASONER proposes: **add `RULE classify_solo_high_revenue` with `WHEN employee_count < 10 AND monthly_revenue > 50000 THEN set_tier_smb` PRIORITY 110** (higher than enterprise, so it wins).

This is a Tier 2 mutation (rule addition). It goes through deterministic test:
- The 6 captured cases all reclassify as `smb` under the candidate → resolves them
- Regression suite (last 30 days, ~12,400 classifications) → all 12,394 other cases unchanged

Deterministic test passes. The mutation deploys with full audit:
> "Mutation `mut_2026-06-15_001` deployed at 2026-06-15 09:33 UTC. Proposed by REASONER `tier_efficiency_review` (signed by IdentityName `system_improvement_v1`). Triggered by efficiency review (not andon). Tier 2. Test evidence: 6 cases resolved, 12,394 cases unchanged. Approval: auto (deterministic test pass within Tier 2 policy)."

**Runtime — true andon scenario:**

A *truly* new customer type arrives: `{ name: "Open Source Foundation", employee_count: 0, monthly_revenue: 0, industry: "nonprofit", ... }`. No rule matches (the `MODULE customer_tier_rules` has `EXPECTS_MATCH true`).

Andon pulls. Workflow halts at `run_rules` step. The `internal` ROLLBACK_BOUNDARY means no commit happened. `AndonEvent` published to `andon_queue`. `andon_classifier` REASONER fires.

The REASONER examines:
- Customer attributes: 0 employees, 0 revenue, "nonprofit" industry
- Activity log: no rule matched
- Mutation ledger: no prior similar failures
- Successful classifications log: no prior "nonprofit" classifications

The REASONER proposes a Tier 2 mutation: **add `RULE classify_nonprofit` with `WHEN Customer.industry == "nonprofit" THEN set_tier_nonprofit` PRIORITY 120, plus declare new ACTION `set_tier_nonprofit` plus extend the `tier` field's valid values to include "nonprofit"**.

But wait — adding a new ACTION and extending a field's value space is actually a **Tier 4** structural change, not Tier 2. The REASONER's proposal under-declares its tier. The verifier detects this (the mutation touches an ACTION definition AND introduces a new valid value) and rejects the proposal as under-declared.

The REASONER tries again. This time it proposes a more bounded Tier 2 mutation: **add `RULE classify_nonprofit_as_smb` with `WHEN Customer.industry == "nonprofit" THEN set_tier_smb` PRIORITY 120**. This is a pure rule addition using existing actions, Tier 2.

Deterministic test:
- The "Open Source Foundation" case now classifies as `smb` → resolves the andon
- Regression suite: all prior classifications unchanged

Mutation deploys. The halted workflow resumes from its checkpoint with the new rule available. "Open Source Foundation" is now classified as `smb`. Activity log shows the full trail: andon pull → REASONER proposal (rejected for under-declaration) → REASONER second proposal (accepted) → mutation deploy → workflow resume → classification commit.

**The audit story for the CISO:**
> "On 2026-06-22 at 11:14 UTC, customer record id 4791 ('Open Source Foundation') triggered an andon (failure category: `no_rule_matched` in module `customer_tier_rules`). REASONER `andon_classifier` (signed by IdentityName `system_responder_v1`) was invoked. First proposal was rejected at the tier verifier for under-declaration (proposed as T2 but contained T4 changes). Second proposal at T2 was accepted; deterministic test passed (1 case resolved, 12,847 regression cases unchanged). Mutation deployed with auto-approval per `classification_policy` T2 rules. Workflow resumed; customer classified as `smb`. Total time from andon to resumption: 47 seconds."

No "the AI decided." No mystery decision. Every step traces.

---

## Implementation phases (sequenced)

The architecture is realistic to implement because each phase delivers value independently and builds on existing Agicore primitives.

### Phase 1 — Telemetry and checkpoint infrastructure

What lands: Every WORKFLOW STEP gets implicit checkpointing. Every action emits a telemetry record. The activity log is queryable.

DSL changes: none (telemetry is already in the compiler; this just formalizes the checkpoint contract).

Runtime: Workflow runner saves state at each step boundary; can resume from any checkpoint.

Estimated effort: ~2 sprints.

### Phase 2 — `ANDON_ON`, `ROLLBACK_BOUNDARY`, `SUCCESS_METRIC`

What lands: The DSL fields for declaring andon triggers, rollback envelopes, and success metrics. The runtime recognizes andon conditions and halts cleanly.

DSL changes: New fields on RULE, STAGES, WORKFLOW STEP, ACTION, SCORE, MODULE.

Runtime: Andon halt mechanism. Rollback executor (handles `internal`; `external` requires the next phase).

Estimated effort: ~1 sprint.

### Phase 3 — Compensating actions, escalation, MUTATION_POLICY

What lands: External rollback boundaries work (via compensating actions). Irreversible boundaries escalate cleanly. `MUTATION_POLICY` declaration parses and influences tier verification.

DSL changes: `COMPENSATING_ACTION`, `ON_ANDON_ESCALATE`, new `MUTATION_POLICY` declaration.

Runtime: Compensating action runner. Tier verifier (compares proposed mutation scope to declared tier scope; rejects mismatches).

Estimated effort: ~2 sprints.

### Phase 4 — `ANDON_RESPONDER` REASONER + sandbox executor + deterministic verifier

What lands: An andon pull invokes a REASONER. The REASONER's proposed mutation is sandboxed and tested. Pass/fail is mechanical.

DSL changes: `ANDON_RESPONDER` is a specialized REASONER (existing) with input/output schema convention.

Runtime: Sandbox executor (clones the affected ES components into a separate evaluator). Deterministic test harness. Mutation ledger storage.

Estimated effort: ~3 sprints.

### Phase 5 — NBVE extension for rule/workflow variants + `IMPROVEMENT_REASONER`

What lands: Proposed efficiency mutations can be shadow-tested via NBVE. The improvement loop runs on schedule. Promotion is based on SUCCESS_METRIC improvement over the window.

DSL changes: NBVE gains `CANDIDATE_RULE` / `CANDIDATE_WORKFLOW` fields (in addition to existing `CANDIDATE_MODEL`). `IMPROVEMENT_REASONER` declaration.

Runtime: Shadow runner for rule/workflow variants (parallel execution; output comparison; metric-based promotion).

Estimated effort: ~2 sprints.

### Phase 6 — Approval chains, governance hooks, multi-tier authority

What lands: T4 and T5 mutations require named human approvals. Approval chains are signed and audited. Governance can override.

DSL changes: `APPROVAL_AUTHORITY` field on MUTATION_POLICY tiers; integration with existing AUTHORITY declarations.

Runtime: Approval workflow integration; notification to human approvers; signed approval ledger.

Estimated effort: ~2 sprints.

**Total: ~12 sprints (3 months at 1 sprint/week, 6 months at 1 sprint/2 weeks).**

This is a Phase 11 capability for Agicore — a major addition, but well-scoped because every piece extends existing primitives rather than inventing new ones.

---

## What this is NOT (limit clearly stated)

- **Not autonomous AI.** The AI proposes; the deterministic system verifies; humans hold approval authority for high-tier changes. There is no path for the AI to make changes without verification.

- **Not unbounded self-modification.** Every mutation is tier-classified. Tiers above T3 require human approval. The mutation policy itself is T5 — the AI cannot change its own authorization scope.

- **Not "AI gets smarter over time."** The AI doesn't learn from the system's operation. The *expert system* gets more complete over time, as the AI fills gaps via andon responses and efficiency proposals. The AI itself is fungible — a different AI brought in tomorrow has the same access surface.

- **Not a replacement for human design.** The initial expert system's structure (which entities, which workflows, which success metrics) requires human design judgment. The AI fills in the rules and refines them; humans set the boundaries.

- **Not safe by default for irreversible operations.** `ROLLBACK_BOUNDARY irreversible` requires explicit `ON_ANDON_ESCALATE human`. Workflows that involve physical actions, money movement, or other irreversible effects always escalate to humans on failure — never to the AI.

- **Not a way to eliminate operations staff.** Operations is still required for: governance approvals, escalation handling, mutation ledger review, system design decisions. The system reduces routine cognitive load; it doesn't eliminate operational responsibility.

---

## The audit story (the enterprise punch line)

The single most defensible property of this architecture is the audit story. Every operational claim a regulator or auditor might ask, the system can answer with a query rather than a guess.

> **Auditor:** "How does this system decide which tier a customer belongs to?"
> **System:** "RULEs in `MODULE customer_tier_rules`, current version derived from initial AI authoring on 2026-04-01 plus 23 mutations since then. Full DSL source available, plus git-style diff history per mutation."

> **Auditor:** "What if the system is wrong about a classification?"
> **System:** "If the input matches no rule, andon pulls and the system halts at the rule-evaluation step. No commit happens. AI is consulted; proposes a new rule; deterministic test verifies. If the test passes the rule deploys with audit. If a previously-correct classification is later overridden by a user, that's data the improvement loop sees and can act on."

> **Auditor:** "Show me every decision the system made on customer X."
> **System:** "Activity log query: 47 events on customer X over 14 months. Each event ties to a RULE name + version + the inputs that triggered it. Includes the andon at 2026-08-02 and the mutation that resolved it."

> **Auditor:** "What if the AI proposes a bad rule?"
> **System:** "Mutation is sandboxed and tested against the failure case + regression suite before deploying. If it fails either test, it's rejected and logged. If it passes the test but produces bad outcomes in production (caught by SUCCESS_METRIC degradation), it can be rolled back via the mutation ledger."

> **Auditor:** "Can the AI bypass governance?"
> **System:** "No. Mutation tier is verified mechanically before testing. Under-declared tiers are rejected. T4-T5 mutations require named human approvals. The mutation policy itself is T5 — the AI cannot expand its own authorization."

> **Auditor:** "Who signed the mutation that classified Customer X?"
> **System:** "REASONER `andon_classifier`, signed by IdentityName `system_responder_v1`. Approval per policy: auto (Tier 2, deterministic test pass). Human approval chain: none required for Tier 2."

This is what makes the architecture enterprise-defensible. Not "we believe the AI is safe" but "here is the mechanical proof that every change was tested before applying."

---

## Open questions for v2

These are deliberately not solved in v1 — they're either non-blocking or require operational experience to inform the right answer.

1. **What if the regression suite is too large to run on every mutation?** Probably: tiered regression suites — fast smoke (10s of cases, runs always), medium (100s of cases, runs for T3+), full (10,000s of cases, runs for T4-T5). Plus a "diff regression" that only re-runs cases the mutation could have affected based on static analysis.

2. **How does the AI handle conflicts between two andon responses to similar failures?** Probably: the second responder sees the first's proposal in flight, can choose to wait, extend, or propose alternative. Conflict resolution at the deterministic verifier level.

3. **Cross-app mutations.** When a fix requires changing two apps' expert systems (e.g., the classification module + a downstream notification rule), tier escalates automatically + governance approval mandatory regardless of base tier.

4. **What about the case where the AI itself is the wrong AI for the job?** Probably: NBVE extends to test alternative AI authors for the andon responder. The improvement loop can propose "use a different REASONER for andon responses to category X." This is recursive (the system improves the system that improves the system) — but each step is bounded by the same tier discipline.

5. **What's the right governance default for a brand-new deployment with no mutation history?** Probably: every mutation requires human approval for the first 30 days, regardless of tier. Auto-deploy unlocks tier-by-tier as the system accumulates evidence of stable behavior.

---

## Final thought

The most consequential property of the Andon Loop is that it makes the runtime trust problem **structural**, not procedural.

Other "AI agent" architectures spend governance budget keeping a probabilistic core honest. The Andon Loop spends design budget keeping the probabilistic core out of runtime entirely. The first approach is infinite-perimeter defense; the second is moving the perimeter to a different layer where defense is finite.

This is also the answer to "what makes Agicore different from every framework that promises 'safe AI agents'." Every other framework eventually answers "trust us, we have guardrails." Agicore answers "the system has no AI at runtime. The runtime is mechanical. The audit log is the system's truth. Here is the mechanical proof of every change."

That's a meaningfully different product. It's also a meaningfully different bet on where the field is going. Most of the industry is racing to make probabilistic systems more reliable. The Andon Loop bets on a different shape entirely: **probabilistic at the edit boundary, deterministic at the runtime boundary, with mechanical verification between them.**

If this bet is right, Agicore won't compete with other agent frameworks. It will be a different category of product — the kind enterprises buy when they need both AI participation and operational reliability without choosing between them.

That's worth building.

---

*Andon Loop v1.0 (design) · 2026-05-23 · Authored as the chosen evolution of the Continual Harness blueprint*
