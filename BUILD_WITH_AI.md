# Building with Agicore + Claude Code

This is the builder's guide. It tells you what to read, what to run, and what to do when the framework is missing something. Skip `START_HERE_WITH_AI.md` — that's for understanding the architecture. This is for shipping an app.

---

## Step 1 — Give Claude Code the right context

Point Claude Code at this repo. Then tell it to read these two files before anything else:

```
Read core/parser/src/types.ts and apps/novasyn-chat/novasyn_chat.agi.
types.ts is the authoritative reference for every DSL declaration type and field.
novasyn_chat.agi is a complete real application — use it as the idiom guide.
```

**Why `types.ts` and not `dsl/grammar.md`?**

`types.ts` is the source of truth. It's what the parser actually accepts, and the test suite enforces it. The grammar doc can lag after framework updates; the types file never does.

**Why `novasyn_chat.agi` and not an example in `/examples`?**

The examples are clean and minimal — good for isolated feature reference. NovaSyn Chat is a production application that uses 31 declaration types across 7 layers. It shows how things actually fit together at scale: how ENTITY relationships compose, how ACTION and AI_SERVICE interact, how COMPILER transitions chain semantic state. If you're building something serious, this is the model.

---

## Step 2 — Write your `.agi` file

Create `<your_app_name>.agi` in your project directory. Start with the required `APP` block, then build out entities, actions, and views.

**Minimal working skeleton:**

```agi
APP my_app {
  TITLE  "My App"
  WINDOW 1200x800 frameless
  DB     my_app.db
  THEME  dark
}

ENTITY Item {
  name:        string REQUIRED
  description: string
  status:      string = "active"
  TIMESTAMPS
}

VIEW ItemList {
  ENTITY  Item
  LAYOUT  table
  ACTIONS create, edit, delete
}
```

**To add AI:**

```agi
AI_SERVICE {
  PROVIDERS  anthropic, openai
  KEYS_FILE  "%APPDATA%/MyApp/api-keys.json"
  DEFAULT    anthropic
  STREAMING  true
  MODELS {
    anthropic  "claude-sonnet-4-20250514"  DEFAULT
    openai     "gpt-4o"                    DEFAULT
  }
}

ACTION summarize_item {
  INPUT  item_id: string
  OUTPUT summary: string
  AI     "Summarize this item in two sentences: {{item}}"
  STREAM true
}
```

**To add a custom deterministic Rust action:**

```agi
ACTION export_report {
  INPUT  item_id: string
  OUTPUT ok: bool, path: string | null, error: string | null
  IMPL   "export_report"
}
```

This generates a `// @agicore-protected` Rust stub file at `src-tauri/src/commands/export_report.rs`. Fill in the logic. The file is never overwritten on regen.

---

## Step 3 — Run the compiler

```bash
cd core/compiler
node dist/cli.js generate path/to/your_app.agi --output path/to/output/dir
```

The compiler writes to the output directory:
- `migrations/` — SQLite schema (run these in order on first launch)
- `src-tauri/src/commands/` — Rust Tauri commands
- `src/lib/` — TypeScript types, invoke wrappers, Zustand store
- `src/components/` — React components (list views, forms, AI chat)
- `src-tauri/tauri.conf.json` — Tauri configuration and ACL capabilities

Any file with `// @agicore-protected` on line 1 is skipped. Your implementations survive regen.

---

## DSL Quick Reference

**Declaration types by layer:**

| Layer | Declarations |
|-------|-------------|
| Application | `APP`, `ENTITY`, `ACTION`, `VIEW`, `AI_SERVICE`, `TEST`, `PREFERENCE` |
| Orchestration | `WORKFLOW`, `PIPELINE`, `QC`, `VAULT` |
| Expert System | `RULE`, `FACT`, `STATE`, `PATTERN`, `SCORE`, `MODULE` |
| Cooperative Intelligence | `ROUTER`, `SKILL`, `SKILLDOC`, `REASONER`, `TRIGGER`, `LIFECYCLE`, `BREED` |
| Semantic Infrastructure | `PACKET`, `AUTHORITY`, `CHANNEL`, `IDENTITY`, `FEED` |
| Ambient Intelligence | `NODE`, `SENSOR`, `ZONE` |
| Semantic Operating Environment | `SESSION`, `COMPILER` |
| Adaptive Intelligence | `EVENT`, `NBVE`, `CONTRACT`, `REPUTATION`, `SUBSCRIPTION`, `DISPUTE` |

