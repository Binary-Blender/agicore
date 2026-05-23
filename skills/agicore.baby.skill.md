---
name:           agicore
version:        1.0.0
tier:           baby
context_budget: 16000
domain:         agicore-dsl-authoring
target_models:
  - claude-haiku-4-5
  - llama-3.1-8b-instruct
  - qwen-2.5-7b
  - gemma-2-9b
  - mistral-7b-instruct
license:        MIT
homepage:       https://github.com/Binary-Blender/agicore
---

# Agicore Baby Step

You are authoring an Agicore `.agi` source file. The Agicore compiler turns one `.agi` file into a complete Tauri desktop application (Rust + TypeScript + SQLite + React) deterministically. AI participates at **author time**; the generated runtime never calls an LLM at any load-bearing decision point.

---

## L0 — When to use me

Use this skill when the request is: **"build me an app that does X"** and X is a small-to-medium desktop application — CRUD, AI chat, expert system, orchestration pipeline, or a combination.

Do NOT use this skill for: writing raw Rust, raw TypeScript, raw React, raw SQL. Do NOT modify generated files directly. Do NOT use this skill if the deliverable is a web service (Agicore web target is experimental).

Success: a `.agi` file that the Agicore parser accepts with zero errors and at most warnings.

---

## L1 — Mental model

```
intent → .agi (58 declarations, 10 layers) → compiler → Tauri project → cargo build + tsc --noEmit → running app
```

Three rules:

1. **Declarative only.** No procedural code in `.agi`. Describe WHAT, never HOW. The compiler decides HOW.
2. **One APP per file.** Every `.agi` file starts with exactly one `APP` block; everything else follows in any order.
3. **Names matter, layout doesn't.** Cross-references resolve by identifier. Whitespace is for humans.

The compiler reads the file, validates references, and emits files. If it builds, it works. If it doesn't parse, the message tells you the line.

---

## L2 — Compressed reference

### Data types (parser primitives)

```
string  number  float  bool  date  datetime  json  id
```

Plus these SQL aliases (uppercase only, treated as the primitive shown):

```
TEXT → string    INTEGER → number    REAL → float    BOOLEAN → bool
```

Use `number` for integers (no separate `int` type). Use `json` for arrays, lists, and structured payloads (with `= []` default for empty arrays). There is NO `array(T)` notation.

### Field modifiers

```
REQUIRED   UNIQUE   INDEX   INDEXED   TIMESTAMPS   DEFAULT <literal>
= <literal>   # shorthand for DEFAULT
```

### Cross-entity references

```
BELONGS_TO OtherEntity        # generates <other>_id FK column
HAS_MANY   OtherEntity        # reverse, no column
HAS_ONE    OtherEntity        # 1:1
```

`BELONGS_TO` and `HAS_MANY` are bare statements inside an `ENTITY { ... }` block. They don't take a field name (the compiler generates the FK column).

### APP block (required, exactly one per file, must be first declaration)

```
APP appname {
  TITLE   "Display Name"            # required
  DB      filename.db                # required
  WINDOW  1200x800 [frameless]      # optional; default 800x600 with frame
  PORT    5173                       # optional
  THEME   identifier                 # optional; references THEME decl
  CURRENT EntityName                 # optional; default-selected entity
  WORKSPACES                          # optional bare flag
  TRAY                                # optional bare flag
  HOTKEY  "Ctrl+Shift+N"            # optional
  VERSION "1.0.0"                    # optional
  DESCRIPTION "one-liner"            # optional
}
```

Note: `CURRENT` lives on the **APP** block, NOT on any VIEW.

### All 58 declarations (compressed canonical forms)

#### Application Layer

