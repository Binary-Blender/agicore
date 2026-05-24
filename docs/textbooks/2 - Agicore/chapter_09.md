# Chapter 9: The Application Layer

Every meaningful Agicore project begins in the same place — a file whose extension is `.agi` and whose first declaration is `APP`. By the time a practitioner is fluent, the file describes a working desktop application: a database schema, the operations that act on it, the surfaces those operations are exposed through, the AI services the operations call, the tests that validate behavior, and the user preferences that persist across sessions. The seven application-layer declarations — `APP`, `ENTITY`, `ACTION`, `VIEW`, `AI_SERVICE`, `TEST`, `PREFERENCE` — are not a starter set in the sense of being incomplete. They are a starter set in the sense that most production Agicore source begins and ends here. The remaining nine layers exist to handle problems the application layer cannot solve alone: multi-step orchestration, symbolic reasoning, multi-model coordination, semantic messaging, adaptive evolution, embedded sensing, deployment topology, and cross-cutting primitives. Each of those layers is consumed by, and ultimately composed with, declarations from this one.

The problem class this layer addresses is the structural problem that ERP solved for physical organizations forty years ago: one shared, schema-first model that every operation, every surface, every test, and every preference references. The disease this layer is designed to prevent is the disease that motivated the 1G coding standards in the first place — drift between the database, the backend, the IPC channel definitions, the frontend type declarations, the store state, and the UI components. In a hand-wired stack, those six surfaces are six independent declarations of the same idea, kept in sync by discipline, code review, and luck. In Agicore, they are six derivatives of a single source. The compiler is responsible for keeping them coherent; you are responsible only for keeping the source correct. This is what "schema-first" means in operational terms.

The reader who has finished Part II already knows the mechanism: the parser produces an AST whose nodes correspond one-to-one with declaration types, the static validator runs twelve semantic checks against that AST, and the generators emit SQL, Rust, TypeScript, and React derived from a shared typed model. The application layer is the place where that mechanism first becomes visible to the author. Read this chapter as the moment the abstract machinery of Part II first acquires a working surface.

The `APP` declaration is the root. It names the application, sets the window configuration, declares the database file path, and chooses the target framework. There is exactly one `APP` per source file. The compiler treats it as the gate: an absent `APP` is a parse error; conflicting `APP` declarations are a static-validator error. The window configuration and database path become entries in the generated `tauri.conf.json`; the title becomes the window's display name; the target framework determines which generator set the compiler invokes. For the current generation that target is `tauri` — a 5 MB self-contained binary using the system WebView and a Rust backend — and the alternatives reserved for future generations are `web` and `embedded`. The minimal `APP` declaration is two lines.

```agi
APP MyTracker {
  title: "Task Tracker"
  db:    "tracker.db"
  target: tauri
}
```

What this gates is the entire generated project structure. The compiler emits a `tauri.conf.json` with the window title set to "Task Tracker", a `src-tauri/Cargo.toml` with the project name `my_tracker`, a SQLite migration file `migrations/001_initial.sql` whose first effect is the creation of the database at `tracker.db`, and a top-level `src/main.tsx` that mounts the React renderer. None of this is wired by hand. The `APP` is the declaration that authorizes the wiring; the remaining declarations populate it.

