# Agicore Coding Standards

These standards apply across all Agicore-generated applications. They are inherited from the NovaSyn 3G zero-defect stack and adapted for the 4G DSL-driven architecture. The compiler enforces most of them automatically. The ones you author (DSL declarations, IMPL stubs) follow the conventions below.

---

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| ENTITY names | PascalCase | `Student`, `InvoiceItem`, `PortfolioSynergy` |
| ACTION names | snake_case, verb_noun | `create_student`, `send_message`, `export_report` |
| WORKFLOW names | snake_case | `business_onboarding`, `invoice_review` |
| RULE names | snake_case, descriptive | `ltv_cac_critical`, `auto_approve_small` |
| SKILL names | snake_case, noun_domain | `finance_frameworks`, `strategy_positioning` |
| EVENT names | snake_case, noun_trigger | `weekly_review_reminder`, `batch_rejected` |
| PREFERENCE names | snake_case | `default_model`, `theme`, `ceo_time_target` |
| ENTITY field names | snake_case | `first_name`, `created_at`, `ltv_cac_ratio` |
| ACTION input/output fields | snake_case | `business_id`, `file_path`, `error_message` |
| SQL column names | snake_case (auto-generated) | `first_name`, `created_at` |
| TypeScript interfaces | PascalCase (auto-generated) | `Student`, `InvoiceItem` |
| TypeScript properties | camelCase (auto-generated) | `firstName`, `createdAt` |
| Rust struct fields | snake_case (auto-generated) | `first_name`, `created_at` |
| Tauri command names | snake_case (auto-generated) | `create_student`, `list_students` |
| Database filenames | snake_case | `novasyn_chat.db`, `my_app.db` |
| App identifiers | snake_case | `novasyn_chat`, `novasyn_mba` |
| .agi filenames | snake_case | `novasyn_chat.agi`, `my_app.agi` |

The compiler converts automatically:
- ENTITY field `first_name` → SQL column `first_name`, TypeScript property `firstName`, Rust field `first_name`
- ACTION `export_report` → Tauri command `export_report`, TypeScript wrapper `exportReport()`
- ENTITY `InvoiceItem` → SQL table `invoice_items`, TypeScript type `InvoiceItem`, Rust struct `InvoiceItem`

---

## DSL Declaration Conventions

### APP block

```agi
APP my_app {
  TITLE  "My App"           // Display title (can contain spaces)
  WINDOW 1200x800 frameless // Width x Height, frameless for NovaSyn-style
  DB     my_app.db          // Database filename, snake_case
  THEME  dark               // dark | light | system
}
```

### ENTITY declarations

- Use `REQUIRED` for NOT NULL fields
- Always include `TIMESTAMPS` — provides `created_at` and `updated_at`
- Always include `CRUD` — generates standard create/read/update/delete commands
- Use `ORDER fieldname ASC|DESC` to set default list sort
- Use `BELONGS_TO` / `HAS_MANY` for relationships, never raw foreign key fields
- Use `DEFAULT` for sensible defaults rather than letting application code set them

```agi
ENTITY Student {
  name:   string REQUIRED
  grade:  string
  active: bool = true

  BELONGS_TO Classroom    // generates classroom_id FK, SQL JOIN on list
  TIMESTAMPS
  CRUD
  ORDER name ASC
}
```

### ACTION declarations

- `AI` actions: include a `PROMPT` block for complex, multi-paragraph prompts; use inline `AI "..."` for simple one-liners
- `IMPL` actions: one action per stub file, never bundle hand-written logic into one large file
- Output field names should be noun-form: `file_path`, not `get_file_path`; `error`, not `error_message`
- Use `string | null` for optional outputs that may not be present; never use empty string as a sentinel

```agi
ACTION analyze_student {
  INPUT  student_id: string REQUIRED
  OUTPUT summary: string, risk_level: string | null
  AI     "Analyze {{student}} and return a brief summary and risk level if applicable."
  STREAM true
}

ACTION export_transcript {
  IMPL
  INPUT  student_id: string REQUIRED
  OUTPUT file_path: string | null, success: bool, error: string | null
}
```

### SEED declarations

