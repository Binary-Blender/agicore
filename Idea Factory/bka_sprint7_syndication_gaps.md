# Agicore Feature Requests — BKA Sprint 7 (Social Syndication)

**Source app:** Bender's Killer App  
**Sprint:** 7 — Bluesky + Mastodon syndication  
**Filed:** 2026-05-19

These two gaps surfaced while designing the social syndication layer. Everything else in Sprint 7 (ENTITY, TYPE, ACTION IMPL, ACTION EMIT, VIEW LAYOUT custom) is already expressible in the DSL cleanly. These are the two places where the framework runs out.

---

## Gap 1 — `PATTERN oauth_callback`

**What's missing:** A PATTERN value that scaffolds the OAuth 2.0 PKCE flow for desktop apps — open the OS browser to the auth URL, spin up a temporary localhost HTTP server, catch the callback with the authorization code, exchange the code for an access token. The existing `PATTERN shell_open` only scaffolds the browser-open half and has no callback server stub.

**Desired syntax:**

```agi
ACTION connect_mastodon {
  INPUT   instance_url: string, client_id: string, client_secret: string
  OUTPUT  ok: bool, access_token: string | null, error: string | null
  IMPL    "connect_mastodon"
  PATTERN oauth_callback
}
```

**What it should generate (the protected stub scaffolding):**

```rust
// @agicore-protected — fill in your Rust logic; this file won't be overwritten
use tauri_plugin_shell::ShellExt;
use std::net::TcpListener;
use std::io::{BufRead, BufReader, Write};

#[tauri::command]
pub async fn connect_mastodon(
    app: tauri::AppHandle,
    instance_url: String,
    client_id: String,
    client_secret: String,
) -> Result<ConnectMastodonOutput, String> {
    // PATTERN oauth_callback scaffold:
    // 1. Build auth URL with PKCE code_challenge
    // 2. Open OS browser: app.shell().open(&auth_url, None)
    // 3. Spin up TcpListener on 127.0.0.1:PORT
    // 4. Accept one connection, parse GET /?code=XXX from request line
    // 5. Exchange code for access token via POST to instance /oauth/token
    // 6. Return token

    todo!("implement oauth_callback flow")
}
```

Compare to current PATTERN outputs:
- `PATTERN file_handler` → imports `tauri_plugin_dialog`, stubs `app.dialog().file().pick_file()`
- `PATTERN shell_open` → imports `tauri_plugin_shell`, stubs `app.shell().open(&url, None)`
- `PATTERN oauth_callback` → imports both `tauri_plugin_shell` AND sets up `TcpListener` scaffold with the 5-step comment outline above

**Why it matters:**  
This pattern recurs in any app that integrates with an OAuth 2.0 provider: Mastodon (Sprint 7), GitHub (Sprint 8 AI key management), Google (potential future integration). Every desktop OAuth integration needs the same browser-open + localhost-catch structure. Without this PATTERN, each app hand-rolls the same ~40 lines of boilerplate with no DSL-level signal that "this action does OAuth." The PATTERN also signals to future readers what kind of action this is — which matters for security review.

**Suggested port:** The localhost callback server should use a configurable port, defaulting to a constant the developer can override in the stub. Port `21337` is a good default (unlikely to conflict). The scaffold comment should note this.

---

## Gap 2 — `SENSITIVE` field annotation on ENTITY

**What's missing:** A way to declare in the DSL that an ENTITY field contains a secret credential. Currently `api_token: string` and `access_token: string` are stored as plain text in SQLite — the same column type as `display_name`. There is no DSL signal that these fields require extra protection. VAULT is listed as partially implemented in the framework; this request defines the concrete interface that would complete it.

**Desired syntax:**

```agi
ENTITY SocialAccount {
  platform:     string REQUIRED
  handle:       string REQUIRED
  instance_url: string
  access_token: string SENSITIVE
  TIMESTAMPS
}
```

```agi
ENTITY CloudflareConfig SINGLETON {
  account_id:   string
  api_token:    string SENSITIVE
  // ... other fields
}
```

**What it should generate:**

Option A — OS keychain via system APIs (strongest):
- Rust: store field using `keyring` crate (`Entry::new(app_id, field_key).set_password(value)`)
- Rust: retrieve via `Entry::new(app_id, field_key).get_password()`
- The ENTITY's SQL column for this field becomes NULL (the value lives in keychain, not SQLite)
- Generated CRUD reads keychain on get, writes keychain on update, deletes on row delete

Option B — Encrypted SQLite column (pragmatic, no new Cargo dep):
- Store the field value AES-encrypted in SQLite using a key derived from the app's machine-specific ID
- Same SQL column, but read/write path goes through an encrypt/decrypt helper
- VAULT declaration generates the key derivation + cipher helpers in `src-tauri/src/vault.rs`

Option C — Minimum viable (flag only, no encryption):
- SENSITIVE annotation causes the field to be redacted from log output and TypeScript serialization
- No encryption, but `#[serde(skip_serializing)]` on the Rust field, so the value never appears in frontend state
- SQL column remains plaintext — this is what we have today, but at least the DSL expresses the intent

**Recommended path:** Option C first (low cost, immediate value, unblocks Sprint 7), then Option A in a later framework session. This matches the VAULT roadmap item already in Phase 7.3.

**Why it matters:**  
BKA currently stores the Cloudflare API token, Resend API key, and is about to store Mastodon/Bluesky access tokens — all in plain SQLite. The framework has no way to express "this field is a secret." This affects every app in the Agicore ecosystem that handles credentials. Without a DSL primitive, the security posture is invisible and inconsistent across apps. Even Option C (serde skip) is a meaningful improvement: it prevents tokens from leaking into frontend state, IPC serialization, or log output.

**Existing framework context:**  
`VAULT` is listed in `NEXT_CAPABILITIES.md` Phase 7.3 codegen table as "Partial → Encrypted key rotation + audit log Rust implementation." This request narrows the target: SENSITIVE annotation is the per-field interface that VAULT backs. The VAULT declaration itself can remain the "configure the vault" mechanism; SENSITIVE is how you mark individual fields as vault-backed.

---

## What is NOT a gap

For completeness: the following Sprint 7 constructs work fine with existing Agicore primitives:

- `TYPE Platform = "bluesky" | "mastodon"` — TYPE works
- `ENTITY SocialAccount` (multi-row, connect/disconnect) — standard ENTITY CRUD
- `ENTITY SyndicationRecord` — standard ENTITY, store post_id + platform + url + timestamp
- `ACTION connect_bluesky` with IMPL (Bluesky uses app passwords, no OAuth) — ACTION IMPL stub works
- `ACTION syndicate_post` with EMIT — EMIT already works for progress events
- `VIEW SyndicationView` with LAYOUT custom — custom views already work
- Multi-platform dispatch inside the IMPL stub — app-specific logic, belongs in protected Rust, not DSL
