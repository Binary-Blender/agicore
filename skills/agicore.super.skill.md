---
name:           agicore
version:        1.0.0
tier:           super
context_budget: 100000
domain:         agicore-dsl-authoring
self_check:     mechanical
target_models:
  - claude-opus-4-7
  - claude-sonnet-4-6
  - gpt-5
  - gemini-2.5-pro
license:        MIT
homepage:       https://github.com/Binary-Blender/agicore
extends:        agicore.baby.skill.md
---

# Agicore Super Skill Doc

You are authoring an Agicore `.agi` source file. The Agicore compiler turns one `.agi` file into a complete Tauri desktop application (Rust + TypeScript + SQLite + React) deterministically. AI participates at **author time**; the generated runtime never calls an LLM at any load-bearing decision point.

This document is the comprehensive teaching artifact for the Agicore DSL — all 58 declaration types, the canonical syntax patterns verified against the v1.0 parser, an anti-pattern catalog assembled from real-app pressure incidents, worked examples that compile end-to-end, edge cases the framework has learned from, and a self-check suite.

If you have read the Baby Step (`agicore.baby.skill.md`), this Super Skill Doc is a strict superset.

---

## L0 — When to use me

Use this skill when the request is **"build me an application that does X"** and X is implementable as a Tauri desktop application: CRUD systems, AI-powered chat clients, expert systems with forward-chaining rules, orchestration pipelines, multi-provider AI tools, knowledge bases with semantic search, ambient intelligence systems with sensors and actuators, governed creator platforms, or any combination.

Do **not** use this skill when:

- The deliverable is a raw Rust library or web service without a UI shell (Agicore web target is experimental in v1.0).
- The deliverable is mobile (iOS/Android).
- You need procedural business logic that has no declarative analog. (Workaround: use `@agicore-protected` hand-written Rust files for the irreducibly imperative bits.)
- The task is "modify this generated file" — Agicore is a regeneration model, not a hand-edit model. Modify the `.agi` source and regenerate.

Success: an `.agi` file that the Agicore parser accepts with zero errors and (ideally) zero warnings; that the static validator passes; that the compiler turns into a Tauri project where both `cargo build` and `tsc --noEmit` complete cleanly.

---

## L1 — Mental model

### The architecture

```
                  Author (human + AI assistant pair)
                                |
                                v
                  .agi source (the constraint boundary)
                                |
                                v
                  Agicore compiler — parse, validate, emit
                                |
                                v
                  Generated Tauri project (~50+ files)
                  cargo build && tsc --noEmit
                                |
                                v
                  Running desktop app
```

### Three load-bearing principles

1. **AI at build time, determinism at runtime.** The runtime never trusts an LLM at a load-bearing decision point. Model calls happen through typed Rust commands that read API keys from a file, stream responses through Tauri events, and persist results to SQLite. There is no LLM in the loop between "user clicks button" and "data is saved."

2. **Declarative only in `.agi`.** Describe WHAT the system is, never HOW. The compiler decides HOW. If you find yourself wanting to write loops or conditionals or state mutations in the `.agi` file, find the declarative equivalent (often `STAGES`, `RULE`, `WORKFLOW`, or `REASONER`) or escape to a hand-written `@agicore-protected` Rust file.

3. **Names are the only link, layout is for humans.** Cross-references between declarations resolve by identifier. The compiler doesn't care if your `WORKFLOW` appears before or after the `ACTION`s it references. Whitespace and ordering are for human readability.

### The compilation pipeline

| Pass | Input | Output | Failure mode |
|---|---|---|---|
| **Lex** | `.agi` text | Token stream | "Unexpected character" — line-precise |
| **Parse** | Token stream | AST (typed declaration nodes) | "Unexpected token at line N" — line-precise |
| **Validate** | AST | AST + diagnostics | 34 semantic checks; errors abort, warnings continue |
| **Emit** | Validated AST | File map (path → content) | Should never fail if validation passed |
| **Write** | File map | Filesystem | Skips files with `// @agicore-protected` first-line marker |

A parse error is your fault. A validate error is your fault but more often a "I referenced a name that doesn't exist" miss. A compile error in generated code (`cargo build` / `tsc --noEmit`) is a framework bug — file an issue.

### What does NOT belong in the `.agi` file

- **Implementation details** — DOM structures, Rust function bodies, SQL query strings. Use the `IMPL { ... }` escape hatch on `ACTION`s when truly necessary.
- **Styling beyond `THEME`** — colors and font choices go in `THEME`; everything else is the framework's job.
- **State machine logic inside RULEs** — use `STAGES` for finite state machines.
- **Inline ad-hoc model calls from `TRIGGER` bodies** — `TRIGGER` fires named primitives, not inline expressions.
- **Multiple APP blocks** — one per file; need two apps → two files.
- **Comments masquerading as documentation** — use `DESCRIPTION` fields; they flow into generated docstrings and tooltips.

---

## L2 — Compressed reference (canonical syntax)

Every form below is verified against the Agicore v1.0 parser. If you write what's here, it will parse.

### Data types

The parser knows these primitive types:

```
string  number  float  bool  date  datetime  json  id
```

Plus these SQL aliases (uppercase only, case-insensitive in source):

```
TEXT → string    INTEGER → number    REAL → float    BOOLEAN → bool
DATE → date      DATETIME → datetime
```

**There is no `int` primitive** — use `number`. **There is no `array(T)` notation** — use `json` for arrays/lists, with `= []` for empty default.

### Field modifiers (inside an ENTITY field declaration)

```
REQUIRED   UNIQUE   INDEX   INDEXED   DEFAULT <literal>    = <literal>
```

`TIMESTAMPS` is an entity-block-level keyword (not a per-field modifier) that adds `created_at` and `updated_at` columns.

### Cross-entity references (inside an ENTITY block)

```
BELONGS_TO OtherEntity              # bare; generates <other>_id FK column
HAS_MANY   OtherEntity              # bare; reverse relation, no column
HAS_ONE    OtherEntity              # bare; 1:1
```

These take no field name. The compiler synthesizes the FK column from the target entity's name.

### APP block (required, exactly one, first declaration)

```
APP appname {
  TITLE       "Display Name"          # required
  DB          filename.db              # required
  WINDOW      1200x800 [frameless]    # optional; default 800x600 with frame
  PORT        5173                     # optional
  THEME       identifier               # optional; references a THEME declaration
  CURRENT     EntityName               # optional; default-selected entity for navigation
  WORKSPACES                            # optional bare flag — enables multi-workspace UI
  TRAY                                  # optional bare flag — enables system tray
  HOTKEY      "Ctrl+Shift+N"           # optional global hotkey
  VERSION     "1.0.0"                  # optional
  DESCRIPTION "one-line app description" # optional
  TELEMETRY   off | auto | explicit    # optional, default off
  ICON        "icon.png"               # optional
}
```

**Critical:** `CURRENT` is an **APP-block** field naming an entity. It is NOT a `VIEW`-block field. There is no `CURRENT` keyword inside `VIEW { ... }`.

### Inline SEED (optional, inside ENTITY block)

```
ENTITY User {
  email: string REQUIRED UNIQUE
  TIMESTAMPS

  SEED {
    id: "default-user"
    email: "you@local"
  }
}
```

Inline SEED produces one row at first run. Use top-level SEED for multiple rows.

### Top-level SEED (outside ENTITY block)

```
SEED Tag { id: "tag-1", name: "Ideas", color: "#3b82f6" }
SEED Tag { id: "tag-2", name: "TODO",  color: "#10b981" }
```

Each top-level SEED line creates one row. The compiler emits idempotent `INSERT OR IGNORE` SQL.

---

### Application Layer (7 declarations)

#### `ENTITY` — persistent data model

```
ENTITY EntityName {
  field_name: type [REQUIRED] [UNIQUE] [INDEX] [= default]
  field_name: json = []
  BELONGS_TO OtherEntity
  HAS_MANY   OtherEntity
  HAS_ONE    OtherEntity
  ORDER      ASC | DESC                # default sort
  CRUD       full                       # OR: CRUD [list]   (subset)
  TIMESTAMPS                            # adds created_at + updated_at
  SEED { id: "...", field: value }     # optional inline single seed
}
```

**Generates:** SQL CREATE TABLE with indexes; Rust `pub struct`; TypeScript interface; Zustand store slice; `<EntityList>`, `<EntityForm>`, `<EntityRow>` React components for any matching `VIEW`.

#### `ACTION` — Tauri command (AI-driven or deterministic)

```
ACTION snake_name {
  INPUT  field: type, field: type           # comma-separated
  OUTPUT result: type                        # or: OUTPUT result: EntityName
  AI     "prompt with {{template_vars}}"    # AI form
  STREAM true                                # AI streaming, optional
  IMPL   { /* raw Rust */ }                  # IMPL form (escape hatch)
}
```

Minimum action (no AI, no IMPL):

```
ACTION rename_item {
  INPUT  item_id: id, new_name: string
  OUTPUT item: SomeEntity
}
```

#### `VIEW` — generated React component

```
VIEW PascalCaseName {
  ENTITY  EntityName                  # optional (custom layouts can omit)
  LAYOUT  list | table | grid | split | document_editor | settings | custom
  ACTIONS create, edit, delete        # which CRUD ops surface; comma-separated
  SIDEBAR icon: IconName              # Lucide icon name; appears in NavRail
  TITLE   "Tab label"                 # optional
  FIELDS  field1, field2              # which fields show in list/table view
}
```

**No `CURRENT` field here** — that's on APP.

Layouts:
- `list` — vertical list (inbox-style)
- `table` — sortable column table
- `grid` — card grid
- `split` — generic split panel
- `document_editor` — list-left, editor-right
- `settings` — auto-form derived from PREFERENCE declarations
- `custom` — your hand-written layout (mark the generated component file `@agicore-protected`)

#### `AI_SERVICE` — singleton multi-provider AI client

