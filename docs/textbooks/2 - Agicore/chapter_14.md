# Chapter 14: The Adaptive Intelligence Layer

A system that does not change is dead. A system that changes without discipline is dangerous. The history of software engineering is largely the history of attempts to thread the gap between these two failure modes — to evolve a running system without breaking the contracts the system's existing users depend on. Continuous integration, blue-green deployment, feature flags, canary releases, A/B testing frameworks, the entire apparatus of modern release engineering exists to answer one question: how do you change a thing that is running, without breaking the running thing. The answers have grown sophisticated. They have not, until now, been incorporated into the language in which the system is specified.

The Adaptive Intelligence Layer is where Agicore makes that incorporation explicit. Its six declarations — `EVENT`, `NBVE`, `CONTRACT`, `REPUTATION`, `SUBSCRIPTION`, `DISPUTE` — divide cleanly into two clusters that look unrelated on first inspection but share a deeper purpose. The first cluster (`EVENT`, `NBVE`) is the evolution machinery: how the system safely changes itself based on observed behavior. The second cluster (`CONTRACT`, `REPUTATION`, `SUBSCRIPTION`, `DISPUTE`) is the economic machinery: how the system manages enduring relationships between principals, including the relationships that themselves evolve over time. The unifying purpose is adaptation under accountability — change that the system can later prove it executed correctly, against criteria the system declared in advance.

The historical inheritance is explicit. Statistical Process Control, developed by Walter Shewhart at Western Electric in the 1920s and refined by W. Edwards Deming for decades after, is the discipline of distinguishing common-cause variation from special-cause variation in a production process. A system whose output fluctuates within expected statistical bounds is in control even when individual observations vary; a system whose output drifts outside those bounds has changed in a way that demands investigation. CSE Ch 10 develops this point at length and locates SPC as the operational heartbeat of cognitive production systems. The Adaptive Intelligence Layer is where SPC stops being a discipline a thoughtful operator applies and becomes a primitive the runtime applies automatically — a promotion gate, a reputation accumulator, a sample-size validator — each generated from a single declarative clause.

`NBVE` is the load-bearing declaration of this layer. It is the technical primitive on which the Andon Loop's safe rule promotion depends, and it deserves the bulk of the chapter's attention. Before reaching it, however, the simpler declarations establish the vocabulary.

The chapter's progression is therefore from the simplest declaration to the most consequential — `EVENT` first, then `NBVE` in depth, then the economic cluster. The economic cluster receives less individual attention than NBVE deserves not because the declarations are less interesting but because their mechanics are familiar from decades of business-system work. Contracts, reputations, subscriptions, and disputes have been modeled in software since the first Customer Relationship Management systems. The Agicore contribution at the economic layer is integration — these primitives compile to the same runtime that everything else compiles to, share the same audit substrate, sign with the same identities, and participate in the same declarative discipline. NBVE, by contrast, is genuinely novel as a first-class language declaration. Most systems that test candidates against production traffic build the testing infrastructure separately from the language in which the system is specified; Agicore makes it a primitive in the same vocabulary.

A useful way to read the six declarations is in pairs. `EVENT` and `NBVE` form the evolution pair: one announces that something happened, the other compares what should have happened against what did. `CONTRACT` and `DISPUTE` form the agreement pair: one declares what was agreed, the other handles disagreement over fulfillment. `REPUTATION` and `SUBSCRIPTION` form the relational pair: one accumulates evidence about a counterparty's behavior, the other binds an ongoing relationship under that evidence. The pairing is not enforced by the DSL — declarations can be used in isolation — but the patterns recur, and the system shapes that emerge in practice tend to use the pairs together.

`EVENT` is the layer's most modest primitive: a named typed pub/sub announcement with an optional retain window and an optional subscriber list. Where `CHANNEL` from Chapter 13 carries structured, validated, typed packets with strict admissibility, `EVENT` carries simpler payloads with looser delivery guarantees. The trade is intentional. `CHANNEL` is for the messages whose schema you commit to; `EVENT` is for the announcements that need to flow without ceremony.

