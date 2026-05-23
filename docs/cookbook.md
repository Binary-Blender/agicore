# Agicore Cookbook

Practical, copy-paste recipes for common Agicore patterns. Each recipe is self-contained. Mix and match.

---

## 1. Basic CRUD Application

**Minimal viable `.agi` — one entity, one view, full CRUD. Start here.**

```
APP task_manager {
  TITLE  "Task Manager"
  WINDOW 1000x700 frameless
  DB     tasks.db
}

ENTITY Task {
  title:       string REQUIRED
  description: string
  done:        bool = false
  TIMESTAMPS
}

VIEW TaskList {
  ENTITY   Task
  LAYOUT   table
  ACTIONS  create, edit, delete
  SIDEBAR  icon: CheckSquare
  FIELDS   title, done, created_at
}
```

`ENTITY` generates the SQL table, Rust CRUD commands, TypeScript types, and a Zustand store slice from a single declaration. `VIEW` with `LAYOUT table` produces a sortable, filterable list with inline actions. `TIMESTAMPS` adds `created_at` and `updated_at` automatically — you almost always want it.

**Gotcha:** `TITLE` inside `APP` is the window title, not the entity label. Omitting `TITLE` from the `APP` block is a validation error.

---

## 2. Multi-Entity App with Relationships

**Two entities connected via BELONGS_TO / HAS_MANY. Both sides must be declared.**

```
ENTITY Project {
  name:        string REQUIRED
  description: string
  status:      string = "active"
  HAS_MANY     Task
  TIMESTAMPS
}

ENTITY Task {
  title:      string REQUIRED
  priority:   string = "medium"
  done:       bool = false
  BELONGS_TO  Project
  TIMESTAMPS
}

VIEW ProjectList {
  ENTITY   Project
  LAYOUT   split
  ACTIONS  create, edit, delete
  SIDEBAR  icon: Folder
  FIELDS   name, status
}

VIEW TaskList {
  ENTITY   Task
  LAYOUT   table
  ACTIONS  create, edit, delete
  SIDEBAR  icon: CheckSquare
  FIELDS   title, priority, done
}
```

`BELONGS_TO Project` on `Task` generates a `project_id TEXT REFERENCES projects(id) ON DELETE CASCADE` foreign key in the migration. `HAS_MANY Task` on `Project` generates a `list_tasks_by_project(project_id)` Rust query. Both sides must be declared — the compiler validates that the referenced entity exists and that the relationship is symmetric.

**Gotcha:** Declaring `BELONGS_TO` without the matching `HAS_MANY` on the parent is allowed, but you lose the generated list query. Declare both unless you deliberately want a one-directional reference.

---

## 3. AI Summarization Action

**An ACTION that summarizes an entity's text field using Claude.**

```
AI_SERVICE {
  PROVIDERS  anthropic
  DEFAULT    anthropic
  STREAMING  false
}

ENTITY Article {
  title:   string REQUIRED
  body:    string REQUIRED
  summary: string
  TIMESTAMPS
}

ACTION summarize_article {
  INPUT   article_id: string, body: string
  OUTPUT  summary: string
  AI      "Summarize the following article in 2-3 sentences. Be concise and capture the main point.\n\n{{body}}"
}

VIEW ArticleList {
  ENTITY   Article
  LAYOUT   split
  ACTIONS  create, edit, delete, summarize_article
  SIDEBAR  icon: FileText
  FIELDS   title, summary, created_at
}
```

The `{{body}}` token is interpolated from the ACTION's `INPUT` fields at runtime. The `AI_SERVICE` declaration resolves the provider and model — the ACTION doesn't hardcode a provider name. Adding `STREAM true` to the ACTION enables token-by-token streaming to the UI.

**Gotcha:** The prompt template receives INPUT fields, not entity fields directly. Pass the text you want to summarize as an explicit INPUT parameter. If you need multiple fields in the prompt, declare all of them in `INPUT`.

---

## 4. Multi-Step AI Workflow

**A WORKFLOW where step 2 depends on step 1's output.**