```
AI_SERVICE {
  PROVIDERS  anthropic, openai, google, xai, huggingface    # comma-separated identifiers
  KEYS_FILE  "%APPDATA%/AppName/api-keys.json"              # string file path
  DEFAULT    anthropic                                       # default PROVIDER (identifier)
  STREAMING  true
  MODELS {
    anthropic "claude-sonnet-4-20250514" LABEL "Claude Sonnet 4" DEFAULT
    anthropic "claude-haiku-4-5-20251001" LABEL "Claude Haiku 4.5"
    openai    "gpt-4o"                    LABEL "GPT-4o"          DEFAULT
    google    "gemini-2.5-pro"            LABEL "Gemini 2.5 Pro"
  }
}
```

**Critical syntax notes:**
- `PROVIDERS` takes comma-separated identifiers, NO brackets
- `KEYS_FILE` is a string literal file path, NOT a VAULT reference
- `DEFAULT` is a provider identifier, NOT a model id
- `MODELS` is a block — each row is `provider "model-id" LABEL "Display Name" [DEFAULT] [CONTEXT n]`
- The per-row `DEFAULT` keyword marks the default model within that provider's row group

#### `TEST` — integration test (canonical syntax)

```
TEST snake_name {
  GIVEN EntityName { field: value, field: value }       # one entity per GIVEN
  GIVEN AnotherEntity { field: value, BELONGS_TO Other }
  EXPECT operation -> assertion                          # one assertion per EXPECT line
}
```

Operations: `create`, `get_by_id`, `list`, `update { field: value }`, `delete`.
Assertions: `id IS NOT NULL`, `field == value`, `field != value`, `field > value`, `HAS_LENGTH > 0`, `get_by_id IS NULL`, `CONTAINS "x"`, `MATCHES "regex"`.

Real example:

```
TEST student_lifecycle {
  GIVEN Student { name: "Alice Chen", grade: "5th", active: true }
  EXPECT create -> id IS NOT NULL
  EXPECT create -> name == "Alice Chen"
  EXPECT list -> HAS_LENGTH > 0
  EXPECT update { grade: "6th" } -> grade == "6th"
  EXPECT delete -> get_by_id IS NULL
}

TEST enrollment_foreign_key {
  GIVEN Student { name: "Bob", grade: "3rd" }
  GIVEN Enrollment { school_year: "2025-2026", BELONGS_TO Student }
  EXPECT create Enrollment -> student_id IS NOT NULL
}
```

#### `PREFERENCE` — user-facing setting

```
PREFERENCE setting_name {
  TYPE        string | number | bool | float | datetime    # single-token type
  DEFAULT     value
  KEY         "storage_key"                                # optional, defaults to name
  LABEL       "Human label"
  DESCRIPTION "Help text"
}
```

**Generates:** TypeScript constant + `usePreference()` hook + row in auto-generated SettingsView.

Note: There's no built-in `enum(...)` form. For constrained-value settings, use `TYPE string` and document allowed values in `DESCRIPTION`; validate at the UI layer.

---

### Orchestration Layer (5 declarations)

#### `WORKFLOW` — multi-step pipeline

```
WORKFLOW WorkflowName {
  STEP step_name {
    ACTION  action_name
    INPUT   key: value                  # optional named input
    ON_FAIL stop | continue | retry     # optional, default stop
  }
  STEP another_step {
    ACTION  another_action
  }
  # OR wrap STEPs in a STEPS block:
  # STEPS {
  #   STEP s1 { ACTION action1 }
  #   STEP s2 { ACTION action2 }
  # }
  PARALLEL   step_name, another_step    # optional explicit-parallel list (bare comma-separated)
  IDEMPOTENT true                        # optional
}
```

**Critical:** Steps run in **source order**. There is no `DEPENDS_ON` inside STEP. Use the `PARALLEL` list to mark steps that should run concurrently.

#### `PIPELINE` — typed streaming chain

```
PIPELINE PipelineName {
  NodeA { INPUT t1, OUTPUT t2, PROCESS "rust_function_name" }
  NodeB { INPUT t2, OUTPUT t3, PROCESS "rust_function_name" }
  NodeA -> NodeB
}
```

#### `QC` — quality control gate

```
QC NodeName {
  CRITERIA """natural-language evaluation standard"""
  ON_FAIL  drop | retry | flag | abort       # default drop
}
```

#### `VAULT` — singleton shared asset storage (NOT for API keys)

```
VAULT {
  PATH        "%APPDATA%/AppName/vault.db"
  ASSET_TYPES text, json, code, conversation     # comma-separated identifiers
  PROVENANCE  true
  TAGS        true
}
```

**Critical:** VAULT is for **shared content assets** (documents, conversations, JSON blobs) across multiple apps. It is **not** for API keys. For API keys, use `AI_SERVICE.KEYS_FILE` with a literal file path string; the runtime reads keys from a JSON file at that path.

#### `STAGES` — finite state machine bound to an entity field

```
# Top-level form (binds to a specific entity field):
STAGES EntityName.field_name {
  state1 -> state2
  state2 -> state3 / state4               # branching: 2→3, 2→4
  state5 -> state6 -> state7              # chain: 5→6, 6→7
}

# Inline form (in an ENTITY block):
ENTITY EntityName {
  …other fields…
  STAGES [state_a, state_b, state_c]
}
```

**Critical:** Top-level STAGES requires `Entity.field` binding — it is bound to a specific entity field, NOT freestanding.

**Generates:** `${Name}State` Rust enum (and TS union); `${Name}Transitions` map; `try_transition(from: State, to: State) -> Result<(), TransitionError>` guard.

---

### Expert System Layer (6 declarations)

#### `RULE` — production rule (forward-chaining)

```
RULE RuleName {
  WHEN     EntityName.field op value         # first condition (WHEN or IF)
  AND      AnotherEntity.field op value      # additional conditions: AND | OR | UNLESS
  THEN     action_identifier                  # OR: THEN FLAG "name"
  SEVERITY warning | error | critical         # optional
  PRIORITY n                                  # optional, higher fires first
}
```

Operators: `=`, `!=`, `>`, `<`, `>=`, `<=`. The condition style is SQL-like (one condition per line, connected by AND/OR/UNLESS). `THEN` names a single ACTION identifier — no function-call args; the matched entity context flows into the action automatically.

#### `FACT` — working memory

```
FACT FactName {
  field_name: type
  another:    type
}
```

#### `STATE` — condition-driven state machine

```
STATE StateName {
  STATES [s1, s2, s3]
  INITIAL s1
  TRANSITION WHEN condition -> target_state
  ON_ENTER s2 { ActionName(args) }
}
```

Use `STATE` for condition-driven transitions; use `STAGES` for explicit user-driven transitions.

#### `PATTERN` — regex matcher

```
PATTERN PatternName {
  MATCH "regex_or_text_pattern"
  CAPTURE [group1, group2]
  FIRES ActionName | RuleName
}
```

#### `SCORE` — certainty/weight tracker

```
SCORE ScoreName {
  INITIAL  n
  MIN      n
  MAX      n
  DECAY    rate PER duration
  THRESHOLD n AT condition THEN action
}
```

Adjustments use three forms: `SCORE x 5` (absolute), `SCORE x +5` (signed delta), `SCORE x -= 5` (compound assignment).

#### `MODULE` — composable expert-system bundle

```
MODULE ModuleName {
  INCLUDES {
    RULES   [Rule1, Rule2]
    FACTS   [Fact1]
    STATES  [State1]
    SCORES  [Score1]
  }
  ACTIVATE_WHEN score > n
}
```

---

### Cooperative Intelligence Layer (10 declarations)

#### `ROUTER` — multi-tier model dispatch

```
ROUTER RouterName {
  DESCRIPTION "human description"
  TIER 1 free {
    model_label: provider "model-id" {
      STRENGTHS  tag1, tag2, tag3
      CONTEXT    32768
      COST       0.0
      DEFAULT
    }
  }
  TIER 2 mid {
    haiku: anthropic "claude-haiku-4-5-20251001" {
      STRENGTHS  coding, analysis
      COST       0.1
      CONTEXT    200000
    }
  }
  TIER 3 premium {
    sonnet: anthropic "claude-sonnet-4-20250514" {
      STRENGTHS  coding, analysis, creative_writing
      COST       0.3
      CONTEXT    200000
      DEFAULT
    }
  }
  TASK_TYPES  coding, analysis, creative_writing, general
  MOSH_PIT    3
  CALIBRATION true
}
```

#### `SKILL` — keyword-routed knowledge

```
SKILL SkillName {
  DESCRIPTION "human description"
  KEYWORDS    keyword1, keyword2, keyword3      # comma-separated, NOT [array]
  DOMAIN      "domain_label"
  PRIORITY    n
}
```

#### `SKILLDOC` — governed signed cognition module

```
SKILLDOC SkillDocName {
  DESCRIPTION "human description"
  VERSION     "1.0.0"
  SKILLS      [Skill1, Skill2]
  SIGNED_BY   AuthorityName
  CLEARANCE   level
}
```

#### `REASONER` — periodic AI analysis loop

```
REASONER ReasonerName {
  DESCRIPTION "human description"
  USES        SkillDocName             # optional
  TIER        n                        # optional ROUTER tier hint
  INPUT       { field: type }
  OUTPUT      { field: type }
  PROMPT      """multi-line triple-quoted prompt"""
  SCHEDULE    daily | hourly | weekly | on_demand | event_triggered | "cron"
  IDEMPOTENT  true
}
```

**Generates:** `src-tauri/src/commands/reasoner.rs` with `run_reasoner(name)`; `start_reasoner_scheduler` spawned from `main.rs` setup hook using `tauri::async_runtime::spawn`; SQLite `reasoner_runs` table; `<ReasonerView>` React component.

#### `TRIGGER` — reactive event binding

```
TRIGGER TriggerName {
  DESCRIPTION "human description"
  WHEN {
    CHANNEL ch1, ch2                    # comma-separated or bracketed
    PACKET  PacketName
    FILTER  "filter expression string"
    EVENT   EventName
  }
  FIRES       (WORKFLOW | REASONER | SESSION | ACTION) target_identifier
  DEBOUNCE    "30s"                     # string literal
  RATE_LIMIT  "10 PER 1h"               # string literal
  IDEMPOTENT  true
}
```

