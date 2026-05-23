# Agicore DSL Reference

> **Practitioner's Reference** — For the formal grammar specification, see `dsl/grammar.md`. This document is for everyday use: every declaration type, clear syntax, realistic examples.

---

## Table of Contents

**Application Layer:** [APP](#app) · [ENTITY](#entity) · [ACTION](#action) · [VIEW](#view) · [AI_SERVICE](#ai_service) · [TEST](#test) · [PREFERENCE](#preference)

**Orchestration Layer:** [WORKFLOW](#workflow) · [PIPELINE](#pipeline) · [QC](#qc) · [VAULT](#vault) · [STAGES](#stages)

**Expert System Layer:** [RULE](#rule) · [FACT](#fact) · [STATE](#state) · [PATTERN](#pattern) · [SCORE](#score) · [MODULE](#module)

**Cooperative Intelligence Layer:** [REASONER](#reasoner) · [TRIGGER](#trigger) · [CHANNEL](#channel) · [PACKET](#packet) · [ROUTER](#router) · [SKILL](#skill) · [SKILLDOC](#skilldoc) · [LIFECYCLE](#lifecycle) · [BREED](#breed) · [COGNITION_ROLE](#cognition_role) · [ESCALATION_CHAIN](#escalation_chain) · [QC_MESH](#qc_mesh)

**Semantic Infrastructure Layer:** [IDENTITY](#identity) · [FEED](#feed) · [AUTHORITY](#authority)

**Adaptive Intelligence Layer:** [EVENT](#event) · [NBVE](#nbve) · [CONTRACT](#contract) · [REPUTATION](#reputation) · [SUBSCRIPTION](#subscription) · [DISPUTE](#dispute)

**Semantic Operating Environment:** [SESSION](#session) · [COMPILER](#compiler) · [SEMANTIC MEMORY](#semantic-memory)

**Ambient + Embedded Layer:** [NODE](#node) · [SENSOR](#sensor) · [ZONE](#zone) · [MESH](#mesh) · [ACTUATOR](#actuator) · [PLATFORM](#platform) · [NULLCLAW](#nullclaw) · [BRAIN_BODY](#brain_body)

**Deployment Layer:** [TARGET](#target) · [AUTH](#auth) · [TENANT](#tenant)

**Primitives:** [MACRO](#macro) · [MACRO_REGISTRY](#macro_registry) · [LOG](#log) · [THEME](#theme) · [SEED](#seed) · [TYPE](#type)

---

## Application Layer

---

## APP

Defines application-level configuration: window geometry, display title, and the SQLite database file.

```
APP <name> {
  TITLE "Display Title"
  WINDOW 1200x800
  WINDOW 1200x800 frameless
  DB database.db
}
```

```agicore
APP NovaSyn {
  TITLE "NovaSyn Studio"
  WINDOW 1440x900 frameless
  DB novasyn.db
}
```

Every `.agi` project has exactly one `APP` declaration. The `DB` path is relative to the app's data directory. `frameless` removes the OS title bar — use when you want to control chrome entirely from your `VIEW` declarations.

---

## ENTITY

Declares a persistent data model. Generates a SQL table, Rust struct, TypeScript type, Zustand store slice, and full CRUD UI components.

```
ENTITY <Name> {
  <field_name> <type> [DEFAULT <value>]
  BELONGS_TO <OtherEntity>
  HAS_MANY <OtherEntity>
}
```

Supported types: `String`, `Int`, `Float`, `Bool`, `Text`, `DateTime`.

The `id` (UUID v4), `created_at`, and `updated_at` fields are always generated — do not declare them manually.

```agicore
ENTITY Article {
  title String DEFAULT "Untitled"
  body Text
  status String DEFAULT "draft"
  word_count Int DEFAULT 0
  published_at DateTime
  BELONGS_TO Author
  HAS_MANY Comment
}
```

`BELONGS_TO` adds a foreign key column (`author_id`) and a typed join in the generated Rust layer. `HAS_MANY` adds a reverse-relation query. Field defaults are applied at the database level and in generated form components.

---

## ACTION

A named operation with typed input and output. Two modes: `AI` (calls an LLM with a prompt template) or deterministic (custom Rust implementation via `IMPL`).

```
ACTION <Name> {
  INPUT  { <field> <type> }
  OUTPUT { <field> <type> }

  // AI mode:
  AI_SERVICE <ServiceName>
  PROMPT """
    Your prompt with {{field_name}} interpolation.
  """

  // Deterministic mode:
  IMPL "<rust_function_name>"
}
```

```agicore
ACTION SummarizeArticle {
  INPUT  { body Text }
  OUTPUT { summary String }

  AI_SERVICE ClaudeService
  PROMPT """
    Summarize the following article in two sentences.

    Article:
    {{body}}
  """
}
```

`ACTION` generates a Tauri command on the Rust side and a typed `invoke` wrapper in TypeScript. Use `AI` mode for any operation where the logic is expressed in natural language; use `IMPL` when you need deterministic, auditable computation. `{{field_name}}` interpolation works for any `INPUT` field.

---

## VIEW

Declares a UI screen bound to an entity. The compiler generates the full component tree from the layout type.

```
VIEW <Name> {
  ENTITY <EntityName>
  LAYOUT table | form | document_editor | settings | dashboard
  CURRENT          // track selected entity globally
  ACTIONS [<ActionName>, ...]
}
```

Layout options:
- `table` — paginated list with inline CRUD controls
- `form` — single-entity create/edit form
- `document_editor` — split pane: list on left, editor on right
- `settings` — flat key-value management panel
- `dashboard` — summary cards from aggregated entity data

```agicore
VIEW ArticleEditor {
  ENTITY Article
  LAYOUT document_editor
  CURRENT
  ACTIONS [SummarizeArticle, PublishArticle]
}
```

`CURRENT` means the selected `Article` is stored in global state and accessible by other views and `REASONER` declarations without an explicit parameter. `ACTIONS` controls which operation buttons appear in the view toolbar; omit to show no action buttons.

---

## AI_SERVICE

Configures an AI provider connection. Multiple `AI_SERVICE` declarations are allowed — reference each by name from `ACTION` or `ROUTER`.

```
AI_SERVICE <Name> {
  MODEL  "<model-id-string>"
  PROVIDER anthropic | openai | google | xai
}
```

```agicore
AI_SERVICE ClaudeService {
  MODEL    "claude-sonnet-4-6"
  PROVIDER anthropic
}

AI_SERVICE GeminiService {
  MODEL    "gemini-2.0-flash"
  PROVIDER google
}
```

API keys are not stored in the `.agi` file — they are read from the `VAULT` at runtime. Declaring multiple services enables multi-model workflows and `ROUTER` fallback chains without code changes.

---

## TEST

Declares an integration test against a real SQLite instance. `GIVEN` seeds data; `EXPECT` asserts outcomes.

```
TEST <Name> {
  GIVEN {
    <EntityName> { <field>: <value>, ... }
  }
  EXPECT {
    create   <EntityName> { <field>: <value>, ... }
    get_by_id <EntityName> <id_expr>
    update   <EntityName> { id: <id_expr>, <field>: <value> }
    delete   <EntityName> <id_expr>
  }
}
```

```agicore
TEST ArticleCRUD {
  GIVEN {
    Author { id: "a1", name: "Ada Lovelace" }
  }
  EXPECT {
    create Article { title: "Notes on the Engine", author_id: "a1", status: "draft" }
    get_by_id Article "auto"
    update Article { id: "auto", status: "published" }
    delete Article "auto"
  }
}
```

Generates a Rust `#[cfg(test)]` integration test. `"auto"` resolves to the ID produced by the preceding `create` step. Tests run against a temporary in-memory database — no teardown required.

---

## PREFERENCE

A user-facing setting that the app exposes in a generated preferences UI and persists to local storage. Lighter-weight than an `ENTITY` — no SQL table, no CRUD, just a typed key with a default.

```
PREFERENCE <name> {
  TYPE     string | number | bool | enum(<v1>, <v2>, …)
  DEFAULT  <value>
  LABEL    "<human-facing label>"
  DESCRIPTION "<one-line help text>"
  SCOPE    user | workspace | session   // optional, defaults to user
}
```

```agicore
PREFERENCE default_model {
  TYPE        enum("claude-sonnet-4-6", "claude-opus-4-7", "gpt-5", "gemini-2.5-pro")
  DEFAULT     "claude-sonnet-4-6"
  LABEL       "Default model"
  DESCRIPTION "Used when no model is explicitly chosen for a chat."
}

PREFERENCE temperature {
  TYPE     number
  DEFAULT  0.7
  LABEL    "Sampling temperature"
}
```

Generates a TypeScript constant, a typed `usePreference()` hook, and a row in the auto-generated `SettingsView`. `SCOPE user` persists to `localStorage`; `workspace` and `session` are reserved for multi-tenant / per-session overrides.

---

## Orchestration Layer

---

## WORKFLOW

A multi-step processing pipeline. Steps reference `ACTION` declarations and execute in dependency order; independent steps run in parallel automatically.

```
WORKFLOW <Name> {
  STEPS {
    <step_name>: <ActionName> [DEPENDS_ON <step_name>]
  }
  SPC_SAMPLE <n>    // optional: sample every nth run for quality monitoring
}
```

```agicore
WORKFLOW PublishArticle {
  STEPS {
    summarize:  SummarizeArticle
    proofread:  ProofreadText    DEPENDS_ON summarize
    publish:    PushToFeed       DEPENDS_ON proofread
  }
  SPC_SAMPLE 10
}
```

Steps without `DEPENDS_ON` run concurrently in the first BFS wave. The generated UI shows a live step-by-step execution trace with status indicators. `SPC_SAMPLE` enables Statistical Process Control — every nth workflow run is flagged for quality review.

---

## PIPELINE

A streaming data-processing chain. Nodes connect with `->` and contract their input/output types.

```
PIPELINE <Name> {
  <NodeName> {
    INPUT  <type>
    OUTPUT <type>
    PROCESS "<rust_function>"
  }
  <NodeA> -> <NodeB> -> <NodeC>
}
```

```agicore
PIPELINE DocumentIngest {
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

Designed for document processing, ETL, and transformation chains where each stage has a defined type contract. The compiler validates that adjacent nodes have compatible `OUTPUT`/`INPUT` types at build time.

---

## QC

A quality-control node that evaluates pipeline output against natural-language standards before passing data downstream.

```
QC <Name> {
  CRITERIA """
    <natural language evaluation standard>
  """
  ON_FAIL drop | retry | flag
}
```

```agicore
QC ChunkQuality {
  CRITERIA """
    Each text chunk must be between 100 and 500 words.
    Chunks must not split mid-sentence.
    Chunks containing only whitespace or punctuation are rejected.
  """
  ON_FAIL flag
}
```

Insert a `QC` node between pipeline stages to validate intermediate output. `drop` removes failing items silently; `retry` reruns the preceding node once; `flag` passes the item downstream with a quality warning attached.

---

## VAULT

An encrypted key-value store for secrets and sensitive configuration. Generates a secure Tauri backend with OS keychain integration.

```
VAULT <Name> {
  KEY <key_name> String
}
```

```agicore
VAULT AppSecrets {
  KEY anthropic_api_key String
  KEY openai_api_key     String
  KEY database_password  String
}
```

Keys are stored in the OS keychain (Keychain on macOS, Credential Manager on Windows, Secret Service on Linux). Values are never written to disk in plaintext. Reference vault keys in `AI_SERVICE` and `ACTION` declarations by name — the compiler wires the retrieval automatically.

---

## STAGES

A lightweight finite state machine for entities or workflows. Declares the set of legal states and the legal transitions between them, generating an exhaustive Rust enum + a transition-table guard.

```
STAGES <Name> {
  <state1> -> <state2>
  <state1> -> <state2> / <state3> / <state4>        // branching: a → b, a → c, a → d
  <state1> -> <state2> -> <state3> -> <state4>      // chain: sugar for n-1 transitions
}

// Inline (on an ENTITY):
ENTITY <Name> {
  …fields…
  STAGES [<state1>, <state2>, <state3>]
}
```

```agicore
STAGES OrderLifecycle {
  draft -> submitted
  submitted -> approved / rejected / pending_review
  approved -> fulfilled -> closed
  rejected -> closed
}

ENTITY Article {
  title: string
  body:  text
  STAGES [draft, in_review, published, archived]
}
```

Soft-keyword state names are allowed — `open`, `pending`, `closed`, `define` all work as states even though they're DSL keywords elsewhere. The compiler generates a `${Name}State` enum, a `${Name}Transitions` map, and a `try_transition(from, to)` guard that returns `Err` on illegal transitions. Use `STAGES` whenever an entity has a finite, auditable lifecycle.

---

## Expert System Layer

---

## RULE

An if-then production rule. Fires when all `CONDITIONS` match; executes all `ACTIONS`.

```
RULE <Name> {
  CONDITIONS {
    <EntityName>.<field> <op> <value>
  }
  ACTIONS {
    SET <EntityName>.<field> = <value>
    TRIGGER <ActionName>
    EMIT <event_name>
  }
}
```

```agicore
RULE FlagStaleArticle {
  CONDITIONS {
    Article.status == "draft"
    Article.updated_at < NOW() - 7days
  }
  ACTIONS {
    SET Article.status = "stale"
    EMIT article_went_stale
  }
}
```

Rules are evaluated by the inference engine whenever relevant entity fields change. Operators: `==`, `!=`, `<`, `>`, `<=`, `>=`, `contains`, `matches`. Multiple conditions are implicitly ANDed.

---

## FACT

A declared domain truth, asserted into the working memory of the expert system. Rules can match against facts.

```
FACT <Name> {
  <field> <type> = <value>
}
```

```agicore
FACT PublishingPolicy {
  max_draft_age_days Int     = 7
  require_summary    Bool    = true
  min_word_count     Int     = 300
}
```

Facts are static assertions that rules can read as constants. Use facts to externalize policy thresholds so rules stay readable when limits change. Facts can be retracted and re-asserted at runtime via generated Tauri commands.

---

## STATE

A named node in a finite state machine. `TRANSITIONS` define valid moves to other states with optional guard conditions.

```
STATE <Name> {
  TRANSITIONS {
    -> <TargetState> [WHEN <condition>]
  }
}
```

```agicore
STATE ArticleDraft {
  TRANSITIONS {
    -> ArticleReview  WHEN word_count > 300
    -> ArticleDeleted
  }
}

STATE ArticleReview {
  TRANSITIONS {
    -> ArticlePublished WHEN approved == true
    -> ArticleDraft
  }
}
```

State machines are bound to an entity via a `String` field (e.g., `status`). The compiler generates a validated transition function — invalid moves are rejected at runtime. Use `STATE` whenever an entity follows a defined lifecycle.

---

## PATTERN

A named matching template that detects sequences of events or facts. Used with `RULE` to trigger on complex temporal or structural conditions.

```
PATTERN <Name> {
  SEQUENCE {
    <event_or_fact> [WITHIN <duration>]
  }
}
```

```agicore
PATTERN RapidRejectionPattern {
  SEQUENCE {
    Article.status -> "review"
    Article.status -> "draft"   WITHIN 1hour
    Article.status -> "review"  WITHIN 24hours
  }
}
```

Patterns are stateful — the engine tracks partial matches across events. Reference a pattern by name in a `RULE` condition to fire when the full sequence completes. Useful for detecting loops, escalations, or abuse conditions.

---

## SCORE

A numeric scoring function over entity fields. Generates a Rust function that computes a weighted sum for ranking or routing.

```
SCORE <Name> {
  TARGET <EntityName>
  WEIGHTS {
    <field> * <weight>
  }
  NORMALIZE Bool
}
```

```agicore
SCORE ArticleReadiness {
  TARGET Article
  WEIGHTS {
    word_count      * 0.4
    has_summary     * 0.3
    image_count     * 0.2
    revision_count  * 0.1
  }
  NORMALIZE true
}
```

`NORMALIZE true` scales the result to [0.0, 1.0]. Scores are recomputed on field change and stored on the entity. Use scores for inbox prioritization, `MODULE` activation thresholds, and `ROUTER` tier selection.

---

## Cooperative Intelligence Layer

---

## REASONER

A periodic AI analysis loop. Runs on a schedule, reads from the database, and writes results back — the "always-on" background intelligence.

```
REASONER <Name> {
  SCHEDULE "<cron>" | EVERY <duration>
  READ    <EntityName>
  WRITE   <EntityName>
  AI_SERVICE <ServiceName>
  PROMPT """
    <analysis prompt with {{field}} interpolation>
  """
}
```

```agicore
REASONER ContentHealthMonitor {
  EVERY 1hour
  READ    Article
  WRITE   Article
  AI_SERVICE ClaudeService
  PROMPT """
    Review the following articles and identify any that are
    factually inconsistent, stylistically weak, or overdue for
    an update. Return structured feedback for each.

    Articles: {{articles}}
  """
}
```

`REASONER` runs in a background Tauri thread — it does not block the UI. `READ` and `WRITE` control database access scope for auditability. Use `REASONER` for monitoring, trend detection, or any analysis that should run continuously without user initiation.

---

## TRIGGER

A reactive event binding. Fires when a condition becomes true — entity lifecycle events, field threshold crossings, or elapsed time.

```
TRIGGER <Name> {
  ON <EntityName>.<event>     // created | updated | deleted
  ON <EntityName>.<field> <op> <value>
  AFTER <duration>
  DEBOUNCE <duration>
  RATE_LIMIT <n> per <duration>
  FIRE <ActionName> | EMIT <event_name>
}
```

```agicore
TRIGGER NotifyOnPublish {
  ON Article.status == "published"
  DEBOUNCE 5s
  FIRE SendPublishNotification
}
```

`DEBOUNCE` collapses rapid repeated triggers into one. `RATE_LIMIT` caps how often the trigger can fire in a window. Use `TRIGGER` for reactive side-effects that should not require user interaction — notifications, cache invalidation, downstream sync.

---

## CHANNEL

A typed message-passing bus between modules. Messages must conform to a `PACKET` schema.

```
CHANNEL <Name> {
  PACKET <PacketName>
  PATTERN pub_sub | request_reply
}
```

```agicore
CHANNEL ArticleEvents {
  PACKET ArticleEventPacket
  PATTERN pub_sub
}
```

Channels are in-process by default; future versions will support cross-process and networked channels. Publishers emit packets; subscribers receive them. Invalid packets (schema mismatch) are rejected before delivery and written to the audit log.

---

## PACKET

A typed payload contract for `CHANNEL` messages. Defines required fields, types, TTL, and optional validation conditions.

```
PACKET <Name> {
  <field> <type>
  TTL <duration>
  CONDITION <validation_expr>
}
```

```agicore
PACKET ArticleEventPacket {
  article_id  String
  event_type  String
  triggered_by String
  TTL 30s
  CONDITION event_type IN ["published", "rejected", "stale"]
}
```

`TTL` causes expired packets to be dropped rather than delivered late. `CONDITION` is evaluated at emit time — invalid packets never enter the channel. Every rejected packet is written to the audit trail with the failing condition.

---

## ROUTER

Multi-tier AI routing with automatic fallback. Tiers define model priority; circuit breakers prevent cascading failures.

```
ROUTER <Name> {
  TIER <n> {
    AI_SERVICE <ServiceName>
    TIMEOUT <duration>
    RETRIES <n>
  }
  CIRCUIT_BREAKER threshold: <n>, window: <duration>
}
```

```agicore
ROUTER AIRouter {
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

If tier 1 exhausts its retries, the router automatically promotes to tier 2. The circuit breaker opens after `threshold` failures within `window`, stopping requests to the failed tier until the window resets. Reference a `ROUTER` from `ACTION` instead of a direct `AI_SERVICE` for resilient production deployments.

---

## SKILL

A reusable, versioned capability declaration with a typed interface. Skills are composed into `SKILLDOC` libraries.

```
SKILL <Name> {
  VERSION "<semver>"
  INPUT  { <field> <type> }
  OUTPUT { <field> <type> }
  IMPL "<rust_function>" | AI_SERVICE <ServiceName>
}
```

```agicore
SKILL ExtractKeywords {
  VERSION "1.0.0"
  INPUT  { text Text }
  OUTPUT { keywords [String] }
  AI_SERVICE ClaudeService
}
```

Skills differ from `ACTION` in that they are library primitives — composable, versioned, and shared across multiple workflows. Use `ACTION` for application-specific operations; use `SKILL` for generic capabilities you expect to reuse or publish.

---

## SKILLDOC

A library of related `SKILL` declarations. Generates a typed skill registry and dispatch layer.

```
SKILLDOC <Name> {
  VERSION "<semver>"
  SKILLS [<SkillName>, ...]
}
```

```agicore
SKILLDOC ContentSkills {
  VERSION "1.2.0"
  SKILLS [
    ExtractKeywords,
    SummarizeText,
    DetectTone,
    CheckReadability
  ]
}
```

`SKILLDOC` is the unit of distribution — a versioned package of skills. The generated registry exposes each skill as a typed callable. Reference a `SKILLDOC` from `WORKFLOW` steps to use its skills without importing individual skill names.

---

## LIFECYCLE

A declarative graduation curve for cognition assets. Defines how a primitive (skill, packet schema, reasoner) matures from `experimental` → `stable` → `production` based on observed quality, age, and usage.

```
LIFECYCLE <Name> {
  TARGET    <SkillName | PacketName | ReasonerName>
  STAGES    [experimental, stable, production, deprecated]
  PROMOTE_WHEN { uses >= <n>, success_rate >= <pct>, age >= <duration> }
  DEMOTE_WHEN  { success_rate < <pct> }
}
```

```agicore
LIFECYCLE SummarizeSkillLifecycle {
  TARGET    SummarizeText
  STAGES    [experimental, stable, production]
  PROMOTE_WHEN { uses >= 500, success_rate >= 0.95, age >= 30d }
  DEMOTE_WHEN  { success_rate < 0.90 }
}
```

Generates a SQLite `lifecycle_state` row per target and a daily evaluator that promotes / demotes based on the observed metrics. Use `LIFECYCLE` to make graduation explicit rather than implicit — "is this skill ready for production traffic?" becomes a measured, automated decision.

---

## BREED

An evolutionary reproduction declaration — fork a primitive into variants, run them in parallel under `NBVE`, and let the system promote the winner. The DSL analog of A/B testing for AI artifacts.

```
BREED <Name> {
  PARENT      <SkillName | PromptName | ReasonerName>
  VARIANTS    <n>
  MUTATIONS   [<mutation_strategy>, ...]
  EVALUATE_BY <MetricName | ScoreName>
  KEEP        top_<n>
}
```

```agicore
BREED SummarizerEvolution {
  PARENT      SummarizeText
  VARIANTS    5
  MUTATIONS   [temperature_jitter, prompt_rephrase, model_swap]
  EVALUATE_BY summary_quality_score
  KEEP        top_2
}
```

Generates a per-variant runner under the parent's `NBVE` envelope. The two highest-scoring variants survive into the next generation; the rest are archived. Use `BREED` for primitives that you suspect can be optimized empirically faster than they can be designed.

---

## COGNITION_ROLE

A declared role in the org-chart of cognition: which models are eligible to do which kind of work, with an SPC quality floor and tier-based cost ceiling.

```
COGNITION_ROLE <Name> {
  TIER           1 | 2 | 3              // 1=cheapest, 3=premium
  MODELS         [<model_id>, ...]
  SPC_FLOOR      <0.0-1.0>              // minimum acceptable quality
  HANDLES        [<TaskTag>, ...]
  ESCALATE_TO    <RoleName>             // optional
}
```

```agicore
COGNITION_ROLE FrontlineSummarizer {
  TIER       1
  MODELS     ["claude-haiku-4-5", "gemini-2.5-flash"]
  SPC_FLOOR  0.85
  HANDLES    [summarize, extract_keywords]
  ESCALATE_TO SeniorSummarizer
}

COGNITION_ROLE SeniorSummarizer {
  TIER       3
  MODELS     ["claude-opus-4-7"]
  SPC_FLOOR  0.95
  HANDLES    [summarize, extract_keywords, hard_edge_case]
}
```

Generates a `cheapestViableRole(task, qualityNeeded)` helper plus a SQL metrics view. The runtime starts every task at the cheapest viable tier and lets `ESCALATION_CHAIN` promote when SPC drops below the floor.

---

## ESCALATION_CHAIN

The dynamic-model escalation engine. Walks `COGNITION_ROLE` rungs upward when SPC drops below a role's floor; de-escalates when stability returns.

```
ESCALATION_CHAIN <Name> {
  ROLES         [<Role1>, <Role2>, …]    // ordered cheapest → premium
  ESCALATE_ON   spc_drop | error | timeout
  DE_ESCALATE_AFTER <stable_window>
  COOLDOWN      <duration>               // optional, debounces flapping
}
```

```agicore
ESCALATION_CHAIN SummarizationChain {
  ROLES             [FrontlineSummarizer, MidTierSummarizer, SeniorSummarizer]
  ESCALATE_ON       spc_drop
  DE_ESCALATE_AFTER 50_runs_above_floor
  COOLDOWN          15m
}
```

Generates a stateful `ChainEngine` that the runtime asks "which role should I use right now?" before each task. Pair with `NBVE CHAIN <Name>` to make a shadow runner participate in the chain's promotion decisions.

---

## QC_MESH

A distributed quality-control mesh. Aggregates `QC` signals across nodes and surfaces a global stability score plus per-node contribution metrics.

```
QC_MESH <Name> {
  NODES        [<NodeName>, ...]
  AGGREGATE    avg | min | weighted
  WEIGHTS      { <NodeName>: <0.0-1.0>, ... }   // when AGGREGATE = weighted
  ALERT_BELOW  <0.0-1.0>
}
```

```agicore
QC_MESH ContentQualityMesh {
  NODES        [SummarizerNode, ProofreaderNode, FactCheckerNode]
  AGGREGATE    weighted
  WEIGHTS      { SummarizerNode: 0.5, ProofreaderNode: 0.3, FactCheckerNode: 0.2 }
  ALERT_BELOW  0.85
}
```

Generates a SQL view (`qc_mesh_state`) that joins per-node QC samples and exposes a single rollup score. The compiler wires alert emission to the channel registered for `ALERT_BELOW` breaches.

---

## Semantic Infrastructure Layer

---

## IDENTITY

A creator-owned decentralized identity (DID). Generates deterministic signing keys, a DID document, and cryptographic proof functions.

```
IDENTITY <Name> {
  DID_METHOD key | web
  DISPLAY_NAME "<name>"
  LINKED_DOMAIN "<url>"
}
```

```agicore
IDENTITY AuthorIdentity {
  DID_METHOD web
  DISPLAY_NAME "Christopher Bender"
  LINKED_DOMAIN "https://christopherbender.com"
}
```

Used for content attribution and ownership proof. The generated Rust layer can sign any entity or packet payload with the identity's private key. Verifiers can check signatures against the public DID document without contacting a central authority.

---

## FEED

An Atom 1.0 syndication feed generated from entity data. Maps entity fields to feed elements.

```
FEED <Name> {
  ENTITY <EntityName>
  FILTER <field> == <value>
  TITLE_FIELD    <field>
  SUMMARY_FIELD  <field>
  LINK_FIELD     <field>
  DATE_FIELD     <field>
  AUTHOR_FIELD   <field>
}
```

```agicore
FEED PublishedArticles {
  ENTITY Article
  FILTER status == "published"
  TITLE_FIELD   title
  SUMMARY_FIELD summary
  LINK_FIELD    canonical_url
  DATE_FIELD    published_at
  AUTHOR_FIELD  author_name
}
```

Generates a Tauri endpoint that returns a valid Atom 1.0 XML document. `FILTER` limits which entities appear in the feed. Use with `IDENTITY` to sign feed entries for verifiable attribution.

---

## AUTHORITY

Trust governance for channel message signing. Defines which identities are authorized to publish on which channels.

```
AUTHORITY <Name> {
  CHANNEL <ChannelName>
  ALLOW   <IdentityName>
  VERIFY  signature | did_document
}
```

```agicore
AUTHORITY ArticleChannelAuthority {
  CHANNEL ArticleEvents
  ALLOW   AuthorIdentity
  VERIFY  signature
}
```

The compiler generates a verification middleware that runs before packet delivery. Unauthorized publishers are rejected and logged. `VERIFY signature` checks cryptographic signatures; `VERIFY did_document` resolves the DID and checks the key list.

---

## Adaptive Intelligence Layer

---

## EVENT

A named async pub/sub event — the loosely-coupled middle ground between `TRIGGER` (direct fire) and `CHANNEL` (point-to-point routed message). Emit on one side; any number of subscribers (local or remote) listen.

```
EVENT <Name> {
  PAYLOAD     { <field>: <type>, ... }
  SUBSCRIBERS [<NodeName>, ...]         // optional: cross-node distribution
  RETAIN      <duration>                // optional: replay buffer
}
```

```agicore
EVENT ArticleSubmitted {
  PAYLOAD {
    article_id: string REQUIRED
    author_id:  string REQUIRED
    submitted_at: datetime
  }
  SUBSCRIBERS [EditorNode, ModerationNode]
  RETAIN 24h
}
```

Generates a Tauri event bus command (`emit_event`) + per-event TypeScript wrappers (`emitArticleSubmitted({...})`, `listenArticleSubmitted(cb)`). `SUBSCRIBERS` are cross-node listeners auto-wired through the `MESH`. Use `EVENT` for fan-out where the producer doesn't know (or care) who the consumers are.

---

## NBVE

**Non-Blocking Variant Evaluation.** Runs a cheaper/smaller model shadow-mode alongside the production model, gated by SPC thresholds — automatically promoting when quality meets the bar. The mechanism for progressive AI cost optimization without production risk.

```
NBVE <Name> {
  PRODUCTION  <model_id>
  CANDIDATE   <model_id>
  METRICS     [quality, latency, cost]
  SPC_FLOOR   <0.0-1.0>
  PROMOTION_WINDOW <n_runs>
  CHAIN       <EscalationChainName>     // optional: tie into a chain's promotion logic
}
```

```agicore
NBVE SummarizationDowngrade {
  PRODUCTION       "claude-sonnet-4-6"
  CANDIDATE        "claude-haiku-4-5"
  METRICS          [quality, latency, cost]
  SPC_FLOOR        0.92
  PROMOTION_WINDOW 200
  CHAIN            SummarizationChain
}
```

Generates a shadow runner class with `isReadyForPromotion()` and `getActiveModel()` methods. The candidate runs side-by-side, its outputs scored against production; once SPC stays above floor for `PROMOTION_WINDOW` runs, the candidate becomes production. Use to safely downshift cost or test new providers.

---

## CONTRACT

A machine-readable service agreement between parties. Generates a TypeScript schema, a SQLite lifecycle table (`draft → pending_signature → signed → active → completed | cancelled | disputed`), and Rust CRUD commands. Non-custodial — Agicore coordinates state; external providers move money.

```
CONTRACT <Name> {
  PARTIES      { <role_name>: <IdentityName>, ... }
  TERMS        { <term_name>: <type> = <default>, ... }
  DELIVERABLES [<description>, ...]
  PAYMENT      { amount: <number>, currency: <code>, provider: <ProviderName> }
  GOVERNANCE   <AuthorityName>
}
```

```agicore
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

Generates a SQLite `contracts` table with full lifecycle state, a Rust state-machine guard, and TypeScript invoke wrappers. Contract signing is logged with both parties' signatures via the linked `IDENTITY`s. Use for any structured B2B/B2C agreement that needs an auditable lifecycle.

---

## REPUTATION

SPC-driven trust scoring. Tracks metric samples per identity, applies decay, and emits a state transition (`new → maturing → mature`) once enough samples accumulate.

```
REPUTATION <Name> {
  SUBJECT   <IdentityName>
  METRICS   { <metric_name>: <type>, ... }
  SPC       { sample_size: <n>, control_limits: tight | normal | loose }
  DECAY     <half_life_duration>
}
```

```agicore
REPUTATION EditorialReputation {
  SUBJECT   EditorIdentity
  METRICS {
    on_time_rate:   float
    quality_score:  float
    revision_count: number
  }
  SPC       { sample_size: 30, control_limits: normal }
  DECAY     90d
}
```

Generates a SQLite `reputation_scores` table and a TypeScript `Tracker` class with `addSample()`, `getState()`, and `isEligibleForDecay()`. The `parseHalfLife()` utility turns `90d`, `6mo`, `1y` into seconds. Use to make trust quantitative and decay-aware rather than vibes-based.

---

## SUBSCRIPTION

Recurring creator support. Defines provider, subscriber, term, and payment in DSL; generates a typed config constant + SQLite subscriptions table + Rust CRUD.

```
SUBSCRIPTION <Name> {
  PROVIDER   <IdentityName>
  SUBSCRIBER <IdentityName>
  TERMS      { tier: <"name">, billing: monthly | annual, perks: [<perk_id>, ...] }
  PAYMENT    { amount: <number>, currency: <code>, provider: <ProviderName> }
}
```

```agicore
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

Generates a SQLite `subscriptions` table and Rust `create_subscription` / `list_subscriptions` / `cancel_subscription` commands. The `perks` array is typed as `readonly string[]`, so TypeScript code that gates a feature against `perks.includes('ad_free')` is autocomplete-safe.

---

## DISPUTE

Structured conflict resolution attached to a `CONTRACT`. Defines the legal state machine and the human-driven resolution path.

```
DISPUTE <Name> {
  CONTRACT      <ContractName>
  STATES        [opened, investigating, resolved, escalated]
  RESOLUTION    { mediator: <IdentityName>, outcome: refund | partial | dismissed }
  EVIDENCE      { allowed_types: [<type>, ...] }
}
```

```agicore
DISPUTE MissedDeadlineDispute {
  CONTRACT      MonthlyEditorial
  STATES        [opened, investigating, resolved, escalated]
  RESOLUTION    { mediator: ArbiterIdentity, outcome: refund | partial | dismissed }
  EVIDENCE      { allowed_types: ["screenshot", "log_export", "third_party_attestation"] }
}
```

Generates state + resolution union types, a `DisputeRecord` interface, and a `${Name}Transitions` map state machine. Wire `EVIDENCE.allowed_types` to your `PACKET` validation so the runtime rejects unsupported evidence submissions before they reach the human reviewer.

---

## SESSION

A semantic operating mode with persistent key-value memory. Encapsulates a set of views, AI context, and memory that survives restarts.

```
SESSION <Name> {
  VIEWS  [<ViewName>, ...]
  MEMORY <key> <type>
  AI_CONTEXT """
    <standing instructions for AI calls within this session>
  """
}
```

```agicore
SESSION WritingSession {
  VIEWS  [ArticleEditor, OutlineView, ResearchPanel]
  MEMORY last_article_id  String
  MEMORY writing_goal     String
  AI_CONTEXT """
    You are assisting a professional writer. Maintain their
    established voice: precise, authoritative, and direct.
    Do not add filler phrases or unnecessary hedging.
  """
}
```

Sessions are persisted to the database — memory keys survive app restarts. `AI_CONTEXT` is prepended to every AI call made within the session's views. Use sessions to give different application modes distinct AI personalities and state.

---

## MODULE

A composable expert-system bundle. Groups rules, facts, and reasoners; activates when its score threshold is met.

```
MODULE <Name> {
  SCORE_THRESHOLD <Float>
  SCORE_SOURCE    <ScoreName>
  RULES    [<RuleName>, ...]
  FACTS    [<FactName>, ...]
  REASONERS [<ReasonerName>, ...]
}
```

```agicore
MODULE EditorialQualityModule {
  SCORE_THRESHOLD 0.7
  SCORE_SOURCE    ArticleReadiness
  RULES    [FlagStaleArticle, RequireSummaryRule]
  FACTS    [PublishingPolicy]
  REASONERS [ContentHealthMonitor]
}
```

When `ArticleReadiness` score drops below 0.7, the module deactivates — its rules stop firing and its reasoners pause. This lets you express context-dependent behavior: the editorial quality system only runs when there is enough content to evaluate.

---

## SEMANTIC MEMORY

A cross-session shared intelligence store. Accumulates structured observations over time, queryable by semantic similarity.

```
SEMANTIC MEMORY <Name> {
  ENTITY    <EntityName>
  EMBED_FIELD <field>
  DIMENSIONS <n>
  RECALL    top_k: <n>
}
```

```agicore
SEMANTIC MEMORY ArticleMemory {
  ENTITY     Article
  EMBED_FIELD body
  DIMENSIONS 1536
  RECALL     top_k: 5
}
```

Each entity write triggers an embedding update. At query time, `RECALL` returns the top-k most semantically similar entities. Use semantic memory to give AI actions awareness of prior content — "what have we written about this topic before?"

---

## Ambient + Embedded Layer

---

## NODE

A processing node in a distributed cognition network. Declares typed inputs, outputs, and its processing function.

```
NODE <Name> {
  INPUT  { <field> <type> }
  OUTPUT { <field> <type> }
  PROCESS "<rust_function>"
  CONNECTS_TO [<NodeName>, ...]
}
```

```agicore
NODE SentimentAnalyzer {
  INPUT  { text Text }
  OUTPUT { sentiment String, confidence Float }
  PROCESS "analyze_sentiment"
  CONNECTS_TO [ToneClassifier, AlertRouter]
}
```

Nodes are the primitive unit of distributed cognition — analogous to a function in a dataflow graph. `CONNECTS_TO` defines the downstream topology. Use `ZONE` to group related nodes into a bounded subsystem.

---

## SENSOR

An environmental data source. Polls or subscribes to external data and emits typed events into the pipeline.

```
SENSOR <Name> {
  SOURCE  file | api | system | websocket
  TARGET  "<path_or_url>"
  POLL    <duration> | SUBSCRIBE
  EMIT    <PacketName>
}
```

```agicore
SENSOR ArticleFileWatcher {
  SOURCE file
  TARGET "/content/articles/*.md"
  SUBSCRIBE
  EMIT FileChangedPacket
}
```

`SUBSCRIBE` uses OS filesystem events for zero-latency detection; `POLL` checks on an interval. Emitted packets flow into the connected `CHANNEL`. Use sensors to bridge external reality — file changes, API webhooks, system metrics — into the pipeline.

---

## ZONE

A logical grouping of `NODE` and `SENSOR` declarations defining a bounded distributed cognition subsystem.

```
ZONE <Name> {
  NODES   [<NodeName>, ...]
  SENSORS [<SensorName>, ...]
  CHANNEL <ChannelName>
}
```

```agicore
ZONE ContentIntelligenceZone {
  NODES   [SentimentAnalyzer, ToneClassifier, AlertRouter]
  SENSORS [ArticleFileWatcher]
  CHANNEL ArticleEvents
}
```

Zones define isolation boundaries — nodes inside a zone share a channel and can be deployed, monitored, and scaled as a unit. Use zones to decompose a complex ambient intelligence system into understandable subsystems.

---

## MESH

A distributed compute fabric across `NODE`s. Declares the topology, governance, and accounting model for cross-node work — the unit that turns a single Tauri app into a cooperating cluster.

```
MESH <Name> {
  NODES        [<NodeName>, ...]
  TOPOLOGY     mesh | star | ring
  GOVERNS      <AuthorityName>
  ACCOUNTING   { credits_per_hour: <n>, reconcile: hourly | daily }
}
```

```agicore
MESH EditorialMesh {
  NODES      [WriterNode, EditorNode, ReviewerNode]
  TOPOLOGY   mesh
  GOVERNS    EditorialAuthority
  ACCOUNTING { credits_per_hour: 100, reconcile: daily }
}
```

Generates a SQLite `mesh_accounting` table, a TypeScript balance view (`getNodeBalance(nodeName)`), and per-node CONTRIBUTES rows that track who paid for whose compute. `CHANNEL OVERFLOW_TO` (a CHANNEL field) auto-routes messages to a sibling node when local pressure spikes. Use `MESH` when a system spans more than one runtime.

---

## ACTUATOR

A physical-world output device — motor, servo, relay, LED strip. Declares the safe state, the control surface, and the safety envelope.

```
ACTUATOR <Name> {
  TYPE        motor | servo | relay | led | speaker | display
  MODEL       "<part_number>"
  SAFE_STATE  <value>
  RANGE       { min: <n>, max: <n> }
  ZONE        <ZoneName>
}
```

```agicore
ACTUATOR DoorLock {
  TYPE        relay
  MODEL       "Sonoff-SV"
  SAFE_STATE  locked
  ZONE        EntrywayZone
}

ACTUATOR PanTiltMount {
  TYPE        servo
  MODEL       "MG996R"
  SAFE_STATE  centered
  RANGE       { min: -90, max: 90 }
  ZONE        SecurityCameraZone
}
```

Generates Rust command stubs (`set_${name}`, `${name}_to_safe()`) and a watchdog that returns the actuator to `SAFE_STATE` on connection loss. Use `ACTUATOR` for any physical output you need the deterministic runtime to govern.

---

## PLATFORM

The hardware platform an app is targeting — Raspberry Pi, ESP32, NVIDIA Jetson, generic Linux. Drives toolchain selection and pin assignments for `ACTUATOR`/`SENSOR`.

```
PLATFORM <Name> {
  ARCH        x86_64 | aarch64 | armv7 | riscv64 | esp32
  OS          linux | windows | macos | freertos | none
  PINS        { <peripheral>: <pin>, ... }
}
```

```agicore
PLATFORM EdgeNodeRPi5 {
  ARCH x86_64
  OS   linux
  PINS {
    door_lock_relay: GPIO17
    pan_servo:       GPIO18
    tilt_servo:      GPIO19
    temperature:     I2C_1
  }
}
```

Generates a `platform.rs` constants module and a build-time check that ensures the cargo target triple matches `ARCH`/`OS`. Use `PLATFORM` to make an embedded app's hardware contract explicit and machine-checked.

---

## NULLCLAW

Declares a NullClaw agent runtime — bounded tool bindings, model providers, and safety guards for autonomous-ish tasks where you DO want short loops of agentic behavior but only within a verified envelope.

```
NULLCLAW <Name> {
  PROVIDER    <AiServiceName>
  TOOLS       [<ToolName>, ...]
  MAX_STEPS   <n>
  HALT_ON     [low_confidence, budget_exceeded, tool_error]
  AUTHORITY   <AuthorityName>
}
```

```agicore
NULLCLAW ContentResearcher {
  PROVIDER  AnthropicService
  TOOLS     [WebSearch, FetchURL, SummarizeText]
  MAX_STEPS 8
  HALT_ON   [low_confidence, budget_exceeded, tool_error]
  AUTHORITY ResearchAuthority
}
```

Generates a Rust runtime with hard per-tool invocation limits, mandatory `MAX_STEPS` enforcement, and per-step audit logging. NullClaw is the deliberately-limited inverse of an open-ended agent loop — bounded, signed, governed.

---

## BRAIN_BODY

A "brain ↔ body" tether: pairs a `NULLCLAW` agent (the brain) with one or more `ACTUATOR`s + `SENSOR`s (the body) under a single `PLATFORM`. The unit of embodied cognition.

```
BRAIN_BODY <Name> {
  BRAIN       <NullclawName>
  BODY {
    ACTUATORS [<ActuatorName>, ...]
    SENSORS   [<SensorName>, ...]
  }
  PLATFORM    <PlatformName>
  TICK        <duration>
}
```

```agicore
BRAIN_BODY SecurityCameraRig {
  BRAIN     IntruderClassifier
  BODY {
    ACTUATORS [PanTiltMount, AlertLED]
    SENSORS   [WideAngleCamera, MotionPIR]
  }
  PLATFORM  EdgeNodeRPi5
  TICK      500ms
}
```

Generates the wiring code so the brain's outputs become actuator commands and the sensors' events stream into the brain on every `TICK`. Use `BRAIN_BODY` to compose physical-world systems out of the platform's declarative primitives.

---

## Semantic Operating Environment

---

## COMPILER

A semantic state transition. Transforms one session or entity type into another — chat to document, conversation to transcript, note to article.

```
COMPILER <Name> {
  FROM <SourceEntity | SessionName>
  TO   <TargetEntity | SessionName>
  EXTRACT {
    <target_field>: <source_field> | "<literal>" | <ActionName>
  }
  AI_SERVICE <ServiceName>
}
```

```agicore
COMPILER ChatToArticle {
  FROM ChatSession
  TO   Article
  EXTRACT {
    title:  ExtractTitle
    body:   ExtractBodyFromTranscript
    status: "draft"
  }
  AI_SERVICE ClaudeService
}
```

`EXTRACT` fields can pull directly from a source field, call an `ACTION` to derive the value, or set a literal. The compiler runs the extractions, validates the output against the target `ENTITY` schema, and writes the result to the database. Use `COMPILER` to make session artifacts (conversations, notes, brainstorms) first-class persistent entities.

---

## Deployment Layer

---

## TARGET

The compilation target an `.agi` file is destined for — desktop (Tauri), web (Axum + React), CLI, or bare-Rust library. Switches the codegen backend.

```
TARGET <Name> {
  KIND       desktop | web | cli | library
  RUNTIME    tauri | axum | rocket
  BUNDLE_AS  msi | dmg | appimage | docker | wasm
  HOST       "<bind_addr>"               // web only
  PORT       <n>                          // web only
}
```

```agicore
TARGET DesktopBundle {
  KIND      desktop
  RUNTIME   tauri
  BUNDLE_AS msi | dmg | appimage
}

TARGET WebService {
  KIND      web
  RUNTIME   axum
  BUNDLE_AS docker
  HOST      "0.0.0.0"
  PORT      3008
}
```

The compiler reads `TARGET` early to pick the codegen tree. Multiple `TARGET` declarations in one file produce multi-target bundles — the same `ENTITY`/`ACTION` core compiles to both a desktop app and a web service.

---

## AUTH

Declares how the app authenticates users. Generates middleware, route guards, and a session model.

```
AUTH <Name> {
  PROVIDER    oauth_google | oauth_github | magic_link | password | sso_saml
  SESSION     cookie | jwt | bearer
  TIMEOUT     <duration>
  REQUIRE     [<scope>, ...]              // optional, per-route gating
}
```

```agicore
AUTH UserLogin {
  PROVIDER oauth_google
  SESSION  jwt
  TIMEOUT  7d
  REQUIRE  [profile, email]
}
```

Generates auth routes (`/auth/login`, `/auth/callback`, `/auth/logout`), session middleware, and a typed `useAuth()` hook for the frontend. Combine with `TENANT` for multi-tenant isolation.

---

## TENANT

Multi-tenant isolation. Generates per-tenant row scoping on every `ENTITY` and rewrites queries to add the tenant predicate automatically.

```
TENANT <Name> {
  KEY          <field_name>            // e.g. organization_id
  SCOPE        all | [<EntityName>, ...]
  RESOLVE_FROM auth_session | header | subdomain
}
```

```agicore
TENANT OrgIsolation {
  KEY          organization_id
  SCOPE        all
  RESOLVE_FROM auth_session
}
```

The compiler adds `organization_id` to every entity table (or only the listed ones), wires every Tauri command / Axum route to extract the tenant from the request, and rejects cross-tenant access at the query layer. Use `TENANT` whenever an app holds data for more than one customer.

---

## Primitives

---

## MACRO

A compile-time helper that expands into one or more declarations. Lets you express common patterns once and reuse them.

```
MACRO <name>(<param>: <type>, ...) {
  <body — emits one or more declarations with ${param} interpolation>
}

// Invocation site:
@<name>(<arg>, ...)
```

```agicore
MACRO timestamped_entity(name: identifier, fields: block) {
  ENTITY ${name} {
    ${fields}
    created_at: datetime DEFAULT now()
    updated_at: datetime DEFAULT now()
  }
}

@timestamped_entity(Article, {
  title: string REQUIRED
  body:  text
})
```

Macros are expanded by the lexer before parsing — the resulting AST is identical to hand-writing the expanded form. Use `MACRO` for cross-cutting patterns (timestamps, audit fields, soft-delete columns) that would otherwise be repeated on dozens of entities.

---

## MACRO_REGISTRY

A registry of macros distributable as a package — the `SKILLDOC` of `MACRO`. Generates a versioned import surface so other apps can pull a known-good macro set.

```
MACRO_REGISTRY <Name> {
  VERSION "<semver>"
  MACROS  [<MacroName>, ...]
  EXPORTS [<MacroName>, ...]      // public surface (subset of MACROS)
}
```

```agicore
MACRO_REGISTRY StandardPatterns {
  VERSION "1.0.0"
  MACROS  [timestamped_entity, soft_delete, audit_fields]
  EXPORTS [timestamped_entity, soft_delete, audit_fields]
}
```

Generates a manifest file (`macros.json`) the compiler reads on `@import` directives. Use `MACRO_REGISTRY` to share pattern libraries across the org without copy-paste drift.

---

## LOG

A typed logging surface for the generated runtime. Declares log channels, levels, and where each goes.

```
LOG <Name> {
  CHANNEL   <name>
  LEVEL     trace | debug | info | warn | error
  SINK      file | stdout | both
  PATH      "<file_path>"           // when SINK = file | both
  ROTATION  <size> | <duration>
}
```

```agicore
LOG AppLog {
  CHANNEL  app
  LEVEL    info
  SINK     both
  PATH     "logs/app.log"
  ROTATION 50MB
}

LOG AuditLog {
  CHANNEL  audit
  LEVEL    info
  SINK     file
  PATH     "logs/audit.jsonl"
  ROTATION 7d
}
```

Generates a Rust logger with zero new dependencies (uses `std::fs` + `chrono`) and a per-channel TS helper for the frontend (`logApp.info(...)`, `logAudit.warn(...)`). Use `LOG` when stdout isn't enough — audit trails, structured logging, rotated files.

---

## THEME

A theming primitive — color tokens, fonts, spacing — that flows into the generated React + Tailwind config.

```
THEME <Name> {
  COLORS    { <token>: "<hex>", ... }
  FONTS     { sans: "<family>", mono: "<family>" }
  SPACING   { sm: "<size>", md: "<size>", lg: "<size>" }
  RADIUS    { sm: "<n>px", md: "<n>px", lg: "<n>px" }
  DARK_MODE auto | always | never
}
```

```agicore
THEME NovaSynDark {
  COLORS {
    bg_primary:   "#0f172a"
    bg_secondary: "#1e293b"
    text:         "#f1f5f9"
    accent:       "#3b82f6"
  }
  FONTS    { sans: "Inter", mono: "JetBrains Mono" }
  DARK_MODE always
}
```

Generates a `tailwind.config.js` extension, CSS custom properties, and a TypeScript `theme` constant. Components reference tokens via `text-text` / `bg-bg-primary` Tailwind classes — never raw hex codes. Use `THEME` so theme tokens have a single source of truth.

---

## SEED

Initial data inserted into the database at first run — config rows, lookup tables, demo content. Three forms: `key value`, `key: value`, and bulk `RECORDS [...]`.

```
// Single-record forms:
SEED <EntityName> { <field> <value> }
SEED <EntityName> { <field>: <value> }

// Bulk form:
SEED <EntityName> {
  RECORDS [
    { <field>: <value>, ... },
    { <field>: <value>, ... }
  ]
}

// Bracket sugar:
SEED <EntityName> [
  { <field>: <value>, ... },
  { <field>: <value>, ... }
]
```

```agicore
SEED Tag {
  RECORDS [
    { id: "tag-1", name: "AI", color: "#3b82f6" },
    { id: "tag-2", name: "Writing", color: "#10b981" },
    { id: "tag-3", name: "Engineering", color: "#f59e0b" }
  ]
}

SEED AppSetting { key: "theme" value: "dark" }
```

Emitted as `INSERT OR IGNORE INTO ...` statements in the initial migration — re-runs are idempotent. Use `SEED` for lookup tables, demo data, and first-run configuration that ships with the app.

---

## TYPE

A type alias — names a complex type so it can be referenced by `field_def`s, `INPUT`/`OUTPUT` blocks, and `PACKET` payloads without repeating the structure.

```
TYPE <Name> = <type_expr>

// Where <type_expr> is:
//   string | number | bool | json | datetime …       (primitives)
//   <EntityName>                                      (entity reference)
//   array(<type>)                                    (array of)
//   { <field>: <type>, ... }                         (record literal)
//   <T1> | <T2> | ...                                (union)
```

```agicore
TYPE TokenUsage = { prompt: number, completion: number, total: number }

TYPE ChatRole = "system" | "user" | "assistant"

ENTITY Message {
  role:   ChatRole
  body:   text
  tokens: TokenUsage
}
```

The compiler inlines the type at every use site — no runtime cost, just a naming convenience that makes complex shapes (especially unions and records) ergonomic to reuse.

---

*For formal grammar, token definitions, and precedence rules, see `dsl/grammar.md`.*
