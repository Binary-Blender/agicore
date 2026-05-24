# Chapter 12: The Cooperative Intelligence Layer

The Application Layer gives you data, the Orchestration Layer gives you flow, and the Expert System Layer gives you policy. None of them, by themselves, answer the question that arrives the moment a real organization deploys AI at scale: which model handles this request, and under whose authority, and with what consequence if it errs. The answer is not a single decision but a coordinated set of decisions about routing, capability exposure, periodic analysis, lifecycle promotion, role tiering, escalation, and consensus. The Cooperative Intelligence Layer is the substrate that makes those decisions declarative rather than ad hoc. Its ten declarations — `ROUTER`, `SKILL`, `SKILLDOC`, `REASONER`, `TRIGGER`, `LIFECYCLE`, `BREED`, `COGNITION_ROLE`, `ESCALATION_CHAIN`, `QC_MESH` — are the layer in which the Cattle Dog Principle of Cognition Systems Engineering (CSE Ch 7) finds its declarative form. Humans retain authority. AI provides capability under explicit constraint. The DSL records both.

The reader who has internalized CSE will recognize the inheritance immediately. The Cattle Dog Principle holds that an AI agent is most useful in the same posture as a working dog on a Border Collie's stockwork run: high capability, narrow tasking, deferring to the handler at every decision boundary that matters. The principle is not a sentimental gesture toward human dignity; it is an operational claim about where capability and authority should meet. Where AI's pattern-completion is asymmetrically powerful, place it. Where consequence is asymmetrically heavy, withhold authority. The Cooperative Intelligence Layer is the declarative vocabulary in which that placement is recorded. Every declaration in this chapter is a different aspect of the same answer.

It is worth pausing on what the layer is not. It is not a model-orchestration framework in the sense of LangChain or LangGraph — frameworks whose entire conceit is that the AI is in the runtime loop and the framework's job is to shape the AI's behavior at every call. It is not a prompt-management system in the sense of Promptfoo or LangSmith — observability stacks whose contribution is to record what happened after the AI ran free. It is the layer at which AI's relationship to authority, capability, cost, and quality is specified in advance, generated as code, and enforced by the runtime that the compiler emits. The distinction matters because the failure modes the layer prevents are the failure modes the unconstrained alternatives produce as a matter of course: capability surfaces that no one signed off on, audit trails that are best-effort, cost ramps that no one bounded, quality drops that no one noticed until the customers did.

Begin with `ROUTER` — the simplest of the ten, and the foundation on which the others rest. A real AI system in production touches multiple providers and multiple model tiers. Latency varies. Cost varies by an order of magnitude. Quality varies by task. The single-provider, single-model assumption that prevails in tutorials is incompatible with production traffic, and the consequence of designing around it is operational fragility — when the one provider degrades, the system has nowhere to go. `ROUTER` makes the multi-tier strategy explicit. Tiers are tried in order; each tier specifies its `AI_SERVICE`, its `TIMEOUT`, and its `RETRIES`; a circuit breaker prevents a degraded tier from cascading failures across the whole system.

```agi
ROUTER ChatRouter {
  TIER 1 {
    AI_SERVICE ClaudeService
    TIMEOUT 10s
    RETRIES 2
  }
  TIER 2 {
    AI_SERVICE GeminiService
    TIMEOUT 15s
    RETRIES 1
  }
  CIRCUIT_BREAKER threshold: 5, window: 60s
}
```

What this declaration generates is a Rust `Router` struct with a `route()` method, per-tier success and failure counts, and a circuit-breaker state machine that opens after five failures within a sixty-second window. When the breaker is open, the router skips that tier entirely until the window closes. The runtime cost of expressing a multi-provider AI strategy collapses to ten lines of DSL. The discipline encoded in those ten lines — degrade gracefully; do not pretend the cloud is reliable; budget timeouts explicitly — is what the runtime enforces every request.

