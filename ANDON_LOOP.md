# The Andon Loop

**Agicore's continual harness, inverted.**

> A persistent adaptive-cognition runtime where AI authors the rules, deterministic systems run the rules, and every transition between proposal and production passes through a mechanical gate that AI cannot bypass.

The Andon Loop is the architecture this repository ships for the problem space currently labelled "continual harness." It deliberately takes the opposite shape from every other implementation in the wild — and the rest of this document explains why that inversion is the load-bearing decision, what it gets you, and how the substrate is wired.

---

## The problem with current continual harness implementations

The continual harness frame is correct: agent systems need to evolve their own prompts, policies, sub-agents, and workflows over time, rather than depending on a human to engineer the harness manually. Static harnesses age out. The intuition is sound.

Where the existing implementations go wrong is the placement of the AI. They keep AI **inside the runtime loop** — the agent's model is the thing executing each request. Then they bolt on layers to manage the resulting nondeterminism:

- Observability stacks to see what the AI did
- Policy engines to constrain what it can do
- Evaluators that grade its outputs
- Retry budgets and circuit breakers when it misbehaves
- Retreat-to-known-good logic for when the new harness is worse
- Approval queues for state changes the AI wants to make
- Versioning systems to roll back when something breaks

Each layer adds operational burden. None of them eliminate the underlying property: **the AI is in the path, and the system inherits its nondeterminism.** Your audit trail is best-effort. Your reproducibility is "if you replay the same prompts against the same model with the same seed *maybe*." Your governance is a policy correctness problem — a single misconfigured rule and the AI's blast radius widens.

The deeper issue: when AI is in the runtime loop, every safety property is a policy you have to maintain. There is no mechanical guarantee. "AI cannot expand its own authorization" is a thing you hope your governance layer correctly enforces — not a thing the architecture makes impossible.

---

## The inversion

The Andon Loop moves AI **out of the runtime path entirely** and confines it to two edit-time roles:

1. **Initial expert system construction** — at build time, AI helps a human author write the `.agi` source. The compiler then generates a deterministic Rust + TypeScript application from that source. The AI does not run when end users hit the app.

2. **On-demand intervention** — when the deterministic expert system encounters something it cannot handle (an `ANDON_ON action_error`, an `EXPECTS_MATCH true` module with no rule firing, a score threshold breach), it **pulls the andon cord**: writes a row to `andon_events` and returns. AI is invoked asynchronously to propose a fix. The fix flows through deterministic gates before it can touch production.

Between those two roles, AI is not in the request path. End users never wait on a model. There is no prompt to log, no temperature to tune, no eval to grade per request. The runtime is the same code every time, with the same outputs for the same inputs, forever.

This is not a denial of AI's value — it's a placement decision. AI is most valuable where its strengths (interpretation, planning, generation) are paid for once and amortized across many deterministic executions. AI is most costly where its weaknesses (nondeterminism, governance burden, audit opacity) compound per request.

The Andon Loop puts AI exactly where it pays and exactly nowhere else.

### The lifecycle when something fails

```
expert system rule engine
       │ no rule matched (or action failed, or score below threshold)
       ↓
  pullModuleAndon(target, eventPayload)        ── Phase 11.8b
       │
       ↓
  andon_events row                              ── trigger='no_rule_match' | 'action_error' | …
       │
       ↓
  respondToAndon(eventId)                       ── Phase 4c (deterministic stub responder)
                                                   OR
  respondToAndonWithAI({...model...})           ── Phase 4d (real AI dispatch via send_chat)
       │
       ↓
  create_mutation_proposal({target, claimed_tier, claimed_scope, mutation_content})
       │                                         ── Phase 4a
       ↓
  verify_and_persist(proposal_id)
       │                                         ── Phase 4a: tier verifier
       │                                            ├── claimed_scope ⊆ tier.scope ? → tier_verified
       │                                            └── otherwise              → tier_rejected (terminal)
       │
       ↓ tier_verified
  execute_proposal_sandbox(proposal_id)
       │                                         ── Phase 4b: regression suite
       │                                            ├── test failed             → rejected (terminal)
       │                                            ├── tier has NBVE_WINDOW    → shadow_evaluating
       │                                            ├── tier AUTO_DEPLOY=true   → deployed
       │                                            └── otherwise               → escalated
       │
       ├─ shadow_evaluating ──────────────────► Phase 5d/5e: NBVE shadow window
       │       │
       │       │ window elapses + SPC pass     → deployed
       │       │ window elapses + SPC fail     → rejected
       │       │ window elapses + insufficient → escalated
       │
       ├─ deployed (auto)                     ── via AUTO_DEPLOY=true
       │
       └─ escalated                            ── via AUTO_DEPLOY=false / inconclusive shadow
               │
               ↓
          approve_proposal(resolver, notes)   ── Phase 6 + 6b + 6c
               │                                 ├── 1-of-1 single signer
               │                                 ├── N-of-N parallel (unordered)
               │                                 └── N-of-N ordered (sequential)
               │
               ├── threshold met → deployed
               └── any rejection → rejected (terminal)

  Every transition above appends to mutation_ledger:
      PROPOSED → TIER_VERIFIED / TIER_REJECTED → TESTED →
      SHADOW_EVALUATING / SHADOW_PROMOTED / SHADOW_ROLLED_BACK / SHADOW_INCONCLUSIVE →
      DEPLOYED / ESCALATED / REJECTED_BY_SANDBOX →
      PARTIAL_APPROVAL → APPROVED / REJECTED_BY_AUTHORITY

  Each entry is SHA-256 hash-chained to the previous (Phase 7).
  Optional file-system mirror to <path>/<ledger_name>.jsonl (Phase 7b).
```

