# Andon

**The AI ops system that knows when to pull the cord.**

Andon is the reference application for the [Andon Loop architecture](../../Idea%20Factory/andon_loop_architecture.md). It demonstrates AI-authored deterministic incident response with self-improving runbooks — built specifically to be the canary that drives the Phase 11 framework work, and built to be the product story Agicore takes to enterprise buyers.

```
Pokemon-equivalent in cognitive complexity. Pokemon-opposite in seriousness.
```

---

## What Andon does

Replaces the routine 70% of your on-call workload with a deterministic expert system that the AI authored at build time and continuously refines via the Andon Loop pattern:

- **Build time:** AI sits with your SRE lead, ingests service inventory + incident history + runbook patterns, generates the initial `.agi` source (rules + workflows + diagnostics + responses).
- **Runtime:** Alerts arrive, deterministic rules classify, runbooks execute. Every action logged. Zero LLM in the runtime decision path.
- **Andon pull:** When a novel alert pattern arrives that doesn't match any rule, the workflow halts at a checkpoint. The AI is consulted, proposes a deterministic mutation (new rule, new runbook, or modified existing one), the mutation is verified mechanically against the failure case + a regression suite, then deployed with full audit trail.
- **Improvement loop:** Weekly, the AI reviews execution logs against declared success metrics (MTTR, false page rate, runbook success rate). Proposes efficiency mutations that NBVE-shadow-test against production for a tier-determined window before promotion.
- **Memory of past failures:** Rejected mutation proposals are logged. The AI doesn't get to repeat its own dead ends.
- **Mutation tier system:** T1 threshold tuning auto-deploys after test. T2 rule additions auto-deploy after monitoring window. T3 rule modifications need NBVE shadow proof. T4 structural changes need human approval. T5 architectural changes need governance sign-off. **The AI cannot expand its own authorization scope.**

For the day-by-day narrative showing every capability in action across 30 days of simulated operations, see [`DEMO.md`](DEMO.md).

For the architectural design this implements, see [`Idea Factory/andon_loop_architecture.md`](../../Idea%20Factory/andon_loop_architecture.md).

---

## Why this exists (the product thesis)

Every modern company runs some version of NOC operations. The market spends ~$10B/year on it (Datadog $30B mkt cap, PagerDuty $1.5B, Splunk $28B before acquisition). Most of that spend goes to:

1. **Detection** — monitoring catches the problem (Datadog/Prometheus territory)
2. **Routing** — paging gets the right human (PagerDuty territory)
3. **Investigation** — humans figure out what's happening
4. **Resolution** — humans take action
5. **Postmortem** — humans write up what happened
6. **Improvement** — humans (rarely) update runbooks

Steps 3-6 are where every company hemorrhages money and burns out engineers. The standard "AI for ops" pitch is: replace step 3 with an AI agent that investigates. That pitch fails for an unsexy reason — **putting an LLM between an alert and a production database in a regulated environment is a non-starter for the CISO who actually approves the budget.**

Andon is the inverted pitch. The LLM never decides what to do at runtime. It builds the system that decides, and refines that system over time, with mechanical verification at every change. **The runtime is auditable. The change history is signed. The decision path is mechanical.** That's the version a CISO can defend in an audit.

The target buyer: mid-sized e-commerce or SaaS platform, 50-500 services, SRE team of 2-10, currently paying $100k-$500k/year for incident response tooling + on-call hardship pay + occasional outsourced NOC. Andon replaces the human-cost portion of that stack — not the detection or the deep investigation, just the **mechanical 70% of "this is the routine alert we've seen 200 times before."**

---

## What's in this directory

| File | Purpose |
|---|---|
| [`andon.agi`](andon.agi) | The DSL source. 600+ lines covering entities, rules, runbooks, workflows, mutation policy, success metrics, seeded service topology. Mostly uses existing Agicore primitives; sections requiring Phase 11 DSL extensions are commented with `@phase11` markers. |
| [`DEMO.md`](DEMO.md) | 30-day demo narrative showing every Andon Loop capability at least once. Walks through normal operation, first andon pull, AI mutation proposal + test + deploy, improvement loop with NBVE shadow, memory-of-past-failures rejection, T4 human approval, audit-trail demonstration for SOC 2. |
| [`README.md`](README.md) | You are here. |

---

## Current build status

**The `andon.agi` source in this directory is a design specification, not currently-compilable source.** It uses Phase 11 (Andon Loop) DSL extensions that don't yet exist in Agicore v1.0. The file shows what the AI WILL author once Phase 11 ships — and it serves as the canary that drives Phase 11 implementation, per the [`EVOLVING.md`](../../EVOLVING.md) methodology.

Trying to half-parse it against the current compiler would mislead more than it clarifies. The file shows the full architectural intent; the framework catches up to it.

**Phase 11 DSL surface required to make this file compile cleanly:**