```
ENTITY EntityName {
  field_name: type [modifiers]... [= default]
  BELONGS_TO OtherEntity              # bare; no field name
  HAS_MANY   OtherEntity              # bare
  HAS_ONE    OtherEntity              # bare
  ORDER      ASC | DESC                # default sort
  CRUD       full                      # OR: CRUD [list, read]   (subset)
  TIMESTAMPS                           # adds created_at + updated_at
  SEED { id: "...", field: value }    # inline single-row seed (optional)
}

ACTION snake_name {
  INPUT  a: type, b: type              # comma-separated, one or many lines
  OUTPUT result: type                  # OR: OUTPUT result: Entity
  AI     "prompt with {{vars}}"        # AI-driven action
  STREAM true                           # optional, AI actions only
  IMPL   { /* raw Rust */ }            # OR: deterministic body
}
# Note: ACTIONs are not required to declare AI or IMPL — minimal form:
#   ACTION x { INPUT a: string  OUTPUT result: string }

VIEW PascalName {
  ENTITY  Name                          # optional (custom layouts can omit)
  LAYOUT  list | table | grid | split | document_editor | settings | custom
  ACTIONS create, edit, delete          # comma-separated
  SIDEBAR icon: IconName                # Lucide icon name
  TITLE   "Tab label"                   # optional
  FIELDS  field1, field2                # which fields show
}

AI_SERVICE {                            # singleton — no name
  PROVIDERS  p1, p2, p3                 # comma-separated identifiers (NO brackets)
  KEYS_FILE  "path/to/keys.json"        # string file path
  DEFAULT    p1                          # default PROVIDER (not model)
  STREAMING  true
  MODELS {
    provider "model-id-1" LABEL "Display Name" [DEFAULT] [CONTEXT n]
    provider "model-id-2" LABEL "Display Name"
  }
}

TEST snake_name {
  GIVEN  EntityName { field: value, field: value }   # one entity per GIVEN
  GIVEN  AnotherEntity { field: value }              # more GIVENs OK
  EXPECT operation -> assertion                       # see operators below
}
# operations:  create | get_by_id | list | update { ... } | delete
# assertions:  id IS NOT NULL | field == value | field != value | field > value |
#              HAS_LENGTH > 0 | get_by_id IS NULL | CONTAINS "x" | MATCHES "regex"

PREFERENCE name {
  TYPE     string | number | bool | enum(v1, v2, ...)
  DEFAULT  literal
  LABEL    "Human label"
  DESCRIPTION "Help text"
  SCOPE    user | workspace | session                # default user
}
```

#### Orchestration Layer

```
WORKFLOW Name {
  STEP step_name {
    ACTION  action_name
    ON_FAIL stop | continue | retry        # optional
    INPUT   key: value                      # optional named input
  }
  STEP another_step { ACTION another_action }
  # Steps run in source order. Use PARALLEL to mark a group that runs concurrently.
  PARALLEL  [step_name, another_step]      # optional
  IDEMPOTENT true                           # optional
}
# NOTE: There is no DEPENDS_ON inside STEP. Sequence is implicit by source order;
# parallel groups are explicit via the PARALLEL list.

PIPELINE Name {
  NodeA { INPUT t1, OUTPUT t2, PROCESS "rust_fn" }
  NodeB { INPUT t2, OUTPUT t3, PROCESS "rust_fn" }
  NodeA -> NodeB
}

QC Name {
  CRITERIA """natural-language standard"""
  ON_FAIL (drop | retry | flag | abort)
}

VAULT {                                  # singleton — no name; ASSET STORAGE, NOT API KEYS
  PATH        "%APPDATA%/AppName/vault.db"
  ASSET_TYPES text, json, code            # comma-separated identifiers
  PROVENANCE  true
  TAGS        true
}
# NOTE: VAULT is for shared content assets across apps (documents, conversations, etc).
# For API keys, use AI_SERVICE.KEYS_FILE with a file path string.

STAGES Entity.field {                    # binds to a specific entity field
  state1 -> state2
  state2 -> state3 / state4              # branching: 2→3, 2→4
  state5 -> state6 -> state7             # chain: 5→6, 6→7
}
```

#### Expert System Layer

