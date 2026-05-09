# Agicore DSL Grammar Specification

Version: 0.1.0

## Overview

The Agicore DSL is a declarative language for defining deterministic systems. It serves as the constraint boundary between AI-generated intent and deterministic execution.

A `.agi` file contains one or more top-level declarations that together define a complete system. The DSL compiler parses these declarations into an AST, validates them, and generates executable artifacts (SQL migrations, Rust commands, TypeScript types, Zustand stores, React components, Tauri configuration, and test suites).

---

## File Structure

An `.agi` file consists of:

1. One `APP` declaration (required, must be first)
2. Zero or more `ENTITY` declarations
3. Zero or more `ACTION` declarations
4. Zero or more `VIEW` declarations
5. Zero or one `AI_SERVICE` declaration
6. Zero or more `TEST` declarations
7. Zero or more `RULE` declarations (expert system mode)
8. Zero or more `WORKFLOW` declarations

Comments use `//` for single-line and `/* */` for multi-line.

```
// This is a comment
/* This is a
   multi-line comment */
```

---

## Data Types

The DSL supports the following primitive types:

| Type     | Description              | SQL Mapping          | Rust Mapping    | TS Mapping  |
|----------|--------------------------|----------------------|-----------------|-------------|
| string   | Text value               | TEXT                 | String          | string      |
| number   | Integer value            | INTEGER              | i64             | number      |
| float    | Floating point           | REAL                 | f64             | number      |
| bool     | Boolean                  | INTEGER (0/1)        | bool            | boolean     |
| date     | ISO 8601 date string     | TEXT                 | String          | string      |
| datetime | ISO 8601 datetime string | TEXT                 | String          | string      |
| json     | JSON blob                | TEXT                 | serde_json::Value | unknown  |
| id       | UUID v4 primary key      | TEXT PRIMARY KEY     | String          | string      |

---

## APP Declaration

Defines application-level configuration. Required. Must appear first in the file.

### Syntax

```
APP <name> {
  TITLE    <string_literal>
  WINDOW   <width>x<height> [frameless]
  DB       <filename>
  PORT     <number>
  THEME    dark | light | system
  ICON     <path>
}
```

### Fields

| Field     | Required | Default             | Description                        |
|-----------|----------|---------------------|------------------------------------|
| TITLE     | yes      | --                  | Window title / app display name    |
| WINDOW    | no       | 1200x800 frameless  | Window dimensions and style        |
| DB        | yes      | --                  | SQLite database filename           |
| PORT      | no       | 5173                | Vite dev server port               |
| THEME     | no       | dark                | Default theme                      |
| ICON      | no       | --                  | Path to app icon                   |
| TELEMETRY | no       | off                 | Auto-emission mode: `auto` (every action emits a TelemetryEvent), `explicit` (only marked actions emit), `off` |

### Example

```
APP home_academy {
  TITLE   "NovaSyn Home Academy"
  WINDOW  1200x800 frameless
  DB      academy.db
  PORT    5176
  THEME   dark
}
```

### Generates

- `tauri.conf.json` -- Tauri application configuration
- `src-tauri/src/main.rs` -- Application entry point with window setup
- `src/renderer/styles/globals.css` -- Theme CSS variables
- Database initialization with WAL mode and foreign keys

---

## ENTITY Declaration

Defines a data model. Generates schema, types, CRUD commands, and store slices.

### Syntax

```
ENTITY <Name> {
  <field_name>: <type> [= <default>] [REQUIRED] [UNIQUE] [INDEX]
  ...
  [TIMESTAMPS]
  [CRUD <operations>]
  [BELONGS_TO <Entity>]
  [HAS_MANY <Entity>]
}
```

### Rules

- Entity names are PascalCase
- Field names are snake_case in the DSL (auto-converted to camelCase in TypeScript)
- Every entity automatically gets an `id: id` field (UUID v4 primary key)
- `TIMESTAMPS` adds `created_at: datetime` and `updated_at: datetime`
- `CRUD` accepts: `full` (all operations), or a comma-separated list of `create`, `read`, `update`, `delete`, `list`
- `BELONGS_TO` creates a foreign key field (`<entity>_id`) with cascading delete
- `HAS_MANY` generates a list query on the related entity
- `REQUIRED` maps to `NOT NULL`
- `UNIQUE` adds a unique constraint
- `INDEX` creates a database index on the field

### Default CRUD

If `CRUD` is omitted, defaults to `full` (all five operations).

### Example

```
ENTITY Student {
  name: string REQUIRED
  date_of_birth: date
  grade: string REQUIRED
  notes: string
  active: bool = true
  TIMESTAMPS
  CRUD full
}

ENTITY Enrollment {
  school_year: string REQUIRED
  status: string = "active"
  BELONGS_TO Student
  TIMESTAMPS
}

ENTITY Lesson {
  subject: string REQUIRED
  content: json
  score: number
  BELONGS_TO Student
  TIMESTAMPS
}
```

### Generates

**SQL Migration:**
```sql
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date_of_birth TEXT,
  grade TEXT NOT NULL,
  notes TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Rust Struct:**
```rust
#[derive(Debug, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct Student {
    pub id: String,
    pub name: String,
    pub date_of_birth: Option<String>,
    pub grade: String,
    pub notes: Option<String>,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}
```

**Rust CRUD Commands:**
```rust
#[tauri::command]
#[specta::specta]
fn list_students(db: State<DbPool>) -> Result<Vec<Student>, String> { ... }

#[tauri::command]
#[specta::specta]
fn create_student(db: State<DbPool>, input: CreateStudentInput) -> Result<Student, String> { ... }

#[tauri::command]
#[specta::specta]
fn get_student(db: State<DbPool>, id: String) -> Result<Student, String> { ... }

#[tauri::command]
#[specta::specta]
fn update_student(db: State<DbPool>, id: String, input: UpdateStudentInput) -> Result<Student, String> { ... }

