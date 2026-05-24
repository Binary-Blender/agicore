# Chapter 11: The Expert System Layer

The orchestration layer handles coordination. The expert system layer handles reasoning. The distinction is consequential. Coordination answers the question "in what order, and under what dependencies, should these operations execute?" Reasoning answers a different question: "given what we observe about the state of the system, what should happen?" In a hand-wired stack, the answer to the reasoning question is buried — partly in cron jobs, partly in background workers, partly in conditional branches inside CRUD handlers, partly in scattered notification dispatchers. Each fragment carries its own context, its own assumptions about which fields matter, its own implicit policy constants. When the policy changes, an engineer chases the change through every fragment and hopes nothing was missed. This is the disease that the expert-systems tradition diagnosed in the 1970s and addressed with a deliberate architectural separation: logic apart from data, rules apart from inference, facts apart from conditions. The Agicore expert system layer is the contemporary embodiment of that separation, expressed in declarations that the compiler can translate into a deterministic in-process rules engine running alongside the application's CRUD spine.

The six declarations — `RULE`, `FACT`, `STATE`, `PATTERN`, `SCORE`, `MODULE` — solve six distinct sub-problems of reasoning. `RULE` is the reactive if-then primitive. `FACT` is the typed-immutable assertion. `STATE` is the lower-level state-machine declaration for cases that need guarded transitions beyond what `STAGES` provides. `PATTERN` detects temporal sequences. `SCORE` quantifies multi-field readiness. `MODULE` activates groups of rules and facts conditionally on score. Together they constitute the substrate where AI's generative strength is applied at exactly the right moment — the authoring of the rules — while the rules themselves execute deterministically at runtime, paying the AI cost once and amortizing across every execution. This is the inversion Part I named, applied to the specific problem class of symbolic reasoning over evolving entity state.

The deeper architectural point is that this layer is what makes the no-runtime-AI commitment economically rational for problems that are obviously pattern-shaped. A naïve reading of "AI lives at the edit boundary" might object that some decisions genuinely require AI reasoning at the moment of decision — flagging a stale article, escalating a high-value complaint, suppressing a notification under low-readiness conditions. The expert system layer is the answer. The decision logic itself is symbolic — it can be expressed as rules, facts, and scores — and AI's contribution is to author and refine those rules, not to evaluate them. The author writes a description of the policy; the AI generates the `RULE` declarations; the human verifies them; the compiler emits the deterministic runtime. Every subsequent decision executes without an LLM call. The expert system is fast, auditable, reproducible, and ready for the Andon Loop's improvement reasoners to propose modifications under mechanical gates.

The `RULE` declaration is the primitive. Syntactically, a rule names itself, declares a condition, declares an action, and optionally sets a priority. The condition references entity fields, facts, or computed values; the action takes one of a small set of forms — `SET` updates an entity field, `TRIGGER` invokes a named action, `EMIT` publishes an event, `FLAG` raises a typed flag with a severity. The classic form uses `WHEN` for the condition and `THEN` for the action. The modern form uses `IF` (an alias for `WHEN`) and `FLAG` (which synthesizes both a flag and an implicit action). The modifiers extend the basic shape: `UNLESS` is a guard that suppresses an otherwise-matching rule, `PRIORITY <n>` controls evaluation order when multiple rules match the same entity state, and `SEVERITY critical|high|medium|low` attaches a severity to flagged rules so that downstream alerting can route appropriately.

What the compiler emits for a rule is not an external rules engine. The generated runtime is an in-process Rust module: rules are wired into the CRUD command path so that whenever an entity field a rule depends on is written, the rule's condition is evaluated. Matching rules fire in priority order. The action is invoked synchronously if it is a `SET` or `EMIT`, or scheduled if it is a `TRIGGER` to an asynchronous action. Every fired rule writes a structured log entry capturing the rule name, the entity ID, the condition values that caused the match, and the action taken. The audit trail is the load-bearing property: a regulator tracing a flagged article back to the rule that flagged it sees the exact field values, the exact threshold, and the exact downstream action.

```agi
RULE flag_stale_article {
  WHEN Article.status == "draft"
    AND Article.updated_at < NOW() - 7days
  THEN SET Article.status = "stale"
       EMIT article_went_stale
  PRIORITY 5
}

RULE escalate_high_value_complaint {
  IF Complaint.value_cents > 100000
    AND Complaint.severity == "high"
  THEN FLAG "needs_executive_review"
  SEVERITY critical
  PRIORITY 10
}

RULE suppress_notifications_during_quiet_hours {
  WHEN Notification.scheduled_at WITHIN quiet_hours
  UNLESS Notification.priority == "urgent"
  THEN SET Notification.suppressed = true
  PRIORITY 1
}
```