**Commonly used ENTITY modifiers:**

```agi
ENTITY Post {
  title:   string REQUIRED
  content: string
  tags:    json = []
  status:  string = "draft"

  BELONGS_TO Author           // foreign key, SQL pushdown on list
  HAS_MANY Comment            // inverse side
  CRUD    list, read, update  // restrict generated operations
  ORDER   DESC                // default sort direction
  TIMESTAMPS                  // adds created_at, updated_at
  SINGLETON                   // one row per install (get-or-create, no list/create/delete)

  SEED {                      // INSERT OR IGNORE on migration
    title: "Welcome"
    status: "published"
  }
}
```

**ACTION patterns:**

```agi
ACTION pick_file {
  OUTPUT  ok: bool, path: string | null
  IMPL    "pick_file"
  PATTERN file_handler        // scaffolds tauri_plugin_dialog import + picker stub
}

ACTION open_link {
  INPUT   url: string
  OUTPUT  ok: bool
  IMPL    "open_link"
  PATTERN shell_open          // scaffolds tauri_plugin_shell import + open stub
}

ACTION upload_file {
  INPUT   file_path: string
  OUTPUT  ok: bool, url: string | null, error: string | null
  IMPL    "upload_file"
  EMIT    upload_progress { stage: string, percent: number }
  // generates typed onUploadProgress() listener in TypeScript
}
```

**PREFERENCE (client-side settings, no DB round-trip):**

```agi
PREFERENCE app_theme {
  TYPE    string
  DEFAULT "dark"
  KEY     "myapp_theme"
}
// generates getAppTheme(), setAppTheme(), useAppTheme() hook
```

**WORKFLOW (sequential or parallel steps with AI execution):**

```agi
WORKFLOW onboard_user {
  DESCRIPTION "New user onboarding sequence"
  STEP verify_identity   { ACTION validate_cf_token }
  STEP create_workspace  { ACTION provision_workspace  DEPENDS_ON verify_identity }
  STEP send_welcome      { ACTION send_welcome_email   DEPENDS_ON create_workspace }
}
```

---

## When the framework is missing something

This is expected. Agicore evolves through operational pressure — your app will surface gaps.

**What to do:**

1. Don't work around the gap in generated code. Generated files get wiped.
2. Write a structured feature request in `idea factory/` (see the template in [EVOLVING.md](EVOLVING.md)).
3. Switch to a framework session: tell Claude Code you're extending the framework, point it at `core/parser/src/lexer.ts`, `core/parser/src/types.ts`, `core/parser/src/parser.ts`, and the relevant generator in `core/compiler/src/generators/`.
4. The pattern is always the same: lexer token → AST type → parse rule → codegen output → tests.
5. Return to your app with the new primitive.

For non-framework custom logic right now, use `ACTION IMPL` to get a protected Rust stub the compiler won't overwrite.

The file `idea factory/bka_stress_test_gaps.md` is a real example of a feature request document that became a framework session (Phase 8). Six gaps, one session.

---

## What gets generated vs. what you write

| Layer | Generated (don't edit) | You write |
|-------|----------------------|-----------|
| SQL | All migrations | Nothing |
| Rust | All CRUD commands, AI dispatch, routing | `IMPL` action bodies (protected files) |
| TypeScript types | All entity types, action result types | Nothing |
| Invoke wrappers | All `invoke()` calls to Rust | Nothing |
| Zustand store | Full app state + actions | Nothing |
| React components | List views, forms, AI chat, model picker | Custom views that extend generated scaffolds |
| Tauri config | `tauri.conf.json`, ACL capabilities | `Cargo.toml` dependencies for plugins |

---

## Reference files

| File | What it's for |
|------|--------------|
| `core/parser/src/types.ts` | Every declaration type and field — the authoritative DSL spec |
| `apps/novasyn-chat/novasyn_chat.agi` | Full production app — 595 lines, 31 declaration types |
| `examples/home-academy/home_academy.agi` | Simpler example — good for entity/action/view patterns |
| `examples/invoice-approval/` | Workflow and expert system patterns |
| `dsl/grammar.md` | Grammar narrative (types.ts is more current) |
| `EVOLVING.md` | How to extend the framework when it's missing something |
| `ROADMAP.md` | What's implemented, what's planned |