```
WORKFLOW ArticleWorkflow {
  STEP summarize {
    ACTION  summarize_article
    INPUT   article_id: workflow.article_id, body: workflow.body
  }

  STEP find_related {
    ACTION  find_related_articles
    INPUT   summary: summarize.summary
    ON_FAIL skip
  }

  STEP save_results {
    ACTION  update_article_metadata
    INPUT   article_id: workflow.article_id,
            summary: summarize.summary,
            related_ids: find_related.ids
  }
}

ACTION summarize_article {
  INPUT   article_id: string, body: string
  OUTPUT  summary: string
  AI      "Summarize in 2-3 sentences: {{body}}"
}

ACTION find_related_articles {
  INPUT   summary: string
  OUTPUT  ids: json
  AI      "Given this summary, identify related topic keywords for a database search: {{summary}}"
}

ACTION update_article_metadata {
  INPUT   article_id: string, summary: string, related_ids: json
  OUTPUT  ok: bool
}
```

Steps without inter-step dependencies run in parallel (BFS execution). `find_related` depends on `summarize.summary`, so it waits for `summarize` to complete. `save_results` depends on both, so it runs last. `ON_FAIL skip` on `find_related` means the workflow continues even if that step errors — useful for optional enrichment steps.

**Gotcha:** `workflow.field_name` refers to the workflow's own input parameters. `step_name.output_field` refers to a previous step's output. Mixing these up is the most common workflow bug.

---

## 5. Multiple AI Models (Routing by Capability)

**Haiku for fast/cheap classification; Sonnet for complex reasoning. Two AI_SERVICE blocks, two ACTIONs.**

```
AI_SERVICE fast_model {
  MODEL    claude-haiku-4-5-20251001
  PROVIDER anthropic
}

AI_SERVICE capable_model {
  MODEL    claude-sonnet-4-20250514
  PROVIDER anthropic
}

ACTION classify_intent {
  INPUT    text: string
  OUTPUT   category: string
  AI       "Classify this text into one of: question, complaint, compliment, other. Return only the category word.\n\n{{text}}"
  SERVICE  fast_model
}

ACTION generate_response {
  INPUT    text: string, category: string, context: string
  OUTPUT   response: string
  AI       "You are a helpful support agent. The user sent a {{category}}. Given this context:\n\n{{context}}\n\nRespond thoughtfully to: {{text}}"
  SERVICE  capable_model
  STREAM   true
}
```

Name the `AI_SERVICE` blocks so each ACTION can reference them by name in `SERVICE`. Without a `SERVICE` field, the ACTION uses whichever `AI_SERVICE` is marked `DEFAULT`. You can declare as many services as you need — different providers, different models, different defaults.

**Gotcha:** A named `AI_SERVICE` block requires a name token between `AI_SERVICE` and `{`. The unnamed form (`AI_SERVICE { ... }`) is the global default. Both forms can coexist in the same file.

---

## 6. The CURRENT Pattern (Master-Detail Navigation)

**List view + detail view. Clicking a row in the list sets CURRENT; the detail renders it.**

```
ENTITY Note {
  title:   string REQUIRED
  content: string
  tag:     string
  TIMESTAMPS
}

VIEW NoteList {
  ENTITY   Note
  LAYOUT   list
  ACTIONS  create, delete
  SIDEBAR  icon: StickyNote
  FIELDS   title, tag, created_at
}

VIEW NoteDetail {
  ENTITY   Note
  LAYOUT   form
  CURRENT
  ACTIONS  edit
  SIDEBAR  icon: FileEdit
  FIELDS   title, content, tag
}
```

`CURRENT` on `NoteDetail` tells the compiler to bind the view to the store's `selectedNoteId`. Clicking any row in `NoteList` calls `selectNote(id)`, which updates `selectedNoteId` in the Zustand store. `NoteDetail` re-renders immediately. No routing configuration, no URL params.

**Gotcha:** `CURRENT` views render nothing (or a placeholder) when no record is selected. Wire the list view to always exist in the sidebar so users have a way to select a record before navigating to the detail.

---

## 7. Document Editor Layout

**Split panel with list on left, editor on right. Combine with CURRENT.**

```
ENTITY Document {
  title:    string REQUIRED
  content:  string
  word_count: number = 0
  TIMESTAMPS
}

VIEW DocumentEditor {
  ENTITY   Document
  LAYOUT   document_editor
  ACTIONS  create, edit, delete
  SIDEBAR  icon: BookOpen
  FIELDS   title, word_count, created_at
  CURRENT
}
```