`SKILL` formalizes the unit of AI capability. A skill is a versioned, typed, callable primitive. It declares an input schema, an output schema, and a backing implementation that is either deterministic Rust (`IMPL`) or an AI service with a prompt template. The contract is the point. When a skill is invoked, the inputs are type-checked at compile time and the outputs are validated at runtime. The skill cannot be called with the wrong arguments because the compiler will not emit code that does so. The skill cannot return malformed data because the wrapper validates the AI response against the declared `OUTPUT` schema before passing it onward.

```agi
SKILL ExtractKeywords {
  VERSION "1.0.0"
  INPUT  { text Text }
  OUTPUT { keywords [String] }
  AI_SERVICE ClaudeService
}
```

A single `SKILL` is unremarkable. Its significance emerges when several are bundled into a `SKILLDOC` — the declaration that turns a list of capabilities into a deployable, governed cognition package. `SKILLDOC` is the load-bearing concept of this chapter. It is the declaration that converts ad hoc AI consumption into infrastructure. Where `SKILL` is lightweight metadata for routing and registry, `SKILLDOC` carries provenance, governance, audit metadata, and signature attestations. It is the artifact that makes "AI assistant" a governed organizational asset rather than a session.

The governance fields are the operational point. `SIGNED_BY` records which authority signed the skill doc; `REQUIRE` lists the clearances a caller must hold to invoke any skill inside it; `EXECUTE_ONLY` whitelists permitted operations; `DISALLOW` blacklists prohibited ones; `AUDIT all_actions` causes every invocation to be logged with full context. The combination is capability-based security applied to AI — the explicit declaration of what an AI agent is permitted to do, under whose authority, in which contexts, with what evidence trail.

```agi
SKILLDOC aerospace_qc {
  DESCRIPTION "Aerospace QC inspection protocol"
  VERSION     "2.1.0"
  DOMAIN      "quality-assurance"
  PRIORITY    95
  KEYWORDS    inspection, safety, compliance, audit

  GOVERNANCE {
    SIGNED_BY    CorpAuthority
    REQUIRE      clearance_level_3, qa_certified
    EXECUTE_ONLY read_report, submit_finding
    DISALLOW     delete_record, override_finding
    AUDIT        all_actions
  }
}
```

What this declaration generates is a JSON manifest carrying the governance metadata, a TypeScript registry that the runtime queries via `matchSkillDocs(userMessage, clearance)`, an `isOperationPermitted(skillDoc, operation)` guard called before every skill invocation, and an audit log writer that records every action when `AUDIT all_actions` is present. The runtime check is mechanical: before a skill is invoked, the caller's clearances are verified against `REQUIRE`, the requested operation is checked against `EXECUTE_ONLY` (if non-empty) and `DISALLOW`, and only if all checks pass does the call proceed. A revoked authority signature invalidates every skill doc it signed. A clearance demotion takes effect at the next invocation. The system enforces governance at the boundary where governance is meaningful — at the moment of action — and it does so deterministically.

This is the Cattle Dog Principle made operational. The AI is a working agent of extraordinary capability. The handler — the authority who signed the skill doc, the clearance system that gates access, the audit log that records every action — retains directive control. The agent acts; the handler is accountable; the system proves both. A regulator tracing an AI-assisted finding traces it back through the audit log to the invoked skill, through the skill to the signed skill doc, through the signature to the authority. The chain is mechanical. The governance is not a hope about the runtime's behavior; it is a structural property of the architecture.

The contrast with the prevailing alternative is sharp. In an unconstrained agent framework, an AI given access to a tool can invoke that tool under any reasoning it generates. The framework's response to a misuse is reactive: a guardrail catches the bad output, a policy filter rejects the request, an evaluator flags the response after the fact. Each of these layers fires after the agent has decided to act and contributes additional operational burden without producing a mechanical guarantee. The `SKILLDOC` posture is structurally different. The agent does not have access to a tool; the agent has access to a skill that is part of a skill doc whose `EXECUTE_ONLY` clause whitelists the operations and whose `REQUIRE` clause gates the caller's clearance. A misuse cannot occur because the invocation cannot occur. There is no reactive layer because there is no proactive surface that needs reacting to.