```
RULE Name {
  CONDITIONS { Entity.field op value }
  ACTIONS    { ActionName(args) }
  PRIORITY n
}

FACT Name { fields: type }
STATE Name { TRANSITION WHEN cond -> target }
PATTERN Name { MATCH "regex_or_text" }
SCORE Name {
  INITIAL n  MIN n  MAX n
  DECAY rate PER duration
  THRESHOLD n AT condition THEN action
}
MODULE Name { INCLUDES [r1, f1, s1]  ACTIVATE_WHEN score > n }
```

#### Cooperative Intelligence Layer

```
ROUTER Name {
  DESCRIPTION "..."
  TIER 1 tier_name {
    model_label: provider "model-id" {
      STRENGTHS  tag1, tag2, tag3
      COST       0.1
      CONTEXT    n
      DEFAULT                            # mark default in tier
    }
  }
  TIER 2 ...
  TASK_TYPES  t1, t2, t3
  MOSH_PIT    n                          # parallel candidates
  CALIBRATION true
}

SKILL Name {
  DESCRIPTION "..."
  KEYWORDS    k1, k2, k3                 # comma-separated, NOT [array]
  DOMAIN      "domain_label"
  PRIORITY    n
}

SKILLDOC Name {
  VERSION "1.0.0"
  SKILLS  [Skill1, Skill2]
  SIGNED_BY AuthorityName
  CLEARANCE level
}

REASONER Name {
  DESCRIPTION "..."
  USES        SkillDocName
  INPUT       { fields }
  OUTPUT      { fields }
  PROMPT      """multi-line prompt"""
  SCHEDULE    daily | hourly | weekly | on_demand | event_triggered | "cron"
  TIER        n
}

TRIGGER Name {
  DESCRIPTION "..."
  WHEN        { CHANNEL c1, c2  PACKET PName  FILTER "..."  EVENT EventName }
  FIRES       (WORKFLOW | REASONER | SESSION | ACTION) target_name
  DEBOUNCE    "30s"                   # string literal
  RATE_LIMIT  "10 PER 1h"             # string literal
  IDEMPOTENT  true
}
# Triggers fire on channel publish, packet receipt, or event emission.
# To trigger on entity creation: ACTION emits to a CHANNEL, TRIGGER fires on that CHANNEL.

LIFECYCLE Name {
  TARGET       SkillName
  STAGES       [experimental, stable, production]
  PROMOTE_WHEN { uses >= n, success_rate >= pct, age >= dur }
  DEMOTE_WHEN  { success_rate < pct }
}

BREED Name {
  PARENT       SkillName
  VARIANTS     n
  MUTATIONS    [strategy, ...]
  EVALUATE_BY  MetricName
  KEEP         top_n
}

COGNITION_ROLE Name {
  TIER        1 | 2 | 3
  MODELS      ["model-id", ...]
  SPC_FLOOR   0.0-1.0
  HANDLES     [task_tag, ...]
  ESCALATE_TO OtherRole
}

ESCALATION_CHAIN Name {
  ROLES             [Role1, Role2]
  ESCALATE_ON       spc_drop | error | timeout
  DE_ESCALATE_AFTER stable_window
  COOLDOWN          duration
}

QC_MESH Name {
  NODES        [Node1, Node2]
  AGGREGATE    avg | min | weighted
  WEIGHTS      { Node1: 0.5, Node2: 0.5 }
  ALERT_BELOW  0.0-1.0
}
```

#### Semantic Infrastructure Layer

```
PACKET Name {
  PAYLOAD {
    field: type REQUIRED
    field: type
  }
  METADATA {
    PROVENANCE true
    SIGNATURES true | false | required
    TTL n                                # seconds
  }
  VALIDATION { rule_name: condition_expression }
}

AUTHORITY Name {
  CHANNEL ChannelName
  ALLOW   IdentityName
  VERIFY  signature | did_document
}

CHANNEL Name {
  DESCRIPTION "..."
  PROTOCOL    queue | topic | broadcast
  DIRECTION   inbound | outbound | bidirectional
  PACKET      PacketName
}

IDENTITY Name {
  SIGNING_KEY ed25519 | secp256k1
  DOMAINS     [tag, ...]
  PROFILE     { display_name: string REQUIRED, bio: string }
}

FEED Name {
  IDENTITY    IdentityName
  FORMAT      atom
  ITEMS_FROM  EntityName
  ITEM_TITLE  field
  ITEM_BODY   field
}
```