`LAYOUT document_editor` generates a two-panel layout: a list of records on the left, a full-height editable content area on the right. It is the idiomatic layout for note-taking, writing, and content creation apps. `CURRENT` is implicit in this layout — the right panel always shows the selected record.

**Gotcha:** `document_editor` layout expects a `content` field of type `string` on the entity. If your entity uses a different field name for the main editable body, the generated editor will be blank. Alias the field to `content` in the ENTITY or rename it.

---

## 8. Expert System Rules

**A RULE that fires when conditions are met and executes an action automatically.**

```
ENTITY Invoice {
  amount:     float REQUIRED
  due_date:   date REQUIRED
  status:     string = "pending"
  BELONGS_TO  Vendor
  TIMESTAMPS
}

ENTITY Vendor {
  name:        string REQUIRED
  trust_level: string = "standard"
  HAS_MANY     Invoice
  TIMESTAMPS
}

RULE flag_overdue {
  WHEN    invoice.due_date < today()
  AND     invoice.status != "paid"
  THEN    set_status("overdue")
  PRIORITY 10
}

RULE auto_approve_small_trusted {
  WHEN    invoice.amount <= 500
  AND     vendor.trust_level == "premium"
  THEN    auto_approve
  PRIORITY 20
}

RULE block_high_value_untrusted {
  WHEN    invoice.amount > 5000
  AND     vendor.trust_level == "low"
  THEN    reject_and_flag
  PRIORITY 25
}
```

Rules are evaluated in descending PRIORITY order. The first matching rule fires; subsequent rules are not evaluated unless `CONTINUE` is specified. `WHEN` clauses can reference fields on the primary entity and on related entities via dot notation (`vendor.trust_level`). Built-in functions like `today()` are available in conditions.

**Gotcha:** Rules share a priority space across the file. If two rules have the same PRIORITY, evaluation order is undefined. Assign distinct priorities to rules that could match the same record.

---

## 9. SEED Data

**Pre-populate the database on first run using SEED blocks inside ENTITY.**

```
ENTITY Category {
  name:        string REQUIRED UNIQUE
  description: string
  color:       string = "#3B82F6"
  TIMESTAMPS

  SEED [
    { name: "Research",  description: "Background reading and notes",  color: "#6366F1" }
    { name: "Writing",   description: "Drafts and published content",  color: "#10B981" }
    { name: "Review",    description: "Items pending review",          color: "#F59E0B" }
    { name: "Archive",   description: "Completed or inactive items",   color: "#6B7280" }
  ]
}
```

SEED data is inserted during database initialization, only if the table is empty. This makes it safe to re-run on an existing database — it will not duplicate rows. SEED is ideal for reference data (categories, statuses, configuration defaults) and demo content.

**Gotcha:** SEED respects `REQUIRED` and `UNIQUE` constraints. If a seed row violates a constraint, the app will fail to start. Test seed data against the schema before shipping.

---

## 10. The Protected File Pattern

**Escape hatch for custom logic. The compiler skips any file that starts with `// @agicore-protected`.**

```rust
// @agicore-protected
// Custom Rust command: batch import from CSV
// This file will not be overwritten on regeneration.

use tauri::State;
use crate::db::DbPool;
use crate::models::Article;

#[tauri::command]
#[specta::specta]
pub async fn import_articles_csv(
    db: State<'_, DbPool>,
    csv_content: String,
) -> Result<Vec<Article>, String> {
    let mut reader = csv::Reader::from_reader(csv_content.as_bytes());
    let mut created = vec![];
    for result in reader.deserialize::<ImportRow>() {
        let row = result.map_err(|e| e.to_string())?;
        let article = create_article_internal(&db, row.title, row.body).await?;
        created.push(article);
    }
    Ok(created)
}
```

Add `// @agicore-protected` as the very first line of any generated file you have customized. On subsequent `agicore generate` runs, the compiler reads the first line of each output file and skips it entirely if the marker is present. Non-protected files are always regenerated from the current `.agi` source.

**Gotcha:** The marker must be on line 1. A blank line or any other content before it will cause the file to be overwritten. After adding custom code, immediately add the marker — not after the next regeneration wipes your work.

---

## 11. Scheduled AI Analysis (REASONER)

**A REASONER runs on a schedule, reads from the database, and writes results back.**