The `ENTITY` declaration is the load-bearing primitive. An `ENTITY` defines a typed record — a row in a table, a struct in Rust, an interface in TypeScript — and the operations that act on it. Field types are drawn from a small closed set: `string`, `text`, `int`, `float`, `bool`, `datetime`, plus union types of the form `string | null` (added in Phase 8 to give the optionality that Rust's `Option<T>` and TypeScript's `T | null` already supported on their respective sides of the boundary). Field names are `snake_case` by DSL convention; the compiler auto-converts them to `camelCase` at the TypeScript boundary so that Rust and JavaScript idiom is preserved on each side without the author writing two names. Modifiers attach to fields and to the entity as a whole. `REQUIRED` produces a SQL `NOT NULL` constraint, a non-`Option` Rust field, and a required TypeScript property. `TIMESTAMPS` adds `created_at` and `updated_at` columns, populates them in the generated CRUD commands, and exposes them on the typed interface. `CRUD <ops>` restricts which of the four standard operations the compiler generates — useful when an entity should be read-only or insert-only. `BELONGS_TO <Entity>` declares a foreign key with cascading delete; the compiler emits the foreign-key constraint in SQL, the corresponding `parent_id: i64` field in Rust, and the necessary join logic in any generated list view. `HAS_MANY <Entity>` is the inverse query, exposing a typed `getChildren(parent_id)` accessor without requiring the author to write the join. `SINGLETON` declares an entity with exactly one row; the compiler synthesizes a get-or-create accessor, suppresses the create form in the generated UI, and seeds the row on first run.

```agi
ENTITY Project {
  name: string REQUIRED
  description: text
  status: string REQUIRED
  TIMESTAMPS
  CRUD full
  HAS_MANY Task
}

ENTITY Task {
  title: string REQUIRED
  notes: text
  due_date: datetime | null
  completed: bool REQUIRED
  TIMESTAMPS
  CRUD full
  BELONGS_TO Project
}

ENTITY AppSettings {
  theme: string REQUIRED
  default_view: string REQUIRED
  SINGLETON
}
```

What these three declarations generate, in inventory, is substantial. The SQL generator emits three `CREATE TABLE` statements with appropriate constraints, two `CREATE INDEX` statements on the foreign keys, and an `INSERT OR IGNORE` seed for the singleton row. The Rust generator emits three `struct` definitions deriving `Serialize`, `Deserialize`, and `Debug`; twelve CRUD command functions (four operations across three entities, modulo `SINGLETON` restrictions); a registration block in `lib.rs` that lists every command for Tauri's invoke handler; and a `HAS_MANY` accessor function for `Project::get_tasks`. The TypeScript generator emits three interface declarations matching the Rust structs, twelve typed `invoke` wrappers that take and return the right types, and the corresponding entries in the generated Zustand store. The React generator emits a `ProjectList`, `ProjectForm`, `TaskList`, `TaskForm`, and `AppSettingsForm` component, each pre-wired to the store. The author wrote eleven non-blank lines of DSL; the compiler emitted somewhere in the neighborhood of fifty files of generated code. The two-compiler property holds: `cargo build` passes, `tsc --noEmit` passes, the application runs.

The `ACTION` declaration handles operations that are not pure CRUD. It is the escape hatch from "everything is a database row" — the place where domain logic lives. An `ACTION` has an `INPUT` block, an `OUTPUT` block, and a body. The body takes one of four forms, and the choice of form determines the generator path. The first form is `AI "<prompt>"` — the action is backed by an AI service, the prompt is a template with `{{variable}}` interpolation against the inputs, and the compiler emits a Tauri command that dispatches to the configured `AI_SERVICE` with the prompt. The second form is `IMPL "<stub_name>"` — the action is a hand-written deterministic Rust function, the compiler emits a typed function signature with the inputs and outputs, and it writes the body into a protected file marked `// @agicore-protected` on line 1. The protected marker survives subsequent regeneration; you fill in the body, the compiler keeps the signature in sync forever. The third form is `PATTERN <name>` — the action follows a predefined scaffolding pattern, currently `file_handler` (which wires `tauri_plugin_dialog` for native file picking) and `shell_open` (which wires `tauri_plugin_shell` for URL opening). The fourth modifier is `EMIT <event_name> { <fields> }`, which attaches to long-running actions and emits typed progress events that the frontend can subscribe to.

```agi
ACTION summarize_project {
  INPUT  project_id: string REQUIRED
  OUTPUT summary: string
  AI "Summarize the project named {{project.name}} with description: {{project.description}}. Return a two-sentence summary."
}

ACTION import_tasks_from_file {
  INPUT  file_path: string REQUIRED
  OUTPUT imported_count: int
  IMPL "import_tasks_from_csv"
  EMIT import_progress { current: int, total: int }
}

ACTION open_project_in_browser {
  INPUT  url: string REQUIRED
  PATTERN shell_open
}
```