Three observations are worth making about the rules above. First, the conditions are dense in domain content and sparse in plumbing. There is no scheduler hand-wired to check `updated_at` every hour; the runtime evaluates the condition whenever a write to the relevant table occurs, and the time comparison is recomputed against the current clock at evaluation. Second, `UNLESS` is the natural form for guards that domain experts express as "do this, except when…" — it is grammatically closer to how policy is articulated in the wild than nested boolean negations would be. Third, priority is an integer ordering with explicit semantics: when multiple rules match the same entity state, they fire in descending priority order, and a higher-priority rule's `SET` action is visible to a lower-priority rule's condition. This makes deterministic ordering a first-class declaration rather than an emergent property of source-file order.

The `FACT` declaration encodes policy constants. A `FACT` block names a fact, declares its typed fields, and provides initial values. At compile time, the fields become Rust constants accessible from any rule's condition; at runtime, the fact is also stored in the database so that it can be retracted and re-asserted through generated `get_fact` and `set_fact` commands without recompilation. This is the answer to "we need to change the threshold without a deploy." A hand-coded policy constant lives in source, requires a build, and ships with a release. An Agicore `FACT` lives in source as the default value, lives in the database as the operational value, and can be updated through the same UI a settings page would expose.

```agi
FACT PublishingPolicy {
  max_draft_age_days   int   = 7
  require_summary      bool  = true
  min_word_count       int   = 300
  premium_threshold    int   = 100000
}
```

A rule that previously embedded `7days` as a literal becomes a rule that references `PublishingPolicy.max_draft_age_days`. The literal is now a configurable fact. The rule becomes more general; the policy becomes more visible. An auditor reading the `FACT` block sees every policy constant in the application in one place. A product manager changing the policy updates a single field in a generated settings UI, and every rule that references the fact picks up the new value on the next evaluation. The static validator enforces that every fact reference resolves to a declared field on a declared `FACT`, so a typo becomes a compile error rather than a silent fallback to a stale value.

The `STATE` declaration is the lower-level companion to the orchestration layer's `STAGES`. Where `STAGES` is the right primitive for entity lifecycles whose transitions are simply "you can go from any state in the list to any other," `STATE` is the right primitive for lifecycles whose transitions need guards — conditions that must hold before a transition is permitted. The declaration names a state, lists its outbound transitions, and optionally attaches a `WHEN` guard to each. The compiler emits a typed enum for the state set and a transition validator that evaluates the guard before permitting the transition. An attempt to advance an `Article` from `Draft` to `Review` when its word count is below the policy threshold returns a typed error and writes an audit log entry; the corruption that would otherwise result from advancing the entity into a state it does not satisfy never occurs.

```agi
STATE ArticleDraft {
  TRANSITIONS {
    -> ArticleReview     WHEN Article.word_count > PublishingPolicy.min_word_count
                           AND Article.summary != ""
    -> ArticleDeleted
  }
}

STATE ArticleReview {
  TRANSITIONS {
    -> ArticlePublished  WHEN Article.editor_approved == true
                           AND Article.fact_check_passed == true
    -> ArticleDraft      WHEN Article.requires_revision == true
  }
}

STATE ArticlePublished {
  TRANSITIONS {
    -> ArticleArchived
  }
}
```

The choice between `STAGES` and `STATE` is a discipline question. `STAGES` is sufficient when the legal transitions are uniform — when any state in the list is reachable from any other, or when the transitions are obvious from the ordering. `STATE` is necessary when guards must run before the transition is permitted. Most lifecycles begin as `STAGES` and graduate to `STATE` only when the guard conditions accumulate enough complexity that they would otherwise be hand-coded into every state-changing action. The graduation is straightforward; the original `STAGES` block becomes a set of `STATE` blocks with `WHEN` guards added.

The `PATTERN` declaration handles temporal sequences. A `PATTERN` block names a pattern and declares a `SEQUENCE` of events or state transitions that, occurring in order within optional `WITHIN` windows, constitute a detected pattern. The compiler emits a Rust state machine that tracks partial matches in a memory-bounded buffer; when a new event arrives, the machine checks each open pattern, advances those whose next expected event has occurred, expires those whose windows have elapsed, and fires the patterns whose sequence has completed. Patterns are the right primitive for detecting behavior over time — rapid loops between states, repeated approval-then-rejection cycles, escalating error rates within a window, recurring activity by a single principal within a short period.