```
ENTITY Article {
  title:        string REQUIRED
  body:         string REQUIRED
  summary:      string
  summarized_at: datetime
  TIMESTAMPS
}

REASONER article_summarizer {
  SCHEDULE  "0 * * * *"
  QUERY     "SELECT id, body FROM articles WHERE summary IS NULL LIMIT 20"
  ACTION    summarize_batch
  WRITE_TO  Article
  DESCRIPTION "Summarize any articles that haven't been processed yet. Runs hourly."
}

ACTION summarize_batch {
  INPUT   article_id: string, body: string
  OUTPUT  summary: string
  AI      "Summarize in 2-3 sentences: {{body}}"
}
```

`SCHEDULE` takes a cron expression. The REASONER wakes on schedule, runs the `QUERY` against the live database, calls `ACTION` once per row, and writes results back to the entity specified in `WRITE_TO`. This is the idiomatic pattern for background AI enrichment — it keeps the UI responsive and batches work naturally.

**Gotcha:** The REASONER runs in the Tauri background process. It does not block the UI. However, if the user closes the app, in-flight REASONER jobs are cancelled. Design REASONERs to be resumable — the `WHERE summary IS NULL` pattern in the query ensures partially-processed batches are retried on next run.

---

## 12. Reactive Triggers (TRIGGER)

**A TRIGGER fires automatically when a lifecycle event occurs on an entity.**

```
ENTITY Article {
  title:      string REQUIRED
  body:       string REQUIRED
  summary:    string
  auto_tagged: bool = false
  TIMESTAMPS
}

ACTION summarize_article {
  INPUT   article_id: string, body: string
  OUTPUT  summary: string
  AI      "Summarize in 2-3 sentences: {{body}}"
}

TRIGGER on_article_created {
  ON       Article.create
  ACTION   summarize_article
  INPUT    article_id: entity.id, body: entity.body
  DEBOUNCE 2000
}
```

`ON Article.create` fires the trigger every time a new `Article` is inserted. `DEBOUNCE 2000` prevents the trigger from firing more than once per 2 seconds per record — important when bulk imports could create many records in rapid succession. `entity.id` and `entity.body` refer to the fields of the record that fired the trigger.

**Gotcha:** Triggers run asynchronously. The create operation returns to the UI immediately; the trigger fires in the background. Do not use triggers for operations that must succeed before the UI updates — use a WORKFLOW for that.

---

## 13. Typed Message Channels (CHANNEL + PACKET)

**Inter-module communication with a typed payload contract. Malformed messages are rejected before they reach the subscriber.**

```
PACKET NotificationPayload {
  title:    string REQUIRED
  body:     string REQUIRED
  severity: string REQUIRED  // "info" | "warning" | "error"
  link_id:  string
}

CHANNEL notifications {
  PACKET   NotificationPayload
  BUFFER   50
  ORDERED  true
}

ACTION send_notification {
  INPUT  title: string, body: string, severity: string, link_id: string
  OUTPUT ok: bool
  EMIT   notifications
}

VIEW NotificationCenter {
  LAYOUT   custom
  SIDEBAR  icon: Bell
  TITLE    "Notifications"
  SUBSCRIBE notifications
}
```

`PACKET` defines a typed schema for the channel payload. The generated channel validates every message against the PACKET before enqueuing it — a message missing `severity` or carrying an unexpected type is rejected with a structured error. `BUFFER 50` sets the maximum number of unread messages before older ones are dropped. `ORDERED true` guarantees delivery order.

**Gotcha:** A `VIEW` that `SUBSCRIBE`s to a channel receives all buffered messages on mount. If the buffer fills before the view opens, older messages are lost. Size the buffer to match your worst-case burst rate, or use `ORDERED false` with a larger buffer for high-volume channels.

---

## 14. VAULT for API Keys

**Store the AI provider key securely. The generated settings screen handles key entry and persistence.**

```
VAULT api_keys {
  KEYS [
    { name: "anthropic_api_key",  label: "Anthropic API Key",  required: true  }
    { name: "openai_api_key",     label: "OpenAI API Key",     required: false }
  ]
  STORAGE  keychain
}

AI_SERVICE {
  PROVIDERS  anthropic, openai
  KEY_SOURCE vault: api_keys
  DEFAULT    anthropic
  STREAMING  true
}
```