- Use `SEED` inside ENTITY for a single record, or top-level `SEED EntityName { }` for multiple
- Seed data is inserted with `INSERT OR IGNORE` — safe to re-run migrations
- Seed only demonstrability data (realistic, complete, not "test" or "foo/bar")
- Include seeds for every reference app; they make first-launch demonstrable without setup

---

## Generated File Structure

The compiler writes to a fixed output structure. Never manually edit these files — they are overwritten on every regen:

```
<output-dir>/
├── migrations/
│   └── 001_initial.sql         // All tables, indexes, FKs, seeds — in order
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── crud.rs         // Generated CRUD for all entities
│   │   │   ├── ai_actions.rs   // Generated AI action dispatchers
│   │   │   └── <action>.rs     // @agicore-protected — one per IMPL action
│   │   └── lib.rs              // Tauri app builder, command registration
│   └── tauri.conf.json         // Window config, ACL capabilities
└── src/
    ├── lib/
    │   ├── types.ts            // All entity interfaces, action result types
    │   ├── invokes.ts          // Typed invoke() wrappers for every command
    │   ├── store.ts            // Full Zustand store — state + actions for all entities
    │   └── preferences.ts      // Typed get/set accessors for PREFERENCE declarations
    └── components/
        ├── <Entity>List.tsx    // Table/list view per entity
        ├── <Entity>Form.tsx    // Create/edit modal per entity
        └── AiChat.tsx          // Streaming AI chat (when AI_SERVICE declared)
```

**Protected files** — files with `// @agicore-protected` on line 1 are never overwritten:
- One `.rs` stub file per `ACTION IMPL` declaration
- Fill in the Rust logic; the compiler keeps your implementation through regen

---

## Application Architecture

### One store per app

Every Agicore app has a single Zustand store (`src/lib/store.ts`). Generated by the compiler. Contains:
- Current entity lists for every ENTITY
- Current-item selection (when applicable)
- AI model selection state (when AI_SERVICE declared)
- Action functions (async, calls Tauri commands via invoke wrappers)

Never create a second store. Never use React Context for cross-component state. The store is the single source of truth.

### State access pattern

```typescript
// Correct: destructure from store at point of use
const { students, currentStudent, setCurrentStudent, createStudent } = useStore();

// Wrong: prop drilling from parent
// Wrong: React Context for state
// Wrong: useState for data that belongs in the store
```

### Component structure

Generated components follow this structure. Hand-written custom components should follow the same pattern:

```typescript
export function MyComponent() {
  // 1. Store
  const { items, currentItem, setCurrentItem } = useStore();

  // 2. Local UI state only
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3. Effects (data fetching on mount if needed)
  useEffect(() => { loadItems(); }, []);

  // 4. Handlers
  const handleCreate = async () => { ... };

  // 5. Render
  return (...);
}
```

### Window layout

All NovaSyn / Agicore apps use a frameless window with a custom title bar:

```
┌─────────────────────────────────────────────┐
│ TitleBar (drag region, window controls)      │
├──────────┬──────────────────────────────────┤
│          │                                  │
│ Sidebar  │     Main Content Area            │
│ (w-14)   │     (LAYOUT renders here)        │
│ icons    │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

- TitleBar: `data-tauri-drag-region` attribute for dragging; minimize/maximize/close via Tauri window API
- Sidebar: narrow icon strip (`w-14`), one icon per VIEW, active state highlighted
- Main area: renders the active VIEW's generated component

### App startup sequence

```
Tauri runtime starts
  → Rust lib.rs initializes (DB connection, migrations from 001_initial.sql)
  → Tauri commands registered
  → WebView opens
    → React renders
    → Zustand store initializes (empty state)
    → Components mount, store actions called to fetch initial data
```

Migrations run automatically on startup from the generated SQL file. No manual migration step needed.

---

## Error Handling

### Rust commands (generated and IMPL stubs)

Every Tauri command returns `Result<T, String>`. Never panic in a command handler. Never return a silent success when something failed.

```rust
// Correct
#[tauri::command]
pub fn export_report(state: State<AppState>, input: ExportReportInput) -> Result<ExportReportOutput, String> {
    let path = do_export(&input).map_err(|e| e.to_string())?;
    Ok(ExportReportOutput { file_path: Some(path), success: true, error: None })
}