The proactive (kaizen) entry follows the exact same lifecycle, just with a different starting point:

```
scheduler tick (cron-style, declared per IMPROVEMENT_REASONER)        ── Phase 5b
       │
       ↓
  runImprovementCycle(policyName)               ── Phase 5a (stub)
                                                   OR
  runImprovementCycleWithAI({...model...})      ── Phase 5c (real AI dispatch)
       │
       ↓ same proposal pipeline as above
```

Two entry points (reactive andon, proactive kaizen) → one shared lifecycle → one audit chain.

---

## What you get from a single MUTATION_POLICY declaration

One declaration in a `.agi` source unlocks the entire pipeline. The compiler emits the substrate; the consumer's app inherits the behavior.

```agi
MUTATION_POLICY ops_policy {
  TARGETS [order_workflow, refund_workflow]

  TIER 1 rule_tuning {
    SCOPE [RULES_modify]
    AUTO_DEPLOY true
    REGRESSION_SUITE 24h_recent_workflows
    NBVE_WINDOW 24h
  }

  TIER 3 structural {
    SCOPE [WORKFLOW_modify, WORKFLOW_add_step]
    AUTO_DEPLOY false
    APPROVAL_AUTHORITY [ops_lead, security_lead]      # 2-of-2 unordered
  }

  TIER 5 governance {
    SCOPE [MUTATION_POLICY_modify]
    AUTO_DEPLOY false
    APPROVAL_AUTHORITY ORDERED [ceo, cto, board_chair]  # 3-of-3 sequential
  }

  ANDON_RESPONDER ops_handler           # reactive AI entry point
  IMPROVEMENT_REASONER weekly_kaizen    # proactive AI entry point (also runs on a schedule)
  LEDGER ComplianceLedger               # named hash-chained audit log
}
```

Generated from that declaration alone:

| Generator | Emits | Phase |
|---|---|---|
| `mutations.ts` | `mutation_proposals` table; tier verifier; sandbox executor with regression suite resolver; auto-deploy / escalate / shadow decision branching; create/verify/sandbox/list/get/record Tauri commands; ledger hooks at every transition | 4a + 4b + 5e + 7 |
| `responder.ts` | `respond_to_andon` (stub) Tauri command; `respond_to_andon_with_ai` TS orchestration over `send_chat`; `parseResponderDraft` for parsing AI JSON output (handles code fences, decline, malformed); `link_proposal_to_andon_event` | 4c + 4d |
| `improver.ts` | `run_improvement_cycle` (stub) + `runImprovementCycleWithAI` (TS orchestration); `record_ai_improvement_cycle`; `improvement_cycles` table; `start_improvement_scheduler` (hourly/daily/weekly auto-spawn) | 5a + 5b + 5c |
| `approvals.ts` | `approval_requests` table; `AuthoritySet { authorities, threshold, ordered }`; record_decision aggregator (single / N-of-N parallel / N-of-N ordered); approve_proposal / reject_proposal with positional signer validation when ordered | 6 + 6b + 6c |
| `ledger.ts` | `mutation_ledger` table (hash chain via SHA-256 over canonical-JSON-serialized entries); `verify_ledger_integrity` (walks chain, returns IntegrityReport); file-system sink helper (opt-in via `AGICORE_LEDGER_SINK_PATH`); list/get/sink-status commands | 7 + 7b |
| `shadow_eval.ts` | `mutation_shadow_evaluations` + `mutation_shadow_observations` tables; SPC gate (defect_rate ≤ threshold AND samples ≥ min); `evaluateWithShadow<TIn, TOut>` TS dual-routing helper; `finalize_shadow_evaluations` runtime closer; `start_shadow_finalizer` 60s background poller | 5d + 5e |
| `mutation_console.ts` | React `<MutationConsole />` component with 5 tabs (Proposals / Approvals / Shadow / Ledger / Andon Events); status pills covering every lifecycle state; verify/sandbox/approve/reject/integrity-check/finalize action buttons | 8c |
| `workflow.ts` | `pull_module_andon` Tauri command for the expert-system runtime to fire andons on no-match (gated on EXPECTS_MATCH=true + MUTATION_POLICY binding) | 11.8b |