`VAULT` with `STORAGE keychain` writes keys to the OS keychain (Keychain on macOS, Credential Manager on Windows, libsecret on Linux) rather than a config file. The compiler generates a Settings view where users enter their keys once. The `AI_SERVICE` block pulls from the vault at runtime via `KEY_SOURCE vault: api_keys` — no environment variable, no hardcoded string.

**Gotcha:** Never ship a `.agi` file with an API key literal in `AI_SERVICE`. Even if the app is private, the `.agi` source ends up in version control. Use VAULT for every key, even in development.

---

## 15. Comprehensive Test Suite

**Full CRUD lifecycle with cross-entity assertions. Tests run against a real SQLite database — no mocks.**

```
TEST article_crud_lifecycle {
  GIVEN Article { title: "Test Article", body: "Body text here", summary: "" }

  EXPECT create -> id IS NOT NULL
  EXPECT create -> title == "Test Article"
  EXPECT create -> summary == ""
  EXPECT list -> HAS_LENGTH > 0
  EXPECT get_by_id -> body == "Body text here"
  EXPECT update { summary: "Updated summary" } -> summary == "Updated summary"
  EXPECT delete -> get_by_id IS NULL
}

TEST article_belongs_to_category {
  GIVEN Category { name: "Research", color: "#6366F1" }
  GIVEN Article { title: "Related Article", body: "Body", BELONGS_TO Category }

  EXPECT create -> id IS NOT NULL
  EXPECT create -> category_id IS NOT NULL
  EXPECT delete -> list HAS_LENGTH == 0
}

TEST required_field_enforcement {
  GIVEN Article { body: "Missing title" }

  EXPECT create -> ERROR CONTAINS "title"
}
```

Each `GIVEN` block seeds one record into the test database. `EXPECT` assertions chain against the result of the preceding operation — `create`, `list`, `get_by_id`, `update`, and `delete`. The `ERROR CONTAINS` form asserts that the operation fails with a message matching the substring. Cross-entity tests (the second block) verify cascade behavior: deleting the parent Category deletes the child Article.

**Gotcha:** Test databases are isolated per test function. State does not carry between `TEST` blocks. If you need shared setup, use multiple `GIVEN` statements within the same `TEST` block.

---

## 16. Session-Based Operating Modes (SESSION)

**Named operating contexts with distinct tool access and memory scope.**

```
SESSION research_mode {
  DESCRIPTION "Exploratory reading, note-taking, and source collection"
  TOOLS       chat, search, vault_browse, web_search
  CONTEXT     conversation
  MEMORY      session
  OUTPUT      text, notes
}

SESSION writing_mode {
  DESCRIPTION "Drafting and editing with continuity tracking"
  TOOLS       chat, editor, outline
  CONTEXT     structured
  MEMORY      persistent
  OUTPUT      draft, chapter
  PERSIST     true
}
```

Each SESSION is a constrained cognitive environment. `MEMORY session` means context resets when the session ends; `MEMORY persistent` means it survives across app restarts. `TOOLS` limits which capabilities are available in that mode — a writing session cannot launch a web search, which keeps the AI focused. Sessions are the building block for COMPILER declarations (see recipe 17).

**Gotcha:** `PERSIST true` writes session state to the database on close. Omitting it means the session context is lost when the user closes the app. For any session where the user expects to resume work, always set `PERSIST true`.

---

## 17. The Semantic Compiler (COMPILER)

**Transform the content of one session into a structured artifact in another.**

```
SESSION brainstorm {
  DESCRIPTION "Free-form ideation and discussion"
  TOOLS       chat, search
  CONTEXT     conversation
  MEMORY      session
  OUTPUT      text, notes
}

SESSION writing_mode {
  DESCRIPTION "Structured drafting"
  TOOLS       chat, editor
  CONTEXT     structured
  MEMORY      persistent
  OUTPUT      draft
  PERSIST     true
}

ENTITY Article {
  title:   string REQUIRED
  content: string REQUIRED
  tags:    json = []
  TIMESTAMPS
}

COMPILER chat_to_article {
  DESCRIPTION "Extract a publishable article from a brainstorming conversation"
  FROM        brainstorm
  TO          writing_mode
  EXTRACT     title, content, key_points, structure
  ENRICH {
    INFER     missing_sections
    SUGGEST   structure
    PRESERVE  original_intent
  }
  AI          "Analyze this conversation and extract a complete article. Output a title and well-structured body in markdown. Preserve the author's voice and key arguments."
  VALIDATE    true
}
```