The static validator verifies that every `{{variable}}` in an `AI` prompt resolves to a declared `INPUT` field or an entity in scope. The IMPL form produces exactly one protected file at `src-tauri/src/commands/import_tasks_from_csv.rs`; the author opens it once, writes the body of the function, and never touches it again unless the contract changes. The EMIT modifier is what makes long-running imports observable: the generated wrapper exposes a typed `onImportProgress` subscription that the React layer consumes to drive a progress bar. None of this requires the author to know anything about Tauri's IPC bridge, channel serialization, or event lifetimes. The compiler erases the wiring.

The `VIEW` declaration is the surface layer. In the simplest case, `VIEW` is implicit: every `ENTITY` with a `CRUD` declaration produces a default list view and a modal form, both rendered by the generated React components. The explicit `VIEW` declaration is for the surfaces that go beyond defaults — an AI chat panel, a model picker, a custom dashboard, a settings page. The most common explicit views are `VIEW AiChat { ... }`, which generates a streaming chat surface bound to a designated `AI_SERVICE` and conversation entity, and `VIEW ModelPicker { ... }`, which generates the UI for selecting between configured AI providers. The principle behind `VIEW` is the same principle behind `ENTITY`: it is preferable to declare the surface and let the generator produce a coherent React component than to hand-write the React and risk drift from the underlying types. Where the generated UI does not suffice — visualization, custom layout, branded chrome — the author writes plain React in `src/components/` and consumes the same typed `invoke` wrappers and Zustand store that the generated components use. The escape hatch is always available; the generated default is the path of least resistance.

The `AI_SERVICE` declaration configures multi-provider AI integration. The compiler ships first-class support for Anthropic, OpenAI, Google, xAI, and HuggingFace; the declaration specifies the provider, the default model, the API key reference (resolved from the cross-app vault or from environment variables), and the streaming policy. What the generator emits is substantial: a Rust module that wraps the provider's HTTP API behind a uniform internal trait, a streaming dispatcher that handles server-sent events and token streaming, a TypeScript wrapper that exposes the streaming interface to the frontend, and the API-key-management UI scaffold that lets the end user enter and store credentials. Multiple `AI_SERVICE` declarations are normal; an application that uses Anthropic for chat and OpenAI for embeddings declares both and references them by name from the relevant `ACTION` declarations.

```agi
AI_SERVICE PrimaryChat {
  PROVIDER anthropic
  MODEL    "claude-sonnet-4-5"
  STREAMING true
}

AI_SERVICE EmbeddingService {
  PROVIDER openai
  MODEL    "text-embedding-3-small"
  STREAMING false
}
```

The author who declares two `AI_SERVICE` blocks acquires a fully-wired multi-provider runtime: API key entry in the settings UI, per-provider error handling, streaming responses for chat, batched responses for embeddings, and the per-call telemetry that the orchestration layer will later consume. The hand-wired equivalent — multiple HTTP clients, multiple streaming parsers, multiple credential stores, multiple error envelopes — is the kind of plumbing that consumes weeks of engineering time and silently rots when a provider changes its response schema. The generator handles it.

The `TEST` declaration is integration testing in declarative form. A `TEST` block names the test, optionally seeds preconditions with `GIVEN`, performs an operation, and asserts a postcondition with `EXPECT`. The compiler emits a Rust integration test in `src-tauri/tests/` that runs against a fresh in-memory database. The intent is not unit-test coverage of the generated code — that is the job of the compiler's own 3,206-test suite — but acceptance-level validation of application behavior. A `TEST` that fails is a specification problem: either the DSL does not declare what the author meant, or the meaning has changed and the test must be updated. The mechanical guarantee from Part II ensures that the wiring is correct; the `TEST` layer ensures that the wiring expresses the intended semantics.

