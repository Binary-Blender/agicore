# Andon — 30-Day Demo Narrative

A walk-through of the Andon ops system from day 1 (initial AI-authored expert system goes live) through day 30 (system has self-improved measurably, with full audit trail of every change).

The demo is designed to show every architectural capability at least once:

1. **Build time** — AI authors the initial rule set + runbooks
2. **Runtime** — alerts handled deterministically; every action audited
3. **Andon pull** — novel alert pattern surfaces; system halts at checkpoint
4. **Mutation proposal** — AI proposes a fix; deterministic verification gate
5. **Memory of past andons** — repeat failure attempt auto-rejected without test
6. **Improvement loop** — efficiency mutation via NBVE shadow testing
7. **High-tier mutation** — structural change requires human approval
8. **Audit trail demonstration** — query the full provenance of any decision

The demo runs against a synthetic alert stream replaying realistic monitoring traffic from a mid-sized e-commerce platform (13 services, mixed criticality).

---

## Day 0 — Build time

**Operator:** Acme Commerce, $80M GMV/year, 220-employee engineering org, 4-person SRE team. Currently paying $180k/year for Datadog + PagerDuty + an on-call rotation that gets paged 40-60 times a month. About 70% of pages are routine (CPU pressure, disk full, slow queries) — patterns that have been resolved the same way for years.

**Setup:** Acme's SRE lead spends 4 hours with the Andon AI authoring system. The AI walks through:

- Service inventory (the 13 services from `SEED Service`)
- Common failure modes per service (drawn from PagerDuty incident history)
- Existing runbook patterns (the team's wiki + tribal knowledge)
- Success metrics that matter to leadership (MTTR, false page rate, escalation rate)
- Authorization boundaries (what can the system change without human approval)

**Output:** The AI generates `andon.agi` — initial expert system with:
- 12 classification rules covering the top alert categories
- 8 runbooks (one per category) using the team's existing diagnostic + response patterns
- 4 success metrics (MTTR, false pages, novel alert rate, runbook success rate)
- A mutation policy with T1-T2 auto-deploy, T3 shadow-test, T4-T5 human approval

The SRE lead reviews, suggests two changes (the database connection runbook should page-first because of past 3 AM incidents; cert rotation should escalate to security team for production hosts), and signs off.

System goes live at 09:00 Monday morning.

---

## Day 1 — First routine alert

**Time:** 09:14 Monday

**Alert arrives:** Datadog detects CPU usage at 89% on `web-frontend` for 5 minutes. Severity: warning.

**Runtime trace** (all deterministic, all logged):

```
09:14:02  Alert received: external_id=ddg-9942, source=datadog, payload={metric:cpu_usage, value:89, ...}
09:14:02  Classification rule eval: RULE classify_cpu_pressure matched
09:14:02  Alert.category = "cpu_pressure"
09:14:02  Dispatched to runbook_cpu_pressure (rb-cpu v1)
09:14:03  Step 1: diagnose_recent_deploy → result: {recent_deploy: true, deploy_id: "d-44721", deployed_at: "2026-09-21T08:47:00Z"}
09:14:03  Step 2: diagnose_resource_consumer → result: {top_consumer_process: "node web-frontend", consumption_pct: 89.2}
09:14:04  Step 3: diagnose_traffic_pattern → result: {traffic_multiplier: 1.04, geographic_anomaly: false}
09:14:04  Step 4: evaluate_cpu_response → plan: {action: "rollback_deploy", reason: "recent deploy is most likely cause; traffic normal"}
09:14:04  Step 5: execute_cpu_response → executing rollback_deploy(deploy_id=d-44721)
09:14:31  Rollback complete. New version deployed at 09:14:30Z.
09:14:32  Step 6: monitor_post_action → result: {cpu_usage: 67%, recovered: true, monitored_window: 5m}
09:19:32  Step 7: close_alert → outcome: resolved, resolution_note: "Rolled back d-44721 → CPU returned to baseline"
09:19:32  Alert.state = "resolved"
09:19:32  Alert.resolution_at = 09:19:32, outcome = "resolved_by_runbook"
```

**MTTR for this incident:** 5m 30s. **Pages issued:** 0. **Human time consumed:** 0.

The SRE on-call (Alex) sees this in their dashboard as a single line: "09:14 → 09:19 cpu_pressure on web-frontend → resolved (rollback of d-44721)". They don't need to act on it.

---

## Days 1-10 — Routine operation

Over the first 10 days, the system handles 412 alerts:
- 387 (94%) handled deterministically via the 8 initial runbooks
- 18 (4%) handled by runbooks but escalated to human after diagnosis (genuinely ambiguous cases)
- 7 (2%) pulled andon (no rule matched)

**Page count:** 18 (vs. 47 in the same period the prior month — a 62% reduction).
**MTTR:** Median 4m 12s (vs. 47m the prior month — yes, 47 minutes; the prior baseline included human escalation latency).
**False positive paging:** 2 (vs. 14 prior — the deterministic rules don't page unless their runbook actually finishes with a "needs-human" outcome).

The CFO notices the change in the on-call satisfaction survey before noticing it in the metrics. Engineers are sleeping through the night.

---

## Day 12 — First andon pull

**Time:** 03:47 Wednesday (yes, 3 AM — but no human gets paged)

**Alert arrives:** A custom monitoring script Acme uses for their RabbitMQ instance reports: `{"metric":"consumer_lag_growth_rate","value":"+12%","service":"rabbitmq"}`.

**Classification attempts:**
- RULE classify_queue_backup: condition checks for `queue_depth` in payload — payload contains `consumer_lag_growth_rate`, not `queue_depth`. No match.
- All 11 other rules: no match.

**Andon pulls.** `alert_classification_rules` has `EXPECTS_MATCH true`. The workflow halts at the classification step. No runbook dispatched.

**AndonEvent created:**
```json
{
  "failure_category": "no_rule_matched",
  "alert_id": "ddg-10421",
  "workflow_name": "handle_alert",
  "workflow_step": "classify",
  "captured_state": {
    "alert": { ...full alert payload... },
    "tried_rules": [12 rule names with match=false],
  },
  "activity_log": [recent classification + runbook execution events],
  "fired_at": "2026-10-03T03:47:14Z"
}
```

Signal published to `andon_queue`. `andon_responder` REASONER (TIER 2 — Sonnet 4) fires.

**AI proposes:**

```
Mutation: ADD RULE classify_consumer_lag_growth
WHEN     Alert.raw_payload CONTAINS "consumer_lag_growth_rate"
AND      Alert.severity != "info"
THEN     classify_as_queue_backup
PRIORITY 85
MUTATION_TIER 2

Rationale: This pattern is a queue backup expressed as a derivative
metric (growth rate) rather than a steady-state metric (depth). It
should route to the existing queue_backup runbook, which handles
both the cause (consumer processing slow) and the response (scale
consumers or drain producers).
```

**Tier verification:** Proposal scope is RULE_add → confirms T2. Pass.

**Deterministic test:**
1. Apply candidate rule to sandbox copy of `alert_classification_rules` module
2. Replay the andon-triggering alert → classification now matches `classify_consumer_lag_growth` → routes to `runbook_queue_backup`. Resolves.
3. Run regression suite (last 412 alerts) → 411 unchanged classifications, 1 affected (a similar `consumer_lag` test alert from day 8 that was previously also no-matched and escalated to human; now also classifies as queue_backup). Manual review of that case confirms the new classification would have been correct.
4. **Test passes.**

**Deploy:** Mutation `mut_2026-10-03_001` deployed at 03:47:51 UTC. Approval: auto (T2 + test pass per `ops_mutation_policy`). Audit entry:

```
mutation_id: mut_2026-10-03_001
proposed_by: andon_responder (IdentityName: system_responder_v1)
triggered_by: andon_event_2026-10-03_001 (alert ddg-10421)
tier: 2
change: ADD RULE classify_consumer_lag_growth in MODULE alert_classification_rules
test_evidence: {failure_resolved: true, regression: 411 unchanged + 1 improved}
approval: auto (T2 + deterministic test pass + 24h monitoring window starting)
deployed_at: 2026-10-03T03:47:51Z
```

**Workflow resumes.** The halted alert workflow re-classifies under the new rule, dispatches to `runbook_queue_backup`, executes 4 diagnostic + response steps in 6 minutes. Queue depth back to baseline. Alert resolved.

**Total time from alert receipt to resolution:** 9 minutes 12 seconds. Of that, 37 seconds was the AI proposal + verification + deploy.

**No human paged. Page count for the week so far:** still 18.

When Alex logs in at 8 AM, they see: "1 andon last night, auto-resolved via new rule deployment. Review the new rule? [yes/no]". Alex reviews, approves the audit. Moves on with their day.

---

## Day 14 — Improvement loop runs (first time)

**Time:** Sunday 23:00 (scheduled weekly review)

**`efficiency_review` REASONER fires** (TIER 3 — Opus 4.7 for higher-quality analysis).

**Input:** Past 14 days of runbook execution data (587 executions across all 9 runbooks now including the new consumer_lag rule).

**Analysis (excerpt from REASONER output):**

> "Review of `runbook_cpu_pressure` (197 executions, 100% success rate): in 184/197 executions, the diagnostic sequence ran all 3 diagnose steps (deploy, consumer, traffic) before reaching the decision step. In 178/184 of those, the recent_deploy check returned `true` AND the response plan was 'rollback_deploy' — the other two diagnoses didn't affect the plan. Recommendation: short-circuit when `diagnose_recent_deploy` returns true, skip directly to plan='rollback_deploy'. Expected impact: median MTTR for cpu_pressure drops from 5m 30s to 3m 45s (-32%). No safety implication (the other diagnoses were informational, not load-bearing for this branch)."

**EfficiencyProposal:**
```
source_metric: mttr_score (cpu_pressure subset)
baseline: 330 seconds median
target: 225 seconds median
candidate_change: MODIFY WORKFLOW runbook_cpu_pressure
  ADD CONDITIONAL after diagnose_recent_deploy:
    IF result.recent_deploy = true AND result.deployed_at > now() - 1h
    THEN skip [diagnose_consumer, diagnose_traffic] → execute plan="rollback_deploy"
```

**Tier verification:** Scope = WORKFLOW_modify_step_sequence → T3. Requires NBVE shadow test (per ops_mutation_policy).

**NBVE shadow starts:** The candidate workflow runs in parallel with production. Every cpu_pressure alert from this point forward goes through BOTH the production v1 and the candidate v2. Their outputs are compared; only v1's output is actually executed.

---

## Day 19 — Improvement loop NBVE shadow result

**Time:** Friday 23:00 (5 days into 7-day shadow window — early-promotion threshold met)

**NBVE shadow results (5 days, 71 cpu_pressure alerts):**
- v1 (production): median MTTR 332s
- v2 (candidate): median MTTR 218s
- Output divergence: 0 cases where v1 and v2 reached different actions. In all 71 cases, both reached the same plan (rollback_deploy in 64 cases, other plans in 7).
- Quality difference: v2 saved median 114 seconds per cpu_pressure incident with zero behavioral divergence.

**Early-promotion criterion met** (5+ days of clean shadow data, no divergence, clear MTTR improvement).

**EfficiencyProposal promoted to MutationProposal:**

```
mutation_id: mut_2026-10-10_001
proposed_by: efficiency_review (IdentityName: system_improvement_v1)
triggered_by: efficiency_review_2026-10-03 (scheduled review)
tier: 3
change: MODIFY WORKFLOW runbook_cpu_pressure (new short-circuit branch)
test_evidence: {nbve_shadow: 5d / 71 cases / 0 divergence / 34% MTTR reduction}
approval: auto (T3 + shadow window + improvement target met per ops_mutation_policy)
deployed_at: 2026-10-10T23:14:00Z
```

**Production switches to v2.** All subsequent cpu_pressure alerts use the streamlined workflow. v1 retired (kept in version history for rollback).

---

## Day 21 — Andon: memory of past failures in action

**Time:** Tuesday 14:33

**Alert arrives:** `{"metric":"replica_lag_seconds","value":47,"service":"postgres-replica"}`. The RULE `classify_replication_lag` matches but the runbook for replication lag doesn't exist yet (this is a placeholder category from day 0 that hadn't yet seen real alerts).

**Andon pulls** at the dispatch step (`dispatch_to_runbook` can't find a runbook for category `replication_lag`).

**AI proposes:** A new runbook `runbook_replication_lag` with steps: diagnose_replication_health → identify_root_cause → if-network-issue → escalate, if-write-pressure → throttle_writes_temporarily.

The proposal is T3 (new WORKFLOW addition for a category, plus a new ACTION `throttle_writes_temporarily`). Wait — adding a new ACTION is T4 (signature change in the system). The AI under-declared.

**Tier verifier rejects:** "Proposal declared T3 but scope includes ACTION addition (`throttle_writes_temporarily`), which is T4. Re-propose at the correct tier."

**AI re-proposes:** Same content, declared T4. T4 requires human approval per `ops_mutation_policy`. Routed to `incident_escalation` channel.

**Alex (on-call) gets a notification:** "T4 mutation proposed for replication_lag handling. Review required. Andon halted at 14:33; alert is awaiting your decision."

**Alex reviews** the proposal in the UI:
- The proposed runbook (5 steps)
- The proposed new ACTION (throttle_writes_temporarily)
- The captured failure case (alert ddg-10889)
- The test plan if approved

Alex approves with a minor modification (the throttle should be bounded at 30 seconds max). The modification is recorded in the approval chain. Mutation deploys with full provenance. Workflow resumes; new runbook handles the alert; replication catches up.

**Total human time consumed:** 6 minutes (Alex's review). Compare to the prior baseline where Alex would have gotten paged, woken up, investigated for 30+ minutes, and then either written a postmortem or filed a wiki update that nobody would read.

---

## Day 24 — Repeat andon (memory of dead ends)

**Time:** Friday 19:22

**Alert arrives:** A weird signal from a third-party CDN about cache-poisoning suspicion. No rule matches.

**Andon pulls.** `andon_responder` proposes: `ADD RULE classify_cdn_cache_poisoning WHEN Alert.source = "cloudflare" AND Alert.raw_payload CONTAINS "poisoning_suspect" THEN classify_as_security_event`.

**Issue:** Two weeks ago (day 10), an almost-identical proposal was rejected because:
1. The proposed action `classify_as_security_event` didn't exist
2. The proposal under-declared as T2 (rule addition) but actually required an ACTION addition (T4)

The MutationLedger has this rejection logged. The current proposal's failure_pattern matches the rejected one's failure_pattern (same alert source, similar payload signature).

**Auto-rejection without test:** "Proposed mutation matches rejected pattern from mut_2026-09-26_007. The rejected proposal failed deterministic verification because classify_as_security_event ACTION does not exist. To resolve this andon, either: (a) propose a different routing using an existing classification action, or (b) escalate to T4 with the new ACTION declared. Do not re-propose the same fix."

**AI proposes alternative:** Route to existing `runbook_dependency_failure` since "third-party CDN failing in unusual way" is structurally similar. Deterministic test: alert resolves (the runbook checks dependency health, identifies CDN, drains traffic to alternate CDN provider already configured in the dependency-failure runbook). Test passes. Auto-deploy.

**The audit story for the CISO:**
> "The system recognized that a previously-rejected proposal was being suggested again, refused to retest it, and produced a working alternative. The AI doesn't get to rediscover its own dead ends — that's a system-enforced property."

---

## Day 28 — Improvement loop: cross-runbook pattern

**Time:** Sunday 23:00 (weekly review)

**`efficiency_review` REASONER notices:**

> "Across 312 runbook executions this week, runbooks `runbook_cpu_pressure`, `runbook_memory_pressure`, and `runbook_latency_spike` all execute `diagnose_recent_deploy` as their first step. In 67% of cases (208/312), the recent_deploy check returns true and a rollback is the eventual action. Currently each runbook re-runs the same diagnose_recent_deploy independently.
>
> Proposed efficiency: introduce a shared `pre_runbook_deploy_check` that runs BEFORE classification dispatch. If a recent deploy is detected AND the alert is performance-related (cpu/memory/latency/error_rate), short-circuit to a single `runbook_recent_deploy_rollback` rather than running the full runbook for each. Expected impact: 35% MTTR reduction across performance-category alerts; 22% reduction in total runbook execution time; eliminate ~9 redundant diagnose_recent_deploy calls per day.
>
> Risk: short-circuit must NOT apply to alerts where the deploy happened > 1h before the alert (those are usually unrelated). Conservative thresholds in the proposal."

**Tier check:** Adding a new pre-classification step + new runbook + modifying 4 existing runbooks → T4. Requires human approval.

Routed to ops_lead. Alex reviews + approves with the addition of an explicit "if rollback would affect a service in the critical_security_path, page on-call instead of auto-rollback." Mutation deploys after NBVE 14-day shadow window passes.

---

## Day 30 — Summary

**Total alerts in 30 days:** 1,847
**Distribution:**
- 1,612 (87%) resolved by runbook autonomously
- 122 (7%) resolved by runbook with informational human notification
- 96 (5%) escalated to on-call (genuinely needed human judgment)
- 17 (1%) pulled andon — all 17 now have rules that handle the pattern going forward

**Pages issued:** 21 (was 47 in pre-Andon baseline — a 55% reduction)

**MTTR:**
- Median: 3m 14s (was 47m)
- p95: 18m (was 4h 22m)

**On-call satisfaction (anonymous survey):**
- Before Andon: 4.1 / 10 ("constantly paged, half the pages were nothing")
- After Andon: 8.7 / 10 ("paged only when it's real; deterministic system handles routine")

**Cost:**
- AI API spend over 30 days: $47 (the AI fires only on andon + weekly improvement reviews, not on every alert)
- Andon SaaS license: $24k/year for this org size
- Net savings: replaced one outsourced NOC contract ($240k/year), reduced PagerDuty tier (saved $40k/year), reduced on-call hardship pay (saved $80k/year)

**Mutations applied over 30 days:**
- 12 T1 threshold tunings (auto)
- 23 T2 rule additions from andon responses (auto after test)
- 8 T3 rule/workflow modifications from improvement loop (auto after NBVE shadow)
- 4 T4 structural changes (human-approved)
- 0 T5 architectural changes (none proposed yet — system hasn't needed to reshape its own foundation)

**Audit trail demonstration:** The CISO requests evidence for an SOC 2 audit. The query "show me every change made to the alert handling system in the past 30 days, with rationale and approval chain" returns a structured report in 4 seconds. Every line traces to a signed proposal + deterministic test results + approval chain + deployment timestamp + post-deployment effectiveness measurement.

The auditor asks: "How does the system decide what to do with a [specific alert type]?" The Andon Mutation Ledger Browser shows the current rule, when it was deployed, who proposed it (the AI, with cryptographic signature), what test cases it passed, what regression suite it ran against, and what its post-deploy effectiveness has been.

The auditor finds nothing to flag.

---

## The closing line

The Andon system makes ops-engineering boring. The 3 AM page culture that defines SRE life ends not because AI got smart, but because AI got out of the way at runtime — leaving a deterministic system that learns at edit time. Every change to the system is testable. Every decision the system makes is traceable. Every dead end the AI hits is remembered.

This is the kind of demo that makes a CISO smile and a developer relax. The Pokemon people can have their tournaments.

---

*This is a designed demo narrative. The Andon Loop DSL extensions required to fully execute it are specified in `Idea Factory/andon_loop_architecture.md` and not yet implemented (Phase 11). Once implemented, the demo plays as written.*
