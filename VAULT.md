# Vault — Shared Asset Storage

The Vault is a separate SQLite database shared across NovaSyn applications. It stores content assets (conversations, documents, exchanges, knowledge fragments) that need to be accessible from multiple apps. Each app has its own `app.db` for its entity data — the Vault is where cross-app content lives.

---

## Declaring a Vault

```agi
VAULT {
  PATH        "%APPDATA%/NovaSyn/vault.db"
  ASSET_TYPES [conversation, document, exchange, knowledge, snippet]
  TAGS        true
  PROVENANCE  true
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `PATH` | Yes | Absolute path to the vault SQLite file. `%APPDATA%` is expanded to the platform config directory at runtime. |
| `ASSET_TYPES` | Yes | The valid content types for this vault. Enforced by a CHECK constraint in SQL. |
| `TAGS` | No | If `true`, generates `vault_tags` and `vault_asset_tags` tables + tag commands. |
| `PROVENANCE` | No | If `true`, generates `vault_provenance` table + provenance recording/retrieval commands. |

---

## What gets generated

The compiler writes two files:

### `src-tauri/vault_schema.sql`

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vault_assets (
    id          TEXT PRIMARY KEY,
    asset_type  TEXT NOT NULL CHECK(asset_type IN ('conversation', 'document', 'exchange', 'knowledge', 'snippet')),
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    metadata    TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- If TAGS true:
CREATE TABLE IF NOT EXISTS vault_tags (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS vault_asset_tags (
    asset_id  TEXT NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,
    tag_id    TEXT NOT NULL REFERENCES vault_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (asset_id, tag_id)
);

-- If PROVENANCE true:
CREATE TABLE IF NOT EXISTS vault_provenance (
    id        TEXT PRIMARY KEY,
    asset_id  TEXT NOT NULL REFERENCES vault_assets(id) ON DELETE CASCADE,
    action    TEXT NOT NULL,   -- 'created' | 'edited' | 'sent_to' | 'exported'
    source    TEXT,            -- which app or action generated this event
    actor     TEXT,            -- user or AI identifier
    timestamp TEXT NOT NULL
);
```

### `src-tauri/src/vault.rs`

A complete Rust module with a `VaultPool` (Mutex-wrapped SQLite connection) and the following Tauri commands:

**Core commands (always generated):**

| Command | Description |
|---------|-------------|
| `vault_list_assets` | List all assets, ordered by `updated_at DESC` |
| `vault_get_asset` | Get a single asset by id |
| `vault_save_asset` | Insert a new asset, returns the created row |
| `vault_update_asset` | Update content (and optionally title) of an existing asset |
| `vault_delete_asset` | Delete an asset by id |
| `vault_search_assets` | Full-text search across title + content, optional type filter |

**Tag commands (when `TAGS true`):**

| Command | Description |
|---------|-------------|
| `vault_list_tags` | List all tags, ordered alphabetically |
| `vault_tag_asset` | Add a tag to an asset (creates tag if new, idempotent) |

**Provenance commands (when `PROVENANCE true`):**

| Command | Description |
|---------|-------------|
| `vault_record_provenance` | Record an event (action, source, actor) for an asset |
| `vault_get_provenance` | Get full provenance history for an asset, newest first |

---

## Using the Vault from TypeScript

The compiler adds typed invoke wrappers to `src/lib/invokes.ts`. Usage in components:

```typescript
import { invoke } from '@tauri-apps/api/core';

// Save a conversation to the vault
const asset = await invoke<VaultAsset>('vault_save_asset', {
  input: {
    assetType: 'conversation',
    title: 'Strategy session — 2026-05-18',
    content: JSON.stringify(messages),
    metadata: JSON.stringify({ model: 'claude-sonnet-4-6', tokens: 4200 }),
  }
});

// Search the vault
const results = await invoke<VaultAsset[]>('vault_search_assets', {
  query: 'strategy',
  assetType: 'conversation',  // optional filter
});

// Tag an asset
await invoke('vault_tag_asset', { assetId: asset.id, tagName: 'important' });

// Record provenance
await invoke('vault_record_provenance', {
  assetId: asset.id,
  action: 'sent_to',
  source: 'novasyn_chat',
  actor: 'user',
});
```

