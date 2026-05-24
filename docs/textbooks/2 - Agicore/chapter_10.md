# Chapter 10: The Orchestration Layer

The application layer is sufficient for a class of programs whose ambitions end at "store these records, expose these operations, render these surfaces." Most working software does not end there. Once an application acquires a real workflow — a sequence of operations in which each step depends on the output of a prior step, in which steps can run in parallel where their dependencies permit it, in which an intermediate failure has implications for the steps downstream, in which the artifact moves through a lifecycle whose legal transitions are a small fraction of the conceivable ones — the application layer alone forces the author to express that structure in hand-written code. The orchestration layer is the place where that structure becomes declarative. Its five declarations — `WORKFLOW`, `PIPELINE`, `QC`, `STAGES`, `VAULT` — are the primitives by which multi-step coordination, in-line quality control, lifecycle constraint, and cross-application asset sharing are made first-class.

The problem class this layer addresses is the problem class that the Toyota Production System addressed in the manufacturing inheritance the framework is named after. The orchestration layer is where flow is made visible, quality is built into the process rather than inspected at the end, standardization is enforced through declarative state machines, and shared resources are governed through a substrate every workstation can access without negotiating individual contracts with every other. The chapter that follows develops each declaration in turn — first as a theoretical construct, then as a syntactic primitive, then in terms of what the compiler emits, then in a representative snippet — and concludes with a worked end-to-end example that exercises every declaration in concert.

The `WORKFLOW` declaration captures the most familiar multi-step coordination pattern: a named process composed of named steps, each step bound to an `ACTION`, each step potentially declaring a dependency on prior steps, the whole forming a directed acyclic graph that the runtime executes by topological sort with parallel scheduling where dependencies permit. The theoretical framing is straightforward — workflows are DAGs of typed operations — but the engineering implications are not. A workflow whose dependency graph is allowed to contain cycles is a workflow that can deadlock. A workflow whose steps do not have typed input and output contracts is a workflow whose intermediate failures produce unrecoverable corruption. A workflow whose execution leaves no audit trail is a workflow whose post-mortem requires guessing.

Agicore's `WORKFLOW` makes all of these properties mechanical. The compiler validates that the dependency graph is acyclic at build time — a cycle is a static error, not a runtime hang. The compiler validates that every reference to a prior step's output (`step_name.output_field`) resolves to a field that the referenced action declared in its `OUTPUT` block. The runtime executor maintains per-step state (pending, running, done, failed), emits typed progress events, and writes a structured log entry for each transition. The `ON_FAIL` modifier on a step specifies the recovery policy: `stop` halts the workflow and reports failure, `skip` continues with the failed step's downstream dependencies marked unresolvable, `retry` attempts up to three times before falling through to the next policy, and `fallback` invokes an alternative action whose contract must satisfy the failing step's output. The `SPC_SAMPLE <n>` modifier on the workflow as a whole flags every nth execution as a statistical-process-control sample, surfaced to a reviewer queue for the kind of periodic auditing that CSE Chapter 10 develops at length.

```agi
WORKFLOW publish_article {
  STEPS {
    summarize:    summarize_article
    proofread:    proofread_text       DEPENDS_ON summarize
    fact_check:   verify_claims        DEPENDS_ON summarize
    push_to_feed: publish_to_channel   DEPENDS_ON proofread, fact_check
  }
  SPC_SAMPLE 10
}
```

What the compiler emits for this declaration is a Rust `Workflow` executor specialized to this DAG: a typed enum of step identifiers, a topological-sort engine that schedules `proofread` and `fact_check` to run in parallel after `summarize` completes, a per-step task in the runtime's thread pool, a TypeScript invoke wrapper that returns a typed result containing every step's output, and a per-execution log record written to the workflow audit table. The `SPC_SAMPLE 10` modifier wires the tenth execution to a sample-review queue without imposing any runtime cost on the other nine. The author wrote eight lines; the compiler emitted the orchestration spine that would otherwise require a Celery-like task queue, a custom scheduler, a custom audit pipeline, and the integration glue between all three.