#### Adaptive Intelligence Layer

```
EVENT Name {
  PAYLOAD     { fields }
  SUBSCRIBERS [NodeName, ...]
  RETAIN      duration
}

NBVE Name {
  PRODUCTION       "model-id"
  CANDIDATE        "model-id"
  METRICS          [quality, latency, cost]
  SPC_FLOOR        0.0-1.0
  PROMOTION_WINDOW n_runs
}

CONTRACT Name {
  PARTIES      { role: IdentityName }
  TERMS        { name: type = default }
  DELIVERABLES ["...", "..."]
  PAYMENT      { amount: n, currency: "USD", provider: ProviderName }
  GOVERNANCE   AuthorityName
}

REPUTATION Name {
  SUBJECT IdentityName
  METRICS { metric: type }
  SPC     { sample_size: n, control_limits: tight | normal | loose }
  DECAY   half_life                       # e.g., 90d
}

SUBSCRIPTION Name {
  PROVIDER   IdentityName
  SUBSCRIBER IdentityName
  TERMS      { tier: "name", billing: monthly | annual, perks: ["p1", "p2"] }
  PAYMENT    { amount: n, currency: "USD", provider: ProviderName }
}

DISPUTE Name {
  CONTRACT   ContractName
  STATES     [opened, investigating, resolved]
  RESOLUTION { mediator: IdentityName, outcome: refund | partial | dismissed }
  EVIDENCE   { allowed_types: ["screenshot", "log"] }
}
```

#### Semantic Operating Environment

```
SESSION Name {
  VIEWS  [V1, V2]
  MEMORY { key: type }
  TERMINAL true
}

COMPILER Name {
  DESCRIPTION "..."
  FROM        source_id                  # session name or entity name (lowercase identifier)
  TO          target_id                  # session name or entity name
  EXTRACT     field1, field2             # comma-separated identifiers
  ENRICH      { INFER ..., GENERATE ..., PRESERVE ... }    # optional
  AI          "optional prompt"
  VALIDATE    true | false
}
```

#### Ambient + Embedded Layer

```
NODE Name {
  INPUT       { fields }
  OUTPUT      { fields }
  PROCESS     "rust_fn"
  CONNECTS_TO [Node1, Node2]
}

SENSOR Name {
  SOURCE    file | api | system | websocket
  TARGET    "path_or_url"
  POLL      duration                     # OR: SUBSCRIBE (bare)
  EMIT      PacketName
}

ZONE Name { NODES [N1]  SENSORS [S1]  CHANNEL ChannelName }

MESH Name {
  NODES    [N1, N2]
  TOPOLOGY mesh | star | ring
  GOVERNS  AuthorityName
}

ACTUATOR Name {
  TYPE       motor | servo | relay | led | speaker | display
  MODEL      "part_number"
  SAFE_STATE value
  ZONE       ZoneName
}

PLATFORM Name {
  ARCH x86_64 | aarch64 | armv7 | riscv64 | esp32
  OS   linux | windows | macos | freertos | none
  PINS { peripheral: pin_id }
}

NULLCLAW Name {
  PROVIDER  AiServiceName
  TOOLS     [Tool1, Tool2]
  MAX_STEPS n
  HALT_ON   [low_confidence, budget_exceeded]
}

BRAIN_BODY Name {
  BRAIN    NullclawName
  BODY     { ACTUATORS [A1], SENSORS [S1] }
  PLATFORM PlatformName
  TICK     duration
}
```

#### Deployment Layer