`REASONER` adds the temporal dimension. Where `SKILL` is invoked on demand, `REASONER` runs on a schedule or on demand, reading from declared inputs, writing to declared outputs, executing under a chosen AI service. The two flavors that matter most are reactive (`SCHEDULE on_demand`) and proactive (`SCHEDULE weekly`, `daily`, cron expressions). The reactive form is the substrate on which the Andon Loop's `ANDON_RESPONDER` will be built in Chapter 20 — a reasoner invoked the moment the deterministic expert system pulls an andon cord. The proactive form is the substrate for the `IMPROVEMENT_REASONER` — a reasoner that wakes on schedule, reviews recent execution against a declared success metric, and proposes efficiency mutations.

```agi
REASONER weekly_kaizen {
  DESCRIPTION "Weekly review of network behavior; propose rule refinements"
  INPUT       { CHANNEL device_observations  WINDOW "7d" }
  OUTPUT      { PACKET AndonStateChange }
  SCHEDULE    weekly
}
```

The `INPUT` and `OUTPUT` blocks are the discipline. A reasoner is not a free-form AI invocation; it is a typed transformation over a windowed stream of inputs producing a structured packet output. The compiler validates that the channel exists, that the packet schema is defined, that the reasoner's prompt has access to the variables it references. At runtime, the reasoner consumes a deterministic snapshot of the input channel for the declared window, generates its analysis, validates the output against the packet schema, and emits the packet downstream. The AI's nondeterminism is bounded; the integration is mechanical.

`TRIGGER` binds reasoners and actions to events. Where a reasoner declares its schedule, a trigger declares the condition that fires a downstream effect — when a channel publishes a packet, when an entity field changes, when a score crosses a threshold. The body of a trigger is simple: `WHEN <condition> THEN FIRES <reasoner_or_action>`, with optional `RATE_LIMIT` enforcement.

```agi
TRIGGER NotifyOnEscalation {
  WHEN  SupportTicket.priority changes to "urgent"
  THEN  FIRES alert_on_call_engineer
  RATE_LIMIT 5 per 1h
}
```

The triple of `ROUTER`, `SKILL`/`SKILLDOC`, and `REASONER`/`TRIGGER` is the basic vocabulary. The next four declarations are the structural primitives that ESCALATION_CHAIN composes. `LIFECYCLE` tracks the maturation of a skill or reasoner through stages — `experimental`, `stable`, `production`, `deprecated`. It declares the metrics that promote (`uses >= 500`, `success_rate >= 0.95`, `age >= 30d`) and the metrics that demote (`success_rate < 0.90`). A daily evaluator checks the metrics, applies the transitions, and logs every change to the lifecycle ledger. The decision to advance a skill from experimental to production becomes a measured event rather than a release-meeting agenda item.

`BREED` is evolutionary A/B testing for AI capabilities. It takes a parent skill, generates a number of mutated variants (temperature jitter, prompt rephrasing, model swap), runs them in parallel shadow mode, evaluates each by a declared metric, and keeps the top `n`. The variants that lose are archived; the winners replace the parent. This is the answer Agicore gives to the question "which prompt is better?" The answer is not philosophical and is not committee-driven; it is empirical, and the empirical mechanism is declarative.

`COGNITION_ROLE` formalizes the cost-quality tradeoff. A role declares a tier (1, 2, or 3), the models it is willing to use, an SPC floor below which the role is judged inadequate for the task, the operations it handles, and the role it escalates to when its floor is breached. Junior roles use cheap models. Senior roles use premium models. Work is assigned to the cheapest viable role.

```agi
COGNITION_ROLE FrontlineSummarizer {
  TIER        1
  MODELS      ["claude-haiku-4-5", "gemini-2.5-flash"]
  SPC_FLOOR   0.85
  HANDLES     [summarize, extract_keywords]
  ESCALATE_TO SeniorSummarizer
}

COGNITION_ROLE SeniorSummarizer {
  TIER       3
  MODELS     ["claude-opus-4-7"]
  SPC_FLOOR  0.95
  HANDLES    [summarize, extract_keywords, hard_edge_case]
}
```