The `PIPELINE` declaration addresses a different coordination shape: typed streaming through a sequence of nodes where each node transforms its input into the input type of its successor. Where `WORKFLOW` is appropriate for processes whose steps are heterogeneous in shape and where parallel execution is a feature, `PIPELINE` is appropriate for processes whose stages form a strict linear or branching chain and whose correctness depends on each stage's output type unifying with the next stage's input type. A document-ingestion pipeline that parses bytes into text, then chunks text into paragraphs, then embeds chunks into vectors is the canonical example. The discipline is type-driven: the compiler validates at build time that adjacent node output and input types unify; a type mismatch is a static error, not a runtime panic three stages into a stalled job.

```agi
PIPELINE document_ingest {
  ParsePDF {
    INPUT  RawBytes
    OUTPUT ParsedText
    PROCESS "parse_pdf_bytes"
  }
  ChunkText {
    INPUT  ParsedText
    OUTPUT TextChunks
    PROCESS "chunk_by_paragraph"
  }
  EmbedChunks {
    INPUT  TextChunks
    OUTPUT EmbeddingBatch
    PROCESS "embed_with_model"
  }
  ParsePDF -> ChunkText -> EmbedChunks
}
```

Each node names a Rust function via `PROCESS`, an `INPUT` type, and an `OUTPUT` type. The arrow notation at the end establishes the order. The compiler emits a Rust `enum PipelineNode` whose variants correspond to the named nodes, a per-node dispatch function that calls the named Rust function with the correctly-typed input, a TypeScript invoker that runs the pipeline by stage with intermediate values passed through the runtime, and the static guarantee that no stage produces an output that its successor cannot consume. The acyclicity check is mechanical: a cycle in the arrow chain is a static error. The author does not write a runtime check for pipeline well-formedness because the compiler has already discharged it.

The `QC` declaration is where Built-In Quality enters the orchestration layer. A `QC` block is a quality gate: a node that takes an item, applies a `CRITERIA` predicate to it, and either passes the item downstream, drops it, retries the upstream stage, or flags it for human review. The criterion is expressed in natural language because the predicate is evaluated by an AI service at runtime — typically a small, fast model that returns a structured pass/fail decision with a brief justification. This is intentional, and the design tradeoff is precise: per-item evaluation cost is paid in exchange for the ability to specify quality criteria in language a domain expert can read, audit, and change without a recompile. A `QC` block plugs into a pipeline between adjacent stages or attaches to a workflow step as a postcondition. The `ON_FAIL` modifier — `drop`, `retry`, `flag` — declares the policy.

```agi
QC chunk_quality {
  CRITERIA """
    Each text chunk must be between 100 and 500 words.
    Chunks must not split mid-sentence.
    Chunks containing only whitespace or punctuation are rejected.
  """
  ON_FAIL flag
}
```

What the compiler emits is a Tauri command `validate_qc_chunk_quality` that dispatches the item and the criterion to the configured `AI_SERVICE`, parses the response into a typed `{ pass: bool, reason: string }` structure, logs every decision with full provenance — which item, which criterion, which model, which justification — and either returns the item to the pipeline or routes it according to `ON_FAIL`. The audit trail is the load-bearing property: a regulator or post-mortem investigator can trace any rejected item to the exact criterion that rejected it and the exact justification the evaluator produced. This is what Jidoka — Sakichi Toyoda's loom that stopped itself when a thread broke — looks like inside a cognitive pipeline. The stage stops itself when the criterion fails. The reason is recorded. The downstream process is protected from the contaminated input.

The `STAGES` declaration is the finite-state-machine primitive for entity lifecycles. The Agicore design choice here is exhaustive enumeration: every state an entity can occupy is listed in the declaration, every transition is declared, and unreachable states or transitions are flagged as warnings by the static validator. The compiler emits a Rust enum for the state set, a typed transition table, and a guard function `try_transition(from, to) -> Result<(), InvalidTransition>` that is called by every Tauri command that would change the entity's state. The state itself is stored as a `String` column on the entity table; the guard runs before any write. An attempt to transition from `submitted` to `closed` when only `submitted -> approved` and `submitted -> rejected` are declared returns a typed error, not a corrupted record. The author can read the `STAGES` block and see the state diagram. A business stakeholder can read it and verify it matches the process they intended.