### TypeScript types (auto-generated)

```typescript
export interface VaultAsset {
  id: string;
  assetType: string;
  title: string;
  content: string;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VaultTag {
  id: string;
  name: string;
}

export interface ProvenanceRecord {
  id: string;
  assetId: string;
  action: string;
  source: string | null;
  actor: string | null;
  timestamp: string;
}
```

---

## Cross-app sharing

The Vault's power is that any NovaSyn app pointing to the same `PATH` shares the same content store. The path `%APPDATA%/NovaSyn/vault.db` is the NovaSyn standard — all apps in the suite use it by convention.

**Pattern: NovaSyn Chat saves a conversation → NovaSyn MBA reads it**

```
NovaSyn Chat                    NovaSyn MBA
─────────────────               ─────────────────────────
User finishes a                 Opens vault, searches for
strategy session                conversations tagged
                                'strategy'
vault_save_asset(               vault_search_assets(
  type: 'conversation',           query: 'strategy',
  content: ...,                   assetType: 'conversation'
)                               )
vault_tag_asset(
  tagName: 'strategy'
)
```

Both apps must declare the same VAULT block with the same PATH. The schema runs idempotently (`CREATE TABLE IF NOT EXISTS`) so whichever app opens the file first creates the schema; subsequent opens are no-ops.

---

## Vault initialization in `lib.rs`

The compiler wires the Vault into the app startup automatically when a VAULT declaration is present. The generated `lib.rs` includes:

```rust
// Vault initialization (generated)
let vault_path = vault::resolve_vault_path("%APPDATA%/NovaSyn/vault.db");
let vault_pool = vault::init_vault(vault_path);

tauri::Builder::default()
    .manage(vault_pool)
    .invoke_handler(tauri::generate_handler![
        vault::vault_list_assets,
        vault::vault_get_asset,
        vault::vault_save_asset,
        vault::vault_update_asset,
        vault::vault_delete_asset,
        vault::vault_search_assets,
        vault::vault_list_tags,
        vault::vault_tag_asset,
        vault::vault_record_provenance,
        vault::vault_get_provenance,
    ])
```

---

## Provenance pattern

Provenance answers "where did this asset come from and what happened to it?" Record an event every time an asset is created, edited, or shared:

```typescript
// When saving
await invoke('vault_record_provenance', {
  assetId: asset.id,
  action: 'created',
  source: 'novasyn_chat',
  actor: 'user',
});

// When an AI action generates content and saves it
await invoke('vault_record_provenance', {
  assetId: asset.id,
  action: 'ai_generated',
  source: 'finance_advisor',
  actor: 'claude-sonnet-4-6',
});

// When sent to another app or exported
await invoke('vault_record_provenance', {
  assetId: asset.id,
  action: 'exported',
  source: 'novasyn_mba',
  actor: 'user',
});
```

Standard action strings by convention: `created`, `edited`, `ai_generated`, `sent_to`, `exported`, `deleted`.

---

## What the Vault is not

- **Not a replacement for your app's SQLite database.** Entity data (Students, Businesses, Contacts) lives in the app's own `my_app.db`. The Vault is for *content assets* — text, conversations, documents — that have value beyond the app that created them.
- **Not a full-text search engine.** `vault_search_assets` does `LIKE %query%` — it's good enough for most use cases. For large vaults, consider an index or a dedicated FTS5 table in a future DSL extension.
- **Not encrypted.** The vault SQLite file sits in APPDATA. If your content is sensitive, add encryption via SQLCipher (a future DSL extension candidate).