These three declarations — `LIFECYCLE`, `BREED`, `COGNITION_ROLE` — are the primitives. `ESCALATION_CHAIN` composes them into the runtime policy that governs which role handles which request at which moment. The chain declares an ordered list of roles, the condition that triggers escalation (typically `spc_drop`), the stability window required for de-escalation, and the cooldown that prevents flapping between tiers.

```agi
ESCALATION_CHAIN SummarizationChain {
  ROLES             [FrontlineSummarizer, MidTierSummarizer, SeniorSummarizer]
  ESCALATE_ON       spc_drop
  DE_ESCALATE_AFTER 50_runs_above_floor
  COOLDOWN          15m
}
```

What the compiler emits is a stateful escalation engine. Every task begins at the cheapest role in the chain. The engine tracks SPC for each role as work flows through. When SPC drops below the role's declared floor, the engine promotes to the next role. When the promoted role accumulates fifty consecutive runs above its floor, the engine de-escalates back to the cheaper tier. The cooldown of fifteen minutes prevents the system from flapping between tiers when quality is borderline. The result is an economic governance mechanism for AI consumption — the system pays for the cheap model when the cheap model is working, pays for the premium model only when the cheap model is failing, and notices recovery rather than committing irrevocably to the expensive tier.

This is the Cattle Dog Principle as cost discipline. The cheap, fast working agent handles most of the run. When it strains, the handler escalates to a more capable agent. When the conditions ease, the handler returns the work to the cheaper agent. The decision is structural — encoded in the chain, enforced by the runtime — not improvisational.

A note on `BREED` deserves expansion before the chapter moves to the mesh. The declaration's premise is that prompt design and model selection are empirical questions that admit empirical answers. The conventional approach to "which prompt should we ship" is meeting culture: stakeholders argue, a winner is chosen, the chosen prompt ships, and disagreement persists about whether the winner was actually the best. `BREED` replaces the meeting with measurement. Five variants run in parallel, each scored by a declared metric, the top two retained, the rest archived with their performance data attached. Over multiple generations the system discovers prompt structures that no individual reviewer would have proposed — the kind of incremental optimization that is the bread and butter of every successful A/B testing operation, here baked into the declaration vocabulary so the discipline is enforced rather than aspired to.

`QC_MESH` is the layer's implementation of Ashby's Law of Requisite Variety. CSE Ch 5 develops this point in full: the variety of possible AI outputs exceeds the discriminating power of any single quality criterion. The correct engineering response is multiple, independent quality evaluators, each covering a different dimension, with consensus or weighted aggregation across them. `QC_MESH` is the declaration that makes this discipline mechanical. It names a set of evaluator nodes — typically three, five, or more — declares an aggregation strategy (`avg`, `min`, `weighted`), optional per-node weights, and an alert threshold.

```agi
QC_MESH ContentQualityMesh {
  NODES        [SummarizerNode, ProofreaderNode, FactCheckerNode]
  AGGREGATE    weighted
  WEIGHTS      { SummarizerNode: 0.5, ProofreaderNode: 0.3, FactCheckerNode: 0.2 }
  ALERT_BELOW  0.85
}
```

The runtime emits a SQL view that joins per-node quality samples on the artifact under evaluation, computes the aggregate, and triggers alerts when the aggregate drops below the threshold. The architectural point: no single evaluator's verdict is decisive. The mesh produces a verdict that is the consensus of independent assessors, weighted to reflect their relevance. A single failing evaluator does not stop the line. A pattern of failure across the mesh does. This is precisely the multi-criterion quality control that CSE Part III prescribes — implemented as a declaration, generated as code, audited as a row in a table.

`TRIGGER`'s rate-limiting deserves a moment of treatment because it is the kind of small primitive whose absence is the source of operational pain. An unbounded trigger that fires once per entity update produces an avalanche when an entity is updated in bulk. The conventional response is a debounce in application code — a manual cooldown that the developer remembers to implement and that drifts as the trigger logic evolves. The DSL declaration makes the cooldown a property of the trigger rather than a property of the consumer, and the runtime enforces it without the consumer's cooperation. `RATE_LIMIT 5 per 1h` is not a hint; it is a hard cap that the trigger dispatcher enforces by silently dropping invocations past the threshold and logging them for review. The discipline that production systems acquire painfully over time is here baked into the declaration vocabulary.

