# Build Your First Agicore App: A Knowledge Base with AI Search

Agicore is a deterministic systems-authoring platform. You write a single `.agi` file describing your application — its data model, AI services, actions, views, and tests. The compiler reads that file and generates a complete Tauri desktop app: Rust backend, SQLite database, React frontend, Zustand state management.

The core principle: **AI is used at build time for generation. At runtime, everything is deterministic.** AI is never trusted at runtime to make structural decisions. This is not an AI chatbot framework. It is a compiler.

In this tutorial you will build **Basecamp**, a personal knowledge base that stores articles, tags them, and uses Claude to summarize content and suggest related topics. By the end you will understand not just the syntax but the reasoning behind each DSL construct.

---

## Prerequisites

- Agicore CLI installed (`agicore --version` should return a version number)
- An Anthropic API key in your environment: `ANTHROPIC_API_KEY=sk-...`
- Rust toolchain and Node.js 18+ installed (Tauri's requirements)

Create a working directory:

```bash
mkdir basecamp && cd basecamp
```

---

## Part 1: The Data Model

Start with a blank file called `basecamp.agi`. Every Agicore app begins with an `APP` block that sets global configuration, followed by `ENTITY` declarations that define the data model.

```
APP basecamp {
  TITLE "Basecamp — Personal Knowledge Base"
  WINDOW 1200x800 frameless
  DB basecamp.db
}

ENTITY Article {
  title:       string
  content:     string
  summary:     string
  source_url:  string
  created_at:  datetime
  updated_at:  datetime
}

ENTITY Tag {
  name:  string
  color: string = "#6d28d9"
  BELONGS_TO Article
}
```

Every entity automatically gets an `id` field (UUID v4, generated at insert time). You do not declare it. The compiler owns the primary key contract.

`created_at` and `updated_at` are also managed by the runtime — `created_at` is set on insert, `updated_at` is updated on every write. You declare them to make them visible in views; you never set them manually.

`BELONGS_TO Article` on Tag does two things: it adds an `article_id` column to the tags table with a foreign key constraint, and it tells the compiler that Tag is a dependent entity. Delete an Article and its Tags are cascaded. The relationship is explicit in the DSL, not inferred from naming conventions.

Run the compiler to see the schema:

```bash
agicore generate basecamp.agi --dry-run --show-sql
```

Expected output:

```sql
CREATE TABLE articles (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  summary     TEXT NOT NULL DEFAULT '',
  source_url  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE tags (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6d28d9',
  article_id  TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
```

The `--dry-run` flag generates nothing to disk. `--show-sql` prints the migration SQL. This is a useful habit: verify the schema before generating code.

Note that `color` carries its default value (`"#6d28d9"`) through to the SQL `DEFAULT` clause. Defaults declared in the DSL propagate everywhere — SQL, Rust structs, TypeScript types, and form initial values — from a single source.

---

## Part 2: Adding AI Actions

Now add an AI service and two actions. An `AI_SERVICE` block names a model and provider. An `ACTION` block describes a unit of AI-assisted work: what goes in, what comes out, and the prompt.

Add this to `basecamp.agi`:

```
AI_SERVICE claude {
  MODEL claude-haiku-4-5-20251001
  PROVIDER anthropic
}

ACTION summarize_article {
  INPUT  article_id: string
  OUTPUT summary: string
  AI     "Read the following article and write a 2-3 sentence summary that captures the key insight. Be precise. Article: {{content}}"
}

ACTION find_related {
  INPUT  article_id: string
  OUTPUT related_titles: string
  AI     "Given this article's title and summary, suggest 3 related topics worth exploring. Format as a simple numbered list. Title: {{title}} Summary: {{summary}}"
}
```

The `{{field_name}}` syntax in the prompt template is resolved at runtime from the entity record identified by `article_id`. The compiler knows that `summarize_article` takes an `article_id`, looks up the Article row, and makes all of Article's fields available as template variables. You reference `{{content}}` — you do not write the lookup code. That is boilerplate the compiler generates.

The compiler also generates the Tauri command, the Rust function that calls the Anthropic API, the TypeScript hook that invokes it, and the loading/error state in the UI. The AI prompt is the only thing you write.

Why `article_id` as input rather than passing `content` directly? Because the action is tied to a persistent record. The runtime can log which article was summarized, when, by which model version. Actions are not anonymous function calls; they are auditable operations on entities.

---

## Part 3: Views and Navigation

Views define how entities are presented. Add these to `basecamp.agi`:

```
VIEW ArticleList {
  ENTITY Article
  LAYOUT table
  ACTIONS create, edit, delete
}

VIEW ArticleDetail {
  ENTITY Article
  LAYOUT document_editor
  CURRENT
}

VIEW ArticleForm {
  ENTITY Article
  LAYOUT form
}

VIEW TagList {
  ENTITY Tag
  LAYOUT table
  ACTIONS create, edit, delete
}
```

**The `CURRENT` keyword** is the most important navigation concept in Agicore. When a user clicks a row in `ArticleList`, the selected Article is stored in a shared `CURRENT` slot for the Article entity. `ArticleDetail` reads from that slot. No URL params, no prop drilling, no router configuration. The selection state is a first-class runtime concept, not an afterthought wired up with `useParams`.

This matters for desktop apps specifically. Desktop UI patterns — master-detail layouts, docked panels, split views — all rely on selection state that persists across panels. The `CURRENT` pattern makes this natural in the DSL.

**Layouts** are not just stylistic choices. Each layout generates a different React component tree:

- `table` — a sortable, filterable data grid with bulk actions
- `form` — a single-record edit form with field validation
- `document_editor` — a two-panel layout: entity list on the left, a rich content editor on the right, driven by `CURRENT`

The `document_editor` layout is specifically designed for knowledge base and note-taking applications. The left panel shows the article list; the right panel shows the full content of whatever is currently selected, with inline editing. You do not build this layout. You declare that you want it.

---

## Part 4: A Workflow

A `WORKFLOW` sequences multiple actions into a named pipeline. Add this to `basecamp.agi`:

```
WORKFLOW process_new_article {
  DESCRIPTION "Summarize a new article and find related topics"
  STEPS
    summarize: summarize_article
    find_related: find_related
}
```

Workflows execute steps in dependency order. The compiler performs a static analysis of the step graph: steps with no interdependencies run in parallel (BFS-parallel); steps that consume the output of a prior step run after it completes. In this case `find_related` uses `{{summary}}`, which is produced by `summarize_article`, so it is automatically sequenced after it.

The generated UI shows a step-by-step execution trace: each step's status (pending / running / done / error), elapsed time, and output. This is not a loading spinner. It is an observable pipeline. When `find_related` fails because the model returned a malformed response, you see exactly which step failed and why.

This traceability is why workflows exist as a first-class construct rather than being implemented as chained promises in custom code. The compiler knows the structure of the pipeline and can generate meaningful observability.

---

## Part 5: Tests

Agicore includes a `TEST` declaration for exercising CRUD operations and relationships. Add these to `basecamp.agi`:

```
TEST article_crud {
  GIVEN Article {
    title: "The Production Problem"
    content: "AI systems fail not because the models are bad..."
    summary: ""
    source_url: "https://example.com"
  }
  EXPECT create -> id IS NOT NULL
  EXPECT get_by_id -> title == "The Production Problem"
  EXPECT update -> summary == "Updated summary"
  EXPECT delete -> NOT FOUND
}

TEST tag_belongs_to_article {
  GIVEN Article { title: "Test Article", content: "...", summary: "", source_url: "" }
  GIVEN Tag { name: "AI", color: "#6d28d9" }
  EXPECT create -> id IS NOT NULL
}
```

`TEST` declarations compile to Rust integration tests that run against an in-memory SQLite database. They are not unit tests of generated code — they are behavioral contracts on the entities themselves. If you change the schema, the tests catch regressions.

`GIVEN` sets up the fixture. `EXPECT` asserts an operation's result. The operations (`create`, `get_by_id`, `update`, `delete`) map to the generated repository functions. `NOT FOUND` asserts that the delete propagated correctly.

The `tag_belongs_to_article` test implicitly verifies the foreign key — attempting to create a Tag without a valid Article would fail at the database constraint layer, and the test would catch it.

Run the tests:

```bash
agicore test basecamp.agi
```

---

## Part 6: Compile and Run

Your complete `basecamp.agi` now has all the declarations. Compile:

```bash
agicore generate basecamp.agi
```

This creates:

```
basecamp/
  src-tauri/
    src/
      commands/
        article.rs      # CRUD commands for Article
        tag.rs          # CRUD commands for Tag
        actions.rs      # summarize_article, find_related
        workflows.rs    # process_new_article
      db/
        migrations/     # SQL migration files
        schema.rs       # Rust structs matching entities
      main.rs
    Cargo.toml
  src/
    components/
      ArticleList.tsx
      ArticleDetail.tsx
      ArticleForm.tsx
      TagList.tsx
    store/
      articleStore.ts   # Zustand store with CURRENT slot
      tagStore.ts
    App.tsx
  package.json
  tauri.conf.json
```

Start the development server:

```bash
cd basecamp
npm install
npm run tauri dev
```

The app opens. The left sidebar shows ArticleList and TagList navigation. Clicking an article in the list populates the document editor on the right. The "Process" button on an article triggers the `process_new_article` workflow — you see the two steps execute in sequence, with the summary written back to the Article record when complete.

---

## Part 7: Adding Custom Logic Without Losing It

The compiler owns most files in the generated output. If you regenerate after changing the DSL, those files are overwritten. But some logic cannot be expressed in the DSL — a clipboard import feature, a custom export format, a third-party integration. For these, Agicore has a protected file contract.

Create a new file at `src-tauri/src/commands/import.rs`:

```rust
// @agicore-protected
// Custom handler for article import from clipboard
use crate::db::schema::Article;

#[tauri::command]
pub async fn import_from_clipboard(
    app: tauri::AppHandle,
) -> Result<Article, String> {
    let clipboard_text = get_clipboard_text()?;
    let article = Article {
        id: uuid::Uuid::new_v4().to_string(),
        title: extract_title(&clipboard_text),
        content: clipboard_text,
        summary: String::new(),
        source_url: String::new(),
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };
    insert_article(&app, &article).await?;
    Ok(article)
}
```

The `// @agicore-protected` comment on the first line marks this file. When you run `agicore generate` again, the compiler skips any file carrying that marker. Your custom handler survives the regeneration.

The contract is clear: the DSL owns the schema, the entities, and the generated commands. You own the extensions. The boundary is explicit — not a convention to memorize, but a marker you place deliberately.

Register your custom command in `main.rs` — that file is also regenerated, so you list custom command modules in the DSL:

```
APP basecamp {
  TITLE "Basecamp — Personal Knowledge Base"
  WINDOW 1200x800 frameless
  DB basecamp.db
  CUSTOM_COMMANDS import
}
```

The `CUSTOM_COMMANDS` directive tells the compiler to include `import.rs` in the Tauri command registration without overwriting it.

---

## Part 8: Iterating on the DSL

The real payoff of the DSL approach becomes clear when requirements change. Suppose you want to add a `reading_time` field to Article — an integer storing estimated reading time in minutes.

Edit `basecamp.agi`:

```
ENTITY Article {
  title:        string
  content:      string
  summary:      string
  source_url:   string
  reading_time: integer = 0
  created_at:   datetime
  updated_at:   datetime
}
```

Regenerate:

```bash
agicore generate basecamp.agi
```

The compiler detects that the schema has changed. It generates a new migration:

```sql
ALTER TABLE articles ADD COLUMN reading_time INTEGER NOT NULL DEFAULT 0;
```

It also updates:
- The Rust `Article` struct to include `reading_time: i64`
- The TypeScript `Article` type
- The `ArticleForm` view to include a number input for `reading_time`
- The `ArticleList` table to include the column (sortable by default)

Nothing falls out of sync. You changed one line in the DSL. Every layer of the stack updated together. This is the compilers's contract with you: the DSL is the single source of truth, and the generated code is always consistent with it.

---

## What You've Learned

Working through Basecamp, you've seen how each DSL construct maps to a system-level decision:

- `ENTITY` + `BELONGS_TO` — schema, foreign keys, cascade rules, and TypeScript types from one declaration
- `AI_SERVICE` + `ACTION` — Anthropic API integration, prompt templating, and UI loading state without boilerplate
- `CURRENT` — selection state as a first-class runtime concept, not a routing afterthought
- `WORKFLOW` — observable, dependency-ordered AI pipelines with step-level tracing
- `TEST` — behavioral contracts on entities, not unit tests of generated code
- `@agicore-protected` + `CUSTOM_COMMANDS` — a clear boundary between compiler-owned and developer-owned code
- Field additions — schema migration, type updates, and UI changes propagated from one edit

The mental model: Agicore is a compiler, not a framework. You are not configuring a runtime. You are writing a specification, and the compiler produces a correct implementation of that specification. The specification is the authoritative artifact. The generated code is a build artifact you can inspect but do not maintain directly.

That distinction — specification vs. implementation — is what makes regeneration safe and iteration fast.