**Critical:** `FIRES` takes a kind keyword (WORKFLOW / REASONER / SESSION / ACTION) followed by the target name. `DEBOUNCE` and `RATE_LIMIT` are string literals.

Triggers fire on **channel publish, packet receipt, or event emission**. To trigger on entity creation, have an ACTION publish to a CHANNEL and have a TRIGGER WHEN that CHANNEL.

#### `LIFECYCLE`

```
LIFECYCLE LifecycleName {
  TARGET       SkillName
  STAGES       [experimental, stable, production, deprecated]
  PROMOTE_WHEN { uses >= n, success_rate >= pct, age >= dur }
  DEMOTE_WHEN  { success_rate < pct }
}
```

#### `BREED`

```
BREED BreedName {
  PARENT       SkillName
  VARIANTS     n
  MUTATIONS    [strategy, ...]
  EVALUATE_BY  MetricName
  KEEP         top_n
}
```

#### `COGNITION_ROLE`

```
COGNITION_ROLE RoleName {
  TIER         1 | 2 | 3
  MODELS       ["model-id", ...]
  SPC_FLOOR    0.0-1.0
  HANDLES      [TaskTag, ...]
  ESCALATE_TO  HigherRole
}
```

#### `ESCALATION_CHAIN`

```
ESCALATION_CHAIN ChainName {
  ROLES             [Role1, Role2, Role3]
  ESCALATE_ON       spc_drop | error | timeout
  DE_ESCALATE_AFTER stable_window
  COOLDOWN          duration
}
```

#### `QC_MESH`

```
QC_MESH MeshName {
  NODES        [Node1, Node2, Node3]
  AGGREGATE    avg | min | weighted
  WEIGHTS      { Node1: 0.5, Node2: 0.5 }
  ALERT_BELOW  0.0-1.0
}
```

---

### Semantic Infrastructure Layer (5 declarations)

#### `PACKET`

```
PACKET PacketName {
  DESCRIPTION "human description"
  PAYLOAD {
    field_name: type REQUIRED
    field_name: type
  }
  METADATA {
    PROVENANCE true
    LINEAGE    true
    SIGNATURES true | false | required
    TTL        seconds
  }
  VALIDATION {
    rule_name: condition_expression
  }
}
```

#### `AUTHORITY`

```
AUTHORITY AuthorityName {
  CHANNEL ChannelName
  ALLOW   IdentityName
  VERIFY  signature | did_document
}
```

#### `CHANNEL`

```
CHANNEL ChannelName {
  DESCRIPTION "human description"
  PROTOCOL    queue | topic | broadcast
  DIRECTION   inbound | outbound | bidirectional
  PACKET      PacketName
}
```

#### `IDENTITY`

```
IDENTITY IdentityName {
  SIGNING_KEY  ed25519 | secp256k1
  DOMAINS      [tag1, tag2]
  PROFILE {
    display_name: string REQUIRED
    bio:          string
  }
}
```

#### `FEED`

```
FEED FeedName {
  IDENTITY    IdentityName
  FORMAT      atom
  ITEMS_FROM  EntityName
  ITEM_TITLE  field_name
  ITEM_BODY   field_name
}
```

---

### Adaptive Intelligence Layer (6 declarations)

#### `EVENT`

```
EVENT EventName {
  PAYLOAD     { field: type }
  SUBSCRIBERS [NodeName]
  RETAIN      duration
}
```

#### `NBVE` — Non-Blocking Variant Evaluation

```
NBVE NbveName {
  PRODUCTION        "model-id"
  CANDIDATE         "model-id"
  METRICS           [quality, latency, cost]
  SPC_FLOOR         0.0-1.0
  PROMOTION_WINDOW  n_runs
}
```

#### `CONTRACT`

```
CONTRACT ContractName {
  PARTIES {
    role_name: IdentityName
  }
  TERMS {
    term_name: type = default
  }
  DELIVERABLES ["description"]
  PAYMENT {
    amount:   number
    currency: "USD"
    provider: ProviderName
  }
  GOVERNANCE AuthorityName
}
```

#### `REPUTATION`

```
REPUTATION ReputationName {
  SUBJECT IdentityName
  METRICS { metric_name: type }
  SPC     { sample_size: n, control_limits: tight | normal | loose }
  DECAY   half_life_duration
}
```

#### `SUBSCRIPTION`

```
SUBSCRIPTION SubscriptionName {
  PROVIDER   IdentityName
  SUBSCRIBER IdentityName
  TERMS {
    tier:    "tier_name"
    billing: monthly | annual
    perks:   ["perk1", "perk2"]
  }
  PAYMENT { amount: n, currency: "USD", provider: ProviderName }
}
```

#### `DISPUTE`

```
DISPUTE DisputeName {
  CONTRACT   ContractName
  STATES     [opened, investigating, resolved]
  RESOLUTION { mediator: IdentityName, outcome: refund | partial | dismissed }
  EVIDENCE   { allowed_types: ["screenshot"] }
}
```

---

### Semantic Operating Environment (2 declarations)

#### `SESSION`

```
SESSION SessionName {
  DESCRIPTION "human description"
  MEMORY    identifier_name              # OR: MEMORY { key: type, ... }   typed block
  TOOLS     tool1, tool2                  # comma-separated identifiers
  CONTEXT   context_identifier
  OUTPUT    output1, output2              # comma-separated identifiers
  PERSIST   true | false
  TERMINAL  true | false
  PROFILES  [profile1, profile2]
}
```

A session encapsulates a UI mode with its own memory, tool inventory, and persistence behavior. Sessions don't reference VIEWs directly — they reference TOOLS (action identifiers) and a CONTEXT (a domain tag). View routing happens at the APP level.

#### `COMPILER` — semantic state transition

```
COMPILER CompilerName {
  DESCRIPTION "human description"
  FROM        source_id                      # lowercase identifier (session or entity)
  TO          target_id                      # lowercase identifier
  EXTRACT     field1, field2, field3         # comma-separated identifier list
  ENRICH {                                    # optional
    INFER     topic_classification
    GENERATE  summary
    PRESERVE  original_content
  }
  AI          "optional prompt template"
  VALIDATE    true | false
}
```

**Critical:** `EXTRACT` is a comma-separated list of identifier names, NOT a block. `FROM` and `TO` are lowercase identifiers (typically `chat`, `document`, or your entity name).

---

### Ambient + Embedded Layer (8 declarations)

#### `NODE`, `SENSOR`, `ZONE`, `MESH`

```
NODE NodeName {
  INPUT       { field: type }
  OUTPUT      { field: type }
  PROCESS     "rust_function_name"
  CONNECTS_TO [Node1, Node2]
}

SENSOR SensorName {
  SOURCE  file | api | system | websocket
  TARGET  "path_or_url"
  POLL    duration                           # OR: SUBSCRIBE (bare)
  EMIT    PacketName
}

ZONE ZoneName {
  NODES   [Node1, Node2]
  SENSORS [Sensor1]
  CHANNEL ChannelName
}

MESH MeshName {
  NODES    [Node1, Node2, Node3]
  TOPOLOGY mesh | star | ring
  GOVERNS  AuthorityName
}
```

#### `ACTUATOR`, `PLATFORM`, `NULLCLAW`, `BRAIN_BODY`

```
ACTUATOR ActuatorName {
  TYPE       motor | servo | relay | led | speaker | display
  MODEL      "part_number"
  SAFE_STATE value
  ZONE       ZoneName
}

PLATFORM PlatformName {
  ARCH x86_64 | aarch64 | armv7 | riscv64 | esp32
  OS   linux | windows | macos | freertos | none
  PINS { peripheral_name: pin_id }
}

NULLCLAW AgentName {
  PROVIDER  AiServiceName
  TOOLS     [ToolName]
  MAX_STEPS n
  HALT_ON   [low_confidence, budget_exceeded]
}

BRAIN_BODY RigName {
  BRAIN    NullclawName
  BODY     { ACTUATORS [Actuator1], SENSORS [Sensor1] }
  PLATFORM PlatformName
  TICK     duration
}
```

---

### Deployment Layer (3 declarations)

```
TARGET TargetName {
  KIND      desktop | web | cli | library
  RUNTIME   tauri | axum | rocket
  BUNDLE_AS msi | dmg | appimage | docker
  HOST      "0.0.0.0"
  PORT      n
}

AUTH AuthName {
  PROVIDER oauth_google | oauth_github | magic_link | password | sso_saml
  SESSION  cookie | jwt | bearer
  TIMEOUT  duration
}

TENANT TenantName {
  KEY          field_name
  SCOPE        all | [EntityName]
  RESOLVE_FROM auth_session | header | subdomain
}
```

(Note: `TARGET KIND web` parses; codegen is experimental in v1.0.)

---

### Primitives (6 declarations)

```
MACRO macro_name(p: identifier, b: block) { /* body with ${p} */ }
# Invocation: @macro_name(arg, { ... })

MACRO_REGISTRY RegistryName {
  VERSION "1.0.0"
  MACROS  [m1, m2]
  EXPORTS [m1]
}

LOG LogName {
  CHANNEL  ch_name
  LEVEL    trace | debug | info | warn | error
  SINK     file | stdout | both
  PATH     "logs/path.log"
  ROTATION 50MB | 7d
}

THEME ThemeName {
  PALETTE    indigo | violet | rose | amber | emerald | cyan | slate
  ACCENT     "#3b82f6"                                          # hex string
  BACKGROUND dark | light | auto
  FONT       "Inter"                                             # font family string
  DENSITY    compact | comfortable | spacious
  MOTIF      minimal | retro | cyberpunk | corporate | playful
  RADIUS     sharp | rounded | pill
}

# SEED — multiple valid forms:
SEED Entity { id: "x", field: value }                              # single, inline
SEED Entity { RECORDS [ { id: "a", ... }, { id: "b", ... } ] }     # bulk block
SEED Entity [ { id: "a", ... }, { id: "b", ... } ]                 # bulk bracket

TYPE AliasName = type_expression                                    # type alias
```