Consider how these declarations compose in a representative production system: a customer-support pipeline serving a high-traffic retailer. Incoming tickets arrive through a CHANNEL; a `TRIGGER` fires a `ROUTER`-backed `SKILL` for initial classification; classified tickets are dispatched to an `ESCALATION_CHAIN` that begins at a Tier 1 `COGNITION_ROLE` using Haiku-class models. Most tickets — order status, return tracking, common questions — are resolved at Tier 1 in under a second at fractional cents per request. A small percentage trigger SPC drops as the cheap model struggles with ambiguous customer language; the chain escalates to Tier 2. A still smaller percentage reach Tier 3, where the premium model handles edge cases. The aggregate quality is monitored by a `QC_MESH` with three independent evaluators — semantic correctness, tone appropriateness, policy compliance — whose weighted consensus produces the per-ticket quality score. A `REASONER` runs weekly, reviewing the last seven days of escalations against a declared success metric, proposing classifier refinements that will be vetted through the Andon Loop before deployment. Every skill the customer-facing AI invokes lives inside a `SKILLDOC` signed by the customer-support authority, with `EXECUTE_ONLY` constraints that prevent any AI invocation from triggering refunds, address changes, or account closures without human approval.

A second worked example highlights how `LIFECYCLE` and `BREED` interact with the rest of the layer. A content-recommendation pipeline declares three skills — `RecommendArticles`, `RecommendVideos`, `RecommendDiscussions` — each bound to a `LIFECYCLE` that promotes after five hundred uses with a success rate above 0.95. A `BREED` declaration produces five variants of the recommendation prompts each week, shadow-evaluated against the parent, with the top two retained. As variants graduate from experimental through stable to production, the `LIFECYCLE` machinery tracks their progress; as new variants emerge from `BREED`, they enter at the experimental stage and ascend by accumulating successful invocations. The system continuously improves its recommendations without human intervention in the loop, and the audit trail records every promotion, every demotion, every variant's birth and death. The operator's role shifts from prompt-tuning meetings to ratifying the policies that govern promotion — exactly the kind of role-shift the Cattle Dog Principle predicts.

The full declaration set for this system is on the order of a hundred and fifty lines of `.agi` source. The generated runtime is approximately twelve thousand lines of Rust and TypeScript, fully wired, type-coherent, and audit-instrumented. The discipline the declarations encode — multi-tier routing with circuit breakers, capability governance with mechanical clearance checks, cost-optimized escalation with hysteresis, multi-criterion quality control with consensus aggregation, proactive analysis with deterministic verification — is exactly the discipline that CSE prescribes and that, without a declarative substrate, every team must rebuild from scratch in every project, with the inevitable shortcuts that produce the operational fragility we observe across the industry.

The combinatorics of the layer's declarations are worth pausing on. Ten declaration types do not produce ten primitives; they produce a vocabulary whose compositions yield orders of magnitude more reachable system shapes. A `ROUTER` plus an `ESCALATION_CHAIN` plus a `QC_MESH` is a different system from a `ROUTER` alone plus repeated direct invocations. A `SKILLDOC` plus a `LIFECYCLE` plus a `BREED` is a different governance posture from a hand-managed prompt registry. The vocabulary is small precisely because each primitive is composable; the system shapes the vocabulary describes are large precisely because composition multiplies expressiveness. This is the standard payoff of well-designed orthogonal language features, transplanted into the AI cooperation domain.

The reader emerging from this chapter should be able to look at any `.agi` source and predict, for each declaration in the Cooperative Intelligence Layer, the table that gets generated, the runtime checks that get inserted, and the audit rows that accumulate. That predictive capacity is what it means to read the layer fluently. It is also the precondition for Parts IV and V, where these primitives will reappear as the substrate that the Andon Loop's responders and reasoners stand on. The Cattle Dog Principle is no longer an aspirational frame; it is, after this chapter, a vocabulary you can write.
