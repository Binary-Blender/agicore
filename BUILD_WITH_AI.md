# Building with Agicore + Claude Code

This is the builder's guide. It tells you what to read, what to run, and what to do when the framework is missing something. Skip `START_HERE_WITH_AI.md` — that's for understanding the architecture. This is for shipping an app.

---

## If you are an AI building an Agicore app — read in this order

1. `README.md` — what Agicore is and how the architecture works
2. `TECH_STACK.md` — exact pinned versions, architecture choices, 3G→4G changes
3. `CODING_STANDARDS.md` — naming conventions, generated structure, anti-patterns
4. `core/parser/src/types.ts` — every DSL declaration type and field (the authoritative spec)
5. `apps/novasyn-chat/novasyn_chat.agi` — production app, idiom guide (AI, ENTITY, COMPILER layers). The canonical reference; lives in this repo.
6. `novasyn-mba` — second production app, expert system layers (RULE, SKILL, WORKFLOW, EVENT). Lives in the [agicore-examples](https://github.com/Binary-Blender/agicore-examples) repo under `showcase/novasyn-mba/`.
7. This file (`BUILD_WITH_AI.md`) — DSL reference, extension process, common pitfalls
8. Feature-specific docs as needed: `TESTING.md`, `VAULT.md`, `CHANNEL.md`, `LOGGING.md`, `MACROS.md`, `EMBEDDED.md`, `NULLCLAW.md`

Then write your `.agi` file, run the compiler, and iterate.

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

**Second reference app — `novasyn-mba` (in [agicore-examples](https://github.com/Binary-Blender/agicore-examples/tree/main/showcase/novasyn-mba))**

NovaSyn MBA is the second production application (1,227 lines, 41 declaration types). It shows the full surface of the expert system and orchestration layers: RULE with IF/FLAG/SEVERITY, SKILL with CONTENT and APPLIES_TO, WORKFLOW chaining, and EVENT with SCHEDULE. If you're using those layers, read this file alongside NovaSyn Chat. The source moved to the agicore-examples repo so platform releases stay focused on the canary (novasyn-chat); novasyn-mba evolves on its own cadence.

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

**RULE (expert system health checks):**

```agi
## Classic syntax (WHEN + named action)
RULE auto_approve_small {
  WHEN   invoice.amount <= 500
  UNLESS vendor.trust_level == "low"
  THEN   auto_approve
  PRIORITY 5
}

## Modern syntax (IF + FLAG + SEVERITY — cleaner for alert rules)
RULE ltv_cac_critical {
  IF   FinancialSnapshot.ltv_cac_ratio < 2
  THEN FLAG "finance_risk"
  SEVERITY critical
  PRIORITY 10
}
```

`IF` is an alias for `WHEN`. `THEN FLAG "name"` sets `rule.flag` and `rule.action = "flag:name"` — use it for data health alert rules. `SEVERITY` values: `critical`, `high`, `medium`, `low`.

**SKILL (domain knowledge injected at prompt-time):**

```agi
SKILL finance_frameworks {
  DESCRIPTION "Core financial frameworks"
  DOMAIN      "finance"
  CONTENT     "LTV:CAC Ratio: Healthy 3:1+, Warning 2:1, Critical below 2:1. ..."
  APPLIES_TO  [finance_advisor, investment_screener]
  KEYWORDS    finance, ltv, cac, runway
  PRIORITY    8
}
```

`CONTENT` embeds a knowledge string that can be injected into AI prompts at runtime. `APPLIES_TO` is a bracketed list of ACTION names this skill context applies to.

**EVENT (time-based or data-driven triggers):**

```agi
## Scheduled event (cron)
EVENT weekly_review_reminder {
  DESCRIPTION "Monday morning reminder"
  SCHEDULE    "0 9 * * 1"
  SUBSCRIBERS [leadership_advisor]
}

## Data-driven event (payload-based)
EVENT batch_rejected {
  DESCRIPTION "Fires when QC rejects a batch"
  PAYLOAD {
    batch_id:         string
    rejection_reason: string
  }
  SUBSCRIBERS [audit_logger]
  IDEMPOTENT  true
  TTL         3600
}
```

`SCHEDULE` accepts any cron expression. If present, the event fires on that schedule.

**PREFERENCE (client-side settings, no DB round-trip):**

```agi
PREFERENCE app_theme {
  TYPE    string
  DEFAULT "dark"
  KEY     "myapp_theme"
}
// generates getAppTheme(), setAppTheme(), useAppTheme() hook
```

**WORKFLOW (sequential steps, each referencing a declared ACTION):**

```agi
WORKFLOW onboard_user {
  STEP verify_identity {
    ACTION validate_cf_token
    ON_FAIL stop
  }
  STEP create_workspace {
    ACTION provision_workspace
    INPUT user_id: "current_user"
    ON_FAIL stop
  }
  STEP send_welcome {
    ACTION send_welcome_email
    ON_FAIL skip
  }
}
```

Steps run in declaration order. `ON_FAIL` options: `stop`, `skip`, `retry`, `fallback`. `INPUT` is a flat `key: value` map (no braces, no comma separators). WORKFLOW does not support DESCRIPTION or DEPENDS_ON.

---

## When the framework is missing something

This is expected. Agicore evolves through operational pressure — your app will surface gaps.

**What to do:**

1. Don't work around the gap in generated code. Generated files get wiped on regen.
2. Write a structured feature request in `idea factory/` (see the template in [EVOLVING.md](EVOLVING.md)).
3. Switch to a framework session. Tell Claude Code you're extending the framework and point it at: `core/parser/src/lexer.ts`, `core/parser/src/types.ts`, `core/parser/src/parser.ts`, and the relevant generator in `core/compiler/src/generators/`.
4. The implementation order is always: **lexer token → AST type → parse function → codegen output → tests**.
5. After rebuilding the parser, sync the dist: `cp -r core/parser/dist/. core/compiler/node_modules/@agicore/parser/dist/`
6. Return to your app with the new primitive.

For custom logic you need right now without a framework session, use `ACTION IMPL` to get a protected Rust stub the compiler won't overwrite.

The file `idea factory/bka_stress_test_gaps.md` is a real example of a feature request document that became a framework session (Phase 8). Six gaps, one session.

---

## How to extend the parser (the exact steps)

When extending a declaration (adding a new keyword or field), follow this sequence precisely:

**Step 1 — Check the lexer first**

Before adding a new token, grep `core/parser/src/lexer.ts` for the keyword. Many keywords already exist in the `TokenType` enum and the keyword map but aren't wired into the declaration you need them in. Example: `SCHEDULE` and `CONTENT` both existed before they were used in `EVENT` and `SKILL`. Re-using an existing token is always preferable to adding a new one.

```bash
grep -n "SCHEDULE\|CONTENT" core/parser/src/lexer.ts
```

**Step 2 — Add the token (only if it doesn't exist)**

Add to the `TokenType` enum in `lexer.ts`:
```typescript
SEVERITY_KW = 'SEVERITY_KW',
```

Add to the keyword map (also in `lexer.ts`):
```typescript
SEVERITY: TokenType.SEVERITY_KW,
```

**Step 3 — Extend the AST type in `types.ts`**

```typescript
export interface RuleDecl {
  // ... existing fields ...
  severity?: 'critical' | 'high' | 'medium' | 'low';  // ← add new field
}
```

**Step 4 — Wire into the parse function in `parser.ts`**

Find the parse function for your declaration (e.g., `parseRule()`). Add a handler in the `while (!this.check(RBRACE))` loop:

```typescript
if (token.type === TokenType.SEVERITY_KW) {
  this.advance();
  severity = this.expectIdentifier() as RuleDecl['severity'];
  continue;
}
```

Include the new field in the returned object literal.

**Step 5 — Build the parser and sync**

```bash
cd core/parser && npm run build
cp -r core/parser/dist/. core/compiler/node_modules/@agicore/parser/dist/
```

**Step 6 — Add tests**

In `core/parser/test/parser.test.ts`, find the `// --- Summary ---` block at the end. Add a new test section before it:

```typescript
section('RULE SEVERITY syntax');

try {
  const result = parse(`
    APP t { TITLE "T" DB t.db }
    RULE my_rule { IF Entity.field < 2 THEN FLAG "alert" SEVERITY critical PRIORITY 5 }
  `);
  assert(result.rules[0]!.severity === 'critical', 'severity should be critical');
  console.log('  RULE SEVERITY parsed successfully');
} catch (err) {
  failed++;
  console.error(`  FAIL: ${err}`);
}
```

The test runner uses `section()`, `assert()`, and `failed++` — no external test framework. New tests go before the Summary block. Run with `npm test` in `core/parser/`.

**Step 7 — Check what the existing parse function supports**

To understand what keywords a declaration already handles, read its parse function directly — not the grammar doc. Search in `parser.ts`:

```bash
grep -n "parseRule\|parseSkill\|parseWorkflow" core/parser/src/parser.ts
```

Then read the function body. Every `if (token.type === TokenType.XYZ)` block is a supported keyword. If a keyword isn't there, it's not supported — add it.

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

## Common pitfalls

These are the mistakes that cause silent failures or confusing errors. Read them before you start.

**1. Editing generated files directly**
Files without `// @agicore-protected` on line 1 are overwritten on every compiler run. Any edits you make to `types.ts`, `store.ts`, `invokes.ts`, `crud.rs`, or `ai_actions.rs` will be wiped. If you need custom logic, add it to the DSL (new IMPL action, new ENTITY, new PREFERENCE) and let the compiler generate it.

**2. Forgetting the parser→compiler sync step**
If you extend the parser (edit `core/parser/src/`), you must rebuild and sync before compiling:
```bash
cd core/parser && npm run build
cp -r core/parser/dist/. core/compiler/node_modules/@agicore/parser/dist/
```
If you skip this, the compiler runs against the old parser. Changes appear to do nothing.

**3. Using `^` in package.json**
npm adds `^` automatically on install. Remove it. All Agicore projects use exact version strings. See `TECH_STACK.md` for canonical versions and the upgrade procedure.

**4. ENTITY field names that aren't snake_case**
DSL field names must be snake_case. The compiler generates SQL columns with the exact name you write, TypeScript properties in camelCase (auto-converted), and Rust fields in snake_case. A field named `firstName` would produce a SQL column `firstName` — breaking the snake_case SQL convention.

**5. ACTION names that don't follow verb_noun**
Tauri command names are derived directly from ACTION names. `ACTION export` generates a command called `export` — which may conflict with reserved words. Use `ACTION export_report`, `ACTION create_student`, etc.

**6. Referencing an entity or action that isn't declared**
The static validator catches most cross-reference errors, but the compiler won't generate code for things that aren't in the DSL. If your WORKFLOW references an ACTION that doesn't exist, it parses cleanly but produces a workflow step with no backing command. Declare everything the app needs.

**7. Triple-quoted prompts for complex AI text**
If your AI prompt contains em dashes, `$`, `[`, `]`, or newlines, use triple-quoted strings (`"""..."""`) not regular strings (`"..."`). The lexer handles triple-quoted strings as raw content.

**8. SEED data with wrong field names**
SEED field names must exactly match the ENTITY field names in the DSL. A mismatch won't error at parse time but will generate invalid SQL. Double-check SEED field names against their ENTITY.

**9. Working around a framework gap instead of filing it**
If you find yourself writing hand-rolled Rust that should be generated, or copy-pasting patterns across files, that's a framework gap. See EVOLVING.md. The implementation cost of a well-specified gap is low; the cost of undocumented workarounds in generated apps is high.

---

## Reference files

| File | What it's for |
|------|--------------|
| `core/parser/src/types.ts` | Every declaration type and field — the authoritative DSL spec |
| `core/parser/src/parser.ts` | Parse functions — the ground truth for what each declaration currently accepts |
| `core/parser/src/lexer.ts` | Token enum and keyword map — check here before adding a new token |
| `apps/novasyn-chat/novasyn_chat.agi` | Production app — 595 lines, 31 declaration types (AI, ENTITY, ACTION, COMPILER) |
| [agicore-examples/showcase/novasyn-mba/](https://github.com/Binary-Blender/agicore-examples/tree/main/showcase/novasyn-mba) | Production app — 1,227 lines, 41 declaration types (RULE, SKILL, WORKFLOW, EVENT) |
| [agicore-examples/reference/home-academy/](https://github.com/Binary-Blender/agicore-examples/tree/main/reference/home-academy) | Minimal example — entity/action/view patterns |
| [agicore-examples/reference/invoice-approval/](https://github.com/Binary-Blender/agicore-examples/tree/main/reference/invoice-approval) | Workflow and expert system patterns |
| `dsl/grammar.md` | Grammar narrative (types.ts and parser.ts are more current) |
| `EVOLVING.md` | Methodology for extending the framework when it's missing something |
| `TECH_STACK.md` | Exact pinned versions for all dependencies (Node, Rust, frontend) + 3G→4G comparison |
| `CODING_STANDARDS.md` | Naming conventions, generated file structure, error handling, anti-patterns |
| `TESTING.md` | TEST declarations and generated Rust integration tests |
| `VAULT.md` | VAULT declaration: shared cross-app SQLite asset storage |
| `CHANNEL.md` | CHANNEL + PACKET: typed SQLite-backed message queues |
| `LOGGING.md` | LOG declaration: file-based Rust logger, no new Cargo dependencies |
| `MACROS.md` | MACRO + MACRO_REGISTRY: cross-app capability invocation |
| `EMBEDDED.md` | NODE, SENSOR, ZONE, ACTUATOR, PLATFORM, BRAIN_BODY — robots and sensor arrays |
| `NULLCLAW.md` | NullClaw agent runtime: tool bindings, offline-first AI routing, safety |
| `ROADMAP.md` | What's implemented, what's planned |
