# Agicore Feature Request — BKA Sprint 8 (AI Authoring)

**Source app:** Bender's Killer App  
**Sprint:** 8 — AI draft generation, SEO meta, social variants  
**Filed:** 2026-05-20

One gap. Everything else in Sprint 8 (multi-provider streaming, ACTION AI prompt templates, model discovery) already exists and is ready to use.

---

## Gap 1 — `AI_SERVICE KEYS_ENTITY`

**What's missing:** The AI_SERVICE declaration currently takes a `KEYS_FILE` path pointing to a JSON file on disk where API keys are persisted. BKA (and any app that follows Agicore's ENTITY/SINGLETON pattern for config) stores all user configuration in SQLite. Using a separate JSON file for AI keys is inconsistent with the rest of the app's data model and creates a second config storage mechanism the user can't manage through the app UI.

The fix is a new `KEYS_ENTITY` field on `AI_SERVICE` that names a SINGLETON ENTITY to use as the key source instead of a flat file.

**Desired syntax:**

```agi
AI_SERVICE {
  PROVIDERS  anthropic, openai, google, xai
  KEYS_ENTITY AIConfig          // name of a SINGLETON ENTITY in this file
  DEFAULT    anthropic
  STREAMING  true
  MODELS {
    anthropic  "claude-sonnet-4-20250514"  DEFAULT
    openai     "gpt-4o"                    DEFAULT
    google     "gemini-2.5-pro"            DEFAULT
    xai        "grok-3"                    DEFAULT
  }
}

ENTITY AIConfig SINGLETON {
  anthropic_api_key: string SENSITIVE
  openai_api_key:    string SENSITIVE
  google_api_key:    string SENSITIVE
  xai_api_key:       string SENSITIVE
  default_provider:  string = "anthropic"
  TIMESTAMPS
}
```

**Naming convention:** The generator looks up API keys by matching provider name to ENTITY field name: `{provider}_api_key`. So `anthropic` → `anthropic_api_key`, `openai` → `openai_api_key`, etc. This is deterministic and requires no additional configuration.

**What it should change in the generator (`ai-service.ts`):**

*Current — KEYS_FILE path:*
```rust
fn api_keys_path() -> PathBuf { /* resolves %APPDATA%/... */ }

pub fn load_api_keys() -> HashMap<String, String> {
    let path = api_keys_path();
    // reads JSON file from disk
}

pub fn save_api_keys(keys: &HashMap<String, String>) -> Result<(), String> {
    // writes JSON file to disk
}

#[tauri::command]
pub fn get_api_keys(store: tauri::State<'_, ApiKeyStore>) -> ...

#[tauri::command]
pub fn set_api_key(provider: String, key: String, store: tauri::State<'_, ApiKeyStore>) -> ...
```

*New — KEYS_ENTITY mode:*
```rust
// No api_keys_path() or file I/O helpers needed.

pub fn load_api_keys(db: &rusqlite::Connection) -> HashMap<String, String> {
    let mut keys = HashMap::new();
    // SELECT anthropic_api_key, openai_api_key, google_api_key, xai_api_key
    // FROM ai_configs WHERE id = 'singleton'
    // Insert non-empty values into keys map under provider name
    keys
}

// get_api_keys and set_api_key Tauri commands are NOT generated.
// Key management is handled by the normal ENTITY CRUD for AIConfig SINGLETON
// (update_ai_config already exists as a generated command — no duplication).
```

The `send_chat` command and streaming commands still accept a `db: tauri::State<'_, DbPool>` parameter (which they already have in most apps) and call `load_api_keys(&conn)` to get the key for the selected provider.

**Impact on `ApiKeyStore` Mutex:**  
In KEYS_ENTITY mode, `ApiKeyStore` (the in-memory key cache) is not needed. Keys are read from DB on each request. This is acceptable — AI requests are infrequent and the DB lookup is negligible overhead compared to the API call. If caching is desired later, that's a separate concern.

**Impact on main.rs registration:**  
In KEYS_ENTITY mode, `get_api_keys` and `set_api_key` are not generated and therefore not registered. The `app.manage(ApiKeyStore::new(...))` call in setup is also skipped. The `discover_models` command still works (it reads from DB instead of the store).

**Why it matters:**

1. **Consistency** — BKA already stores Cloudflare tokens, Resend keys, and now Mastodon/Bluesky tokens in SQLite. AI API keys should follow the same pattern.

2. **UI coherence** — With KEYS_ENTITY, the AI settings UI is just a standard form updating `AIConfig` via `update_ai_config`. The user sees one Settings view with all their credentials. With KEYS_FILE, there's a second mechanism the app can't fully control.

3. **SENSITIVE annotation** — Fields declared `SENSITIVE` on the ENTITY get `#[serde(skip_serializing)]` on the Rust struct, so keys never reach the frontend even if the struct is serialized. This is the right security posture for credentials. KEYS_FILE has no equivalent protection.

4. **Zero new concepts** — KEYS_ENTITY combines two things that already exist: AI_SERVICE and ENTITY SINGLETON. The generator change is localized to `ai-service.ts` — replace file I/O helpers with a DB query, suppress `get_api_keys`/`set_api_key` command generation.

5. **General applicability** — Any Agicore app that uses AI_SERVICE wants to manage API keys through the app's normal config UI, not a separate JSON file. NovaSyn Chat, NovaSyn MBA, and BKA all have this same need. This is a framework-level fix, not a BKA-specific workaround.

---

## What is NOT a gap

- `ACTION ... AI "prompt" STREAM true` — works perfectly for draft generation, SEO meta, social variants. Template variables like `{{title}}` and `{{tags}}` map directly to INPUT fields. No changes needed.
- Multi-provider streaming (Anthropic, OpenAI, Google, xAI) — fully implemented in the generator.
- `discover_models` command — already generates model discovery per provider.
- AI cost tracking — not needed as a framework primitive. Can be implemented as an `ENTITY AIUsageRecord` with `input_tokens`, `output_tokens`, `provider`, `action` fields written from IMPL stubs or from the `send_chat` response metadata.
- Multimodal (alt text generation) — will be an `ACTION IMPL` stub that calls the Anthropic vision API directly. Not a framework gap.