```agi
PATTERN rapid_rejection_loop {
  SEQUENCE {
    Article.status -> "in_review"
    Article.status -> "draft"        WITHIN 1hour
    Article.status -> "in_review"    WITHIN 24hours
    Article.status -> "draft"        WITHIN 1hour
  }
  THEN FLAG "loop_detected" SEVERITY high
}

PATTERN suspicious_login_burst {
  SEQUENCE {
    LoginAttempt.user_id -> any
    LoginAttempt.user_id -> any      WITHIN 5min
    LoginAttempt.user_id -> any      WITHIN 5min
    LoginAttempt.user_id -> any      WITHIN 5min
  }
  THEN TRIGGER lock_account
}
```

Patterns are rare in simple applications and essential in systems where behavior over time carries signal that no single event encodes. A single state transition tells you nothing; the third oscillation between two states in an hour tells you a great deal. The declarative shape makes the detection logic auditable — a reviewer can read the `SEQUENCE` and the `WITHIN` windows and see exactly what behavior the system is watching for — and the in-process implementation avoids the kind of stream-processing infrastructure (Kafka, Flink, dedicated event-time runtimes) that the same detection would otherwise require.

The `SCORE` declaration is the bridge between symbolic rules and continuous decisions. A `SCORE` block names a score, identifies the entity it applies to, declares the weighted fields that contribute to it, and optionally normalizes the result into the unit interval. The compiler emits a Rust function that recomputes the score whenever any contributing field changes, stores the result on the entity, exposes it through the typed TypeScript layer, and makes it available to rules and to modules. Scores are how Agicore quantifies readiness, quality, urgency, or any other multi-factor judgment that resists expression as a single boolean condition.

```agi
SCORE ArticleReadiness {
  TARGET Article
  WEIGHTS {
    word_count       * 0.4
    has_summary      * 0.3
    image_count      * 0.2
    revision_count   * 0.1
  }
  NORMALIZE true
}

SCORE ComplaintUrgency {
  TARGET Complaint
  WEIGHTS {
    value_cents      * 0.5
    severity_numeric * 0.3
    customer_tier    * 0.2
  }
  NORMALIZE true
}
```

The weighted-sum form is intentionally simple. Agicore's position is that scoring functions whose form must be more complex than a normalized weighted sum belong in a `SKILL` or `REASONER` from the cooperative intelligence layer, where their AI dependency can be made explicit and routed through the appropriate model tier. The `SCORE` primitive is the symbolic, deterministic form — fast, auditable, computable from any client without a network call. The weights are exposed through the same fact-update mechanism that policy constants use; a reviewer can tune the weights through the operational UI without a recompile.

The `MODULE` declaration is the activation primitive. A `MODULE` block names a coherent group of rules, facts, and reasoners; identifies a `SCORE_SOURCE`; and declares a `SCORE_THRESHOLD`. The runtime activates the module when the score for any entity in its scope rises above the threshold and deactivates it when the score falls below. Active modules evaluate their rules; inactive modules do not. This is the expert-system equivalent of attention. Expensive rules — notification dispatch, escalation, third-party API calls — are gated behind the readiness score, so they fire only against entities whose state justifies the cost. Cheap rules — flagging, status updates, internal events — can sit outside any module and fire unconditionally.

```agi
MODULE EditorialQualityModule {
  SCORE_THRESHOLD 0.7
  SCORE_SOURCE    ArticleReadiness
  RULES    [flag_stale_article, require_summary_rule, push_to_editor_queue]
  FACTS    [PublishingPolicy]
  REASONERS [content_health_monitor]
  EXPECTS_MATCH true
}

MODULE EscalationModule {
  SCORE_THRESHOLD 0.85
  SCORE_SOURCE    ComplaintUrgency
  RULES    [page_executive, freeze_account, open_war_room]
  FACTS    [EscalationPolicy]
  EXPECTS_MATCH true
}
```

The `EXPECTS_MATCH true` modifier is the load-bearing contract that ties the expert system layer to the Andon Loop. The semantics are precise: when the module is active and an entity in its scope produces no matching rule, the runtime treats the absence-of-match as a defect signal. It pulls the andon cord. The expert system stops itself, the same way Sakichi Toyoda's loom stopped itself when a thread broke, and the framework's andon responders take over — proposing rule additions or modifications under the tier-verified, sandbox-tested, signed-and-audited approval flow that Part IV develops in full. The contract is not "we hope a rule matches"; it is "we declare that a matching rule must exist, and we make the architecture surface its absence as a defect rather than as silent under-coverage."