```agi
TEST creating_a_project_succeeds {
  GIVEN no projects exist
  WHEN  create Project { name: "Test", status: "active" }
  EXPECT Project.count == 1
  EXPECT Project.first.name == "Test"
}
```

The `PREFERENCE` declaration handles client-side state that should persist across sessions without touching the database. Window position, last-selected filter, sidebar collapsed/expanded, theme — all of these are preferences. The declaration takes a name, a type, and a default value. What the compiler generates is an entry in the typed `preferences.ts` accessor with `getX()`/`setX(value)` functions backed by `localStorage`, a default-value initializer that runs on first load, and the corresponding entry in the settings UI if the preference is user-facing. The boundary between `ENTITY` and `PREFERENCE` is precise: `ENTITY` is durable, queryable, shared across users in a future multi-tenant deployment; `PREFERENCE` is local to the install, opaque to the database, and intended for the kind of state that should not survive a fresh install on a new machine.

```agi
PREFERENCE sidebar_collapsed {
  TYPE bool
  DEFAULT false
}

PREFERENCE last_selected_project_id {
  TYPE string | null
  DEFAULT null
}
```

Now consider the seven declarations composed into a complete minimal application. The example below is a project-and-task tracker with AI-assisted project summarization, one preference, one test, and one AI service. Every declaration is exercised at least once. The reader who runs the compiler against this source and inspects the output project will see a working Tauri application — about 5 MB on disk, launching in under a second, with a project list, a task list per project, an "Ask AI" button that streams a summary into a panel, a settings page with a theme toggle, and a test suite that passes.

```agi
APP TaskTracker {
  title: "Project & Task Tracker"
  db:    "tracker.db"
  target: tauri
}

AI_SERVICE Summarizer {
  PROVIDER anthropic
  MODEL    "claude-sonnet-4-5"
  STREAMING true
}

ENTITY Project {
  name: string REQUIRED
  description: text
  status: string REQUIRED
  TIMESTAMPS
  CRUD full
  HAS_MANY Task
}

ENTITY Task {
  title: string REQUIRED
  notes: text
  due_date: datetime | null
  completed: bool REQUIRED
  TIMESTAMPS
  CRUD full
  BELONGS_TO Project
}

ENTITY AppSettings {
  theme: string REQUIRED
  SINGLETON
}

ACTION summarize_project {
  INPUT  project_id: string REQUIRED
  OUTPUT summary: string
  AI "Summarize {{project.name}} (status: {{project.status}}). Description: {{project.description}}. Two sentences."
}

VIEW ProjectSummaryPanel {
  KIND ai_panel
  AI_SERVICE Summarizer
  ACTION summarize_project
}

PREFERENCE sidebar_collapsed {
  TYPE bool
  DEFAULT false
}

TEST creating_project_succeeds {
  GIVEN no projects exist
  WHEN  create Project { name: "Alpha", status: "active" }
  EXPECT Project.count == 1
}
```

Forty-odd lines of DSL produces an application whose hand-wired equivalent — schema migrations, three layers of CRUD plumbing, IPC channel registration, streaming AI integration, multi-provider credential management, a Zustand store, five React components, one integration test, and a preferences subsystem — would run to several thousand lines of carefully synchronized code across three languages. The two-compiler property holds on the generated output: `cargo build` and `tsc --noEmit` both pass. The application runs. This is the operational meaning of "schema-first" and "if it builds, it works." Both phrases are load-bearing engineering claims, not slogans. The compiler turns them into mechanical guarantees.

A note on what this layer does not contain. There are no workflows here — no multi-step orchestration with dependency-tracked execution. There are no rules — no declarative if-then logic that fires on entity changes. There are no quality gates — no in-pipeline predicates that drop, retry, or flag items. There are no routers, no escalation chains, no shadow evaluations. The application layer is intentionally small. Its primitives are the ones that every application needs; the additional power lives in the layers above. A well-designed application starts in the application layer, runs to completion against the application layer alone, and reaches for orchestration, expert-system, or cooperative-intelligence declarations only when the operational pressure justifies the additional surface area. This is the right shape. The framework's most valuable property is the cliff that it does not force you to climb until you need to.