The declaration supports two forms. The standalone form names a state machine and lists its transitions explicitly, using arrow notation with `/` to express alternative successors. The inline form attaches a flat list of allowed states to an entity directly, for the common case where the legal transitions are simply "any state to any state in the list." The inline form is the right default for simple lifecycles; the standalone form is the right default for the moment the lifecycle becomes graph-shaped.

```agi
STAGES order_lifecycle {
  draft -> submitted
  submitted -> approved / rejected / pending_review
  approved -> fulfilled -> closed
  rejected -> closed
  pending_review -> approved / rejected
}

ENTITY Order {
  customer_name: string REQUIRED
  total_cents: int REQUIRED
  state: string REQUIRED
  TIMESTAMPS
  CRUD full
  USES_STAGES order_lifecycle
}

ENTITY Article {
  title: string REQUIRED
  body: text
  STAGES [draft, in_review, published, archived]
}
```

The `VAULT` declaration is the orchestration layer's contribution to ecosystem applications. The problem the vault solves is the problem of multiple applications needing access to the same artifacts — a conversation saved by a chat application, read by an analysis application, indexed by a search application — without any of them building or operating a central service. The vault is a separate SQLite database whose path is declared in the `VAULT` block, whose schema runs idempotently (`CREATE TABLE IF NOT EXISTS`) so that whichever application opens it first creates the schema and subsequent applications find it ready, and whose assets are typed, optionally tagged, and optionally provenance-tracked. Every Agicore application that declares the same `VAULT { PATH ... }` shares the same database. No inter-process communication. No HTTP. No service to deploy. Just a shared local file with ACID guarantees provided by SQLite and idempotent migrations provided by the generator.

```agi
VAULT {
  PATH        "%APPDATA%/NovaSyn/vault.db"
  ASSET_TYPES [conversation, document, exchange, knowledge, snippet]
  TAGS        true
  PROVENANCE  true
}
```

The compiler emits a Rust `VaultPool` module wrapping a `Mutex`-guarded SQLite connection, three tables (`vault_assets`, `vault_tags`, `vault_provenance`) plus a join table (`vault_asset_tags`) for the tag relationship, and Tauri commands `vault_save_asset`, `vault_search_assets`, `vault_tag_asset`, `vault_record_provenance`. The TypeScript layer receives typed invoke wrappers for all of the above. The `PROVENANCE true` modifier wires every asset write to record who saved it, when, and from what source — the same provenance metadata that the semantic-infrastructure layer's `PACKET` declaration will later carry across organizational boundaries. The vault is the local-substrate analog of that distributed primitive; the design rhymes deliberately.

The five declarations compose into a coherent orchestration substrate. Consider a worked example: a content-publishing application whose authoring surface is shared with a separate analysis tool, whose articles move through an exhaustive lifecycle, whose ingestion of submitted articles flows through a typed pipeline with quality gates at every stage, and whose publication workflow runs three steps in parallel after summarization. The application layer declarations come first — `APP`, `AI_SERVICE`, the `Article` and `Submission` entities. The orchestration layer declarations follow.