### Soft keywords (work as state names in `STAGES`/`STATE`)

```
open  closed  pending  draft  in_review  published  archived
define  active  completed  cancelled  disputed  approved  rejected
```

### Numeric literals

```
5    +5    -5    0.5    +0.5    -0.5            # signed numerics OK since Sprint X.3
SCORE x 5    SCORE x +5    SCORE x -= 5         # three SCORE adjustment forms
```

### Duration / size literals

```
500ms  5s  10m  2h  3d  30d  6mo  1y           # durations
50MB  100MB  2GB                                # sizes
```

---

## L3 — Anti-patterns & error → fix

### Anti-patterns

#### A1. Treating `VAULT` as an API key store

```
BAD:  VAULT ApiKeys { KEY anthropic_api_key string }
      AI_SERVICE { KEYS_FILE ApiKeys ... }

GOOD: AI_SERVICE {
        PROVIDERS anthropic
        KEYS_FILE "%APPDATA%/AppName/api-keys.json"
        ...
      }
```

**Why:** `VAULT` is for shared **content asset storage** across apps (documents, conversations, blobs). Its fields are `PATH`, `ASSET_TYPES`, `PROVENANCE`, `TAGS` — there is no `KEY` field. API keys are read from a JSON file at the path given by `AI_SERVICE.KEYS_FILE`. The Tauri runtime can read the file directly or via the keychain plugin.

#### A2. Bracket-form for comma-list fields

```
BAD:  AI_SERVICE { PROVIDERS [anthropic, openai] ... }
BAD:  SKILL X { KEYWORDS [coding, react, typescript] ... }

GOOD: AI_SERVICE { PROVIDERS anthropic, openai ... }
GOOD: SKILL X { KEYWORDS coding, react, typescript ... }
```

**Why:** Some fields accept bare comma-separated identifiers; others require bracketed lists. AI_SERVICE.PROVIDERS, SKILL.KEYWORDS, and VAULT.ASSET_TYPES use the bare comma form. Most other list fields (HAS_MANY targets in CRUD list, SKILLDOC.SKILLS, NODE.CONNECTS_TO, etc.) use brackets. When in doubt, check the canary.

#### A3. `AI_SERVICE.MODELS` as a string array

```
BAD:  AI_SERVICE { MODELS ["claude-sonnet-4-20250514", "gpt-5"]
                   DEFAULT "claude-sonnet-4-20250514" }

GOOD: AI_SERVICE {
        DEFAULT anthropic
        MODELS {
          anthropic "claude-sonnet-4-20250514" LABEL "Sonnet 4"   DEFAULT
          openai    "gpt-5"                    LABEL "GPT-5"
        }
      }
```

**Why:** `MODELS` is a block with rows of `provider "model-id" LABEL "Display Name" [DEFAULT] [CONTEXT n]`. The top-level `DEFAULT` is a **provider** identifier, not a model id; default model per provider is marked with the `DEFAULT` keyword on the row.

#### A4. `CURRENT` on a VIEW block

```
BAD:  VIEW NoteList {
        ENTITY  Note
        LAYOUT  list
        CURRENT
      }

GOOD: APP myapp {
        TITLE "..."
        DB    x.db
        CURRENT Note
      }
      VIEW NoteList { ENTITY Note  LAYOUT list ... }
```

**Why:** `CURRENT EntityName` is an **APP-block** field declaring which entity is the navigation default. It is NOT a VIEW field. Master-detail navigation is wired by the compiler based on the APP-level CURRENT entity.

#### A5. `array(T)` for typed arrays

```
BAD:  ENTITY X { tags: array(string) }
BAD:  ENTITY X { tags: string[] }

GOOD: ENTITY X { tags: json = [] }
```

**Why:** The parser type alphabet is fixed: `string`, `number`, `float`, `bool`, `date`, `datetime`, `json`, `id`. Use `json` for arrays/lists/blobs; default-empty with `= []`. Generated code uses `serde_json::Value` for the Rust side and `unknown[]` (or specific types via type alias) for TypeScript.

#### A6. TEST with nested `GIVEN { ... }` or nested `EXPECT { ... }`

```
BAD:  TEST t {
        GIVEN { Note { title: "x" } }                   # nested braces in GIVEN
        EXPECT {                                         # nested EXPECT block
          create Note { ... }
          get_by_id Note "auto"
        }
      }

GOOD: TEST t {
        GIVEN Note { title: "x", body: "y" }            # one entity per GIVEN, no braces
        EXPECT create -> id IS NOT NULL                  # one assertion per EXPECT
        EXPECT create -> title == "x"
        EXPECT update { title: "z" } -> title == "z"
        EXPECT delete -> get_by_id IS NULL
      }
```

**Why:** Each `GIVEN` declares one seed entity (you can have many GIVEN lines). Each `EXPECT` is a single `operation -> assertion` line.

#### A7. Top-level `STAGES` without entity binding

```
BAD:  STAGES OrderLifecycle { draft -> submitted -> approved }

GOOD: STAGES Order.state { draft -> submitted -> approved }
      ENTITY Order { state: string = "draft" ... }
```

**Why:** Top-level STAGES syntax is `STAGES Entity.field { ... }` — it's bound to a specific field of a specific entity. The field on the entity is a plain string with a default; the STAGES declaration wires the validation/transition guard.

#### A8. Field name on `BELONGS_TO`/`HAS_MANY`

```
BAD:  ENTITY Tag { parent: BELONGS_TO Note }

GOOD: ENTITY Tag { BELONGS_TO Note }
```

**Why:** These are bare statements. The compiler synthesizes the FK column name (e.g., `note_id`).

#### A9. Procedural logic in `.agi`

```
BAD:  ACTION foo {
        IMPL {
          for record in db.query("SELECT * FROM X") {
            if record.field > 10 { ... }
          }
        }
      }

GOOD: ACTION foo {
        INPUT  threshold: number
        OUTPUT results: json
        AI     "Return all records where field > {{threshold}}."
      }
```

**Why:** `.agi` is declarative. `IMPL` is an escape hatch; every IMPL block is a code smell — usually there's a declarative primitive that expresses the same intent more clearly.

#### A10. `RULE` for state machines

```
BAD:  RULE submit_order {
        CONDITIONS { Order.state = "draft" }
        ACTIONS    { Order.state = "submitted" }
      }

GOOD: STAGES Order.state { draft -> submitted -> approved -> fulfilled }
```

**Why:** `RULE` is for forward-chaining inference. `STAGES` is for explicit finite state machines. Using RULE for state machines obscures the lifecycle and loses the compiler-generated transition guard.

#### A11. `WHEN Entity created` on TRIGGER

```
BAD:  TRIGGER on_new_order {
        WHEN  Order created
        FIRES process_order_workflow
      }

GOOD: # Define a channel + packet for entity events.
      PACKET OrderCreated { PAYLOAD { order_id: string REQUIRED } }
      CHANNEL order_events {
        DESCRIPTION "Order lifecycle events"
        PROTOCOL    topic
        DIRECTION   bidirectional
        PACKET      OrderCreated
      }
      ACTION publish_order { INPUT order_id: id  OUTPUT published: bool }
      # ACTION should publish to order_events channel via EMIT (codegen) or IMPL.
      TRIGGER on_new_order {
        WHEN  { CHANNEL order_events  PACKET OrderCreated }
        FIRES WORKFLOW process_order_workflow
      }
```

**Why:** TRIGGER's `WHEN` block listens for CHANNEL publishes, PACKET receipt, or EVENT emission — not entity CRUD directly. To react to entity creation, publish to a channel from the relevant action.

#### A12. `FIRES` without a kind keyword

```
BAD:  TRIGGER t { WHEN { CHANNEL c }  FIRES my_workflow }

GOOD: TRIGGER t { WHEN { CHANNEL c }  FIRES WORKFLOW my_workflow }
```

**Why:** `FIRES` requires a kind keyword (`WORKFLOW`, `REASONER`, `SESSION`, or `ACTION`) before the target identifier.

#### A13. `DEBOUNCE` / `RATE_LIMIT` as bare numbers/durations

```
BAD:  TRIGGER t { ... DEBOUNCE 30s }
BAD:  TRIGGER t { ... RATE_LIMIT 10 PER 1h }

GOOD: TRIGGER t { ... DEBOUNCE "30s" }
GOOD: TRIGGER t { ... RATE_LIMIT "10 PER 1h" }
```

**Why:** These are string literals (parsed by the runtime).

#### A14. `WORKFLOW` with `DEPENDS_ON` inside STEP

```
BAD:  WORKFLOW w {
        STEP a { ACTION action_a }
        STEP b { ACTION action_b DEPENDS_ON a }
      }

GOOD: WORKFLOW w {
        STEP a { ACTION action_a }
        STEP b { ACTION action_b }                  # implicit order
      }
      # OR explicit parallel:
      WORKFLOW w {
        STEP a { ACTION action_a }
        STEP b { ACTION action_b }
        STEP c { ACTION action_c }
        PARALLEL [a, b]                              # a + b parallel, then c
      }
```

**Why:** STEP blocks don't accept `DEPENDS_ON`. Steps run in source order. Use `PARALLEL` to mark a group that should run concurrently.

#### A15. Multiple APP blocks per file

One per file. Two apps → two files.

#### A16. Using `string` for prose, `text` for short labels

```
BAD:  ENTITY Article { body: string }                # truncated for long prose
BAD:  ENTITY Tag     { name: text   }                # text is unbounded — wasteful

GOOD: ENTITY Article { body: string }                # works for any length (string maps to TEXT in SQL)
GOOD: ENTITY Tag     { name: string REQUIRED UNIQUE }
```

**Why:** In Agicore's type system, `string` and `text` (SQL alias) both map to TEXT in SQLite. There's no actual length limit. Convention: use `string` everywhere unless you really want to signal "this is going to be very long" — and even then, `string` works.