Plus generator wiring in `rust.ts` (mod declarations + invoke_handler registration), tier-JSON serialization in `workflow.ts mutationPoliciesSql()`, the parser changes for `EXPECTS_MATCH` / `MUTATION_POLICY` (module binding) / `RULES` (rule-ref list) / `MUTATION_TIER` / `ORDERED` (Phase 11.8 + 11.8b + 6c), and validator checks for dangling refs.

**~9,700 LOC of generator code; 3,206 tests passing** (parser 911 + codegen 2,250 + validator 45).

---

## The DSL surface, annotated

Every field that participates in the Andon Loop:

```agi
# ── Top-level MUTATION_POLICY ─────────────────────────────────────────────
MUTATION_POLICY <name> {
  TARGETS [<workflow_or_module>, ...]            # which systems this policy governs

  TIER <n> <label> {                              # zero or more tiers, n=1..5 conventional
    SCOPE [<MutationScope>, ...]                  # what kinds of mutations are allowed at this tier
                                                  #   RULES_modify | WORKFLOW_modify | WORKFLOW_add |
                                                  #   WORKFLOW_add_step | MODULE_add | ENTITY_add |
                                                  #   MUTATION_POLICY_modify | SCORE_THRESHOLD | …
    AUTO_DEPLOY <bool>                            # true → deploy on test pass; false → escalate
    REQUIRE <gate>, <gate> | <gate> AND <gate>    # additional gate names (semantic flags)
    REGRESSION_SUITE <suite_name>                 # e.g. 24h_recent_workflows | 7d_recent_workflows
    MONITORING_WINDOW <duration>                  # post-deploy observation window (telemetry)
    NBVE_WINDOW <duration>                        # shadow-mode duration before promotion (Phase 5e)
    APPROVAL_AUTHORITY <identity>                 # single signer (1-of-1)
    APPROVAL_AUTHORITY [<id>, <id>, ...]          # multi-signer (N-of-N parallel, any order)
    APPROVAL_AUTHORITY ORDERED [<id>, <id>, ...]  # multi-signer (N-of-N sequential)
  }

  ANDON_RESPONDER <reasoner_name>                 # reactive: invoked when andon fires
  IMPROVEMENT_REASONER <reasoner_name>            # proactive: scheduled via REASONER's SCHEDULE
  LEDGER <ledger_name>                            # routes audit entries to a named log
}

# ── MODULE bindings (Phase 11.8) ──────────────────────────────────────────
MODULE <name> {
  EXPECTS_MATCH true                              # no rule match → andon pull (no_rule_match)
  MUTATION_POLICY <policy_name>                   # which policy authorises AI fixes here
  RULES [<rule_name>, <rule_name>, ...]           # shared rule library refs (top-level RULEs)
  # …plus existing fields: DESCRIPTION, ACTIVATE_WHEN, PATTERN, RULE inline, etc.
}

# ── RULE binding (Phase 11.8) ─────────────────────────────────────────────
RULE <name> {
  WHEN <condition>
  THEN <action>
  PRIORITY <n>
  MUTATION_TIER <n>                               # which tier within the bound policy governs edits
  # …existing fields
}
```

The parser captures all of this today; the generators emit the runtime for all of it today. The only DSL field still without live execution wiring is the per-event observation feed for NBVE shadow mode — covered below.

---

## What's still open (and honest about it)

The substrate is complete for every DSL declaration. Two areas have substrate-only support:

### 1. NBVE shadow execution (substrate complete, execution path is "bring your own dual-router")

Phase 5d + 5e ship the full lifecycle: a tier with `NBVE_WINDOW` set causes `execute_proposal_sandbox` to enter `shadow_evaluating` status instead of auto-deploying; a `mutation_shadow_evaluations` row tracks the window; a background poller closes the window on cadence and transitions the proposal to deployed / rejected / escalated based on SPC.