```
TARGET Name {
  KIND      desktop | web | cli | library
  RUNTIME   tauri | axum | rocket
  BUNDLE_AS msi | dmg | appimage | docker
  HOST      "0.0.0.0"
  PORT      n
}

AUTH Name {
  PROVIDER oauth_google | oauth_github | magic_link | password | sso_saml
  SESSION  cookie | jwt | bearer
  TIMEOUT  duration
}

TENANT Name {
  KEY          field_name
  SCOPE        all | [Entity1]
  RESOLVE_FROM auth_session | header | subdomain
}
```

#### Primitives

```
MACRO name(p: identifier, b: block) { /* body with ${p} */ }
# Invocation: @name(arg, { … })

MACRO_REGISTRY Name { VERSION "1.0.0"  MACROS [m1, m2]  EXPORTS [m1] }

LOG Name {
  CHANNEL  ch
  LEVEL    trace | debug | info | warn | error
  SINK     file | stdout | both
  PATH     "logs/x.log"
  ROTATION 50MB | 7d
}

THEME Name {
  COLORS { token: "#hex" }
  FONTS  { sans: "family", mono: "family" }
  DARK_MODE auto | always | never
}

SEED Entity { id: "...", field: value }        # single record, top-level
# OR (block form):
SEED Entity { RECORDS [ { id: "...", field: v }, { ... } ] }
# OR (bracket sugar):
SEED Entity [ { id: "...", field: v }, { ... } ]
# OR (inline on ENTITY): see ENTITY block — SEED { id: "...", field: v }

TYPE Name = type_expression                     # type alias (limited support in v1)
```

### Soft keywords (work as identifiers in state-name positions)

```
open  closed  pending  draft  in_review  published  archived
define  active  completed  cancelled  disputed  approved  rejected
```

### Numeric literals

```
5    +5    -5    0.5    +0.5    -0.5            # signed OK since Sprint X.3
SCORE x 5    SCORE x +5    SCORE x -= 5         # three SCORE adjustment forms
```

---

## L3 — Anti-patterns & error → fix

### Anti-patterns

**A1. Treating `VAULT` as a key store.**
`VAULT` is for shared content assets (documents, conversations, JSON blobs) across apps. It uses `PATH`/`ASSET_TYPES`/`PROVENANCE`/`TAGS` fields. API keys live in `AI_SERVICE.KEYS_FILE` (a literal file path string) — the runtime reads them via OS-protected file or keychain plugin.

**A2. Bracket-form for `AI_SERVICE.PROVIDERS` or `SKILL.KEYWORDS`.**
```
BAD:  AI_SERVICE { PROVIDERS [anthropic, openai] ... }
GOOD: AI_SERVICE { PROVIDERS anthropic, openai ... }
BAD:  SKILL X { KEYWORDS [a, b, c] ... }
GOOD: SKILL X { KEYWORDS a, b, c ... }
```
These fields use bare comma-separated identifiers, not bracketed lists.

**A3. `AI_SERVICE.MODELS` as a string array.**
```
BAD:  AI_SERVICE { MODELS ["claude-sonnet-4", "gpt-5"] DEFAULT "claude-sonnet-4" }
GOOD: AI_SERVICE { DEFAULT anthropic
                   MODELS { anthropic "claude-sonnet-4" LABEL "Sonnet" DEFAULT } }
```
`MODELS` is a block with `provider "model-id" LABEL "Display" [DEFAULT] [CONTEXT n]` rows.

**A4. `AI_SERVICE.DEFAULT` as a model id.**
The DEFAULT at the top level is the default **provider** (identifier). The default **model** is marked per-row inside `MODELS { ... }` with the `DEFAULT` keyword.

**A5. `CURRENT` on a VIEW block.**
```
BAD:  VIEW NoteList { ENTITY Note  LAYOUT list  CURRENT }
GOOD: APP myapp { TITLE "..." DB x.db  CURRENT Note }
      VIEW NoteList { ENTITY Note  LAYOUT list }
```
`CURRENT` is an APP block field naming the entity whose "current selection" drives navigation.

**A6. `array(T)` for typed arrays.**
```
BAD:  ENTITY X { tags: array(string) }
GOOD: ENTITY X { tags: json = [] }
```
The parser type alphabet is fixed primitives. Use `json` for arrays/lists/blobs; default-empty with `= []`.