// Wrong: panicking on error
// Wrong: returning Ok with an error string in a success field
```

### TypeScript / store actions (generated)

Generated store actions check the command result and surface errors to the component:

```typescript
// Generated pattern
const result = await invoke<ExportReportOutput>('export_report', { input });
if (result.error) {
  set({ lastError: result.error });
  return;
}
```

For IMPL actions with hand-written logic, follow this pattern for your IMPL stub bodies.

### Non-critical errors

Errors in analytics, logging, or decorative features (gamification, badges) should be caught and logged, not surfaced to the user:

```rust
if let Err(e) = log_analytics_event(&state, &event) {
    eprintln!("Analytics error (non-critical): {}", e);
    // continue — don't fail the primary operation
}
```

---

## AI Provider Patterns

### Multi-provider strategy

Agicore's generated AI service follows the same strategy as the 3G NovaSyn stack:

- **Anthropic**: native SDK (`@anthropic-ai/sdk`) for streaming — best streaming support
- **OpenAI / xAI**: raw `fetch()` with SSE parsing — no SDK dependency
- **Google Gemini**: raw `fetch()` — no SDK dependency

The `AI_SERVICE` declaration in the DSL generates the provider dispatch, model selection, and streaming handler. Do not add provider-specific code outside the generated AI service layer.

### Streaming responses

Streaming is handled through Tauri events. The generated Rust command emits chunks via `app_handle.emit()`. The TypeScript invoke wrapper listens via `listen()` from `@tauri-apps/api/event`.

When an ACTION has `STREAM true`, the generated component renders incrementally as chunks arrive. Do not buffer the full response before displaying.

### API key storage

API keys are stored encrypted at `%APPDATA%\NovaSyn\api-keys.json` (Windows) or equivalent platform path via the `dirs` crate. Never hardcode API keys. Never store keys in the SQLite database. The `KEYS_FILE` field in `AI_SERVICE` specifies the path.

---

## What Agicore Prevents (Anti-Patterns)

The DSL and compiler eliminate entire classes of errors that plagued hand-written Tauri/Electron apps. Understanding what Agicore prevents helps you not recreate the problems in custom code.

| 3G Anti-Pattern | How Agicore Prevents It |
|-----------------|------------------------|
| Forgetting to wire IPC channels | The compiler generates all Tauri commands and invoke wrappers from ACTION declarations — no manual wiring |
| Type mismatch between Rust and TypeScript | Compiler generates both from the same AST — they are always in sync |
| Mixed case in SQL (firstName vs first_name) | DSL fields are snake_case; compiler enforces SQL snake_case, TypeScript camelCase |
| Multiple Zustand stores | Compiler generates one store — it's the only place to put state |
| Magic strings for command names | TypeScript invoke wrappers use typed function calls — no raw string command names in component code |
| Forgetting to register a command in lib.rs | Compiler generates the full registration list — you can't forget |
| Forgetting to apply a migration | Compiler generates one migration file; it runs on startup automatically |
| Row mapper drift | Serde handles snake_case → camelCase automatically — no hand-written mappers |

**Do not work around the DSL.** If you find yourself:
- Writing Rust commands that aren't scaffolded from an IMPL action
- Adding state to the store by hand
- Writing TypeScript invoke calls with raw string command names
- Creating a second Zustand store

...stop. You've hit a framework gap. Follow the process in EVOLVING.md to add the primitive to the DSL instead.

---

## Commit Conventions

All commits to Agicore framework and apps include a `Co-Authored-By` trailer when AI-assisted:

```
Brief description of what changed and why

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

For framework sessions (extending the lexer, parser, compiler), the message should reference the phase and what layer was extended:

```
Phase 10: RULE IF/FLAG/SEVERITY + SKILL CONTENT/APPLIES_TO + EVENT SCHEDULE

Brief description...

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

For application sessions, reference the app and what was built:

```
NovaSyn Chat: add folder knowledge injection and streaming

Brief description...

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