#### A17. Editing generated files without `// @agicore-protected`

```
GOOD: First line of any hand-edited generated file: `// @agicore-protected`
      Compiler skips the file on regen.
```

#### A18. Inventing keywords

Stick to L2. The validator rejects unknown declaration names and unknown fields.

#### A19. Decorating with comments instead of `DESCRIPTION`

```
BAD:  // This entity tracks customer accounts
      ENTITY Customer { ... }

GOOD: ENTITY Customer {
        DESCRIPTION "Customer account record — primary subject of CRM operations"
        ...
      }
```

`DESCRIPTION` flows into generated TS docstrings, admin UI tooltips, API docs. Comments in `.agi` are stripped.

#### A20. Forgetting the `STREAMING true` line on AI_SERVICE when using `STREAM true` on actions

```
BAD:  AI_SERVICE {
        PROVIDERS anthropic
        KEYS_FILE "..."
        DEFAULT anthropic
        MODELS { anthropic "..." LABEL "..." DEFAULT }
      }
      ACTION send_message { ... AI "..." STREAM true }     # AI_SERVICE not streaming-enabled

GOOD: AI_SERVICE {
        PROVIDERS anthropic
        KEYS_FILE "..."
        DEFAULT anthropic
        STREAMING true
        MODELS { ... }
      }
      ACTION send_message { ... AI "..." STREAM true }
```

### Error → fix table

| Error fragment | Cause | Fix |
|---|---|---|
| `Expected LBRACE, got: IDENTIFIER ('ApiKeys')` after VAULT | VAULT given a name | `VAULT { ... }` — singleton, no name (A1) |
| `Unexpected token in VAULT: KEY` | VAULT used as key store | Use `AI_SERVICE.KEYS_FILE "..."` (A1) |
| `Expected identifier, got: LBRACE ('{')` inside TEST | TEST nested GIVEN or EXPECT block | Canonical flat form (A6) |
| `Expected DOT, got: LBRACE ('{')` after STAGES name | Top-level STAGES without `Entity.field` | `STAGES Entity.field { ... }` (A7) |
| `Unexpected field in VIEW: CURRENT` | CURRENT on VIEW | Move to APP block (A4) |
| `Unexpected character: '(' at line N` in field declaration | `array(T)` syntax | Use `json` (A5) |
| `Expected type, got: int` | `int` is not a primitive | Use `number` |
| `Expected STEP inside STEPS block` | WORKFLOW STEPS used colon-form | Use STEP wrapper (canonical) |
| `Unexpected token in STEP: DEPENDS_ON` | STEP doesn't have DEPENDS_ON | Use source order or PARALLEL (A14) |
| `Expected LBRACE, got: IDENTIFIER` after TRIGGER WHEN | TRIGGER WHEN not in block form | `WHEN { CHANNEL ... }` |
| `Unexpected token in TRIGGER: WHEN_word` | Used `WHEN Entity created` form | Use channel/packet/event form (A11) |
| `TRIGGER fires.target kind mismatch` | FIRES missing kind keyword | `FIRES WORKFLOW name` (A12) |
| `Expected STRING_LITERAL` for DEBOUNCE/RATE_LIMIT | Bare value not string | `DEBOUNCE "30s"` (A13) |
| `Model 'X' provider not in PROVIDERS` | Model uses unlisted provider | Add provider to PROVIDERS line |
| `Unknown declaration type 'X'` | Invented keyword | Check L2 |
| `ENTITY 'X' not declared` (in VIEW/ACTION/STAGES) | Reference to non-existent entity | Declare it (order doesn't matter) |

When in doubt, run `agicore parse file.agi` — the parser is strict and line-precise.

---

## L4 — Worked examples (verified)

Every example below has been verified against the Agicore v1.0 parser. They will parse with zero errors and compile to a Tauri project.

### Recipe 1 — Minimum viable CRUD

```agicore
APP notes {
  TITLE  "Notes"
  WINDOW 1000x700
  DB     notes.db
}

ENTITY Note {
  title: string REQUIRED
  body:  string
  TIMESTAMPS
}

VIEW NoteList {
  ENTITY  Note
  LAYOUT  list
  ACTIONS create, edit, delete
  SIDEBAR icon: FileText
  FIELDS  title, updated_at
}

TEST note_crud {
  GIVEN Note { title: "First note", body: "hello" }
  EXPECT create -> id IS NOT NULL
  EXPECT create -> title == "First note"
  EXPECT update { title: "Renamed" } -> title == "Renamed"
  EXPECT delete -> get_by_id IS NULL
}
```

### Recipe 2 — Multi-entity with relationships, seeds, CURRENT

```agicore
APP tagged_notes {
  TITLE   "Tagged Notes"
  WINDOW  1200x800 frameless
  DB      notes.db
  CURRENT Note
}

ENTITY Note {
  title: string REQUIRED
  body:  string
  TIMESTAMPS
  HAS_MANY Tag
}

ENTITY Tag {
  name:  string REQUIRED UNIQUE
  color: string = "#3b82f6"
  BELONGS_TO Note
  TIMESTAMPS
}

SEED Tag { id: "tag-1", name: "Ideas",  color: "#3b82f6" }
SEED Tag { id: "tag-2", name: "TODO",   color: "#10b981" }
SEED Tag { id: "tag-3", name: "Drafts", color: "#f59e0b" }

VIEW NoteList {
  ENTITY  Note
  LAYOUT  list
  ACTIONS create, edit, delete
  SIDEBAR icon: FileText
  FIELDS  title, updated_at
}

VIEW TagList {
  ENTITY  Tag
  LAYOUT  table
  ACTIONS create, edit, delete
  SIDEBAR icon: Hash
  FIELDS  name, color
}
```

### Recipe 3 — AI summarization action

```agicore
APP summarizer {
  TITLE   "Article Summarizer"
  WINDOW  1100x750
  DB      summarizer.db
  CURRENT Article
}

AI_SERVICE {
  PROVIDERS anthropic
  KEYS_FILE "%APPDATA%/Summarizer/api-keys.json"
  DEFAULT   anthropic
  STREAMING true
  MODELS {
    anthropic "claude-sonnet-4-20250514" LABEL "Claude Sonnet 4" DEFAULT
    anthropic "claude-haiku-4-5-20251001" LABEL "Claude Haiku 4.5"
  }
}

ENTITY Article {
  title:   string REQUIRED
  body:    string
  summary: string
  TIMESTAMPS
}

ACTION summarize_article {
  INPUT  article_id: id
  OUTPUT summary:    string
  AI     "Summarize this article in 3 sentences:\n\n{{body}}"
}

VIEW ArticleList {
  ENTITY  Article
  LAYOUT  list
  ACTIONS create, edit, delete
  SIDEBAR icon: FileText
  FIELDS  title, summary, updated_at
}
```

### Recipe 4 — Multi-step AI workflow

```agicore
APP publisher {
  TITLE   "Article Publisher"
  WINDOW  1200x800
  DB      publisher.db
  CURRENT Article
}

AI_SERVICE {
  PROVIDERS anthropic
  KEYS_FILE "%APPDATA%/Publisher/api-keys.json"
  DEFAULT   anthropic
  STREAMING true
  MODELS {
    anthropic "claude-sonnet-4-20250514" LABEL "Sonnet" DEFAULT
  }
}

ENTITY Article {
  title:   string REQUIRED
  body:    string REQUIRED
  status:  string = "draft"
  TIMESTAMPS
}

ACTION proofread_article {
  INPUT  article_id: id
  OUTPUT corrections: string
  AI     "List grammar / typo issues in this article:\n\n{{body}}"
}

ACTION summarize_article {
  INPUT  article_id: id
  OUTPUT summary: string
  AI     "Three-sentence summary:\n\n{{body}}"
}

ACTION fact_check_article {
  INPUT  article_id: id
  OUTPUT issues: string
  AI     "List factual claims that need verification:\n\n{{body}}"
}

ACTION publish_article {
  INPUT  article_id: id
  OUTPUT article: Article
}

WORKFLOW publish_pipeline {
  STEP proofread  { ACTION proofread_article }
  STEP summarize  { ACTION summarize_article }
  STEP fact_check { ACTION fact_check_article }
  STEP publish    { ACTION publish_article }
  PARALLEL proofread, summarize, fact_check
}

VIEW ArticleList {
  ENTITY  Article
  LAYOUT  list
  ACTIONS create, edit, delete
  SIDEBAR icon: FileText
  FIELDS  title, status, updated_at
}
```

The PARALLEL list makes proofread/summarize/fact_check run concurrently; publish runs after.

### Recipe 5 — Multi-provider AI chat with ROUTER

```agicore
APP smart_chat {
  TITLE   "Smart Chat"
  WINDOW  1300x850 frameless
  DB      chat.db
  CURRENT ChatSession
}

AI_SERVICE {
  PROVIDERS anthropic, openai, google
  KEYS_FILE "%APPDATA%/SmartChat/api-keys.json"
  DEFAULT   anthropic
  STREAMING true
  MODELS {
    anthropic "claude-haiku-4-5-20251001"   LABEL "Haiku 4.5"
    anthropic "claude-sonnet-4-20250514"    LABEL "Sonnet 4"   DEFAULT
    anthropic "claude-opus-4-6"             LABEL "Opus 4"
    openai    "gpt-4o"                       LABEL "GPT-4o"     DEFAULT
    google    "gemini-2.5-pro"               LABEL "Gemini 2.5 Pro" DEFAULT
  }
}