What's NOT automatic: the actual dual-execution of the mutated rule set alongside production. The reason is honest — applying a free-form `mutation_content` JSON blob to a live rule graph requires an interpreter for each mutation kind (add_rule, adjust_threshold, bypass_rule, etc.), and that interpreter is currently the consumer's responsibility.

The provided integration point is `evaluateWithShadow<TIn, TOut>(target, input, prodFn, shadowFn, options?)`. The consumer's expert-system code wraps its evaluations:

```typescript
function classifyAlert(alert: Alert): Classification {
  return evaluateWithShadow(
    'alert_classification',
    alert,
    (input) => productionClassifier(input),
    (input, mutationContent) => applyMutationAndClassify(input, mutationContent),
  );
}
```

Production always runs first; if no shadow is active (zero overhead), `prodFn`'s result is returned. If a proposal is in `shadow_evaluating` targeting `alert_classification`, the shadow function runs too, the diff is computed (JSON deep-equal by default; custom `equals` supported), and `recordShadowObservation` is called per event. The poller does the rest.

A future phase could ship a canonical mutation interpreter for a handful of kinds (add_rule, adjust_threshold, disable_rule, add_catchall_rule). For now, the architecture is honest: the dual-router is your problem; everything else is wired.

### 2. External ledger sinks beyond file-system

Phase 7b ships a file-system sink (opt-in via `AGICORE_LEDGER_SINK_PATH` env var, one `.jsonl` per ledger_name, per-write fsync). S3, IPFS, Postgres, and other off-host destinations are not yet templated. They are mechanical extensions of the same pattern — `maybe_append_to_sink` could become a sink-trait with multiple implementations — but that work is deferred.

The file-system sink is sufficient for the canonical "rsync to a write-only mount" or "cron-to-S3 from local jsonl" patterns that most compliance frameworks accept.

---

## File map

If you want to read the actual code:

```
core/parser/src/
  lexer.ts                  # MUTATION_POLICY, EXPECTS_MATCH, ORDERED, MUTATION_TIER, etc tokens
  parser.ts                 # parseMutationPolicy, parseModule (with new bindings), parseRule (with mutationTier), ORDERED branch
  types.ts                  # MutationPolicyDecl, MutationTierDecl, ModuleDecl extensions

core/compiler/src/
  generators/
    mutations.ts            # proposal lifecycle, tier verifier, sandbox, deploy/escalate/shadow branching, ledger hooks
    responder.ts            # respond_to_andon (stub) + respondToAndonWithAI (TS orchestration over send_chat)
    improver.ts             # run_improvement_cycle (stub) + runImprovementCycleWithAI + scheduler
    approvals.ts            # approval_requests, AuthoritySet, multi-signer + ordered aggregation
    ledger.ts               # mutation_ledger hash chain, integrity verifier, FS sink
    shadow_eval.ts          # mutation_shadow_evaluations + observations, SPC gate, finalizer poller, evaluateWithShadow
    mutation_console.ts     # MutationConsole React component (5 tabs)
    workflow.ts             # andon_events table + emit_andon_event + pull_module_andon
    rust.ts                 # main.rs wiring (module declarations, invoke_handler registration, background spawns)
  validators/
    validate.ts             # MODULE binding warnings, EXPECTS_MATCH+runtime check, RULES dangling ref, MUTATION_TIER scope check

apps/andon/                 # The "what an Andon Loop application looks like" reference (forward-references some
                            # parser features still in progress — see DEMO.md in that dir for what's runnable today)

Idea Factory/
  andon_loop_architecture.md                     # The design rationale that drove the 17 phases
  agicore_continual_harness_architecture_blueprint.md  # The superseded blueprint, preserved for design context
```

---

## TL;DR

If you take one thing from this document:

The continual-harness conversation has been stuck for a few years on the wrong question. "How do we govern AI that runs in the loop?" is a question with bad answers — every layer you add is more operational burden, and none of them give you mechanical safety guarantees. The right question is **"where does AI need to be?"** and the answer that produces a clean architecture is **at the edit boundary, never at runtime**.

The Andon Loop is that answer wired end-to-end: AI proposes at the edit boundary; a deterministic expert system runs at runtime; failures pull an andon cord that invokes AI to propose a fix; the fix flows through a tier verifier (mechanical scope check), a sandbox (regression suite), an optional shadow window (SPC against live traffic), and an optional ordered N-of-M approval chain before it touches production; every transition is on a hash-chained tamper-evident ledger.

Continual self-improvement. Zero runtime nondeterminism. AI cannot bypass the gates.