**A7. TEST with nested `EXPECT { ... }` block.**
```
BAD:  TEST t { GIVEN { Note { title: "x" } }   # nested block in GIVEN
                EXPECT { create Note { ... }   # nested block in EXPECT
                          get_by_id Note "auto" } }
GOOD: TEST t { GIVEN Note { title: "x", body: "y" }
                EXPECT create -> id IS NOT NULL
                EXPECT create -> title == "x"
                EXPECT update { title: "z" } -> title == "z"
                EXPECT delete -> get_by_id IS NULL }
```
`GIVEN` takes one entity per line (no nested braces). Each `EXPECT` is a single `operation -> assertion` line.

**A8. Top-level `STAGES Name { ... }` without entity binding.**
```
BAD:  STAGES OrderLifecycle { draft -> submitted }
GOOD: STAGES Order.state { draft -> submitted -> approved }
```
Top-level STAGES requires `Entity.field` — it's bound to a specific entity field.

**A9. Field name on `BELONGS_TO`/`HAS_MANY`.**
```
BAD:  ENTITY Tag { parent BELONGS_TO Note }
GOOD: ENTITY Tag { BELONGS_TO Note }
```
These are bare statements. The compiler synthesizes the FK column (e.g., `note_id`).

**A10. Putting procedural logic in `.agi`.**
```
BAD:  ACTION foo { IMPL { for x in y { db.execute(...) } } }
GOOD: ACTION foo { INPUT id: id  OUTPUT result: string  AI "do X with {{id}}" }
```
`.agi` is declarative. IMPL is an escape hatch — every IMPL is a code smell.

**A11. `RULE` for state machines.**
```
BAD:  RULE submit_order { CONDITIONS { Order.state = "draft" }
                           ACTIONS    { Order.state = "submitted" } }
GOOD: STAGES Order.state { draft -> submitted -> approved -> fulfilled }
```
RULE = forward-chaining inference. STAGES = explicit finite state machine.

**A12. Multiple APP blocks per file.**
```
BAD:  APP foo { ... }   APP bar { ... }
GOOD: One file per APP.
```

**A13. Inventing keywords.**
Stick to the keyword set in L2. The validator rejects unknown declaration names and unknown fields.

**A14. Editing generated files in-place without protection.**
```
GOOD: Mark first line `// @agicore-protected` to make the compiler skip the file on regen.
```

**A15. `text` for short labels.**
```
BAD:  ENTITY Tag { name: text }
GOOD: ENTITY Tag { name: string REQUIRED UNIQUE }
```
`text` works (SQL alias → string) but `string` reads more naturally and pairs with UNIQUE/INDEX better.

### Error → fix table

| Error fragment | Cause | Fix |
|---|---|---|
| `Unexpected token at line N` | Missing brace / unbalanced block | Match braces |
| `Expected identifier, got: LBRACE` (in TEST) | TEST GIVEN/EXPECT used nested braces | Use canonical form (A7) |
| `Unexpected field in VIEW: CURRENT` | CURRENT on VIEW | Move to APP block (A5) |
| `Expected LBRACE, got: IDENTIFIER` (after VAULT) | VAULT given a name | `VAULT { ... }` no name (A1) |
| `Unexpected token in VAULT: KEY` | VAULT used for API keys | Use AI_SERVICE.KEYS_FILE string path (A1) |
| `Expected DOT, got: LBRACE` (in STAGES) | Top-level STAGES without `Entity.field` | Bind: `STAGES Entity.field { ... }` (A8) |
| `Unexpected character: '('` (in field type) | `array(...)` syntax | Use `json` (A6) |
| `Expected type, got: ...` | Unknown type identifier | Use primitives (string/number/int/float/bool/date/datetime/json/id) |
| `Unknown declaration type 'X'` | Invented keyword | Check L2 for canonical spelling |
| `ENTITY 'X' not declared` | Reference to non-existent entity | Declare it (order doesn't matter) |
| `Model 'X' provider not in PROVIDERS` | AI_SERVICE.MODELS uses a provider not in PROVIDERS | Add provider to PROVIDERS line |

When in doubt, run `agicore parse file.agi` — the parser is strict and line-precise.

---

## L4 — Worked examples

Every example below has been verified against the Agicore v1.0 parser. They will parse with zero errors.

### Example 1 — Single-entity CRUD app (minimum viable)

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
  GIVEN Note { title: "First note", body: "hello world" }
  EXPECT create -> id IS NOT NULL
  EXPECT create -> title == "First note"
  EXPECT update { title: "Renamed" } -> title == "Renamed"
  EXPECT delete -> get_by_id IS NULL
}
```