The COMPILER is a "Send To" operation: it reads the full content of the `FROM` session, runs the `AI` prompt against it, and deposits the result into a new instance of the `TO` session — ready to edit. `EXTRACT` names what the AI should pull out. `ENRICH` adds post-extraction passes (inferring gaps, suggesting structure). `VALIDATE true` runs the result through the target session's output schema before committing.

**Gotcha:** The COMPILER does not create an ENTITY record automatically. It populates a session context. To persist the output as an Article, wire a WORKFLOW step after the COMPILER that reads from the session and calls `create_article`.

---

## Combining Patterns: A Content Pipeline

These patterns compose naturally. Here is how a production-grade content pipeline combines six of them:

```
// 1. Secure key storage (Recipe 14)
VAULT api_keys {
  KEYS [{ name: "anthropic_api_key", label: "Anthropic API Key", required: true }]
  STORAGE keychain
}

AI_SERVICE {
  PROVIDERS  anthropic
  KEY_SOURCE vault: api_keys
  DEFAULT    anthropic
  STREAMING  true
}

// 2. Entity relationship (Recipe 2)
ENTITY Feed {
  name: string REQUIRED
  url:  string REQUIRED
  HAS_MANY Article
  TIMESTAMPS
}

ENTITY Article {
  title:        string REQUIRED
  body:         string REQUIRED
  summary:      string
  summarized_at: datetime
  BELONGS_TO   Feed
  TIMESTAMPS
}

// 3. Background enrichment (Recipe 11)
REASONER article_summarizer {
  SCHEDULE    "0 * * * *"
  QUERY       "SELECT id, body FROM articles WHERE summary IS NULL LIMIT 20"
  ACTION      summarize_article
  WRITE_TO    Article
}

// 4. Reactive on-create trigger (Recipe 12)
TRIGGER on_article_ingested {
  ON       Article.create
  ACTION   summarize_article
  INPUT    article_id: entity.id, body: entity.body
  DEBOUNCE 3000
}

// 5. Multi-step enrichment workflow (Recipe 4)
WORKFLOW EnrichArticle {
  STEP summarize {
    ACTION  summarize_article
    INPUT   article_id: workflow.article_id, body: workflow.body
  }
  STEP classify {
    ACTION  classify_intent
    INPUT   text: summarize.summary
  }
  STEP save {
    ACTION  update_article_metadata
    INPUT   article_id: workflow.article_id, summary: summarize.summary, category: classify.category
  }
}

// 6. Custom import command, protected from regeneration (Recipe 10)
// -- see src-tauri/src/commands/import.rs (marked @agicore-protected)

VIEW FeedList {
  ENTITY   Feed
  LAYOUT   split
  ACTIONS  create, delete
  SIDEBAR  icon: Rss
  FIELDS   name, url
}

VIEW ArticleReader {
  ENTITY   Article
  LAYOUT   document_editor
  ACTIONS  delete
  SIDEBAR  icon: FileText
  FIELDS   title, summary, created_at
  CURRENT
}
```

The TRIGGER handles new articles immediately. The REASONER catches anything that slips through (network hiccups, app-closed during ingestion). The WORKFLOW provides a manual re-run path. The VAULT keeps the API key out of source control. The protected file adds a CSV import command the DSL doesn't cover. None of these patterns know about each other — they compose by sharing entity types and the Zustand store.

---

## 18. Lifecycle State Machines (STAGES)

A common need: "an entity that can be in one of several states, with legal transitions enforced at the boundary." Use `STAGES` rather than hand-rolling string enums.

```agicore
STAGES OrderLifecycle {
  draft -> submitted
  submitted -> approved / rejected / pending_review
  approved -> fulfilled -> closed
  rejected -> closed
}

ENTITY Order {
  buyer_id: string REQUIRED
  total:    number
  state:    OrderLifecycle = draft
  TIMESTAMPS
}

ACTION submit_order {
  INPUT  order_id: id
  OUTPUT order: Order
  IMPL { /* invokes try_transition(Order.state, submitted) */ }
}
```

