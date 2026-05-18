# Macros — Reusable Named Capabilities

A `MACRO` is a named, parameterized capability that an Agicore app can expose to other apps or reuse internally. `MACRO_REGISTRY` declares which macros this app publishes (and which macros it consumes from other apps).

The macro system is the cross-app capability layer. Where `CHANNEL` passes messages and `VAULT` shares content, `MACRO` shares *behavior* — a named invocation that one app can call in another.

---

## Declaring a MACRO

```agi
MACRO export_pdf {
  DESCRIPTION "Export any entity to a PDF document"
  PARAMS {
    entity_id TEXT     REQUIRED
    format    TEXT
    template  TEXT
  }
  ACTION generate_pdf
}
```

### MACRO fields

| Field | Required | Description |
|-------|----------|-------------|
| `DESCRIPTION` | Yes | Human-readable description of what this macro does |
| `PARAMS` | No | Named parameters with type and optional `REQUIRED` modifier |
| `ACTION` | No | The ACTION declaration this macro delegates to |

### PARAMS types

Parameter types follow the same conventions as ENTITY FIELDS: `TEXT`, `INTEGER`, `REAL`, `BOOLEAN`. Each param may be followed by `REQUIRED`; omitting it makes the param optional.

---

## Declaring a MACRO_REGISTRY

```agi
MACRO_REGISTRY {
  EXPOSES [export_pdf, send_report, analyze_business]
  INVOKES {
    novasyn_chat_save_conversation  BINDING save_conversation
    novasyn_mba_run_advisor         BINDING run_advisor
  }
}
```

### MACRO_REGISTRY fields

| Field | Required | Description |
|-------|----------|-------------|
| `EXPOSES` | No | Bracketed list of MACRO names this app publishes for other apps to call |
| `INVOKES` | No | Block of external macro names this app consumes; `BINDING` renames them locally |

`EXPOSES` and `INVOKES` are both optional — declare only what you need.

---

## What gets generated

### `src-tauri/src/macros.rs`

One Tauri command stub per declared MACRO:

```rust
#[tauri::command]
pub async fn macro_export_pdf(
    entity_id: String,
    format: String,
) -> Result<serde_json::Value, String> {
    // MACRO export_pdf: Export any entity to a PDF document
    // Wire to action: generate_pdf
    // TODO: implement this macro
    Ok(serde_json::json!({ "status": "ok", "macro": "export_pdf" }))
}
```

The generated file includes a comment block listing the `invoke_handler!` entries to add to `lib.rs`.

Mark the file `// @agicore-protected` to write your implementation without regeneration overwriting it.

### `src/lib/macros.ts`

Typed TypeScript invoke wrappers for every MACRO, plus the registry manifest:

```typescript
/** Export any entity to a PDF document */
export async function invokeExportPdf(entityId: string, format?: string): Promise<unknown> {
  return invoke('macro_export_pdf', { entityId, format });
}

/** Registry manifest — which macros this app exposes */
export const macroRegistry = {
  "export_pdf": { description: "Export any entity to a PDF document", action: "generate_pdf" },
  "send_report": { description: "...", action: "..." },
};
```

If `INVOKES` is declared, binding wrappers are also generated:

```typescript
// From: INVOKES { novasyn_chat_save_conversation BINDING save_conversation }
export async function invokeSaveConversation(...args: unknown[]): Promise<unknown> {
  return invoke('macro_novasyn_chat_save_conversation', ...args);
}
```

---

## Wiring macros into lib.rs

The compiler generates the `invoke_handler` list as a comment in `macros.rs`. Copy those entries into your protected `lib.rs`:

```rust
// src-tauri/src/lib.rs  (protected)
mod macros;

tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        macros::macro_export_pdf,
        macros::macro_send_report,
        // ... other commands ...
    ])
```

---

## Implementing a MACRO

The generated stub is a placeholder. After marking `macros.rs` as protected, implement the body:

```rust
// src-tauri/src/macros.rs  // @agicore-protected

#[tauri::command]
pub async fn macro_export_pdf(
    entity_id: String,
    format: String,
    db: tauri::State<'_, DbPool>,
) -> Result<serde_json::Value, String> {
    let conn = db.lock().unwrap();
    // ... real implementation ...
    Ok(serde_json::json!({ "status": "ok", "url": pdf_path }))
}
```

---

## Cross-app macro invocation

For two NovaSyn apps to invoke each other's macros, both must run on the same machine and use Tauri's IPC. The calling app invokes the command by its name — the Tauri event bus routes it to whichever app registered the handler.

**Pattern: NovaSyn MBA invokes NovaSyn Chat's save_conversation macro**

```agi
## In novasyn_mba.agi
MACRO_REGISTRY {
  EXPOSES [analyze_business, export_report]
  INVOKES {
    novasyn_chat_save_conversation  BINDING save_conversation
  }
}
```

```typescript
// In NovaSyn MBA's TypeScript
import { invokeSaveConversation } from '@/lib/macros';

await invokeSaveConversation({ title: 'MBA session', content: transcript });
```

---

## When to use MACRO vs. other cross-app primitives

| Use MACRO when | Use alternatives when |
|---------------|----------------------|
| You need to invoke behavior in another app | Sharing content → use VAULT |
| You want a named, parameterized capability | Passing messages → use CHANNEL |
| You're building a suite of cooperating apps | One-time data export → direct Tauri event |
| The operation has a clear input/output contract | The operation is fire-and-forget with no params |

---

## Relationship to ACTION

A MACRO is *not* an ACTION. An ACTION is internal — it runs inside one app's Rust backend. A MACRO is *external* — it's an advertised interface other apps (or the macro registry) can call. Typically a MACRO delegates to an ACTION via the `ACTION` field:

```agi
MACRO analyze_business {
  DESCRIPTION "Run the MBA advisor on a business"
  PARAMS { business_id INTEGER REQUIRED }
  ACTION run_advisor_workflow    // ← delegates internally to this ACTION
}
```

The `ACTION` field is a documentation link; the actual delegation is wired in your protected `macros.rs` implementation.