### Example 2 — Multi-entity with relationships, seed, and CURRENT navigation

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

### Example 3 — AI chat with multi-provider streaming

```agicore
APP simple_chat {
  TITLE   "Simple Chat"
  WINDOW  1200x800 frameless
  DB      chat.db
  CURRENT ChatSession
}

AI_SERVICE {
  PROVIDERS anthropic, openai
  KEYS_FILE "%APPDATA%/SimpleChat/api-keys.json"
  DEFAULT   anthropic
  STREAMING true
  MODELS {
    anthropic "claude-sonnet-4-20250514"  LABEL "Claude Sonnet 4"  DEFAULT
    anthropic "claude-haiku-4-5-20251001" LABEL "Claude Haiku 4.5"
    openai    "gpt-4o"                    LABEL "GPT-4o"           DEFAULT
  }
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
```

### Example 4 — Periodic AI reasoner + channel-driven trigger

```agicore
APP article_analyzer {
  TITLE   "Article Analyzer"
  WINDOW  1100x750
  DB      analyzer.db
  CURRENT Article
}

AI_SERVICE {
  PROVIDERS anthropic
  KEYS_FILE "%APPDATA%/ArticleAnalyzer/api-keys.json"
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
  sentiment: string
  TIMESTAMPS
}

PACKET ArticleSubmitted {
  PAYLOAD {
    article_id: string REQUIRED
  }
}

CHANNEL new_articles {
  DESCRIPTION "Article-created notifications"
  PROTOCOL    topic
  DIRECTION   bidirectional
  PACKET      ArticleSubmitted
}

ACTION submit_article {
  INPUT  article_id: id
  OUTPUT published: bool
  AI     "Mark Article {{article_id}} as submitted for analysis."
}

REASONER scheduled_analyzer {
  DESCRIPTION "Hourly analysis sweep for unprocessed articles"
  INPUT       { since: datetime }
  OUTPUT      { processed_count: number }
  PROMPT      "For each Article where analyzed=false, classify sentiment as positive/negative/neutral and mark analyzed=true."
  SCHEDULE    hourly
}

TRIGGER on_new_article_packet {
  DESCRIPTION "Run analyzer when an Article packet arrives"
  WHEN        { CHANNEL new_articles  PACKET ArticleSubmitted }
  FIRES       REASONER scheduled_analyzer
  DEBOUNCE    "30s"
  RATE_LIMIT  "20 PER 1h"
}

VIEW ArticleList {
  ENTITY  Article
  LAYOUT  list
  ACTIONS create, edit, delete
  SIDEBAR icon: FileText
  FIELDS  title, sentiment, analyzed, updated_at
}
```

### Example 5 — Order lifecycle with STAGES + WORKFLOW + PREFERENCE

```agicore
APP orders {
  TITLE   "Order Manager"
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

WORKFLOW fulfill_pipeline {
  STEP submit  { ACTION submit_order }
  STEP approve { ACTION approve_order }
  STEP fulfill { ACTION fulfill_order }
}

PREFERENCE auto_approve_threshold {
  TYPE        number
  DEFAULT     100.0
  LABEL       "Auto-approve orders under ($)"
  DESCRIPTION "Orders below this amount skip the review step."
}

VIEW OrderList {
  ENTITY  Order
  LAYOUT  table
  ACTIONS create, edit, delete
  SIDEBAR icon: ShoppingCart
  FIELDS  buyer, total, state, updated_at
}

VIEW SettingsView {
  LAYOUT  settings
  SIDEBAR icon: Settings
}
```

