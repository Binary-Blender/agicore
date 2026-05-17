# Agicore DSL Reference

> **Practitioner's Reference** — For the formal grammar specification, see `dsl/grammar.md`. This document is for everyday use: every declaration type, clear syntax, realistic examples.

---

## Table of Contents

**Application Layer:** [APP](#app) · [ENTITY](#entity) · [ACTION](#action) · [VIEW](#view) · [AI_SERVICE](#ai_service) · [TEST](#test)

**Orchestration Layer:** [WORKFLOW](#workflow) · [PIPELINE](#pipeline) · [QC](#qc) · [VAULT](#vault)

**Expert System Layer:** [RULE](#rule) · [FACT](#fact) · [STATE](#state) · [PATTERN](#pattern) · [SCORE](#score)

**Cooperative Intelligence Layer:** [REASONER](#reasoner) · [TRIGGER](#trigger) · [CHANNEL](#channel) · [PACKET](#packet) · [ROUTER](#router) · [SKILL](#skill) · [SKILLDOC](#skilldoc)

**Semantic Infrastructure Layer:** [IDENTITY](#identity) · [FEED](#feed) · [AUTHORITY](#authority) · [SESSION](#session) · [MODULE](#module) · [SEMANTIC MEMORY](#semantic-memory)

**Ambient Intelligence Layer:** [NODE](#node) · [SENSOR](#sensor) · [ZONE](#zone)

**Semantic Operating Environment:** [COMPILER](#compiler)

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

## Ambient Intelligence Layer

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

*For formal grammar, token definitions, and precedence rules, see `dsl/grammar.md`.*