This is the point at which the chapter's forward reference becomes load-bearing. Chapters 16 through 20 develop the Andon Loop in full — the inversion that allows AI to safely modify the rules of a deterministic runtime under mechanical gates. The `EXPECTS_MATCH true` contract is the upstream end of that machinery. When the contract fires, an andon responder REASONER is invoked to propose a modification — a new rule, a tightened condition, a relaxed guard. The proposal flows through the tier verifier (Chapter 17), the sandbox and shadow evaluator (Chapter 18), the multi-signer approval chain (Chapter 19), and lands on the SHA-256 hash-chained tamper-evident ledger (Chapter 20). Every transition is auditable. Every promotion is mechanically gated. The MODULE's missing-match becomes the signal that triggers the entire loop. The expert system, in other words, is not just a runtime — it is the substrate against which AI's continuous improvement of the rules is made safe.

A worked example consolidates the layer. The application is a community-platform content moderation system. Articles are submitted, scored for readiness, and gated through an editorial quality module whose active rules apply only when the readiness score crosses the threshold. Complaints about articles are scored for urgency and gated through an escalation module that fires premium-tier rules only when the urgency score crosses its own threshold. Both modules carry `EXPECTS_MATCH true`, so absences-of-match against high-scoring entities become defect signals that the Andon Loop will respond to. A pattern watches for rapid moderation reversals — a sign of contested calls — and flags them for senior review. The full source for the expert system layer of this application is below.

```agi
FACT PublishingPolicy {
  max_draft_age_days  int   = 7
  require_summary     bool  = true
  min_word_count      int   = 300
  min_readiness       float = 0.7
}

FACT EscalationPolicy {
  high_value_cents      int   = 100000
  premium_tier_required bool  = true
  pager_after_minutes   int   = 15
}

SCORE ArticleReadiness {
  TARGET Article
  WEIGHTS {
    word_count       * 0.4
    has_summary      * 0.3
    image_count      * 0.2
    revision_count   * 0.1
  }
  NORMALIZE true
}

SCORE ComplaintUrgency {
  TARGET Complaint
  WEIGHTS {
    value_cents       * 0.5
    severity_numeric  * 0.3
    customer_tier     * 0.2
  }
  NORMALIZE true
}

RULE flag_stale_article {
  WHEN Article.status == "draft"
    AND Article.updated_at < NOW() - PublishingPolicy.max_draft_age_days
  THEN SET Article.status = "stale"
       EMIT article_went_stale
  PRIORITY 5
}

RULE require_summary_rule {
  WHEN Article.status == "in_review"
  UNLESS Article.summary != ""
  THEN FLAG "missing_summary" SEVERITY medium
  PRIORITY 7
}

RULE push_to_editor_queue {
  WHEN Article.state == "in_review"
    AND Article.readiness >= PublishingPolicy.min_readiness
  THEN TRIGGER enqueue_for_editor
  PRIORITY 6
}

RULE page_executive {
  IF Complaint.value_cents > EscalationPolicy.high_value_cents
    AND Complaint.urgency >= 0.9
  THEN TRIGGER page_on_call_executive
  SEVERITY critical
  PRIORITY 10
}

RULE freeze_account {
  WHEN Complaint.fraud_score >= 0.95
  THEN TRIGGER freeze_principal_account
  SEVERITY critical
  PRIORITY 10
}

PATTERN moderation_reversal_loop {
  SEQUENCE {
    Article.moderation -> "approved"
    Article.moderation -> "rejected"  WITHIN 4hours
    Article.moderation -> "approved"  WITHIN 24hours
  }
  THEN FLAG "contested_moderation" SEVERITY high
}

STATE ArticleReview {
  TRANSITIONS {
    -> ArticlePublished  WHEN Article.editor_approved == true
                           AND Article.fact_check_passed == true
                           AND Article.readiness >= PublishingPolicy.min_readiness
    -> ArticleDraft      WHEN Article.requires_revision == true
  }
}

MODULE EditorialQualityModule {
  SCORE_THRESHOLD 0.7
  SCORE_SOURCE    ArticleReadiness
  RULES    [flag_stale_article, require_summary_rule, push_to_editor_queue]
  FACTS    [PublishingPolicy]
  EXPECTS_MATCH true
}

MODULE EscalationModule {
  SCORE_THRESHOLD 0.85
  SCORE_SOURCE    ComplaintUrgency
  RULES    [page_executive, freeze_account]
  FACTS    [EscalationPolicy]
  EXPECTS_MATCH true
}
```