```agi
APP ContentPlatform {
  title: "Content Platform"
  db:    "content.db"
  target: tauri
}

AI_SERVICE Evaluator {
  PROVIDER anthropic
  MODEL    "claude-haiku-4-5"
  STREAMING false
}

AI_SERVICE Author {
  PROVIDER anthropic
  MODEL    "claude-sonnet-4-5"
  STREAMING true
}

VAULT {
  PATH        "%APPDATA%/ContentPlatform/vault.db"
  ASSET_TYPES [article, draft, citation, image]
  TAGS        true
  PROVENANCE  true
}

ENTITY Submission {
  source_url: string REQUIRED
  raw_bytes: text
  TIMESTAMPS
  CRUD full
}

ENTITY Article {
  title: string REQUIRED
  body: text
  summary: text
  state: string REQUIRED
  TIMESTAMPS
  CRUD full
  USES_STAGES article_lifecycle
}

STAGES article_lifecycle {
  draft -> in_review
  in_review -> approved / rejected
  approved -> published -> archived
  rejected -> archived
}

PIPELINE ingest_submission {
  ParseBytes {
    INPUT  RawBytes
    OUTPUT ParsedText
    PROCESS "parse_submission_bytes"
  }
  StructureArticle {
    INPUT  ParsedText
    OUTPUT DraftArticle
    PROCESS "structure_draft"
  }
  PersistDraft {
    INPUT  DraftArticle
    OUTPUT ArticleId
    PROCESS "persist_draft_article"
  }
  ParseBytes -> StructureArticle -> PersistDraft
}

QC submission_intake {
  CRITERIA """
    Submitted content must be original prose, not marketing copy,
    not generated boilerplate, and not a duplicate of an existing
    Article. Length must exceed 300 words.
  """
  ON_FAIL drop
}

QC draft_quality {
  CRITERIA """
    Draft must have a coherent thesis stated within the first
    two paragraphs. Citations must be inline. No more than three
    grammatical errors per thousand words.
  """
  ON_FAIL flag
}

ACTION summarize_article {
  INPUT  article_id: string REQUIRED
  OUTPUT summary: string
  AI "Summarize the article titled {{article.title}}. Two sentences."
}

ACTION proofread_text {
  INPUT  article_id: string REQUIRED
  OUTPUT corrections: text
  IMPL "proofread_via_grammar_check"
}

ACTION verify_claims {
  INPUT  article_id: string REQUIRED
  OUTPUT verified: bool
  AI "Identify factual claims in {{article.body}}. For each, indicate whether it is verifiable from the cited sources."
}

ACTION publish_to_channel {
  INPUT  article_id: string REQUIRED
  OUTPUT channel_post_id: string
  IMPL "publish_to_feed"
}

WORKFLOW publish_article {
  STEPS {
    summarize:    summarize_article
    proofread:    proofread_text       DEPENDS_ON summarize
    fact_check:   verify_claims        DEPENDS_ON summarize
    push_to_feed: publish_to_channel   DEPENDS_ON proofread, fact_check
  }
  SPC_SAMPLE 10
}
```

What this source produces, after compilation, is an application whose ingestion endpoint runs the `ingest_submission` pipeline against incoming `Submission` records, applies `submission_intake` as a quality gate to reject material that does not meet the criterion, applies `draft_quality` as a quality gate to flag drafts that need human review, persists surviving drafts as `Article` records in the `draft` state, exposes them through the generated CRUD UI for editor review, lets an editor transition them through the lifecycle by the legal transitions and only the legal transitions, and runs the `publish_article` workflow on approval — `summarize` first, then `proofread` and `verify_claims` in parallel, then `publish_to_channel` once both gates have passed. Every quality decision is logged with its justification. Every workflow execution is auditable step by step. Every tenth workflow run is flagged for SPC review. The vault carries the produced articles into the analysis tool, the search tool, and any other Agicore application that declares the same `VAULT { PATH ... }`. The author wrote less than a hundred lines of DSL. The hand-wired equivalent — pipeline runtime, QC infrastructure, state-machine enforcement, workflow executor, audit pipeline, vault interop — would run to several thousand lines of subtly-coupled code that no team has the time to keep coherent across the years that a production system lives.

This is what the orchestration layer is for. The application layer makes individual operations declarable; the orchestration layer makes the coordination between operations declarable; the static validator and the two-compiler property carry the same correctness guarantees through the larger surface area. The declarations rhyme with their TPS antecedents on purpose. `PIPELINE` is a production line. `QC` is a poka-yoke gate. `STAGES` is the standardized work that constrains how an artifact moves through the line. `WORKFLOW` is the multi-line orchestration that coordinates parallel stations. `VAULT` is the shared inventory substrate that downstream lines draw from. The inheritance is structural — Agicore is named after the andon cord — and the declarations are the operational form the inheritance takes in code.