A second note concerns the relationship between the layer's primitives and Codd's relational model. The `ENTITY` declaration is not merely a table; it is a relation in Codd's sense — a typed set of tuples with a declared key, a declared schema, and declared relationships to other relations. The compiler's CRUD generator produces operations that respect relational integrity: cascading deletes through `BELONGS_TO`, referential constraints on every foreign key, indexes on every relationship column. The schema-first discipline is not a stylistic preference; it is the load-bearing commitment that allows the static validator to discharge a category of correctness checks that no amount of runtime testing can substitute for. Every field reference in every action prompt is checked against the declared schema. Every join in every generated query is checked against declared relationships. Every type coercion at the language boundary is checked against the declared field type. The compiler is, in operational terms, a relational-integrity engine that emits its proofs as Rust, TypeScript, SQL, and React.

A third note concerns the lineage of declarative UI. The `VIEW` declaration is not novel in its ambition — declarative UI has a history that runs from HyperCard through Visual Basic through React itself — but it is novel in its source of truth. A React component declared in JSX has its own state, its own type assumptions, its own handlers wired to its own callback shape; the developer is responsible for keeping all three coherent with the underlying data model. A `VIEW` declared in Agicore inherits its state, its types, and its handlers from the `ENTITY`, `ACTION`, and `AI_SERVICE` declarations it references. Coherence is a property the compiler enforces. The author who hand-writes a React component in `src/components/` is making a deliberate choice to take responsibility for coherence in exchange for the design freedom of arbitrary JSX. The author who declares a `VIEW` is delegating coherence to the compiler in exchange for accepting the generated component's structure. The framework supports both modes because both have legitimate use cases; the discipline is to be deliberate about which mode each surface uses and why.

A fourth note concerns the integration tests that the `TEST` declaration generates. The reader familiar with property-based testing or fuzz testing will recognize that `TEST` is not those things. It is acceptance-level integration testing in the tradition of Cucumber and the broader behavior-driven-development lineage — a way to express "this is what the application should do, in the language of the application's domain" and have the compiler turn that expression into mechanical verification. The compiler emits the generated test as a Rust integration test in `src-tauri/tests/` precisely because Rust integration tests run against the compiled binary's CRUD command surface, which is the same surface the production application exercises. The test runs against a fresh in-memory database, performs the declared `WHEN` operation through the same invoke wrappers the UI would use, and asserts the declared `EXPECT` postcondition. A passing `TEST` is evidence that the wiring and the semantics agree. A failing `TEST` is, as noted, a specification problem rather than a wiring problem — the wiring is guaranteed by the two-compiler property and the testing layer's job is to validate the meaning of what was wired.

A fifth and final note concerns what the seven declarations imply for the practitioner's workflow. The author who has internalized this layer no longer thinks in terms of files, migrations, channels, or components. The author thinks in terms of entities, actions, and views — the conceptual units the domain itself uses — and trusts the compiler to materialize them as a coherent multi-language artifact. The shift is not cosmetic; it is the same shift that ERP induced in business operations forty years ago, when planning stopped being a per-department exercise and became a per-organization one. The compiler is the substrate that allows the shift to happen without sacrificing the precision that hand-coding provided. The author writes the precise declarations the domain requires; the compiler emits the precise wiring the deterministic runtime requires; the two-compiler property carries the correctness guarantee through both halves. This is the operational meaning of "AI at the edit boundary, determinism at runtime." The author authors. The compiler emits. The runtime executes. Each role is filled by exactly the mechanism best suited to it.

The next chapter develops the second tier — the orchestration layer — where multi-step processes acquire dependency-tracked execution, quality control becomes a declarative primitive, and the cross-app vault enters as the substrate that makes ecosystem applications cheap. The chapter after that addresses the third tier — the expert system — where symbolic reasoning enters as a first-class generation target and the boundary to the Andon Loop comes into view.