#[tauri::command]
#[specta::specta]
fn delete_student(db: State<DbPool>, id: String) -> Result<(), String> { ... }
```

**TypeScript Types (auto-generated by specta):**
```typescript
export interface Student {
  id: string;
  name: string;
  dateOfBirth: string | null;
  grade: string;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**TypeScript Invoke Wrappers:**
```typescript
import { invoke } from '@tauri-apps/api/core';

export const listStudents = () => invoke<Student[]>('list_students');
export const createStudent = (input: CreateStudentInput) => invoke<Student>('create_student', { input });
export const getStudent = (id: string) => invoke<Student>('get_student', { id });
export const updateStudent = (id: string, input: UpdateStudentInput) => invoke<Student>('update_student', { id, input });
export const deleteStudent = (id: string) => invoke<void>('delete_student', { id });
```

**Zustand Store Slice:**
```typescript
students: Student[],
selectedStudentId: string | null,
loadStudents: async () => { ... },
createStudent: async (input: CreateStudentInput) => { ... },
updateStudent: async (id: string, input: UpdateStudentInput) => { ... },
deleteStudent: async (id: string) => { ... },
selectStudent: (id: string | null) => set({ selectedStudentId: id }),
```

---

## ACTION Declaration

Defines a custom command beyond standard CRUD. Supports AI integration.

### Syntax

```
ACTION <name> {
  INPUT   <field>: <type>, ...
  OUTPUT  <field>: <type>, ...
  [AI     <prompt_template>]
  [STREAM <bool>]
}
```

### Rules

- Action names are snake_case
- `INPUT` defines the parameters
- `OUTPUT` defines the return type
- `AI` provides a prompt template with `{{variable}}` interpolation from INPUT fields
- `STREAM` enables streaming response (default: false)
- Actions without `AI` generate empty command stubs for manual implementation

### Example

```
ACTION generate_lesson {
  INPUT   student_id: string, subject: string, difficulty: string = "medium"
  OUTPUT  lesson: Lesson
  AI      "Generate a structured lesson plan for a {{difficulty}} level student on {{subject}}. Return as JSON matching the Lesson schema."
  STREAM  false
}

ACTION analyze_progress {
  INPUT   student_id: string
  OUTPUT  analysis: string
  AI      "Analyze the academic progress of this student based on their lesson scores. Provide actionable recommendations."
  STREAM  true
}
```

### Generates

- Rust command with AI service integration (or empty stub)
- TypeScript invoke wrapper
- Zustand store action
- Streaming handler (if STREAM is true)

---

## VIEW Declaration

Defines UI scaffolding for an entity or custom view.

### Syntax

```
VIEW <Name> {
  [ENTITY   <EntityName>]
  LAYOUT    table | form | detail | cards | split | custom
  [ACTIONS  <action_list>]
  [SIDEBAR  icon: <IconName>]
  [FIELDS   <field_list>]
  [TITLE    <string_literal>]
}
```

### Rules

- View names are PascalCase
- `ENTITY` links the view to an entity for auto-wiring data
- `LAYOUT` determines the component template
- `ACTIONS` lists available interactions (create, edit, delete, or custom ACTION names)
- `SIDEBAR` registers the view in the sidebar with a Lucide icon name
- `FIELDS` limits which entity fields are displayed (default: all)
- Views without `ENTITY` generate a blank component shell

### Layout Types

| Layout  | Description                                     |
|---------|------------------------------------------------|
| table   | Sortable data table with row selection          |
| form    | Create/edit form with field validation          |
| detail  | Single-record detail view                       |
| cards   | Card grid layout                                |
| split   | List on left, detail on right                   |
| custom  | Empty component shell                           |

### Example

```
VIEW StudentList {
  ENTITY   Student
  LAYOUT   split
  ACTIONS  create, edit, delete, generate_lesson
  SIDEBAR  icon: Users
  FIELDS   name, grade, active
}

VIEW LessonView {
  ENTITY   Lesson
  LAYOUT   cards
  ACTIONS  generate_lesson
  SIDEBAR  icon: BookOpen
  FIELDS   subject, score, created_at
}

VIEW Dashboard {
  LAYOUT   custom
  SIDEBAR  icon: Home
  TITLE    "Dashboard"
}
```

### Generates

- React component with the specified layout
- App.tsx routing entry
- Sidebar navigation entry
- Wiring to Zustand store for the linked entity
- Action buttons / handlers for specified actions

---

## AI_SERVICE Declaration

Configures the AI provider abstraction layer. At most one per file.

### Syntax

```
AI_SERVICE {
  PROVIDERS   <provider_list>
  KEYS_FILE   <path>
  DEFAULT     <provider_name>
  STREAMING   <bool>
  [MODELS     <model_mappings>]
}
```

### Supported Providers

`anthropic`, `openai`, `google`, `xai`, `ollama`, `local`

### Example

```
AI_SERVICE {
  PROVIDERS   anthropic, openai, google, xai
  KEYS_FILE   "%APPDATA%/NovaSyn/api-keys.json"
  DEFAULT     anthropic
  STREAMING   true
  MODELS {
    anthropic  "claude-sonnet-4-20250514"
    openai     "gpt-4o"
    google     "gemini-2.0-flash"
    xai        "grok-3"
  }
}
```

### Generates

- AI service module with provider routing
- Streaming support (SSE parsing)
- API key loading from shared config
- Model selection logic
- Token usage tracking

---

## TEST Declaration

Defines validation assertions for generated systems.

### Syntax

```
TEST <name> {
  GIVEN   <EntityName> { <field>: <value>, ... }
  EXPECT  <operation> -> <assertion>
  ...
}
```

### Assertion Operators

| Operator       | Description                |
|----------------|----------------------------|
| ==             | Equals                     |
| !=             | Not equals                 |
| >              | Greater than               |
| <              | Less than                  |
| >=             | Greater than or equal      |
| <=             | Less than or equal         |
| IS NOT NULL    | Value exists               |
| IS NULL        | Value is null              |
| CONTAINS       | String/array contains      |
| MATCHES        | Regex match                |
| HAS_LENGTH     | Array/string length check  |

### Example

```
TEST student_lifecycle {
  GIVEN Student { name: "Alice Chen", grade: "5th", active: true }

  EXPECT create -> id IS NOT NULL
  EXPECT create -> name == "Alice Chen"
  EXPECT create -> active == true

  EXPECT list -> HAS_LENGTH > 0
  EXPECT get_by_id -> grade == "5th"

  EXPECT update { grade: "6th" } -> grade == "6th"
  EXPECT delete -> get_by_id IS NULL
}

TEST enrollment_foreign_key {
  GIVEN Student { name: "Bob", grade: "3rd" }
  GIVEN Enrollment { school_year: "2025-2026", BELONGS_TO Student }

  EXPECT create Enrollment -> student_id IS NOT NULL
  EXPECT delete Student -> list Enrollment HAS_LENGTH == 0
}
```

### Generates

- Test runner with setup/teardown
- Individual test cases per assertion
- Database fixture management
- Foreign key cascade verification

---

## RULE Declaration (Expert System Mode)

Defines deterministic business rules for expert system generation.

### Syntax

```
RULE <name> {
  WHEN     <condition>
  [AND     <condition>]
  [OR      <condition>]
  [UNLESS  <condition>]
  THEN     <action>
  [PRIORITY <number>]
}
```

### Condition Syntax

```
<entity>.<field> <operator> <value>
```

### Example

```
RULE high_value_invoice {
  WHEN    invoice.amount > 10000
  THEN    require_manager_approval
  PRIORITY 10
}

RULE frustrated_customer {
  WHEN    customer.sentiment < -0.6
  AND     customer.message_count > 3
  THEN    escalate_to_human
  PRIORITY 20
}

RULE auto_approve_small {
  WHEN    invoice.amount <= 500
  UNLESS  invoice.vendor_trust_level == "low"
  THEN    auto_approve
  PRIORITY 5
}
```

### Generates

- Rule engine with forward chaining
- Deterministic evaluation (rules execute in priority order)
- Decision audit log (which rules fired, why)
- Test harness for rule validation

---

## WORKFLOW Declaration

Defines multi-step orchestration sequences.

### Syntax

```
WORKFLOW <Name> {
  STEP <name> {
    ACTION  <action_name>
    [INPUT  <mapping>]
    [ON_FAIL <behavior>]
  }
  ...
  [PARALLEL <step_list>]
}
```

### On-Fail Behaviors

| Behavior | Description                              |
|----------|------------------------------------------|
| stop     | Halt workflow (default)                  |
| skip     | Skip step, continue                     |
| retry    | Retry step (max 3)                       |
| fallback | Execute fallback action                  |

### Example

```
WORKFLOW StudentOnboarding {
  STEP validate_info {
    ACTION  validate_student_data
    INPUT   student_id: workflow.student_id
    ON_FAIL stop
  }

  STEP create_enrollment {
    ACTION  create
    INPUT   student_id: validate_info.student_id, school_year: "2025-2026"
  }

  STEP generate_initial_assessment {
    ACTION  generate_lesson
    INPUT   student_id: validate_info.student_id, subject: "placement", difficulty: "medium"
  }

  STEP notify_parent {
    ACTION  send_notification
    INPUT   message: "Enrollment complete for {{student.name}}"
    ON_FAIL skip
  }
}
```

### Generates

- Workflow execution engine
- Step dependency resolution
- Error handling per step
- Execution lineage / audit trail
- Workflow state persistence

---

## PIPELINE Declaration (Orchestration Engine)

Defines a multi-row execution pipeline where modules in the same row run in parallel (BFS paradigm). This is the core orchestration pattern from the NovaSyn Orchestrator — rows execute top-to-bottom, modules within a row execute simultaneously via Promise.all.

### Syntax

```
PIPELINE <Name> {
  DESCRIPTION <string>

  ROW <name> {
    <module_name>: <module_type> {
      [CONFIG ...]
    }
    ...
  }
  ...

  [CONNECTION <from_module>.<output> -> <to_module>.<input>]
  ...
}
```

### Module Types

| Type             | Description                                           |
|------------------|-------------------------------------------------------|
| ai_action        | Send prompt to AI, return response                    |
| transform        | Transform data (regex, JSON extract, format)          |
| qc_checkpoint    | Pause for human review (Jidoka)                       |
| vault_save       | Save output to shared vault                           |
| vault_load       | Load content from vault                               |
| cross_app        | Invoke macro in another application                   |
| custom           | User-defined action (generates stub)                  |

### Example

```
PIPELINE ContentFactory {
  DESCRIPTION "AI content generation with quality gates"

  ROW research {
    topic_research: ai_action {
      MODEL       anthropic
      PROMPT      "Research the topic: {{input}}. Provide key facts and themes."
    }
    competitor_scan: ai_action {
      MODEL       openai
      PROMPT      "Analyze competitor content on: {{input}}. Identify gaps."
    }
  }

  ROW generate {
    draft_article: ai_action {
      MODEL       anthropic
      PROMPT      "Write an article based on:\n{{research_output}}\n\nGaps to fill:\n{{competitor_output}}"
    }
  }

  ROW quality {
    review: qc_checkpoint {
      DESCRIPTION "Review draft for accuracy and tone"
      SPC         content_quality
    }
  }

  ROW publish {
    save_final: vault_save {
      TAGS        "article", "published"
      OUTPUT_TYPE "markdown"
    }
  }

  CONNECTION topic_research.output -> draft_article.research_output
  CONNECTION competitor_scan.output -> draft_article.competitor_output
  CONNECTION draft_article.output -> review.input
  CONNECTION review.output -> save_final.input
}
```

### Generates

- Pipeline executor with BFS row-based parallel execution
- Module instances with typed configuration
- Connection resolver (output→input wiring)
- Execution state persistence (run tracking, step results)
- Progress event emitter
- Pause/resume lifecycle for QC checkpoints
- Latency tracking per module
- Output aggregation between rows

---

## QC Declaration (Quality Control / SPC)

Defines quality control configuration for a pipeline. Implements Statistical Process Control (SPC) with progressive sampling — automatically reduces human review from 100% to 5% as AI proves reliable. This is the TPS Jidoka principle (stop the line on quality issues) combined with manufacturing-grade process capability tracking.

### Syntax

```
QC <name> {
  [YOUNG_THRESHOLD     <number>]
  [MATURING_THRESHOLD  <number>]
  [YOUNG_PASS_RATE     <float>]
  [MATURE_PASS_RATE    <float>]
  [MATURING_SAMPLE     <float>]
  [MATURE_SAMPLE       <float>]
}
```

### Fields

| Field              | Default | Description                                         |
|--------------------|---------|-----------------------------------------------------|
| YOUNG_THRESHOLD    | 50      | Samples before reducing from 100% inspection        |
| MATURING_THRESHOLD | 100     | Samples before reaching minimum sampling rate       |
| YOUNG_PASS_RATE    | 0.80    | Pass rate required to move to maturing phase        |
| MATURE_PASS_RATE   | 0.95    | Pass rate required to move to mature phase          |
| MATURING_SAMPLE    | 0.50    | Sampling rate during maturing phase (50%)           |
| MATURE_SAMPLE      | 0.05    | Sampling rate during mature phase (5%)              |

### SPC Phases

```
Phase 1 — Young Process (< 50 samples):    100% human review
Phase 2 — Maturing Process (50-99, 80%+):  50% sampling
Phase 3 — Mature Process (100+, 95%+):     5% sampling
Quality Drop:                               Back to 100% automatically
```

### Example

```
QC content_quality {
  YOUNG_THRESHOLD     30
  MATURING_THRESHOLD  75
  YOUNG_PASS_RATE     0.85
  MATURE_PASS_RATE    0.95
  MATURING_SAMPLE     0.40
  MATURE_SAMPLE       0.05
}

QC image_generation {
  YOUNG_THRESHOLD     50
  MATURING_THRESHOLD  100
  MATURE_PASS_RATE    0.98
  MATURE_SAMPLE       0.02
}
```

### Generates

- SPCController class with progressive sampling logic
- Process capability index (Cpk) calculation
- should_require_qc() decision function
- record_qc_result() feedback function
- Cost savings calculator
- Process statistics tracking
- Automatic quality regression detection

---

## VAULT Declaration (Shared Asset Storage)

Declares a shared asset vault for cross-workflow and cross-app data persistence. Assets in the vault have full provenance tracking — you can trace any output back through the entire pipeline that created it.

### Syntax

```
VAULT {
  [PATH       <string>]
  [ASSET_TYPES  <type_list>]
  [PROVENANCE   <bool>]
  [TAGS         <bool>]
}
```

### Fields

| Field       | Default                        | Description                           |
|-------------|--------------------------------|---------------------------------------|
| PATH        | %APPDATA%/Agicore/vault.db     | Vault database location               |
| ASSET_TYPES | text, image, json, code, audio | Allowed asset types                   |
| PROVENANCE  | true                           | Track source lineage for all assets   |
| TAGS        | true                           | Enable tag-based organization         |

### Example

```
VAULT {
  PATH         "%APPDATA%/NovaSyn/vault.db"
  ASSET_TYPES  text, image, video, audio, json, code, prompt_template
  PROVENANCE   true
  TAGS         true
}
```

### Generates

- Vault SQLite schema (vault_items, vault_tags, vault_annotations)
- Store/retrieve/search/delete operations
- Provenance chain tracking (source_asset_ids)
- Tag management
- Cross-workflow asset sharing

---

## FACT Declaration (Expert System Working Memory)

Declares facts that can be asserted and retracted at runtime. Facts are the working memory of the expert system — rules evaluate against current facts to determine which actions fire.

### Syntax

```
FACT <name> {
  <field>: <type> [= <default>]
  ...
  [PERSISTENT]
}
```

### Rules

- Fact names are PascalCase
- Fields define the shape of each fact instance
- `PERSISTENT` means facts survive across sessions (stored in DB)
- Without `PERSISTENT`, facts exist only in the current runtime session
- Facts are asserted/retracted by rules and workflows via ASSERT/RETRACT

### Example

```
FACT UserIntent {
  category: string
  tone: string
  confidence: float = 0.5
  raw_input: string
}

FACT ConversationContext {
  turn_count: number = 0
  topic_history: json = []
  last_category: string
  PERSISTENT
}

FACT SystemAlert {
  level: string
  message: string
  source: string
}
```

### Generates

- TypeScript fact interface
- Fact store (in-memory Map, or SQLite for PERSISTENT)
- Assert/retract functions
- Fact query API (match by fields)

---

## STATE Declaration (Expert System State Machines)

Defines a state machine with named states and transitions. States track where the system is in a process, and transitions define how it moves between states based on conditions.

### Syntax

```
STATE <name> {
  INITIAL <state_name>

  <state_name> {
    [ON_ENTER  <action>]
    [ON_EXIT   <action>]
    TRANSITION <target_state> WHEN <condition>
    ...
  }
  ...
}
```

### Rules

- State machine names are PascalCase
- State names are snake_case
- `INITIAL` designates the starting state (required)
- `ON_ENTER` fires when entering a state
- `ON_EXIT` fires when leaving a state
- `TRANSITION` defines a conditional edge to another state
- Conditions can reference facts, scores, and entity fields

### Example

```
STATE ConversationPhase {
  INITIAL greeting

  greeting {
    ON_ENTER reset_context
    TRANSITION exploring WHEN turn_count > 3
  }

  exploring {
    ON_ENTER load_topic_history
    TRANSITION suspicious WHEN repetition_score > 5
    TRANSITION side_quest WHEN cultural_score > 8
  }

  suspicious {
    ON_ENTER increase_eliza_leak
    TRANSITION revealed WHEN test_attempts > 3
    TRANSITION exploring WHEN turn_count_in_state > 10
  }

  side_quest {
    ON_ENTER activate_character_engine
    ON_EXIT deactivate_character_engine
    TRANSITION exploring WHEN side_quest_complete == true
  }

  revealed {
    ON_ENTER show_reveal_message
  }
}
```

### Generates

- State machine executor with current state tracking
- Transition evaluator (checks conditions each turn)
- ON_ENTER/ON_EXIT action dispatch
- State history / audit log
- Persistence (current state saved to DB)

---

## PATTERN Declaration (Expert System Pattern Matching)

Defines input pattern matching rules with response templates. This is the modernized ELIZA/AIML primitive — regex patterns matched against input, with template responses that can interpolate captured groups and facts.

### Syntax

```
PATTERN <name> {
  MATCH    <regex_or_keyword_list>
  [WHEN    <condition>]
  RESPOND  <template_list>
  [SCORE   <score_name> <delta>]
  [ASSERT  <fact_name> { <fields> }]
  [PRIORITY <number>]
  [CATEGORY <string>]
}
```

### Rules

- Pattern names are snake_case
- `MATCH` accepts a regex string or comma-separated keywords
- `WHEN` adds a guard condition (only match if condition is true)
- `RESPOND` accepts one or more response templates (selected randomly)
- Templates use `{{variable}}` for interpolation from captured groups and facts
- `SCORE` increments a named score by the delta value
- `ASSERT` creates a fact when the pattern matches
- `PRIORITY` determines match order (higher = checked first, default: 0)
- `CATEGORY` tags the pattern for analytics and debugging

### Example

```
PATTERN greeting {
  MATCH    /^(hi|hello|hey|greetings)\b/i
  RESPOND  "Hello. What brings you here today?",
           "Welcome. Let's begin.",
           "I've been expecting you."
  CATEGORY "social"
  PRIORITY 10
}

PATTERN seeking_validation {
  MATCH    /i think i('m| am) (doing |going )?(well|good|great)/i
  RESPOND  "That's one interpretation.",
           "Confidence is... interesting.",
           "If you say so."
  SCORE    insecurity_score 2
  ASSERT   UserIntent { category: "self_assessment", tone: "validation_seeking" }
  CATEGORY "personality"
}

PATTERN repeated_question {
  MATCH    /\?$/
  WHEN     last_response_was_question == true
  RESPOND  "You keep asking questions. That's a pattern.",
           "Questions upon questions. Interesting approach."
  SCORE    suspicion_score 3
  PRIORITY 5
}

PATTERN gen_x_reference {
  MATCH    "rad", "gnarly", "tubular", "bodacious", "gag me"
  RESPOND  "{{input}}... now that takes me back.",
           "Interesting vocabulary choice."
  SCORE    gen_x_score 3
  CATEGORY "cultural_marker"
}
```

### Generates

- Pattern matcher engine (regex compilation, priority ordering)
- Response template renderer with interpolation
- Score update dispatch
- Fact assertion dispatch
- Match audit log (which pattern fired, why, confidence)

---

## SCORE Declaration (Expert System Certainty Tracking)

Declares named scores that accumulate over time. Scores are the mechanism for gradual activation — like Reality.AI's cultural marker scoring that triggers character engine transitions.

### Syntax

```
SCORE <name> {
  INITIAL   <number>
  [MIN      <number>]
  [MAX      <number>]
  [DECAY    <number> PER <interval>]
  THRESHOLD <name> AT <value> [THEN <action>]
  ...
}
```

### Rules

- Score names are snake_case
- `INITIAL` sets the starting value (default: 0)
- `MIN` / `MAX` clamp the score range
- `DECAY` reduces the score over time (prevents stale triggers)
- `THRESHOLD` defines named checkpoints that trigger actions
- Multiple thresholds can exist per score (evaluated in order)

### Example

```
SCORE gen_x_score {
  INITIAL   0
  MIN       0
  MAX       20
  DECAY     1 PER turn
  THRESHOLD interested AT 5 THEN log_cultural_marker
  THRESHOLD activated AT 10 THEN activate_wargames_engine
}

SCORE suspicion_score {
  INITIAL   0
  MAX       30
  THRESHOLD curious AT 5 THEN increase_eliza_frequency
  THRESHOLD testing AT 10 THEN transition_to_layer_2
  THRESHOLD caught AT 20 THEN transition_to_layer_3
}

SCORE trust_level {
  INITIAL   5
  MIN       0
  MAX       10
  THRESHOLD low AT 2 THEN flag_for_review
  THRESHOLD high AT 8 THEN auto_approve
}
```

### Generates

- Score store with increment/decrement/set operations
- Threshold evaluator (checked after each score update)
- Decay timer (if configured)
- Score history for audit trail
- Threshold action dispatch

---

## MODULE Declaration (Expert System Composable Engines)

Defines a self-contained expert system module that can be activated/deactivated. Modules encapsulate related patterns, rules, states, and scores into a composable unit — like Reality.AI's character engines (WarGames, Jedi, Matrix, etc.).

### Syntax

```
MODULE <Name> {
  DESCRIPTION  <string>
  [ACTIVATE_WHEN  <condition>]
  [DEACTIVATE_WHEN  <condition>]

  [PATTERN ...]
  [RULE ...]
  [STATE ...]
  [SCORE ...]
  [FACT ...]
}
```

### Rules

- Module names are PascalCase
- Modules are inactive by default until ACTIVATE_WHEN condition is met
- Patterns/rules inside a module only fire when the module is active
- Modules can contain any expert system primitive
- A module's activation state is tracked as a fact
- Multiple modules can be active simultaneously

### Example

```
MODULE WarGames {
  DESCRIPTION "WOPR/Joshua simulation triggered by Gen-X language patterns"
  ACTIVATE_WHEN gen_x_score >= 10
  DEACTIVATE_WHEN wargames_complete == true

  STATE wargames_phase {
    INITIAL greeting

    greeting {
      ON_ENTER send_joshua_greeting
      TRANSITION game_list WHEN any_response
    }

    game_list {
      TRANSITION game_select WHEN input CONTAINS "thermonuclear"
      TRANSITION game_list WHEN any_response
    }

    game_select {
      TRANSITION war_simulation WHEN side_selected
    }

    war_simulation {
      TRANSITION lesson WHEN turn_count > 3
    }

    lesson {
      ON_ENTER show_futility_lesson
      TRANSITION complete WHEN input CONTAINS "not to play"
    }

    complete {
      ON_ENTER set_wargames_complete
    }
  }

  PATTERN joshua_greeting {
    MATCH    /.*/
    WHEN     wargames_phase == "greeting"
    RESPOND  "GREETINGS, PROFESSOR FALKEN.\n\nSHALL WE PLAY A GAME?"
    PRIORITY 100
  }

  PATTERN game_selection {
    MATCH    /thermonuclear/i
    WHEN     wargames_phase == "game_list"
    RESPOND  "FINE CHOICE.\n\nWHICH SIDE DO YOU WANT?\n  1. UNITED STATES\n  2. SOVIET UNION"
    PRIORITY 100
  }
}

MODULE JediMaster {
  DESCRIPTION "Yoda-style wisdom engine triggered by Star Wars references"
  ACTIVATE_WHEN star_wars_score >= 8
  DEACTIVATE_WHEN jedi_complete == true

  PATTERN yoda_response {
    MATCH    /.*/
    WHEN     jedi_active == true
    RESPOND  "Hmm. {{input}}, you say. Much to learn, you still have.",
             "The Force, strong in this conversation it is not.",
             "Do or do not. There is no try. But mostly do not."
    PRIORITY 90
  }
}
```

### Generates

- Module lifecycle manager (activate/deactivate)
- Scoped pattern/rule/state registration
- Module state persistence
- Activation condition evaluator
- Module interaction coordinator (priority between active modules)

---

## ROUTER Declaration (Cooperative Intelligence Routing)

Defines an intelligent model routing layer that learns which AI model performs best for which task type. Inspired by BabyAI's cooperative intelligence engine — the system starts by testing all models, then progressively routes to proven winners based on calibration data.

The router replaces static model selection with a learning system that gets cheaper and more accurate with every interaction.

### Syntax

```
ROUTER <name> {
  DESCRIPTION  <string>

  TIER <number> <tier_name> {
    <model_key>: <provider> <model_id> {
      [STRENGTHS   <task_type_list>]
      [COST        <float>]
      [CONTEXT     <number>]
      [DEFAULT]
    }
    ...
  }
  ...

  TASK_TYPES    <type_list>
  MOSH_PIT      <number>
  [CALIBRATION  <bool>]
}
```

### Fields

| Field       | Description                                          |
|-------------|------------------------------------------------------|
| TIER        | Model tier (1=free, 2=mid, 3=premium)               |
| STRENGTHS   | Task types this model excels at                      |
| COST        | Cost per 1K tokens                                   |
| CONTEXT     | Context window size                                  |
| DEFAULT     | Default model for this tier                          |
| TASK_TYPES  | All recognized task types for classification         |
| MOSH_PIT    | Number of models to run in parallel competition      |
| CALIBRATION | Enable learning loop (default: true)                 |

### Example

```
ROUTER BabyAI {
  DESCRIPTION "Cooperative intelligence router with progressive learning"

  TIER 1 free {
    qwen3_8b: huggingface "Qwen/Qwen3-8B" {
      STRENGTHS   general, math, coding
      CONTEXT     32768
      DEFAULT
    }
    llama_8b: huggingface "meta-llama/Llama-3.1-8B-Instruct" {
      STRENGTHS   general, conversation, education
      CONTEXT     131072
    }
  }

  TIER 2 mid {
    haiku: anthropic "claude-haiku-4-5-20251001" {
      STRENGTHS   coding, analysis
      COST        0.1
      CONTEXT     200000
    }
    gpt4mini: openai "gpt-4o-mini" {
      STRENGTHS   general, coding, creative_writing
      COST        0.015
    }
  }

  TIER 3 premium {
    sonnet: anthropic "claude-sonnet-4-6" {
      STRENGTHS   coding, analysis, creative_writing
      COST        0.3
    }
    opus: anthropic "claude-opus-4-6" {
      STRENGTHS   coding, analysis, research
      COST        1.5
    }
  }

  TASK_TYPES    coding, creative_writing, analysis, math, conversation, research, education, farming, general
  MOSH_PIT      3
  CALIBRATION   true
}
```

### Generates

- Task classifier (keyword + regex analysis → task_type + complexity score)
- Tiered model selector (complexity → tier → best model by calibration + strengths)
- Calibration learning loop (win/loss tracking per model x task_type)
- Mosh Pit executor (parallel model competition with preference scoring)
- OpenAI-compatible API endpoint (`/v1/chat/completions`)
- Routing statistics and cost tracking

---

## SKILL Declaration (Domain Expertise Documents)

Declares a skill document that transforms a generic AI model into a domain specialist. Skill docs are injected into the model's context when a query matches their keywords. A 7B model with the right skill doc can outperform GPT-4 on domain-specific tasks.

### Syntax

```
SKILL <name> {
  DESCRIPTION  <string>
  KEYWORDS     <keyword_list>
  [PATH        <string>]
  [DOMAIN      <string>]
  [PRIORITY    <number>]
}
```

### Example

```
SKILL corn_missouri {
  DESCRIPTION  "Missouri corn farming expertise including Amish traditional knowledge"
  KEYWORDS     corn, maize, missouri, soil, planting, harvest, rotation, cover_crop
  DOMAIN       "farming"
  PRIORITY     10
}

SKILL typescript_patterns {
  DESCRIPTION  "TypeScript design patterns and NovaSyn coding standards"
  KEYWORDS     typescript, react, zustand, tauri, electron, ipc, schema
  DOMAIN       "coding"
  PRIORITY     5
}

SKILL socratic_tutor {
  DESCRIPTION  "Socratic teaching method for project-based education"
  KEYWORDS     teach, learn, student, project, curriculum, homework, lesson
  DOMAIN       "education"
  PRIORITY     8
}
```

### Generates

- Skill doc registry with keyword matching
- Context injection system (prepends matched skill doc to AI prompt)
- Skill doc association tracking (which docs correlate with best outcomes)
- Skill doc management API

---

## SKILLDOC Declaration (Governed Cognition Infrastructure)

Defines a deployable cognition module — the next evolution of skill docs from lightweight metadata pointers (SKILL) into governed operational intelligence artifacts. SKILLDOC encodes organizational expertise as signable, auditable, deployable cognition packages that can be deployed to specialized runtime nodes with full authority enforcement.

Where SKILL is "here's some keywords for routing," SKILLDOC is "here's a complete deployable cognition module with provenance, signing, clearance requirements, audit trail, and execution constraints."

This is how organizational intelligence becomes infrastructure.

### Syntax

```
SKILLDOC <name> {
  DESCRIPTION  <string>
  [VERSION     <string>]
  [DOMAIN      <string>]
  [CONTENT     <string>]
  [KEYWORDS    <keyword_list>]
  [PRIORITY    <number>]

  [GOVERNANCE {
    [SIGNED_BY     <AuthorityName>]
    [REQUIRE       <clearance_list>]
    [EXECUTE_ONLY  <target_list>]
    [DISALLOW      <action_list>]
    [AUDIT         <audit_level>]
  }]

  [COMPRESSION {
    [SEMANTIC_DENSITY      <float>]
    [INTENT_PRESERVATION   <float>]
    [TOKEN_EFFICIENCY      <float>]
  }]
}
```

### Fields

| Field      | Description                                                  |
|------------|--------------------------------------------------------------|
| VERSION    | Semantic version of this skilldoc (for lineage tracking)     |
| DOMAIN     | Operational domain (manufacturing, compliance, engineering)  |
| CONTENT    | Inline content or path to the skilldoc body                  |
| KEYWORDS   | Routing keywords (same as SKILL — for discovery)             |
| PRIORITY   | Routing priority                                             |

### Governance Block

| Field         | Description                                                   |
|---------------|---------------------------------------------------------------|
| SIGNED_BY     | AUTHORITY declaration that signs this skilldoc                |
| REQUIRE       | Required clearance levels for execution                       |
| EXECUTE_ONLY  | Specific NODEs, ZONEs, or node types where execution allowed  |
| DISALLOW      | Forbidden actions: export, redistribute, log_external, modify |
| AUDIT         | Audit level: none, errors, all_access, all_actions            |

### Compression Block

Targets and minimums for semantic optimization passes (used by BabyAI compression pipelines for small-context model deployment):

| Field                | Description                                            |
|----------------------|--------------------------------------------------------|
| SEMANTIC_DENSITY     | Target compression ratio (0.0–1.0, higher = denser)    |
| INTENT_PRESERVATION  | Minimum intent fidelity required (0.0–1.0)             |
| TOKEN_EFFICIENCY     | Target token efficiency ratio                          |

### Example

```
SKILLDOC aerospace_qc {
  DESCRIPTION  "Aerospace manufacturing quality control procedures"
  VERSION      "2.4.1"
  DOMAIN       "manufacturing"
  CONTENT      "skilldocs/aerospace_qc.md"
  KEYWORDS     aerospace, manufacturing, quality, qc, inspection, compliance
  PRIORITY     20

  GOVERNANCE {
    SIGNED_BY      CorporateAuthority
    REQUIRE        clearance_level_4, manufacturing_certified
    EXECUTE_ONLY   secure_factory_floor, certified_qc_nodes
    DISALLOW       export, redistribute, log_external
    AUDIT          all_access
  }

  COMPRESSION {
    SEMANTIC_DENSITY      0.85
    INTENT_PRESERVATION   0.95
    TOKEN_EFFICIENCY      0.7
  }
}

SKILLDOC novasyn_dev_stack_v2 {
  DESCRIPTION  "Open NovaSyn dev stack patterns and architectural standards"
  VERSION      "2.0.0"
  DOMAIN       "coding"
  CONTENT      "skilldocs/novasyn_dev_stack.md"
  KEYWORDS     typescript, react, zustand, tauri, agicore, schema
  PRIORITY     10

  GOVERNANCE {
    AUDIT          errors
  }
}
```

### Generates

- SkillDoc registry with full metadata
- Authority signature verification at load time
- Clearance checking before execution
- Execution target validation (NODE/ZONE compatibility)
- Disallow rule enforcement
- Audit log integration (writes to PACKET stream when AUDIT is enabled)
- Compression metric tracking (semantic density, intent preservation)
- Versioned skilldoc deployment (lineage across versions)
- Open vs Enterprise mode (governance defaults to open if no GOVERNANCE block)

### Composition With Other Primitives

| Integrates With | Purpose                                              |
|-----------------|------------------------------------------------------|
| AUTHORITY       | Signs skilldocs, defines clearance levels            |
| NODE            | EXECUTE_ONLY targets — restricts deployment surface  |
| ZONE            | Physical/logical execution boundaries                |
| PACKET          | Audit trail and skilldoc distribution format         |
| CHANNEL         | Trusted skilldoc distribution between systems        |
| ROUTER          | Routes queries to skilldoc-enriched specialist nodes |
| BREED           | Inherits skilldoc associations across generations    |

This is how a SKILL becomes a SKILLDOC: by gaining provenance, governance, and deployment semantics. Both remain valid — SKILL for lightweight cases, SKILLDOC for governed organizational cognition.

---

## REASONER Declaration (Periodic AI Analysis Loop)

A REASONER is a recurring AI job that consumes packets from a CHANNEL over a time window, runs a signed SKILLDOC against them, and emits structured insight packets back to a CHANNEL. It is the runtime form of "AI noticed a pattern the humans hadn't seen" — the cybernetic feedback loop that turns observation into recommendation.

REASONER is the missing primitive for organizational intelligence. It composes naturally with PACKET (input/output shape), CHANNEL (transport), SKILLDOC (the signed cognition module), AUTHORITY (signing), NODE (where it runs), and the APP-level `TELEMETRY auto` flag (which guarantees there is something to reason over).

### Syntax

```
REASONER name {
  DESCRIPTION  string

  INPUT {
    CHANNEL    ident_list
    WINDOW     string         // "1h", "24h", "7d", "30d"
    FILTER     string          // optional predicate
  }

  USES         skilldoc_ident   // signed cognition module that drives analysis
  TIER         number           // optional ROUTER tier hint

  OUTPUT {
    PACKET     packet_ident
    CHANNEL    channel_ident
  }

  SCHEDULE     identifier | string   // daily | hourly | weekly | on_demand | event_triggered | "0 6 * * *"

  GOVERNANCE { ... }                  // optional, same shape as SKILLDOC
}
```

### Fields

| Field         | Required | Description                                                          |
|---------------|----------|----------------------------------------------------------------------|
| `DESCRIPTION` | Yes      | One-line description of what the reasoner analyzes                   |
| `INPUT`       | Yes      | Input source: channels, time window, optional filter predicate       |
| `USES`        | No       | SKILLDOC reference — the signed cognition that drives the reasoning  |
| `TIER`        | No       | ROUTER tier hint (1=free, 2=mid, 3=premium)                          |
| `OUTPUT`      | Yes      | Output target: packet shape and (optional) channel to emit on        |
| `SCHEDULE`    | Yes      | Cadence: keyword (daily, hourly, weekly, on_demand, event_triggered) or cron string |
| `GOVERNANCE`  | No       | Signing, clearance, execution, and audit constraints (SKILLDOC shape) |

### Schedules

- `on_demand` — triggered manually (chat command, API call, dashboard button)
- `event_triggered` — triggered by an inbound packet matching a filter
- `hourly` / `daily` / `weekly` — fixed cadence
- `"<cron>"` — explicit cron string for arbitrary cadence

### Example

```
REASONER organization_reasoner {
  DESCRIPTION  "Daily reasoning over telemetry: surfaces bottlenecks, automation candidates, risks"

  INPUT {
    CHANNEL    telemetry_stream
    WINDOW     "7d"
    FILTER     "success IS NOT NULL"
  }

  USES         organization_analysis
  TIER         2

  OUTPUT {
    PACKET     OrgInsight
    CHANNEL    insight_stream
  }

  SCHEDULE     daily

  GOVERNANCE {
    SIGNED_BY      OrgAuthority
    EXECUTE_ONLY   analytics_node
    REQUIRE        analyst
    AUDIT          all_actions
  }
}
```

### Generates

- A scheduled job that queries the input CHANNEL(s) for packets within `WINDOW`
- A windowing layer that aggregates and summarizes telemetry before sending to the LLM
- An LLM call routed via the ROUTER (at `TIER` if specified) using `USES` SKILLDOC as system prompt
- A typed packet emitter that publishes `OUTPUT.PACKET` to `OUTPUT.CHANNEL`
- Cron registration (or event subscription) per `SCHEDULE`
- Signing and audit hooks per `GOVERNANCE`

### Canonical Packet Shapes

The REASONER pattern works with any packet shapes you define, but two canonical shapes are conventional:

**TelemetryEvent** — input shape, one event per recorded action:
- `source` (ERP_SERVICE, MCP_TOOL, CHAT, WORKFLOW, SYSTEM)
- `event_type`, `tool_or_service`, `user_id`, `roles`
- `input_summary`, `outcome_summary` (redacted, structured — never raw payloads)
- `success`, `duration_ms`, `correlation_id`, `tenant_id`

**OrgInsight** — output shape, one insight per finding:
- `category` (BOTTLENECK, AUTOMATION, RISK, TRAINING, SUMMARY)
- `scope` (GLOBAL, TEAM, USER) + optional `target_id`
- `title`, `detail`, `confidence`, `impact_score`

The category and scope enums map directly onto AUTHORITY levels for visibility (admin sees GLOBAL, team_lead sees TEAM with matching target_id, user sees USER with matching target_id).

### Composition With Other Primitives

| Primitive | Role in a REASONER                                                  |
|-----------|----------------------------------------------------------------------|
| PACKET    | Input event shape and output insight shape                          |
| CHANNEL   | Transport for both input telemetry and output insights              |
| SKILLDOC  | The signed system prompt — what "good analysis" means to this org   |
| AUTHORITY | Signs the output insights so they can be trusted downstream         |
| NODE      | Constrains where the reasoner runs (`EXECUTE_ONLY`)                 |
| ROUTER    | Selects the LLM tier per cost/quality/latency policy                |
| LIFECYCLE | Reasoner outputs can age out, with old insights graduating to Elder |
| APP       | `TELEMETRY auto` ensures the input stream is populated automatically |

### The Cybernetic Loop

```
APP TELEMETRY auto
    └─> emits TelemetryEvent packets to telemetry_stream
            └─> REASONER reads windowed batch
                    └─> USES SKILLDOC for analysis context
                            └─> ROUTER selects LLM tier
                                    └─> emits OrgInsight packets to insight_stream
                                            └─> ENTITY persists for dashboards
                                                    └─> humans act on signals
                                                            └─> new actions feed back into telemetry_stream
```

This is Meridian Level 2 made first-class. The AI finds connections you missed; you decide what to do about them.

---

## LIFECYCLE Declaration (Temporal Intelligence Graduation)

Defines the temporal lifecycle for an intelligence instance. When an instance becomes stale (its learned patterns no longer reflect current conditions), it graduates to Elder status and a fresh instance starts learning from current interactions. Elders remain available for historical knowledge via an escalation chain.

This creates geological strata of intelligence — current knowledge on top, historical knowledge preserved below, accessible when needed but not cluttering the active context.

### Syntax

```
LIFECYCLE <name> {
  DESCRIPTION       <string>
  STALENESS_WINDOW  <number>
  STALENESS_DROP    <float>
  MIN_LIFETIME      <number>
  MAX_INSTANCES     <number>

  ESCALATION {
    <level_name>: <description>
    ...
  }
}
```

### Fields

| Field             | Default | Description                                              |
|-------------------|---------|----------------------------------------------------------|
| STALENESS_WINDOW  | 7       | Days of declining accuracy before graduation triggers    |
| STALENESS_DROP    | 0.15    | Accuracy drop threshold (15% below personal best)        |
| MIN_LIFETIME      | 14      | Minimum days before an instance can graduate             |
| MAX_INSTANCES     | 10      | Maximum active instances per domain                      |

### Example

```
LIFECYCLE BabyAILifecycle {
  DESCRIPTION       "Temporal graduation with elder escalation"
  STALENESS_WINDOW  7
  STALENESS_DROP    0.15
  MIN_LIFETIME      14
  MAX_INSTANCES     10

  ESCALATION {
    current: "Active instance — routing queries NOW"
    recent: "Recent elder — last generation's knowledge"
    historical: "Historical elder — older context, still accessible"
    founding: "Founding instance — never deleted, deepest knowledge"
  }
}
```

### Generates

- Staleness detection (rolling accuracy tracking)
- Graduation trigger (accuracy drop below threshold for N days)
- Elder archive system (graduated instances preserved for escalation)
- Escalation chain (current → recent → historical → founding)
- Instance health dashboard
- Lifecycle event logging

---

## BREED Declaration (Evolutionary Reproduction)

Defines evolutionary reproduction rules for intelligence instances. When two specialist instances become stale, they can reproduce — combining a fraction of their proven knowledge into a new child instance that inherits the best of both parents while maintaining fresh capacity to adapt to the present.

This is the knowledge axis complement to LIFECYCLE's time axis. Graduation preserves knowledge. Reproduction evolves it.

### Syntax

```
BREED <name> {
  DESCRIPTION       <string>
  INHERITANCE       <parent_a_pct> / <parent_b_pct> / <fresh_pct>
  MIN_FITNESS       <float>
  COOLDOWN          <number>

  FITNESS {
    prediction_accuracy: <weight>
    domain_depth: <weight>
    cost_efficiency: <weight>
    judge_quality: <weight>
  }

  PAIRING {
    PREFER          <strategy_list>
    DIVERSITY_MIN   <float>
  }

  TRAITS {
    PERSIST_AFTER   <number>
    EXTINCT_AFTER   <number>
  }
}
```

### Fields

| Field           | Default    | Description                                           |
|-----------------|------------|-------------------------------------------------------|
| INHERITANCE     | 15/15/70   | Parent A% / Parent B% / fresh capacity%              |
| MIN_FITNESS     | 0.5        | Minimum fitness score to be eligible for reproduction |
| COOLDOWN        | 30         | Days between reproduction events per parent           |
| PERSIST_AFTER   | 3          | Generations a trait must survive to be "core"         |
| EXTINCT_AFTER   | 1          | Generations before an unused trait is dropped         |
| DIVERSITY_MIN   | 0.4        | Minimum genetic distance between active instances     |

### Example

```
BREED BabyAIEvolution {
  DESCRIPTION       "15/15/70 evolutionary reproduction with cross-domain pollination"
  INHERITANCE       15 / 15 / 70
  MIN_FITNESS       0.5
  COOLDOWN          30

  FITNESS {
    prediction_accuracy: 0.4
    domain_depth: 0.3
    cost_efficiency: 0.2
    judge_quality: 0.1
  }

  PAIRING {
    PREFER          complementary_domains, generational_diversity
    DIVERSITY_MIN   0.4
  }

  TRAITS {
    PERSIST_AFTER   3
    EXTINCT_AFTER   1
  }
}
```

### Reproduction Process

```
Parent A (Ag Baby v2, stale)  x  Parent B (Code Baby v3, stale)
         \                              /
          \-- 15% calibration -------- /-- 15% calibration --\
                                                               \
                            Child Instance
                       (AgTech Baby v1)

                  15% from Parent A (farming routing patterns)
                  15% from Parent B (coding routing patterns)
                  70% fresh capacity (adapts to NOW)
```

Inherited knowledge is selected by highest confidence — the child gets what each parent was SURE about, not what it was still figuring out.

### Generates

- Fitness scoring system (weighted multi-factor evaluation)
- Parent selection algorithm (complementary domains, generational diversity)
- Calibration extraction and merge (top N% by confidence)
- Child initialization with inherited state
- Lineage tracking (full ancestry, trait persistence)
- Generational selection pressure (trait survival analysis)
- Genetic diversity monitoring
- Reproduction event logging
- Lineage visualization data

---

## PACKET Declaration (Semantic Infrastructure)

Defines a semantic packet — a portable, structured unit of operational intelligence that flows between pipeline stages, systems, and organizations. Unlike raw data, a semantic packet carries its own provenance, validation state, authority chain, and execution lineage.

Semantic packets transform pipelines from "pass data between steps" into "exchange self-describing operational intelligence with full traceability."

### Syntax

```
PACKET <Name> {
  DESCRIPTION  <string>

  PAYLOAD {
    <field>: <type> [REQUIRED]
    ...
  }

  METADATA {
    [PROVENANCE    <bool>]
    [LINEAGE       <bool>]
    [SIGNATURES    <bool>]
    [ADMISSIBILITY <bool>]
    [TTL           <number>]
  }

  VALIDATION {
    <rule_name>: <condition>
    ...
  }
}
```

### Fields

| Field         | Description                                             |
|---------------|---------------------------------------------------------|
| PAYLOAD       | The structured data this packet carries                 |
| PROVENANCE    | Track origin system, creator, and source chain          |
| LINEAGE       | Record every transformation this packet has undergone   |
| SIGNATURES    | Require cryptographic signing at each processing stage  |
| ADMISSIBILITY | Track whether this packet meets execution requirements  |
| TTL           | Time-to-live in seconds (0 = no expiry)                |
| VALIDATION    | Rules that must pass before the packet is admissible    |

### Example

```
PACKET ClinicalAssessment {
  DESCRIPTION "Structured clinical assessment flowing through the diagnostic pipeline"

  PAYLOAD {
    patient_summary: string REQUIRED
    symptoms: json REQUIRED
    triage_level: string
    diagnosis_candidates: json
    icd_codes: json
    critic_score: float
    governance_decision: string
  }

  METADATA {
    PROVENANCE    true
    LINEAGE       true
    SIGNATURES    true
    ADMISSIBILITY true
    TTL           86400
  }

  VALIDATION {
    has_symptoms: symptoms IS NOT NULL
    valid_triage: triage_level != "unknown"
    minimum_confidence: critic_score >= 0.5
  }
}

PACKET WorkflowHandoff {
  DESCRIPTION "Portable operational state for cross-system workflow coordination"

  PAYLOAD {
    intent: string REQUIRED
    context: json REQUIRED
    constraints: json
    execution_history: json
    optimization_attempts: number = 0
  }

  METADATA {
    PROVENANCE    true
    LINEAGE       true
    SIGNATURES    false
    ADMISSIBILITY true
    TTL           0
  }

  VALIDATION {
    has_intent: intent IS NOT NULL
    has_context: context IS NOT NULL
  }
}
```

### Generates

- Packet TypeScript interface with metadata fields
- Packet factory function (create, validate, sign)
- Lineage tracker (append-only transformation history)
- Provenance recorder (origin, creator, source chain)
- Admissibility checker (run validation rules before execution)
- Packet serializer/deserializer (for cross-system exchange)
- Validation rule executor

---

## AUTHORITY Declaration (Trust Infrastructure)

Defines trust chains, signing requirements, and admissibility rules for semantic packets and pipeline execution. Authority declarations establish WHO can create, modify, and execute packets, and WHAT conditions must be met before a packet is considered admissible for execution.

This is the governance layer for distributed AI coordination — ensuring that semantic packets flowing between systems carry verifiable trust.

### Syntax

```
AUTHORITY <name> {
  DESCRIPTION  <string>

  LEVELS {
    <level_name>: <description>
    ...
  }

  SIGNING {
    [REQUIRED       <bool>]
    [ALGORITHM      <string>]
    [VERIFY_CHAIN   <bool>]
  }

  ADMISSIBILITY {
    <rule_name>: <condition>
    ...
  }
}
```

### Example

```
AUTHORITY ClinicalGovernance {
  DESCRIPTION "Trust framework for clinical AI pipeline decisions"

  LEVELS {
    system: "Automated system-level authority"
    reviewer: "Human reviewer authority"
    supervisor: "Clinical supervisor override authority"
    admin: "Full administrative authority"
  }

  SIGNING {
    REQUIRED       true
    ALGORITHM      "sha256"
    VERIFY_CHAIN   true
  }

  ADMISSIBILITY {
    governance_passed: governance_decision == "approved"
    critic_threshold: critic_score >= 0.75
    human_reviewed: review_status != "pending"
  }
}

AUTHORITY OperationalTrust {
  DESCRIPTION "Trust framework for cross-system workflow coordination"

  LEVELS {
    local: "Local system operations"
    partner: "Trusted partner system"
    external: "External system with limited trust"
  }

  SIGNING {
    REQUIRED       false
    ALGORITHM      "sha256"
    VERIFY_CHAIN   false
  }

  ADMISSIBILITY {
    valid_source: source_system IS NOT NULL
    within_ttl: packet_age < ttl
  }
}
```

### Generates

- Authority level registry
- Signing/verification functions (when REQUIRED)
- Admissibility rule evaluator
- Authority chain validator
- Trust level resolver
- Audit log for authority decisions

---

## CHANNEL Declaration (Semantic Communication)

Defines a communication endpoint for semantic packet exchange between systems. Channels are how distributed Agicore instances coordinate — they define the topology of the semantic network.

### Syntax

```
CHANNEL <name> {
  DESCRIPTION  <string>
  PROTOCOL     <protocol_type>
  DIRECTION    inbound | outbound | bidirectional
  PACKET       <PacketName>
  [AUTHORITY   <AuthorityName>]
  [ENDPOINT    <string>]
  [RETRY       <number>]
  [TIMEOUT     <number>]
}
```

### Protocol Types

| Protocol   | Description                                    |
|------------|------------------------------------------------|
| local      | In-process communication (same runtime)        |
| websocket  | WebSocket connection (real-time)               |
| http       | HTTP/REST endpoint                             |
| queue      | File-based or message queue (async)            |
| grpc       | gRPC for high-performance inter-service calls  |

### Example

```
CHANNEL clinical_intake {
  DESCRIPTION  "Receives clinical assessments from intake systems"
  PROTOCOL     http
  DIRECTION    inbound
  PACKET       ClinicalAssessment
  AUTHORITY    ClinicalGovernance
  ENDPOINT     "/v1/intake"
  TIMEOUT      30000
}

CHANNEL partner_handoff {
  DESCRIPTION  "Exchange workflow state with partner systems"
  PROTOCOL     websocket
  DIRECTION    bidirectional
  PACKET       WorkflowHandoff
  AUTHORITY    OperationalTrust
  RETRY        3
  TIMEOUT      10000
}

CHANNEL babyai_routing {
  DESCRIPTION  "Route semantic packets to BabyAI specialist nodes"
  PROTOCOL     http
  DIRECTION    outbound
  PACKET       WorkflowHandoff
  ENDPOINT     "/v1/chat/completions"
}
```

### Generates

- Channel endpoint handler (inbound) or client (outbound)
- Packet validation on send/receive
- Authority verification at channel boundary
- Retry logic with exponential backoff
- Timeout handling
- Channel health monitoring
- Message audit log

---

## IDENTITY Declaration (Creator-Owned Identity)

Defines a portable, signed identity for participants in the semantic network. Identities are how creators, systems, and organizations establish verifiable presence — they give PACKET signing a concrete principal, CHANNEL communication an authenticated sender, and AUTHORITY chains a real identity to authorize.

Creator-owned identity means the identity travels with the creator, not with the platform.

### Syntax

```
IDENTITY <name> {
  DESCRIPTION    <string>
  SIGNING_KEY    <algorithm>
  [DOMAINS       <domain_list>]
  [DISCOVERABLE  <bool>]
  [PORTABLE      <bool>]

  PROFILE {
    <field>: <type> [REQUIRED]
    ...
  }
}
```

### Fields

| Field         | Default  | Description                                       |
|---------------|----------|---------------------------------------------------|
| SIGNING_KEY   | ed25519  | Cryptographic algorithm for identity signing      |
| DOMAINS       | general  | Semantic domains this identity participates in    |
| DISCOVERABLE  | true     | Whether this identity appears in discovery        |
| PORTABLE      | true     | Whether this identity can move between systems    |

### Example

```
IDENTITY CreatorProfile {
  DESCRIPTION    "Creator identity for the semantic publishing network"
  SIGNING_KEY    ed25519
  DOMAINS        farming, coding, education, creative_writing
  DISCOVERABLE   true
  PORTABLE       true

  PROFILE {
    display_name: string REQUIRED
    bio: string
    avatar_url: string
    website: string
    interests: json
    joined_at: datetime
  }
}

IDENTITY SystemNode {
  DESCRIPTION    "Machine identity for automated pipeline nodes"
  SIGNING_KEY    ed25519
  DOMAINS        orchestration
  DISCOVERABLE   false
  PORTABLE       false

  PROFILE {
    node_name: string REQUIRED
    node_type: string REQUIRED
    capabilities: json
  }
}
```

### Generates

- Identity creation and management functions
- Keypair generation and storage
- Identity signing/verification functions
- Profile CRUD operations
- Discovery registration/deregistration
- Identity export/import (for portability)
- Identity-to-authority binding

---

## FEED Declaration (Semantic Syndication)

Defines a subscription-based content feed that distributes semantic packets from an identity through a channel. Feeds are the bridge between infrastructure (packets flowing between systems) and humans (creators publishing content). They bring the retro-web spirit of RSS into the semantic packet era — creator-controlled, subscription-based, no algorithmic manipulation.

### Syntax

```
FEED <name> {
  DESCRIPTION  <string>
  IDENTITY     <IdentityName>
  PACKET       <PacketName>
  [CHANNEL     <ChannelName>]
  [SUBSCRIBE   open | approved | invite]
  [SYNDICATE   <bool>]
  [MAX_ITEMS   <number>]
  [DISCOVERY   <bool>]
}
```

### Fields

| Field      | Default | Description                                           |
|------------|---------|-------------------------------------------------------|
| IDENTITY   | --      | The identity that owns/publishes this feed            |
| PACKET     | --      | The packet type this feed distributes                 |
| CHANNEL    | --      | The channel used for distribution (optional)          |
| SUBSCRIBE  | open    | Subscription model: open, approved, or invite-only    |
| SYNDICATE  | true    | Whether this feed can be re-syndicated by others      |
| MAX_ITEMS  | 1000    | Maximum items retained in the feed                    |
| DISCOVERY  | true    | Whether this feed appears in semantic discovery       |

### Example

```
FEED creator_blog {
  DESCRIPTION  "Creator's personal semantic blog feed"
  IDENTITY     CreatorProfile
  PACKET       BlogPost
  CHANNEL      public_feed
  SUBSCRIBE    open
  SYNDICATE    true
  MAX_ITEMS    500
  DISCOVERY    true
}

FEED premium_content {
  DESCRIPTION  "Premium subscriber-only content feed"
  IDENTITY     CreatorProfile
  PACKET       PremiumPost
  SUBSCRIBE    approved
  SYNDICATE    false
  MAX_ITEMS    100
  DISCOVERY    false
}

FEED pipeline_results {
  DESCRIPTION  "Automated feed of pipeline execution results"
  IDENTITY     SystemNode
  PACKET       AnalysisResult
  CHANNEL      analysis_output
  SUBSCRIBE    invite
  SYNDICATE    false
}
```

### Generates

- Feed registry with metadata
- Subscription management (subscribe/unsubscribe/approve)
- Packet publishing (create + distribute through channel)
- Feed item storage with pagination
- Syndication support (re-publish to other feeds)
- Discovery registration
- Feed export (portable feed data)

---

## NODE Declaration (Ambient Intelligence Edge Device)

Defines a physical edge computing node that embeds AI into the real world. Nodes are the fundamental unit of ambient intelligence — they sense, process, communicate, and act in physical spaces. Based on the NovaSyn Embedded Dev Stack's 5-layer architecture and the Thin the Veil course's 4 node types.

### Syntax

```
NODE <name> {
  DESCRIPTION  <string>
  TYPE         personal | environment | business | actor
  HARDWARE     <hardware_spec>
  [AI_TIER     edge | cloud | hybrid]
  [COMMS       <protocol_list>]
  [SENSORS     <sensor_ref_list>]
  [ZONE        <ZoneName>]
  [OFFLINE     <bool>]
  [SAFETY      <safety_level>]
}
```

### Node Types

| Type        | Description                                                    |
|-------------|----------------------------------------------------------------|
| personal    | Smartphone/wearable — knows who you are, adapts to you         |
| environment | Fixed sensors — knows what's happening in a space              |
| business    | Environment node + commerce — connects observation to outcomes |
| actor       | Dumb mobile endpoint — creates interaction by existing         |

### Example

```
NODE basketball_scorer {
  DESCRIPTION  "Court-side shot detection and scoring node"
  TYPE         environment
  HARDWARE     "rpi5"
  AI_TIER      edge
  COMMS        mqtt, ble, wifi
  SENSORS      court_camera, hoop_sensor
  ZONE         BasketballCourt
  OFFLINE      true
  SAFETY       low
}

NODE player_phone {
  DESCRIPTION  "Player's smartphone as personal node"
  TYPE         personal
  HARDWARE     "android"
  AI_TIER      hybrid
  COMMS        ble, mqtt
  OFFLINE      true
}

NODE chase_bot {
  DESCRIPTION  "Soft-bodied actor robot for interactive gameplay"
  TYPE         actor
  HARDWARE     "esp32s3"
  AI_TIER      edge
  COMMS        ble
  ZONE         BasketballCourt
  SAFETY       high
}
```

### Generates

- Node configuration schema
- Communication client (MQTT, BLE, LoRa as configured)
- Telemetry reporter (sensor data → BabyAI / vault)
- Health monitoring and watchdog
- Offline buffering with sync-on-reconnect
- Safety mode handlers (for actuator nodes)
- Device registration with node registry

---

## SENSOR Declaration (Physical World Input)

Defines a sensing capability attached to a node. Sensors are the eyes, ears, and touch of ambient intelligence — they translate the physical world into data the system can reason about. Camera is the default (replaces most specialized sensors), but the declaration supports any input type.

### Syntax

```
SENSOR <name> {
  DESCRIPTION  <string>
  TYPE         camera | microphone | imu | gps | environmental | proximity | custom
  [MODEL       <string>]
  [CAPABILITY  <capability_list>]
  [LATENCY     <number>]
  [ACCURACY    <float>]
  [FAILURE     <failure_mode>]
}
```

### Sensor Types

| Type          | Examples                                           |
|---------------|----------------------------------------------------|
| camera        | USB webcam, RPi camera module, IP camera           |
| microphone    | USB mic, MEMS array, I2S digital                   |
| imu           | Accelerometer, gyroscope, magnetometer             |
| gps           | GPS/GNSS receiver, phone location                  |
| environmental | Temperature, humidity, pressure, light, soil        |
| proximity     | Ultrasonic, ToF, IR, BLE beacon                    |
| custom        | Any specialized sensor                              |

### Example

```
SENSOR court_camera {
  DESCRIPTION  "Side-angle camera for basketball shot detection"
  TYPE         camera
  MODEL        "USB 1080p webcam"
  CAPABILITY   shot_detection, player_tracking, pose_estimation
  LATENCY      150
  ACCURACY     0.95
  FAILURE      "flag_unknown"
}

SENSOR hoop_sensor {
  DESCRIPTION  "Vibration sensor on hoop rim for shot confirmation"
  TYPE         custom
  MODEL        "Piezo vibration sensor"
  CAPABILITY   impact_detection
  LATENCY      10
  ACCURACY     0.99
}

SENSOR field_environment {
  DESCRIPTION  "Hex node environmental sensor array"
  TYPE         environmental
  MODEL        "BME280 + soil moisture"
  CAPABILITY   temperature, humidity, pressure, soil_moisture
  LATENCY      1000
  ACCURACY     0.97
}
```

### Generates

- Sensor interface (read, status, calibrate)
- Capability registry
- Data normalization pipeline
- Failure mode handler
- Accuracy tracking (feeds SPC)
- Sensor health reporter

---

## ZONE Declaration (Physical Space)

Defines a physical space where nodes operate and experiences happen. Zones are where the digital and physical worlds meet — they have boundaries, deployed nodes, ambient intelligence rules, and experience definitions. A zone can be a basketball court, a retail store, a farm field, or an entire neighborhood.

### Syntax

```
ZONE <Name> {
  DESCRIPTION  <string>
  [BOUNDS      <string>]
  [NODES       <node_ref_list>]
  [AMBIENT     <bool>]
  [CAPACITY    <number>]
  [HOURS       <string>]
}
```

### Example

```
ZONE BasketballCourt {
  DESCRIPTION  "Outdoor basketball court with AI-powered scoring"
  BOUNDS       "28x15m"
  NODES        basketball_scorer, chase_bot
  AMBIENT      true
  CAPACITY     20
  HOURS        "06:00-22:00"
}

ZONE RetailFloor {
  DESCRIPTION  "Retail store floor with ambient customer intelligence"
  BOUNDS       "30x20m"
  NODES        store_camera_1, store_camera_2
  AMBIENT      true
  CAPACITY     100
}

ZONE CornField_North {
  DESCRIPTION  "Northern corn field with distributed hex sensor coverage"
  BOUNDS       "400x200m"
  NODES        hex_soil_01, hex_soil_02, hex_air_01
  AMBIENT      true
}
```

### Generates

- Zone configuration with node registry
- Spatial awareness (which nodes cover which areas)
- Capacity management
- Hours-based activation/deactivation
- Ambient intelligence coordinator (processes sensor data from all nodes in zone)
- Zone telemetry aggregator
- Zone-level event detection

---

## SESSION Declaration (Semantic Operating Mode)

Defines a constrained operational mode — a specialized cognitive environment with its own tools, context model, memory semantics, and output types. Sessions are how NovaSyn (or any Agicore-powered interface) presents different "modes of thinking" to the user without overwhelming them with every capability at once.

The key insight: human thought naturally progresses through operational states (brainstorm, refine, formalize, implement, publish). Each state needs different tools and constraints. Sessions formalize this.

### Syntax

```
SESSION <name> {
  DESCRIPTION  <string>
  [TOOLS       <tool_list>]
  [CONTEXT     <context_model>]
  [MEMORY      <memory_mode>]
  [OUTPUT      <output_type_list>]
  [PERSIST     <bool>]
}
```

### Fields

| Field    | Description                                              |
|----------|----------------------------------------------------------|
| TOOLS    | Available tools/capabilities in this session mode        |
| CONTEXT  | Context model: conversation, structured, minimal         |
| MEMORY   | Memory mode: session (ephemeral), persistent, inherited  |
| OUTPUT   | What this session produces: text, skilldoc, requirements, dsl, code, post |
| PERSIST  | Whether session state survives across app restarts       |

### Example

```
SESSION brainstorm {
  DESCRIPTION  "Open-ended ideation and exploration"
  TOOLS        chat, search, vault_browse
  CONTEXT      conversation
  MEMORY       session
  OUTPUT       text, notes
}

SESSION skilldoc_editor {
  DESCRIPTION  "Structured behavioral specification authoring"
  TOOLS        chat, template, validate, publish
  CONTEXT      structured
  MEMORY       persistent
  OUTPUT       skilldoc
}

SESSION coding {
  DESCRIPTION  "Implementation with repo awareness and validation"
  TOOLS        chat, terminal, file_edit, test_run, type_check
  CONTEXT      structured
  MEMORY       persistent
  OUTPUT       code, tests
}

SESSION publishing {
  DESCRIPTION  "Content creation and distribution"
  TOOLS        chat, editor, media, feed_publish
  CONTEXT      structured
  MEMORY       persistent
  OUTPUT       post, packet
}
```

### Generates

- Session mode registry
- Tool availability filter per session
- Context model configuration
- Memory scope management
- Output type validation
- Session state persistence (if enabled)
- UI mode switching support

---

## COMPILER Declaration (Semantic State Transformation)

Defines a transformation rule that converts artifacts from one session type into another. Compilers are the "Send To" buttons — they extract structure from exploratory work and produce formalized artifacts. Chat becomes skill docs. Discussions become requirements. Requirements become DSL. Without manual copy-paste-reprompt ceremonies.

### Syntax

```
COMPILER <name> {
  DESCRIPTION  <string>
  FROM         <SessionName>
  TO           <SessionName>
  [EXTRACT     <extraction_list>]
  [ENRICH {
    <operation>  <target>
    ...
  }]
  [AI          <prompt_template>]
  [VALIDATE    <bool>]
}
```

### Fields

| Field    | Description                                               |
|----------|-----------------------------------------------------------|
| FROM     | Source session type                                       |
| TO       | Target session type                                      |
| EXTRACT  | What to extract from the source                          |
| ENRICH   | Semantic compounding operations (see below)               |
| AI       | Prompt template for AI-assisted transformation            |
| VALIDATE | Whether to validate output against target schema          |

### ENRICH Operations (Semantic Compounding)

Traditional transitions lose information (entropy). ENRICH operations reverse this — the artifact **improves** during transformation. Each operation is a named enrichment step the compiler must perform.

| Operation | Description                                             |
|-----------|---------------------------------------------------------|
| INFER     | Deduce implicit information not stated explicitly       |
| SUGGEST   | Propose improvements, patterns, or alternatives         |
| GENERATE  | Create new artifacts (tests, validations, scaffolding)  |
| DETECT    | Find gaps, contradictions, missing dependencies         |
| PRESERVE  | Ensure original intent/context survives transformation  |

This makes transitions **programmable intelligence surfaces** — not just format converters, but semantic enrichment engines. Information compounds across transitions instead of decaying.

### Example

```
COMPILER chat_to_skilldoc {
  DESCRIPTION  "Extract behavioral specifications from brainstorming"
  FROM         brainstorm
  TO           skilldoc_editor
  EXTRACT      policies, constraints, behaviors, triggers
  AI           "Analyze this conversation and extract all behavioral specifications, runtime policies, operational constraints, and orchestration patterns. Output as a structured skill document."
  VALIDATE     true
}

COMPILER chat_to_requirements {
  DESCRIPTION  "Extract implementation requirements from discussion"
  FROM         brainstorm
  TO           coding
  EXTRACT      features, workflows, entities, dependencies
  AI           "Analyze this conversation and extract all features, architecture decisions, entity definitions, workflow descriptions, and implementation requirements. Output as a structured requirements document."
  VALIDATE     true
}

COMPILER requirements_to_dsl {
  DESCRIPTION  "Generate Agicore DSL from structured requirements"
  FROM         coding
  TO           coding
  EXTRACT      entities, workflows, rules, pipelines
  AI           "Convert these requirements into Agicore DSL declarations. Generate ENTITY, WORKFLOW, RULE, PIPELINE, and TEST declarations that implement the specified architecture."
  VALIDATE     true
}

COMPILER chat_to_post {
  DESCRIPTION  "Transform discussion into publishable content"
  FROM         brainstorm
  TO           publishing
  EXTRACT      structure, key_points, narrative
  AI           "Transform this conversation into a well-structured blog post. Extract key insights, organize into sections, add introduction and conclusion."
  VALIDATE     false
}
```

### Generates

- Transformation pipeline (source session → extraction → AI processing → target session)
- Extraction rules per source type
- AI prompt assembly with source context injection
- Output validation against target session's expected types
- Artifact lineage tracking (which session produced what)
- "Send To" UI integration points

---

## Complete Example

A minimal but complete `.agi` file:

```
// home_academy.agi
// NovaSyn Home Academy - Agicore DSL Definition

APP home_academy {
  TITLE   "NovaSyn Home Academy"
  WINDOW  1200x800 frameless
  DB      academy.db
  PORT    5176
  THEME   dark
}

AI_SERVICE {
  PROVIDERS   anthropic, openai
  KEYS_FILE   "%APPDATA%/NovaSyn/api-keys.json"
  DEFAULT     anthropic
  STREAMING   true
}

ENTITY Student {
  name: string REQUIRED
  date_of_birth: date
  grade: string REQUIRED
  notes: string
  active: bool = true
  TIMESTAMPS
}

ENTITY SchoolYear {
  name: string REQUIRED UNIQUE
  start_date: date REQUIRED
  end_date: date REQUIRED
  active: bool = true
  TIMESTAMPS
}

ENTITY Enrollment {
  status: string = "active"
  BELONGS_TO Student
  BELONGS_TO SchoolYear
  TIMESTAMPS
}

ENTITY Subject {
  name: string REQUIRED
  description: string
  color: string = "#3B82F6"
  TIMESTAMPS
}

ENTITY Lesson {
  title: string REQUIRED
  content: json
  subject_area: string
  score: number
  BELONGS_TO Student
  BELONGS_TO Subject
  TIMESTAMPS
}

ACTION generate_lesson {
  INPUT   student_id: string, subject: string, difficulty: string = "medium"
  OUTPUT  lesson: Lesson
  AI      "You are a curriculum designer. Create a structured lesson plan for a {{difficulty}} level student on {{subject}}. Return JSON with title, content (array of sections), and suggested assessment criteria."
}

ACTION analyze_progress {
  INPUT   student_id: string, subject_id: string
  OUTPUT  analysis: string
  AI      "Analyze this student's progress in the given subject based on their lesson scores. Identify strengths, areas for improvement, and recommend next steps."
  STREAM  true
}

VIEW Dashboard {
  LAYOUT   custom
  SIDEBAR  icon: Home
  TITLE    "Dashboard"
}

VIEW StudentList {
  ENTITY   Student
  LAYOUT   split
  ACTIONS  create, edit, delete
  SIDEBAR  icon: Users
  FIELDS   name, grade, active
}

VIEW LessonView {
  ENTITY   Lesson
  LAYOUT   cards
  ACTIONS  create, generate_lesson
  SIDEBAR  icon: BookOpen
  FIELDS   title, subject_area, score, created_at
}

VIEW SubjectList {
  ENTITY   Subject
  LAYOUT   table
  ACTIONS  create, edit, delete
  SIDEBAR  icon: Layers
}

TEST student_crud {
  GIVEN Student { name: "Alice Chen", grade: "5th", active: true }

  EXPECT create -> id IS NOT NULL
  EXPECT create -> name == "Alice Chen"
  EXPECT list -> HAS_LENGTH > 0
  EXPECT get_by_id -> grade == "5th"
  EXPECT update { grade: "6th" } -> grade == "6th"
  EXPECT delete -> get_by_id IS NULL
}

TEST enrollment_cascade {
  GIVEN Student { name: "Bob", grade: "3rd" }
  GIVEN SchoolYear { name: "2025-2026", start_date: "2025-08-15", end_date: "2026-06-01" }
  GIVEN Enrollment { status: "active", BELONGS_TO Student, BELONGS_TO SchoolYear }

  EXPECT create Enrollment -> student_id IS NOT NULL
  EXPECT create Enrollment -> school_year_id IS NOT NULL
  EXPECT delete Student -> list Enrollment HAS_LENGTH == 0
}
```

---

## Grammar Summary

```
file            = app_decl (entity_decl | action_decl | view_decl |
                  ai_service_decl | test_decl |
                  workflow_decl | pipeline_decl | qc_decl | vault_decl |
                  rule_decl | fact_decl | state_decl | pattern_decl |
                  score_decl | module_decl |
                  router_decl | skill_decl | skilldoc_decl | reasoner_decl |
                  lifecycle_decl | breed_decl |
                  packet_decl | authority_decl | channel_decl |
                  identity_decl | feed_decl |
                  node_decl | sensor_decl | zone_decl |
                  session_decl | compiler_decl)*

// --- Application Layer ---
app_decl        = "APP" IDENT "{" app_field* "}"
entity_decl     = "ENTITY" IDENT "{" entity_body "}"
action_decl     = "ACTION" IDENT "{" action_body "}"
view_decl       = "VIEW" IDENT "{" view_body "}"
ai_service_decl = "AI_SERVICE" "{" ai_service_body "}"
test_decl       = "TEST" IDENT "{" test_body "}"

// --- Orchestration Layer ---
workflow_decl   = "WORKFLOW" IDENT "{" workflow_body "}"
pipeline_decl   = "PIPELINE" IDENT "{" pipeline_body "}"
qc_decl         = "QC" IDENT "{" qc_body "}"
vault_decl      = "VAULT" "{" vault_body "}"

// --- Expert System Layer ---
rule_decl       = "RULE" IDENT "{" rule_body "}"
fact_decl       = "FACT" IDENT "{" fact_body "}"
state_decl      = "STATE" IDENT "{" state_body "}"
pattern_decl    = "PATTERN" IDENT "{" pattern_body "}"
score_decl      = "SCORE" IDENT "{" score_body "}"
module_decl     = "MODULE" IDENT "{" module_body "}"

// --- Cooperative Intelligence Layer ---
router_decl     = "ROUTER" IDENT "{" router_body "}"
skill_decl      = "SKILL" IDENT "{" skill_body "}"
skilldoc_decl   = "SKILLDOC" IDENT "{" skilldoc_body "}"
reasoner_decl   = "REASONER" IDENT "{" reasoner_body "}"
lifecycle_decl  = "LIFECYCLE" IDENT "{" lifecycle_body "}"
breed_decl      = "BREED" IDENT "{" breed_body "}"

// --- Semantic Infrastructure Layer ---
packet_decl     = "PACKET" IDENT "{" packet_body "}"
authority_decl  = "AUTHORITY" IDENT "{" authority_body "}"
channel_decl    = "CHANNEL" IDENT "{" channel_body "}"
identity_decl   = "IDENTITY" IDENT "{" identity_body "}"
feed_decl       = "FEED" IDENT "{" feed_body "}"

// --- Ambient Intelligence Layer ---
node_decl       = "NODE" IDENT "{" node_body "}"
sensor_decl     = "SENSOR" IDENT "{" sensor_body "}"
zone_decl       = "ZONE" IDENT "{" zone_body "}"

// --- Semantic Operating Environment ---
session_decl    = "SESSION" IDENT "{" session_body "}"
compiler_decl   = "COMPILER" IDENT "{" compiler_body "}"

type            = "string" | "number" | "float" | "bool" |
                  "date" | "datetime" | "json" | "id"

field_def       = IDENT ":" type [default] [modifier]*
default         = "=" literal
modifier        = "REQUIRED" | "UNIQUE" | "INDEX"
literal         = STRING | NUMBER | BOOL
```

---

## Design Principles

1. **Finite vocabulary.** The DSL has a fixed set of keywords. AI cannot escape the grammar.
2. **Deterministic output.** The same `.agi` file always generates the same code.
3. **Schema first.** ENTITY declarations drive everything downstream.
4. **Convention over configuration.** Sensible defaults minimize boilerplate.
5. **Two-compiler verification.** Generated code must pass both `cargo build` and `tsc --noEmit`.
6. **Testable by construction.** TEST declarations generate executable validation suites.
7. **Human auditable.** The DSL is readable by non-programmers. The generated code is inspectable.