| New surface | Where it's used in this app |
|---|---|
| `ANDON_ON <category>` field | On RULE (no-match), STAGES (guard fail), ACTION (error variant), SCORE (threshold breach), WORKFLOW STEP (timeout) |
| `ROLLBACK_BOUNDARY internal \| external \| irreversible` | On WORKFLOW STEP — declares rollback envelope |
| `COMPENSATING_ACTION <action_name>` | On WORKFLOW STEP with external boundary |
| `ON_ANDON_ESCALATE human \| reasoner_name` | On WORKFLOW STEP with irreversible boundary |
| `SUCCESS_METRIC <score_name>` | On WORKFLOW — declares the AI-defined success criterion |
| `TIMEOUT <duration>` | On WORKFLOW — andon trigger when exceeded |
| `EXPECTS_MATCH true` | On MODULE — marks the module as "no-match pulls andon" |
| `MUTATION_TIER <n>` | On RULE (and other declarations) — gates AI's authority |
| `THEN ANDON` action variant | On SCORE THRESHOLD — replaces dispatch with andon pull |
| `MUTATION_POLICY` declaration | New top-level — defines tier system + auto-deploy policy + verification gates |
| `ANDON_RESPONDER` REASONER pattern | Conventional input/output schema for andon-response REASONERs |
| `IMPROVEMENT_REASONER` REASONER pattern | Conventional input/output schema for scheduled improvement REASONERs |
| NBVE extension for rule/workflow variants | Existing NBVE infrastructure extended beyond model variants |
| Auto-generated MutationLedger + AndonEvent infrastructure | Compiler emits the table, the queue, and the regression-suite collector |

**Implementation roadmap:** The 6-phase plan in the architecture doc lays out ~12 sprints to land the full Andon Loop. Phase 1 (telemetry + checkpoint infrastructure) is the smallest and unlocks the rest. The Andon app fully runs once all 6 phases ship.

---

## The framework gaps Andon surfaces (per EVOLVING.md)

Following the operational-pressure-drives-framework methodology:

1. **`ANDON_ON` semantics on declarations.** Need a way to declare "this RULE / STAGES transition / ACTION pulls the andon when its expected condition isn't met." Currently the only failure surface is `OUTPUT result: T1 | error` union, which is too coarse.

2. **Workflow checkpoint + rollback boundary declaration.** `ROLLBACK_BOUNDARY internal | external | irreversible` with `COMPENSATING_ACTION` for the external case and `ON_ANDON_ESCALATE` for the irreversible case. The Phase 1 telemetry + checkpoint infrastructure makes this possible.

3. **`SUCCESS_METRIC` field on WORKFLOW pointing to a SCORE.** Makes the AI's "what does good look like" declaration first-class and queryable by the improvement loop.

4. **`MUTATION_POLICY` declaration** with TIER blocks defining scope + auto-deploy + verification requirements per tier. Anchors the AI's authorization scope mechanically.

5. **`EXPECTS_MATCH true` on MODULE.** Marks a module as one where "no rule matched" is an andon, not a no-op. Default for current rules engine is silent no-match.

6. **NBVE extension for non-AI variants.** Currently NBVE compares model variants for AI actions. Andon needs the same shadow-testing pattern for rule/workflow variants. The infrastructure largely exists; the DSL surface needs extending.

7. **`MutationLedger` auto-generated entity** with associated infrastructure (sandbox executor, regression suite collector, deterministic test harness). Substantial runtime work but well-scoped.

8. **`ANDON_RESPONDER` + `IMPROVEMENT_REASONER` REASONER patterns** — specialized REASONERs with conventional input/output schemas. Mostly a documentation + codegen pattern rather than new primitives.

All eight of these are tracked in the architecture doc's 6-phase implementation plan. Andon is the existence proof that the gaps are real and the proposed primitives close them.

---

## Quick reference: what makes Andon a credible demo

| Property | What it demonstrates | Why it matters |
|---|---|---|
| Equal complexity to "AI plays Pokemon" | Multi-step decisions under uncertainty, novel-situation handling, long-horizon optimization | Architecture is non-trivial |
| Pokemon-opposite seriousness | Every viewer's company runs this; nobody's company runs Pokemon | Demo target is the actual buyer |
| Zero LLM at runtime decision path | Architecture's strongest invariant | The CISO can sign the contract |
| Mechanical audit chain per change | Every mutation signed, tested, dated | SOC 2 + ISO 27001 + auditor sleep well |
| AI cannot expand own authorization | T5 governance on MUTATION_POLICY | The WOPR problem doesn't apply |
| Cost-efficient AI use | LLM fires only on andon (rare) + scheduled improvement (weekly) | Predictable + low spend |
| Demonstrable on a laptop | Synthetic alert stream, seeded scenarios, all scripted | Sales demo doesn't need a customer cluster |
| Sells against PagerDuty/Datadog without competing | Andon sits ABOVE detection (PagerDuty notifies → Andon resolves) | Partnership story, not displacement story |

---

## A note on naming

Andon (行灯) is the Japanese for "lantern" — in TPS context, the andon cord lets any factory operator halt the production line when they detect a defect. The defect gets human attention before more defective parts get produced. Toyota's quality discipline is built on the andon principle: surface problems explicitly, stop the line, fix the system.

Applying the same discipline to AI ops: when the deterministic system can't decisively handle a situation, it stops — the andon pulls. The AI (the experienced operator) is summoned. The fix becomes part of the system going forward. No defective decisions get produced while the diagnosis happens.

This is what Toyota would have built if Toyota built incident response platforms.

---

## License

MIT. Part of the [Agicore](https://github.com/Binary-Blender/agicore) framework. See top-level [`LICENSE`](../../LICENSE).