ROUTER ChatRouter {
  DESCRIPTION "Tiered chat routing — cheap by default, escalates on error"

  TIER 1 fast {
    haiku: anthropic "claude-haiku-4-5-20251001" {
      STRENGTHS  general, conversation
      COST       0.1
      CONTEXT    200000
      DEFAULT
    }
  }

  TIER 2 balanced {
    sonnet: anthropic "claude-sonnet-4-20250514" {
      STRENGTHS  coding, analysis
      COST       0.3
      CONTEXT    200000
      DEFAULT
    }
    gpt4o: openai "gpt-4o" {
      STRENGTHS  general, creative_writing
      COST       0.25
      CONTEXT    128000
    }
  }

  TIER 3 premium {
    opus: anthropic "claude-opus-4-6" {
      STRENGTHS  research, analysis, coding
      COST       1.5
      CONTEXT    200000
      DEFAULT
    }
  }

  TASK_TYPES  general, coding, analysis, creative_writing, research
  MOSH_PIT    3
  CALIBRATION true
}

ENTITY ChatSession {
  name:          string REQUIRED
  system_prompt: string
  TIMESTAMPS
}

ENTITY ChatMessage {
  user_message: string REQUIRED
  ai_message:   string REQUIRED
  model:        string REQUIRED
  provider:     string REQUIRED
  tier:         number = 1
  BELONGS_TO ChatSession
  ORDER ASC
  TIMESTAMPS
}

ACTION send_chat {
  INPUT  user_message: string, model: string, system_prompt: string
  OUTPUT response: ChatMessage
  AI     "{{system_prompt}}\n\n{{user_message}}"
  STREAM true
}

VIEW SessionList {
  ENTITY  ChatSession
  LAYOUT  list
  ACTIONS create, delete
  SIDEBAR icon: MessageSquare
  FIELDS  name, updated_at
}

VIEW ChatView {
  LAYOUT  custom
  SIDEBAR icon: Send
  TITLE   "Chat"
}

VIEW SettingsView {
  LAYOUT  settings
  SIDEBAR icon: Settings
}
```

### Recipe 6 — Master-detail with CURRENT

```agicore
APP catalog {
  TITLE   "Catalog Browser"
  WINDOW  1300x850
  DB      catalog.db
  CURRENT Category
}

ENTITY Category {
  name:        string REQUIRED UNIQUE
  description: string
  TIMESTAMPS
  HAS_MANY Product
}

ENTITY Product {
  name:        string REQUIRED
  description: string
  price:       float REQUIRED
  in_stock:    bool = true
  TIMESTAMPS
  BELONGS_TO Category
}

VIEW CategoryList {
  ENTITY  Category
  LAYOUT  list
  ACTIONS create, edit, delete
  SIDEBAR icon: Folder
  FIELDS  name, description
}

VIEW ProductList {
  ENTITY  Product
  LAYOUT  table
  ACTIONS create, edit, delete
  SIDEBAR icon: Package
  FIELDS  name, price, in_stock
}
```

The `CURRENT Category` on APP wires the Zustand store so `currentCategory` is available; `ProductList` auto-scopes to products of `currentCategory`.

### Recipe 7 — Document editor layout

```agicore
APP knowledge_base {
  TITLE   "Knowledge Base"
  WINDOW  1400x900 frameless
  DB      kb.db
  CURRENT Document
}

ENTITY Document {
  title: string REQUIRED
  body:  string
  tags:  string
  TIMESTAMPS
}

VIEW DocList {
  ENTITY  Document
  LAYOUT  document_editor
  ACTIONS create, delete
  SIDEBAR icon: FileText
  FIELDS  title, updated_at
}
```

`LAYOUT document_editor` produces a split view: document list left, in-place editor for `currentDocument` right.

### Recipe 8 — Expert system rules + score

```agicore
APP fraud_detector {
  TITLE   "Fraud Detector"
  WINDOW  1200x800
  DB      fraud.db
  CURRENT Transaction
}

ENTITY User {
  email:        string REQUIRED UNIQUE
  home_country: string
  total_volume: float = 0
  TIMESTAMPS
}

ENTITY Transaction {
  user_id:    string REQUIRED
  amount:     float REQUIRED
  country:    string
  ip_address: string
  flagged:    bool = false
  TIMESTAMPS
}

RULE high_value_foreign {
  WHEN     Transaction.amount > 5000
  AND      Transaction.country != "US"
  THEN     flag_transaction
  SEVERITY warning
  PRIORITY 100
}

RULE rapid_burst {
  WHEN     Transaction.amount > 1000
  THEN     review_user
  SEVERITY warning
  PRIORITY 80
}

ACTION flag_transaction { INPUT tx_id: id     OUTPUT tx: Transaction }
ACTION review_user      { INPUT user_id: id   OUTPUT user: User }

VIEW TransactionList {
  ENTITY  Transaction
  LAYOUT  table
  ACTIONS none
  SIDEBAR icon: CreditCard
  FIELDS  user_id, amount, country, flagged, created_at
}

VIEW UserList {
  ENTITY  User
  LAYOUT  table
  ACTIONS edit
  SIDEBAR icon: Users
  FIELDS  email, home_country, total_volume
}
```

### Recipe 9 — REASONER + channel-driven TRIGGER

```agicore
APP article_intel {
  TITLE   "Article Intelligence"
  WINDOW  1200x800
  DB      intel.db
  CURRENT Article
}

AI_SERVICE {
  PROVIDERS anthropic
  KEYS_FILE "%APPDATA%/ArticleIntel/api-keys.json"
  DEFAULT   anthropic
  STREAMING true
  MODELS {
    anthropic "claude-sonnet-4-20250514" LABEL "Sonnet" DEFAULT
  }
}

ENTITY Article {
  title:    string REQUIRED
  body:     string
  analyzed: bool = false
  TIMESTAMPS
}

PACKET ArticleSubmitted {
  PAYLOAD {
    article_id: string REQUIRED
  }
}

CHANNEL analysis_queue {
  DESCRIPTION "Article submission notifications"
  PROTOCOL    topic
  DIRECTION   bidirectional
  PACKET      ArticleSubmitted
}

REASONER analyze_articles {
  DESCRIPTION "Analyze unprocessed articles"
  INPUT       { since: datetime }
  OUTPUT      { processed_count: number }
  PROMPT      "For each Article where analyzed=false, classify sentiment and mark analyzed=true."
  SCHEDULE    hourly
  IDEMPOTENT  true
}

TRIGGER on_new_article {
  DESCRIPTION "Run analyzer when an article packet arrives"
  WHEN        { CHANNEL analysis_queue  PACKET ArticleSubmitted }
  FIRES       REASONER analyze_articles
  DEBOUNCE    "30s"
  RATE_LIMIT  "20 PER 1h"
}

VIEW ArticleList {
  ENTITY  Article
  LAYOUT  list
  ACTIONS create, edit, delete
  SIDEBAR icon: FileText
  FIELDS  title, analyzed, updated_at
}
```

### Recipe 10 — Comprehensive test suite

```agicore
APP test_demo {
  TITLE   "Test Demo"
  WINDOW  800x600
  DB      test.db
  CURRENT Project
}

ENTITY Project {
  name:        string REQUIRED
  description: string
  status:      string = "active"
  TIMESTAMPS
  HAS_MANY Task
}

ENTITY Task {
  title: string REQUIRED
  done:  bool = false
  TIMESTAMPS
  BELONGS_TO Project
}

TEST project_crud {
  GIVEN Project { name: "Test Project", description: "test desc" }
  EXPECT create -> id IS NOT NULL
  EXPECT create -> name == "Test Project"
  EXPECT update { status: "archived" } -> status == "archived"
  EXPECT delete -> get_by_id IS NULL
}

TEST task_under_project {
  GIVEN Project { name: "Parent Project" }
  GIVEN Task { title: "Implement feature", BELONGS_TO Project }
  EXPECT create -> id IS NOT NULL
  EXPECT update { done: true } -> done == true
}

VIEW ProjectList {
  ENTITY  Project
  LAYOUT  list
  ACTIONS create, edit, delete
  SIDEBAR icon: Folder
  FIELDS  name, status
}

VIEW TaskList {
  ENTITY  Task
  LAYOUT  table
  ACTIONS create, edit, delete
  SIDEBAR icon: CheckSquare
  FIELDS  title, done
}
```

### Recipe 11 — Session-based operating modes

```agicore
APP writers_studio {
  TITLE   "Writer's Studio"
  WINDOW  1400x900 frameless
  DB      studio.db
  CURRENT Document
}

ENTITY Document {
  title: string REQUIRED
  body:  string
  TIMESTAMPS
}

ENTITY Research {
  topic: string REQUIRED
  notes: string
  TIMESTAMPS
}

ENTITY Outline {
  title:     string REQUIRED
  structure: json
  TIMESTAMPS
}

VIEW DocList {
  ENTITY  Document
  LAYOUT  document_editor
  ACTIONS create, delete
  SIDEBAR icon: FileText
  FIELDS  title
}

VIEW ResearchList {
  ENTITY  Research
  LAYOUT  list
  ACTIONS create, delete
  SIDEBAR icon: Search
  FIELDS  topic
}

VIEW OutlineList {
  ENTITY  Outline
  LAYOUT  list
  ACTIONS create, delete
  SIDEBAR icon: List
  FIELDS  title
}

SESSION WritingMode {
  DESCRIPTION "Focused writing — only the document"
  MEMORY {
    focus_doc_id:           string
    last_session_duration:  number
  }
  TOOLS   notes_search
  CONTEXT writing
  PERSIST true
}

SESSION ResearchMode {
  DESCRIPTION "Discovery — research and outlining"
  MEMORY {
    active_topic:      string
    sources_consulted: number
  }
  TOOLS   web_search, doc_summarize
  CONTEXT research
}

SESSION ReviewMode {
  DESCRIPTION "Editing — terminal for spell-check"
  MEMORY  review
  TOOLS   spell_check
  CONTEXT review
  PERSIST true
}
```

### Recipe 12 — Semantic COMPILER ("Send To")

```agicore
APP chat_to_article {
  TITLE   "Chat → Article"
  WINDOW  1200x800
  DB      studio.db
  CURRENT ChatSession
}

AI_SERVICE {
  PROVIDERS anthropic
  KEYS_FILE "%APPDATA%/ChatToArticle/api-keys.json"
  DEFAULT   anthropic
  STREAMING true
  MODELS {
    anthropic "claude-sonnet-4-20250514" LABEL "Sonnet" DEFAULT
  }
}