The generated runtime for this source is a rules engine wired into every CRUD command on `Article` and `Complaint`. Every write triggers re-evaluation of the affected scores, which triggers re-evaluation of the gating modules, which triggers conditional firing of the contained rules. Patterns track open sequences in bounded memory. State transitions are gated by their guards. Every fired rule, every transitioned state, every detected pattern writes a structured audit entry whose schema is generated from the same AST that generated the rules themselves. Nothing about this is hand-wired. The hand-coded equivalent — an in-process rules engine, a scoring subsystem, a pattern detector, a guarded state machine, an audit pipeline that captures all four — would run to several thousand lines of carefully synchronized code whose ongoing maintenance is a recurring cost that no team gets to amortize away. The compiler emits it from declarations the team can read aloud.

A note on the relationship to the classical expert-systems literature is worth making. The lineage of declarative rule systems runs through MYCIN in the 1970s, OPS5 and CLIPS in the 1980s, the Rete algorithm and its descendants in the 1990s, and the rules-engine renaissance of Drools and its peers in the 2000s. Each generation pursued the same architectural commitment: separate the logic from the inference engine, separate the data from the logic, separate the conditions from the actions. Each generation discovered the same operational pitfall: rule systems become difficult to author at scale because the language for expressing rules is alien to the domain experts who own the policy, and rule systems become difficult to maintain because the interaction of rule sets across versions is hard to reason about. Agicore inherits the architectural commitment and addresses both pitfalls. The authoring problem is addressed by AI: domain experts describe policies in language, AI proposes the corresponding `RULE` declarations, the human verifies, the compiler emits. The maintenance problem is addressed by the static validator: rule conflicts, dead rules, and rules whose conditions can never match are detected at build time rather than after deployment. The combined effect is that the rules layer, which has historically been a place where the operational cost of correctness was high enough to discourage adoption, becomes a place where the operational cost is low enough to make symbolic reasoning the default for problems that are obviously pattern-shaped.

A second note concerns the discipline of priority assignment. The integer-priority mechanism is mechanically simple — higher-priority rules fire first, and `SET` actions from higher-priority rules are visible to lower-priority rules' conditions — but the discipline of assigning priorities is a place where teams develop conventions over time. The conventions that work in practice are not novel: reserve the highest priorities (10 and above) for safety-critical rules that must fire before anything else; use the middle range (3 through 7) for ordinary policy rules whose ordering matters but is not catastrophic if violated; use the low range (1 and 2) for cleanup and logging rules whose actions are observations rather than mutations. The convention is the team's, not the framework's. What the framework provides is the deterministic ordering against which the convention can be enforced and audited; what the team provides is the meaning of the integers in their domain.

A third note concerns the relationship between `FACT` and the application layer's `PREFERENCE`. The two have superficial similarity — both are typed values that can be updated through the operational UI — but the architectural roles are distinct. A `PREFERENCE` is per-user, per-install, ephemeral with respect to the policy of the application as a whole; the user toggling sidebar-collapsed has no effect on what the application means. A `FACT` is per-application, durable, semantically load-bearing; changing `max_draft_age_days` from 7 to 14 changes what the application means by "stale article" and propagates through every rule that references the fact. The discipline is to choose `PREFERENCE` for user state and `FACT` for policy state, and to avoid the corner case of using one for the other. The framework supports both clearly; the author's job is to understand which they are declaring.

This concludes Part III's first half. Two more chapters develop the remaining declaration layers — cooperative intelligence (Chapter 12), semantic infrastructure (Chapter 13), adaptive intelligence (Chapter 14), and the ambient-and-embedded layer plus the primitives (Chapter 15) — before Part IV opens with the Andon Loop in full. The reader who has finished the present chapter holds the keys to the upstream end of that loop. The `EXPECTS_MATCH true` contract on a `MODULE` is the place where an absence becomes a defect signal, the place where the expert system pulls its own andon cord, the place where AI's proposal of a rule modification enters the tier-verified, sandbox-tested, signed-and-audited approval pipeline that Chapters 16 through 20 develop. The expert system is not a static body of rules. It is the substrate against which the architecture's most consequential property — AI safely modifying the rules of a deterministic runtime — is made operational.