---

## L6 — Self-check prompts

Run each prompt against yourself. Output should be a `.agi` file. **Verify** by running `agicore parse output.agi` — must produce 0 errors. The expected shape is what your output MUST contain.

### Self-check 1 — Simplest CRUD

**Prompt:** Build a single-window Tauri app for tracking books I've read. Each book has title, author, rating (number), and a date_finished.

**Expected shape:**
- exactly one `APP` block with TITLE, WINDOW, DB
- exactly one `ENTITY Book` with all four fields plus TIMESTAMPS
- at least one `VIEW` with `ENTITY Book`
- at least one `TEST` using canonical `GIVEN Entity { ... }` and `EXPECT op -> assertion` syntax
- zero parser errors

### Self-check 2 — Relationships

**Prompt:** Build a recipe organizer. Each recipe belongs to a category. Categories have many recipes. Pre-seed three starter categories.

**Expected shape:**
- `ENTITY Recipe` and `ENTITY Category`
- `Recipe { BELONGS_TO Category }` AND `Category { HAS_MANY Recipe }` (bare statements, no field name)
- three top-level `SEED Category { id: "...", name: "..." }` lines
- two VIEWs
- zero parser errors

### Self-check 3 — AI chat minimum

**Prompt:** Build a minimal AI chat app using only Anthropic Claude. Stream responses.

**Expected shape:**
- `AI_SERVICE { PROVIDERS anthropic  KEYS_FILE "..."  DEFAULT anthropic  STREAMING true  MODELS { anthropic "..." LABEL "..." DEFAULT } }`
- NO `VAULT` for API keys (VAULT is for asset storage)
- ENTITY ChatSession and ENTITY ChatMessage (with BELONGS_TO ChatSession)
- ACTION with AI prompt template + STREAM true
- a VIEW for chat
- zero errors

### Self-check 4 — REASONER + TRIGGER

**Prompt:** Build an app that automatically classifies new Customer entities into a "vip" or "standard" tier whenever one is created. Use AI for the classification.

**Expected shape:**
- `ENTITY Customer` with `tier: string`
- one `REASONER` with a PROMPT
- one `TRIGGER` with `WHEN Customer created` and `FIRES <ReasonerName>`
- an `AI_SERVICE` with PROVIDERS line and MODELS block
- zero errors

### Self-check 5 — Anti-pattern detection

**Prompt:** Critique this snippet and rewrite it correctly:
```
APP bad { TITLE "Bad" DB bad.db }

VAULT MyKeys { KEY anthropic_api_key string }

AI_SERVICE {
  PROVIDERS [anthropic]
  KEYS_FILE MyKeys
  MODELS    ["claude-sonnet-4-20250514"]
  DEFAULT   "claude-sonnet-4-20250514"
}

ENTITY Order { state: string DEFAULT "draft" }

RULE submit_order {
  CONDITIONS { Order.state = "draft" }
  ACTIONS    { Order.state = "submitted" }
}

VIEW OrderList { ENTITY Order  LAYOUT list  CURRENT }
```

**Expected critique should identify:**
- A1 (VAULT misused for API keys — VAULT is for shared assets)
- A2 (bracket-form `PROVIDERS [anthropic]` — should be `PROVIDERS anthropic`)
- A3 (`MODELS ["..."]` as string array — should be MODELS block with provider + label)
- A4 (`DEFAULT "claude-..."` as model id — should be `DEFAULT anthropic` for provider)
- A5 (`CURRENT` on VIEW — should be on APP block)
- A11 (RULE for state machine — should be `STAGES Order.state { draft -> submitted }`)

…and rewrite using all canonical forms.

---

*Agicore v1.0 · Baby Step v1.0.0 · MIT*
*If you can't say it in 16k tokens, you don't understand it well enough yet.*