ENTITY ChatSession {
  name: string REQUIRED
  TIMESTAMPS
}

ENTITY ChatMessage {
  user_message: string REQUIRED
  ai_message:   string REQUIRED
  BELONGS_TO ChatSession
  ORDER ASC
  TIMESTAMPS
}

ENTITY Article {
  title:  string REQUIRED
  body:   string
  status: string = "draft"
  source: string
  TIMESTAMPS
}

SESSION chat {
  DESCRIPTION "Active conversation session"
  MEMORY      conversation
  CONTEXT     conversation
  TOOLS       send_chat
  PERSIST     true
}

SESSION document {
  DESCRIPTION "Document authoring session"
  MEMORY      document
  CONTEXT     authoring
  PERSIST     true
}

COMPILER chat_to_article {
  DESCRIPTION "Transform a chat session into a draft article"
  FROM        chat
  TO          document
  EXTRACT     title, body, status, source
  ENRICH {
    GENERATE  title
    GENERATE  body
    PRESERVE  source
  }
  AI          "Rewrite this chat transcript as a coherent article. Output as a structured document."
  VALIDATE    true
}

VIEW SessionList {
  ENTITY  ChatSession
  LAYOUT  list
  ACTIONS create, delete
  SIDEBAR icon: MessageSquare
  FIELDS  name
}

VIEW ChatView {
  LAYOUT  custom
  SIDEBAR icon: Send
  TITLE   "Chat"
}

VIEW ArticleList {
  ENTITY  Article
  LAYOUT  list
  ACTIONS edit, delete
  SIDEBAR icon: FileText
  FIELDS  title, status
}
```

### Recipe 13 — Lifecycle state machines (STAGES)

```agicore
APP orders {
  TITLE   "Orders"
  WINDOW  1300x800
  DB      orders.db
  CURRENT Order
}

ENTITY Order {
  buyer: string REQUIRED
  total: float
  state: string = "draft"
  notes: string
  TIMESTAMPS
}

STAGES Order.state {
  draft -> submitted
  submitted -> approved / rejected / pending_review
  approved -> fulfilled -> closed
  rejected -> closed
  pending_review -> approved / rejected
}

ACTION submit_order  { INPUT order_id: id  OUTPUT order: Order }
ACTION approve_order { INPUT order_id: id  OUTPUT order: Order }
ACTION fulfill_order { INPUT order_id: id  OUTPUT order: Order }
ACTION reject_order  { INPUT order_id: id, reason: string  OUTPUT order: Order }

VIEW OrderList {
  ENTITY  Order
  LAYOUT  table
  ACTIONS create, edit, delete
  SIDEBAR icon: ShoppingCart
  FIELDS  buyer, total, state, updated_at
}
```

The generated app gets an `OrderState` enum plus a `try_transition(from, to)` guard. Any `IMPL` block can call the guard; illegal transitions return `Err`.

### Recipe 14 — Combining patterns: a content pipeline

```agicore
APP content_pipeline {
  TITLE   "Content Pipeline"
  WINDOW  1400x900 frameless
  DB      content.db
  CURRENT Article
}

AI_SERVICE {
  PROVIDERS anthropic
  KEYS_FILE "%APPDATA%/ContentPipeline/api-keys.json"
  DEFAULT   anthropic
  STREAMING true
  MODELS {
    anthropic "claude-sonnet-4-20250514"  LABEL "Sonnet"  DEFAULT
    anthropic "claude-haiku-4-5-20251001" LABEL "Haiku"
  }
}

THEME Dark {
  PALETTE    slate
  ACCENT     "#3b82f6"
  BACKGROUND dark
  FONT       "Inter"
  DENSITY    comfortable
  MOTIF      minimal
  RADIUS     rounded
}

ENTITY Article {
  title:       string REQUIRED
  body:        string REQUIRED
  state:       string = "draft"
  proof_notes: string
  TIMESTAMPS
  HAS_MANY Tag
}

ENTITY Tag {
  name:  string REQUIRED UNIQUE
  color: string = "#3b82f6"
  BELONGS_TO Article
  TIMESTAMPS
}

STAGES Article.state {
  draft -> proofread
  proofread -> approved / needs_revision
  needs_revision -> draft
  approved -> published -> archived
}

SEED Tag { id: "tag-1", name: "Engineering", color: "#3b82f6" }
SEED Tag { id: "tag-2", name: "Design",      color: "#10b981" }

ACTION proofread_article {
  INPUT  article_id: id
  OUTPUT corrections: string
  AI     "List grammar/typo issues in:\n\n{{body}}"
}

ACTION mark_proofread { INPUT article_id: id  OUTPUT article: Article }
ACTION mark_approved  { INPUT article_id: id  OUTPUT article: Article }
ACTION publish_article { INPUT article_id: id  OUTPUT article: Article }

WORKFLOW article_review {
  STEP proofread { ACTION proofread_article }
  STEP mark_done { ACTION mark_proofread }
}

PACKET ArticleUpdated { PAYLOAD { article_id: string REQUIRED } }

CHANNEL article_events {
  DESCRIPTION "Article lifecycle events"
  PROTOCOL    topic
  DIRECTION   bidirectional
  PACKET      ArticleUpdated
}

TRIGGER on_article_update {
  WHEN        { CHANNEL article_events  PACKET ArticleUpdated }
  FIRES       WORKFLOW article_review
  DEBOUNCE    "1m"
}

PREFERENCE default_model {
  TYPE        string
  DEFAULT     "claude-sonnet-4-20250514"
  LABEL       "Default model"
  DESCRIPTION "Used for all AI actions unless overridden. Valid: 'claude-sonnet-4-20250514' or 'claude-haiku-4-5-20251001'."
}

VIEW ArticleList {
  ENTITY  Article
  LAYOUT  document_editor
  ACTIONS create, edit, delete
  SIDEBAR icon: FileText
  FIELDS  title, state, updated_at
}

VIEW TagList {
  ENTITY  Tag
  LAYOUT  table
  ACTIONS create, edit, delete
  SIDEBAR icon: Hash
  FIELDS  name, color
}

VIEW SettingsView {
  LAYOUT  settings
  SIDEBAR icon: Settings
}

TEST article_workflow {
  GIVEN Article { title: "Test", body: "Body text" }
  EXPECT create -> id IS NOT NULL
  EXPECT update { state: "proofread" } -> state == "proofread"
  EXPECT update { state: "approved" } -> state == "approved"
}
```

This recipe combines STAGES (lifecycle), SEED (initial data), AI ACTIONs (proofreading), WORKFLOW (orchestration), PACKET + CHANNEL + TRIGGER (reactivity), PREFERENCE (user control), THEME (visual identity), and TEST (verification). None of the primitives know about each other — they compose through shared identifier names and the Zustand store.

---

## L5 — Edge cases, known limits, gotchas

### Edge cases from real-app pressure

**Background-task spawning.** Generated startup-hook code must use `tauri::async_runtime::spawn`, not raw `tokio::spawn`. There's no current tokio runtime at app startup until Tauri builds one. v1.0 codegen handles this correctly throughout (`reasoner.rs`, `trigger.rs`, `router.rs`). If you regenerate over older hand-edited code, the spawns are already correct.

**`validation_errors` on `channel_messages`.** The packet validation column is defined inline in the `CREATE TABLE channel_messages` (channels.sql). Older codegen emitted an `ALTER TABLE` from packets.sql; v1.0 inlines it. No action needed unless you're upgrading hand-edited code.

**The `CONTEXT` keyword.** Used as `CONTEXT n` per-model row inside `AI_SERVICE.MODELS`. Earlier parser versions had context-keyword ambiguity that broke novasyn-chat; v1.0 disambiguates cleanly.

**`COMPOSITE_SCORE` doesn't exist (known limitation).** If you want a score derived from weighted dimensions (`METRICS { x: float } WEIGHTS { x: 0.35 }`), that declaration is **not in v1.0**. The current `SCORE` is for counter-with-thresholds. Workaround: separate SCOREs per dimension + a RULE to combine, OR a REASONER that computes the composite.

### Soft keywords across contexts

State names like `open`, `closed`, `pending`, `draft` work as identifiers in `STAGES` body and `STATE.STATES [...]`. They do NOT work as entity names — `ENTITY Open { ... }` is a hard parse error. When in doubt: **state-position OK, declaration-position not.**

### Lexer expressions (signed literals since Sprint X.3)

- `+5`, `-5`, `+0.5` parse cleanly as numeric literals
- `+=` and `-=` are compound assignment tokens
- `SCORE x +5` and `SCORE x -= 5` are both valid

### SEED forms

```
SEED Tag { id: "x", name: "x" }                                    # single, key value
SEED Tag { id: "x", name: "x" }                                    # single, key: value
SEED Tag { RECORDS [ { id: "a", ... }, { id: "b", ... } ] }        # bulk block
SEED Tag [ { id: "a", ... }, { id: "b", ... } ]                    # bulk bracket sugar
```

Prefer the bulk forms when you have 3+ records of the same entity.

### `@agicore-protected` — the regeneration escape hatch

```rust
// @agicore-protected — first line of a generated file
// Your hand-written code below survives regeneration.
```

The compiler reads the first line of every output path. If it contains the marker, the file is skipped on regeneration. Use sparingly. Mark per-file, not per-block. Every protected file is code that won't get the next generation's improvements.

### Regeneration workflow

```bash
vim my_app.agi                                                     # edit source
agicore generate my_app.agi --output ./out                         # regenerate
cd out && git diff                                                  # see what changed
cd src-tauri && cargo build                                         # build Rust
tsc --noEmit                                                        # check TS
cargo tauri dev                                                     # run
```

Regeneration preserves: SQLite data file, any file with `// @agicore-protected` first line. Regeneration overwrites everything else under `out/`.

### Validator (34 checks)

The validator catches:

- APP block presence + required fields (TITLE, DB)
- Duplicate identifiers across the file
- ENTITY field type validity
- Reserved keywords used as identifiers
- ACTION INPUT/OUTPUT validity
- VIEW.ENTITY references an existing ENTITY
- VIEW.LAYOUT in allowed set
- AI_SERVICE.MODELS non-empty
- AI_SERVICE.DEFAULT matches one of PROVIDERS
- AI_SERVICE model-provider consistency
- WORKFLOW step actions are declared ACTIONs
- TRIGGER.FIRES target kind matches declared target
- HAS_MANY ↔ BELONGS_TO symmetry (warning)
- COMPILER FROM/TO targets are declared
- COMPILER EXTRACT fields exist on FROM entity (warning)
- …plus 19 more covering CHANNEL, PACKET, AUTHORITY, IDENTITY, REASONER, SCORE, MODULE, NBVE, CONTRACT, REPUTATION, SUBSCRIPTION, DISPUTE, MESH, COGNITION_ROLE, ESCALATION_CHAIN cross-references.

Errors abort emission. Warnings continue. Set `AGICORE_STRICT_ACTIONS=1` to upgrade specific warnings to errors.

### What's not in v1.0 (set expectations)

- **Cross-file `.agi` imports.** Each `.agi` is self-contained. Macros can be shared via MACRO_REGISTRY (file-level), but `.agi` cross-file inclusion is v2.
- **Production web target codegen.** `TARGET KIND web RUNTIME axum` parses; the codegen is incomplete in v1.0.
- **Mobile.** No iOS/Android target.
- **Built-in NL→DSL compiler.** Authoring is human + AI assistant (Claude Code, Cursor) reading these skill docs. A packaged CLI is v2.
- **Schema migration tooling.** v1.0 is "regenerate"; v2 may add explicit migration declarations.
- **`array(T)` typed arrays.** Use `json` with default `= []`.
- **`DEPENDS_ON` inside WORKFLOW STEP.** Use source order + PARALLEL list.
- **`WHEN Entity created` on TRIGGER.** Use CHANNEL + PACKET routing.
- **`COMPOSITE_SCORE`.** Use multiple SCOREs + a combining RULE.
- **`int` primitive.** Use `number`.

---

## L6 — Self-check prompts

Run each prompt against yourself. Output must be a `.agi` file. **Verify** by running `agicore parse output.agi` — must produce 0 errors. The expected shape is what your output MUST contain.

### Self-check 1 — Minimum viable CRUD

**Prompt:** Build a single-window Tauri app for tracking books I've read. Each book has title, author, rating (number 1-5), and date_finished. Include a comprehensive test.

**Expected shape:**
- One APP with TITLE, WINDOW, DB
- ENTITY Book with the four fields plus TIMESTAMPS
- VIEW BookList
- TEST with canonical `GIVEN Entity { ... }` and `EXPECT op -> assertion` syntax
- Zero parser errors

### Self-check 2 — Relationships

**Prompt:** Build a recipe organizer. Recipes belong to Categories. Categories have many recipes. Pre-seed three starter categories.

**Expected shape:**
- ENTITY Recipe + ENTITY Category
- `Recipe { BELONGS_TO Category }` and `Category { HAS_MANY Recipe }` (bare statements, no field name)
- Three top-level `SEED Category { id: "...", name: "..." }` lines
- Two VIEWs
- Zero parser errors

### Self-check 3 — AI chat with key file

**Prompt:** Build a minimal AI chat client using Anthropic Claude. Stream responses. Store API keys at `%APPDATA%/MyChat/api-keys.json`.

**Expected shape:**
- AI_SERVICE with `PROVIDERS anthropic` (comma form, no brackets)
- AI_SERVICE.KEYS_FILE as the literal string path
- AI_SERVICE.DEFAULT as `anthropic` (provider identifier)
- AI_SERVICE.MODELS block with per-row provider + model id + LABEL + DEFAULT
- NO VAULT for keys
- ENTITY ChatSession + ENTITY ChatMessage (BELONGS_TO ChatSession)
- ACTION with AI prompt + STREAM true
- View for chat
- Zero parser errors

### Self-check 4 — REASONER + channel-driven TRIGGER

**Prompt:** Build an app that classifies Customer entities into "vip" or "standard" tiers via AI. Hourly REASONER does the work; channel-driven TRIGGER reruns when new customer events arrive.

**Expected shape:**
- ENTITY Customer with `tier: string`
- PACKET CustomerEvent + CHANNEL customer_events
- REASONER with PROMPT and SCHEDULE hourly
- TRIGGER with WHEN block `{ CHANNEL ... PACKET ... }` and FIRES REASONER reasoner_name
- AI_SERVICE set up correctly
- Zero parser errors

### Self-check 5 — STAGES + lifecycle

**Prompt:** Build an order management app. Orders progress: draft → submitted → approved → fulfilled → closed, with rejection paths from submitted and approved. Use STAGES, not RULEs.

**Expected shape:**
- ENTITY Order with `state: string = "draft"` (plain string default)
- `STAGES Order.state { ... }` — top-level form with entity binding
- ACTIONs for the transitions
- View for orders
- Zero parser errors

### Self-check 6 — Anti-pattern detection

**Prompt:** Critique this `.agi` snippet, identify which anti-patterns it hits, and rewrite correctly:

```
APP bad { TITLE "Bad" DB bad.db }

VAULT MyKeys { KEY anthropic_api_key string }

AI_SERVICE {
  PROVIDERS [anthropic]
  KEYS_FILE MyKeys
  MODELS    ["claude-sonnet-4-20250514"]
  DEFAULT   "claude-sonnet-4-20250514"
}

ENTITY Order { state: string = "draft" }

RULE submit_order {
  CONDITIONS { Order.state = "draft" }
  ACTIONS    { Order.state = "submitted" }
}

VIEW OrderList { ENTITY Order  LAYOUT list  CURRENT }
```

**Expected critique identifies:**
- A1 (VAULT misused for API keys — VAULT is for shared assets, fields are PATH/ASSET_TYPES/...)
- A2 (`PROVIDERS [anthropic]` — should be `PROVIDERS anthropic` bare comma form)
- A3 (`MODELS ["..."]` as string array — should be block with `provider "id" LABEL "..." DEFAULT`)
- A3 (`DEFAULT "claude-..."` as model id — should be `DEFAULT anthropic` as provider identifier)
- A4 (`CURRENT` on VIEW — should be on APP block)
- A10 (RULE for state machine — should be `STAGES Order.state { draft -> submitted }`)

And rewrites correctly addressing all six.

### Self-check 7 — Multi-step parallel workflow

**Prompt:** Build a content-publishing workflow that runs proofread, summarize, and fact-check actions concurrently against each Article, then publishes once all three complete.

**Expected shape:**
- Three ACTIONs (proofread, summarize, fact_check) with AI prompts
- One ACTION publish (no AI)
- WORKFLOW with four STEP blocks (no DEPENDS_ON) and a PARALLEL [step1, step2, step3] list for the first three
- VIEW for articles
- Zero parser errors

### Self-check 8 — Multi-provider ROUTER

**Prompt:** Build a chat app that prefers Haiku (fast/cheap) but escalates to Sonnet on error or timeout, and to Opus only if both fail. Use a ROUTER with three TIERs.

**Expected shape:**
- AI_SERVICE with three Claude models in MODELS block
- ROUTER with TIER 1 (Haiku), TIER 2 (Sonnet), TIER 3 (Opus), each with TASK_TYPES, MOSH_PIT, CALIBRATION
- ACTION using the router
- Zero parser errors

### Self-check 9 — Semantic compiler ("Send To")

**Prompt:** Build an app where the user can "send" a ChatSession to become a Document via AI extraction. Use COMPILER declaration.

**Expected shape:**
- ENTITY ChatSession + Message (BELONGS_TO ChatSession)
- ENTITY Document
- COMPILER with FROM, TO (lowercase identifiers), EXTRACT (comma-separated identifier list), optional ENRICH block, AI prompt, VALIDATE true
- Zero parser errors

### Self-check 10 — Expert system + score decay

**Prompt:** Build a fraud detection app. Track Transactions. Define rules for "high-value foreign transaction" and "rapid burst from same user". Use a SCORE that decays over time; flag at score > 30, freeze at > 50.

**Expected shape:**
- ENTITY Transaction with relevant fields
- At least two RULEs with CONDITIONS/ACTIONS/PRIORITY
- SCORE with INITIAL, MIN, MAX, DECAY, two THRESHOLDs
- ACTIONs for flag/freeze
- View for transactions
- Zero parser errors

### Self-check 11 — Combining patterns

**Prompt:** Build a content pipeline: articles with draft→review→approved→published lifecycle (STAGES), AI-driven proofreading (ACTION + AI_SERVICE), a WORKFLOW that runs proofread+summarize in parallel, a PACKET+CHANNEL+TRIGGER that fires the workflow on article events, PREFERENCEs for default model, and a dark THEME.

**Expected shape:**
- STAGES Article.state with the lifecycle
- ENTITY Article
- AI_SERVICE, at least one AI ACTION
- WORKFLOW with PARALLEL list
- PACKET + CHANNEL + TRIGGER for reactivity
- At least one PREFERENCE
- THEME with COLORS and DARK_MODE always
- Zero parser errors

### Self-check 12 — Full app from one paragraph

**Prompt:** I run a small consultancy. Build me a CRM with: contacts, opportunities (BELONGS_TO Contact), proposals (BELONGS_TO Opportunity), and a stages-based pipeline for opportunities (qualified → proposal_sent → negotiating → won/lost). Two views: a list of opportunities and a list of contacts. Dark theme. Pre-seed an "Acme Corp" contact.

**Expected shape:**
- Three ENTITYs with correct BELONGS_TO/HAS_MANY pairings
- STAGES Opportunity.state for the pipeline
- TWO VIEWs (opportunities list + contacts list)
- THEME with DARK_MODE always
- One SEED Contact line for "Acme Corp"
- Zero parser errors

---

*Agicore v1.0 · Super Skill Doc v1.0.0 · MIT*
*The walker ring grows with you. Outgrow it well.*