The compiler generates a `${Name}State` enum, a `${Name}Transitions` table, and a `try_transition(from, to)` guard that any `IMPL` block can call. Illegal transitions return `Err` rather than silently corrupting state.

---

## 19. Cost-Optimizing AI via NBVE

You're using Sonnet for summarization. You suspect Haiku would be Good Enough for most prompts, but you don't want to find out via a regression in production. Run the candidate in shadow mode against a quality floor:

```agicore
AI_SERVICE {
  PROVIDERS [anthropic]
  KEYS_FILE VaultKeys
  MODELS    ["claude-sonnet-4-6", "claude-haiku-4-5"]
  DEFAULT   "claude-sonnet-4-6"
}

NBVE SummarizationDowngrade {
  PRODUCTION       "claude-sonnet-4-6"
  CANDIDATE        "claude-haiku-4-5"
  METRICS          [quality, latency, cost]
  SPC_FLOOR        0.92
  PROMOTION_WINDOW 200
}
```

The runtime calls both models for every summarization request, scores the candidate's output against production, and promotes the candidate when SPC stays above floor for 200 consecutive runs. No human decision required — the data decides.

---

## 20. Recurring Creator Subscriptions

Combine `CONTRACT`, `SUBSCRIPTION`, `REPUTATION`, and `IDENTITY` into a complete monetization layer:

```agicore
IDENTITY PublisherIdentity {
  SIGNING_KEY ed25519
  DOMAINS     [publishing]
}

CONTRACT MonthlyEditorial {
  PARTIES {
    publisher: PublisherIdentity
    editor:    EditorIdentity
  }
  TERMS        { word_count_target: number = 5000, deadline_day: number = 28 }
  DELIVERABLES ["Edited articles"]
  PAYMENT      { amount: 2500.00, currency: "USD", provider: StripeConnect }
  GOVERNANCE   EditorialAuthority
}

SUBSCRIPTION SupporterTier {
  PROVIDER   PublisherIdentity
  SUBSCRIBER ReaderIdentity
  TERMS      { tier: "supporter", billing: monthly, perks: ["ad_free", "early_access"] }
  PAYMENT    { amount: 5.00, currency: "USD", provider: StripeConnect }
}

REPUTATION EditorialReputation {
  SUBJECT EditorIdentity
  METRICS { on_time_rate: float, quality_score: float }
  SPC     { sample_size: 30, control_limits: normal }
  DECAY   90d
}
```

The contract is a state machine (draft → signed → active → completed). The subscription is recurring auth + perks. The reputation tracks the editor's delivery quality. None of this trusts an LLM at runtime — it's all deterministic state plus external payment-provider webhooks.

---

## 21. Multi-Target Deployment

One `.agi` file → both a desktop app and a web service:

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

ENTITY Article { title: string, body: text }
ACTION publish { INPUT id: id  OUTPUT article: Article  IMPL { /* ... */ } }
```

The compiler emits two output trees — `dist-desktop/` (Tauri project) and `dist-web/` (Axum project) — sharing the same ENTITY schemas and ACTION implementations. Codegen branches at the boundary; the business logic stays single-source.

---

## 22. Cognitive Org-Chart (COGNITION_ROLE + ESCALATION_CHAIN)

Most tasks don't need your most expensive model. Declare an org-chart of cognition and let the runtime route to the cheapest viable rung — escalating automatically when SPC drops:

```agicore
COGNITION_ROLE FrontlineSummarizer {
  TIER       1
  MODELS     ["claude-haiku-4-5", "gemini-2.5-flash"]
  SPC_FLOOR  0.85
  HANDLES    [summarize]
  ESCALATE_TO SeniorSummarizer
}

COGNITION_ROLE SeniorSummarizer {
  TIER       3
  MODELS     ["claude-opus-4-7"]
  SPC_FLOOR  0.95
  HANDLES    [summarize]
}

ESCALATION_CHAIN SummarizationChain {
  ROLES             [FrontlineSummarizer, SeniorSummarizer]
  ESCALATE_ON       spc_drop
  DE_ESCALATE_AFTER 50_runs_above_floor
  COOLDOWN          15m
}
```

Every summarize call asks the chain: "which role should I use right now?" — and the chain tracks the SPC state across calls to flip up/down automatically. Pair with `NBVE CHAIN SummarizationChain` to have a shadow runner contribute to the promotion decision.