A note on the choice between `WORKFLOW` and `PIPELINE` is worth making explicit, because the two are sometimes confused on first reading. The discriminator is not the number of steps; either declaration scales from two to dozens. The discriminator is the shape of the dependency graph and the homogeneity of the inter-step contract. `PIPELINE` is correct when the relationship between adjacent stages is "output of stage N becomes input of stage N+1" and when that relationship is naturally typed — when the compiler can check at build time that adjacent stages agree on the type of the artifact passing between them. `WORKFLOW` is correct when the relationship between steps is "this step needs that step's result, but multiple steps can run once their dependencies are satisfied" and when the steps may produce heterogeneous outputs that downstream steps reference by name. A pipeline whose stages produce three different types belongs as a workflow. A workflow whose dependency graph is a strict chain may be better expressed as a pipeline. In practice, a complex application uses both: workflows orchestrate the coarse-grained processes (publish-an-article, onboard-a-customer, close-an-order), and pipelines handle the data-shaped sub-stages (ingest-bytes-into-records, transform-records-into-embeddings, classify-records-into-categories) that those workflows invoke as steps.

A second note concerns the runtime semantics of `QC` and the design choice to express criteria in natural language. The decision is consequential and worth defending. A QC criterion expressed as a deterministic Rust predicate has the property of being free at evaluation time and exact in its acceptance/rejection semantics; the property is desirable when the criterion can be expressed exactly. The criteria that genuinely matter in cognitive pipelines — "is this chunk semantically coherent," "is this article free of factual errors," "does this customer message express frustration" — cannot be expressed exactly. They can be approximated by hand-coded heuristics whose failure modes are subtle and accumulate over time, or they can be expressed in language a domain expert understands and evaluated by a small fast AI model whose decisions are logged with full justification. Agicore takes the second path. The cost is per-item latency and per-item dollars. The benefit is that the criterion is auditable in the language the domain operates in, modifiable by the people who own the policy, and improvable over time as the domain's understanding of quality evolves. The tradeoff is the right one for the class of problems the orchestration layer addresses, and the framework gives the author the choice — a `QC` block whose criterion happens to be exactly expressible in Rust can call out to a `PROCESS` function instead of a natural-language `CRITERIA`, falling through to the deterministic path when that path is available.

A third note concerns `STAGES` as a substrate for regulatory compliance. The exhaustive-enumeration discipline is not merely a hygiene choice; it is the property that makes the generated state machine usable as evidence in regulated industries. A finance application whose order lifecycle is declared as a `STAGES` block can be read by a compliance officer, compared against the regulation's prescribed lifecycle, and verified to match. A medical-records application whose record lifecycle is declared as a `STAGES` block can be audited against HIPAA's required state transitions. The same property — readable by a non-engineer, mechanically enforced by the compiler — applies to the rest of the orchestration layer. Workflows that the compiler can prove are acyclic are workflows that cannot deadlock. Pipelines whose adjacent stages the compiler has type-checked are pipelines whose intermediate failures cannot corrupt downstream stages. Quality gates whose criteria are natural language are quality gates that domain auditors can read and approve. The orchestration layer is, in operational terms, the substrate that turns a Tauri application into something a regulator can certify.

A fourth note concerns the `VAULT` declaration and the architectural choice to use shared SQLite over a service-oriented alternative. The temptation in a distributed-systems education is to reach for a message broker, a microservice, or a shared API. Each of these is the correct answer for some problem. None of them is the correct answer for "multiple desktop applications on the same machine need read-write access to a shared set of assets." Shared SQLite is the answer in that case because it has the operational properties — local, fast, ACID, zero configuration, file-based — that the use case requires and none of the operational properties — separate process, network surface area, deployment lifecycle, version coordination — that the use case does not. The vault is a quiet example of choosing the right tool for the right scale. When the scale grows — when applications run on different machines, when the asset volume exceeds local disk, when concurrent access exceeds SQLite's writer limit — the architecture has clean substitution points: the `VaultPool` interface is mockable, the table schema is documented, the migration files are versioned. The shared-SQLite vault is the right starting point, and the framework's design preserves the option to grow past it without rewriting the declarations that consume it.

The next chapter develops the third declaration layer — the expert system. There the focus shifts from coordination to reasoning: rules that fire on entity changes, facts that encode policy constants, patterns that detect temporal sequences, scores that quantify readiness, and modules that activate rules conditionally on score. The line between orchestration and expert system is the line between "do these things in this order" and "decide what to do based on what you observe." Agicore handles both. The expert system layer is the place where AI's pattern-finding strength is committed to the build-time artifact — the rules — while the rules themselves execute deterministically at runtime, paying the AI cost exactly once and amortizing across every execution.