```agi
EVENT ArticleSubmitted {
  PAYLOAD {
    article_id   string REQUIRED
    author_id    string REQUIRED
    submitted_at datetime
  }
  SUBSCRIBERS [EditorNode, ModerationNode]
  RETAIN 24h
}
```

The compiler generates a typed Tauri event with a declared payload shape, a listener registry, and an optional replay buffer that holds the last twenty-four hours of events for subscribers that connect late. Events also carry a `SCHEDULE` field — a recent addition that lets an event fire on a cron-style schedule, blurring the distinction between event and timer in a useful direction. Scheduled events are how Agicore expresses periodic occurrences that other components react to without coupling the producer to the consumers.

The more consequential declaration in this layer's first cluster is `NBVE` — Non-Blocking Variant Evaluation. The name encodes the technical move precisely. A variant — a candidate version of a rule, workflow, or model — is evaluated against live production traffic without blocking the traffic and without exposing the variant's outputs to the production path. Production runs as it always runs; the variant runs in parallel; the runtime compares their outputs and accumulates statistics; promotion follows only when the statistics satisfy a declared gate.

The simplest form of the declaration names the production component, the candidate component, the metrics to track, the SPC floor that promotion requires, the promotion window, and an optional chain to integrate with.

```agi
NBVE SummarizationDowngrade {
  PRODUCTION       "claude-sonnet-4-6"
  CANDIDATE        "claude-haiku-4-5"
  METRICS          [quality, latency, cost]
  SPC_FLOOR        0.92
  PROMOTION_WINDOW 200
  CHAIN            SummarizationChain
}
```

In its rule-variant and workflow-variant forms, `NBVE` accepts `CANDIDATE_RULE` or `CANDIDATE_WORKFLOW` clauses; in its model form, `CANDIDATE` names the alternate model. The mechanism is the same in every form: dual execution with statistical comparison.

The runtime mechanism deserves explicit treatment, because this is where the layer interacts most directly with the Andon Loop in Part IV. The integration point is a TypeScript helper, generated for every `NBVE` declaration:

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

`evaluateWithShadow<TIn, TOut>` is the dual-execution primitive that every NBVE-aware code path is generated to use. The signature is parametric in the input type and the output type. Its arguments are a target identifier (matching the NBVE declaration's name), the input value, a production function, and a shadow function. Its behavior is precise: the production function always runs first, and its result is what the caller receives. If no shadow evaluation is active for this target, the production result is returned unchanged with zero overhead. If a proposal is in `shadow_evaluating` state targeting this identifier, the shadow function runs in parallel, the diff between production and shadow output is computed (deep JSON equality by default, with a customizable `equals` option for domain-specific comparison), and the observation is recorded against the active shadow window.

The dual-execution pattern is the technical heart of how Agicore promotes mutations safely. Production traffic continues to flow through the production code path; it sees nothing different. The shadow function executes the candidate logic on the same input, producing what production would have produced had the candidate been the running rule. The runtime records both outputs against the shadow evaluation table. Over the declared window — twenty-four hours, seven days, fourteen days depending on the mutation tier — observations accumulate.

At the end of the window, the SPC promotion gate runs. The gate's logic is mechanical: collect all observations for the proposal, compute the defect rate as the fraction of observations where the shadow output diverged from the production output, compare against an acceptable threshold, and confirm the sample count meets a minimum confidence requirement. The verdict is one of three: promote (defect rate within threshold and sample count sufficient), reject (defect rate exceeds threshold), or escalate (sample count insufficient for a confident verdict). The verdict is determined statistically, not editorially. The system that promotes the candidate has evidence — recorded, queryable evidence — that the candidate matches production behavior within the declared tolerance.

This evidence-driven promotion is what makes AI-proposed mutations safe to deploy. In Chapter 18 the full Andon Loop machinery will be treated in depth: the tier verifier that runs before the sandbox, the sandbox that runs before the shadow window, the SPC gate that runs at the close of the shadow window, the approval chain that runs before final promotion. For now, the chapter's necessary forward reference is this: NBVE's `evaluateWithShadow` and SPC promotion gate are the technical primitives without which the Andon Loop cannot exist. The deterministic runtime that Agicore demands and the safe evolution of rules over time would be irreconcilable goals without a primitive that lets candidate logic run alongside production logic and accumulate evidence before changing the production path. NBVE is that primitive. Every other declaration in this layer either supports it or operates in its shadow.

The custom-equality option deserves a moment's attention. JSON deep equality is the default because it is principled — two outputs are different if any field at any depth differs — but it is also brittle in domains where outputs are semantically equivalent yet structurally different. A summarization model might produce "The patient reported chest pain at 0800" in one variant and "Chest pain reported at 0800 by patient" in another; deep equality reports divergence, but a domain-appropriate `equals` predicate built around medical concept extraction would report agreement. The DSL allows the predicate to be supplied per evaluation target, parameterizing the divergence definition by what divergence actually means for the artifact under evaluation. This is the same kind of customization point that mature SPC implementations expose for measurement systems analysis — the recognition that the metric of variation is itself a domain decision.

The cadence poller is the operational glue. A background task wakes every sixty seconds, examines the `mutation_shadow_evaluations` table for rows whose declared window has elapsed, runs the SPC analysis, and transitions the corresponding proposals to their new states. The poller is what closes the loop without human intervention. A proposal entered into shadow evaluation on Monday is automatically transitioned at the next poll tick after the window elapses; if the defect rate satisfies the gate, the proposal advances to `shadow_promoted`; if it fails, it advances to `shadow_rolled_back`; if observations are insufficient, it advances to `shadow_inconclusive`. The state machine is mechanical, the transitions are logged, and every transition is hash-chained into the audit ledger that Chapter 19 will treat.

Turn now to the economic cluster. `CONTRACT`, `REPUTATION`, `SUBSCRIPTION`, and `DISPUTE` model enduring relationships between principals. Their unifying concern is that these relationships have history — past performance affects future trust, past agreements bind future behavior, past disputes precedent future adjudications. The declarations make that history first-class.

`CONTRACT` is a typed agreement between named principals. The declaration specifies the parties (each bound to an `IDENTITY` from Chapter 13), the terms (typed fields with defaults), the deliverables, the payment structure, and an optional governance authority that supervises the relationship.

```agi
CONTRACT MonthlyEditorial {
  PARTIES {
    publisher: PublisherIdentity
    editor:    EditorIdentity
  }
  TERMS {
    word_count_target: number = 5000
    deadline_day:      number = 28
  }
  DELIVERABLES ["Edited articles", "Editorial calendar"]
  PAYMENT { amount: 2500.00, currency: "USD", provider: StripeConnect }
  GOVERNANCE EditorialAuthority
}
```

The runtime generates a TypeScript schema, a SQLite lifecycle table with states `draft → pending_signature → signed → active → completed | cancelled | disputed`, and CRUD commands that move a contract through its lifecycle. Each transition is logged with the responsible identity and timestamp. A signed contract is a durable, queryable artifact whose terms can be cited later — by either party, by a mediator in a dispute, by a regulator examining the relationship.

`REPUTATION` is the quantitative track record. The declaration binds a reputation score to a subject identity, declares the metrics that contribute (each typed), specifies an SPC sample-size and control-limit regime, and applies exponential decay so recent samples dominate older ones.

```agi
REPUTATION EditorialReputation {
  SUBJECT EditorIdentity
  METRICS {
    on_time_rate:   float
    quality_score:  float
    revision_count: number
  }
  SPC   { sample_size: 30, control_limits: normal }
  DECAY 90d
}
```

The runtime generates a SQLite reputation table, an aggregator that maintains the decayed running totals, and state transitions (`new → maturing → mature`) as enough samples accumulate to support confident statistics. Reputation is the empirical substrate for trust decisions: an `ESCALATION_CHAIN` from Chapter 12 can consult a reputation score; a `CONTRACT` can require a minimum reputation before activation; a `DISPUTE`'s mediator can reference reputation as context. Trust is no longer vibes; trust is numbers that the system computed from observed behavior.

`SUBSCRIPTION` models recurring relationships. A subscription binds a provider identity to a subscriber identity with terms specifying tier, billing cadence, and the perks the subscription confers.

```agi
SUBSCRIPTION SupporterTier {
  PROVIDER   PublisherIdentity
  SUBSCRIBER ReaderIdentity
  TERMS {
    tier:    "supporter"
    billing: monthly
    perks:   ["ad_free", "early_access", "comment_replies"]
  }
  PAYMENT { amount: 5.00, currency: "USD", provider: StripeConnect }
}
```

The perks array is a typed capability set — the application's UI and access control consume the perks list to decide what the subscribed user is allowed to do. The declaration unifies the business-model layer (recurring payment) with the access-control layer (feature gating) in a single source of truth.

`DISPUTE` is the conflict-resolution machinery. A dispute references a contract, declares its lifecycle states, names a mediator identity, enumerates allowed evidence types, and specifies the possible resolutions (refund, partial, dismissed).

```agi
DISPUTE MissedDeadlineDispute {
  CONTRACT   MonthlyEditorial
  STATES     [opened, investigating, resolved, escalated]
  RESOLUTION { mediator: ArbiterIdentity, outcome: refund | partial | dismissed }
  EVIDENCE   { allowed_types: ["screenshot", "log_export", "third_party_attestation"] }
}
```

The runtime generates a Mealy-style state machine, a typed resolution union, a `DisputeRecord` interface, and evidence-validation hooks that ensure submitted evidence matches one of the declared types. Disputes accumulate alongside contracts as durable artifacts; the outcomes precedent future similar disputes; the mediators' decisions are signed and auditable.

What unifies the economic cluster with NBVE is that both clusters model adaptation under accountability. NBVE adapts the system's behavior through shadow-tested promotion; contracts, reputation, subscriptions, and disputes adapt the system's relationships through history-aware enforcement. In both cases, change is permitted, but the change is mechanical, evidence-driven, and durably logged. A future audit — a regulator examining how a rule came to be in production, an arbitrator examining whether a contract was fulfilled, a counterparty examining why their reputation dropped — receives a precise answer rather than a narrative.

Consider a worked example that ties NBVE to the economic cluster. A publishing platform runs an editorial review pipeline. The pipeline currently uses a Sonnet-class model for fact-checking — a tier the operator believes is more capable than necessary for the typical article. The operator declares an `IMPROVEMENT_REASONER` (Chapter 12) that wakes weekly, examines recent fact-check outcomes against a declared success metric, and proposes alternate configurations when the metric is dominated by easy cases. The reasoner proposes a rule modification: route articles below a complexity threshold to the Haiku-class model instead. The proposal enters the Andon Loop. The tier verifier (Chapter 17) confirms the proposal's scope is within the policy's T3 tier (rule modification). The sandbox runs the regression suite — the captured failure cases plus the last seven days of successful workflows — and the modified rule passes both. The proposal enters NBVE shadow evaluation with a fourteen-day window.

For fourteen days, every incoming article that satisfies the proposed complexity threshold runs through both the production fact-checker (Sonnet, as it was) and the shadow fact-checker (Haiku, as the candidate would route it). Every shadow observation is recorded — production verdict, shadow verdict, whether they diverged, what the divergence looked like in the cases where it occurred. At the end of fourteen days, the SPC gate runs. The poller sees the window has elapsed, computes the defect rate at 0.4%, confirms the sample count of seventeen thousand observations exceeds the minimum-for-confidence threshold, and transitions the proposal to `shadow_promoted`. The proposal then advances to deployment, lands on the hash-chained ledger, and the editorial pipeline begins routing the lower-complexity articles to the cheaper model. The economic relationships affected by the change — the contracts with editors that depend on quality, the subscriptions whose perks include editorial review, the reputations of the editors whose work flows through the pipeline — are all governed by their own declarations that the change does not perturb. The system has adapted itself; the adaptation is auditable; the surrounding economic substrate is unaffected by virtue of having been declared separately.

A second consideration emerges from the example. The economic cluster — the contracts, reputations, subscriptions, and disputes — provides the relational substrate within which the technical adaptation occurs. The editors whose work flows through the modified fact-checking step have signed contracts; the contracts cite quality standards; the standards are measured through reputations. When the pipeline changes its underlying model, the editors are unaffected at the relational layer because their contracts are written in domain language ("articles meet the publication's quality bar") rather than implementation language ("Sonnet-class model verifies factual claims"). The decoupling between economic relationships and technical implementations is itself a property of having distinct declaration vocabularies for each. Conflating them — writing contracts that cite specific models, writing reputations that depend on specific pipelines — would tie the economic substrate to implementation churn and make every rule change a renegotiation. The layer's discipline is to keep the vocabularies orthogonal so the relationships can persist across the changes the technical substrate undergoes.

The forward reference to Chapter 18 is now precise. Chapter 18 will treat the full verification triad — sandbox, NBVE shadow window, SPC gate — as the technical machinery of the Andon Loop. This chapter has supplied the primitive on which that machinery is built. `evaluateWithShadow<TIn, TOut>` is the dual-execution helper that every shadow-evaluated code path passes through. The SPC promotion gate is the statistical decision that turns observations into a verdict. The cadence poller is the operational loop that closes the cycle without human intervention. When Chapter 18 develops the Andon Loop's promotion flow in full, the reader who has internalized this chapter will recognize NBVE as the substrate that makes the entire flow possible. There is no other primitive in Agicore that provides what NBVE provides: the ability to run candidate behavior alongside production behavior, on the same inputs, with mechanical statistical comparison, generating evidence whose verdict drives promotion. Without this primitive, AI-proposed mutations could not be promoted safely; the Andon Loop's claim to "AI proposes, the system verifies mechanically" would reduce to a promise. With this primitive, the promise becomes an architectural property.

It is worth naming what the layer does not attempt. The layer does not propose to make the system autonomous in the sense of learning new behaviors without specification. Every adaptation occurs against an evaluation criterion declared in advance and a promotion gate declared in advance. The system does not invent its own success metrics. The system does not promote candidates that violate its declared constraints. The autonomy on offer is bounded autonomy: within the space of variants the operator authorizes and against the metrics the operator declares, the system improves itself; outside that space, nothing happens. This is the right shape of autonomy for production systems. Unbounded learning is exciting in laboratory settings and unmanageable in operational ones. Bounded adaptation is what the discipline calls for, and bounded adaptation is what the layer provides.

The chapter closes on the longer arc. The Adaptive Intelligence Layer is what makes Agicore systems capable of inhabiting time. Workflows evolve as the world they coordinate evolves. Models change as new ones become available. Relationships mature as trust accrues. Conflicts arise and are adjudicated. Each of these phenomena is something every real system must accommodate; without declarative primitives for them, every team rebuilds the machinery from scratch and gets the trade-offs subtly wrong. With the primitives declared, the machinery is generated, the evidence is automatic, and the discipline that distinguishes safe evolution from reckless drift is encoded in the source where it can be read, reviewed, and audited. That encoding is the layer's contribution, and the primitive that bears the weight is NBVE.
