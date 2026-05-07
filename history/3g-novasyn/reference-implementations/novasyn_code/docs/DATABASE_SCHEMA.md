# NovaSyn Code Database Schema

NovaSyn Code uses two SQLite databases:
- **code.db** -- Local application database for projects, sessions, messages, and settings
- **vault.db** -- Shared NS Vault database (see Cross-App Integration in ARCHITECTURE.md)

This document covers the **code.db** schema.

---

## Table: projects

Represents a working project directory.

| Column       | Type    | Constraints                  | Description                              |
|--------------|---------|------------------------------|------------------------------------------|
| id           | TEXT    | PRIMARY KEY                  | UUID v4                                  |
| name         | TEXT    | NOT NULL                     | Display name for the project             |
| path         | TEXT    | NOT NULL UNIQUE              | Absolute path to the project directory   |
| created_at   | TEXT    | NOT NULL DEFAULT CURRENT_TIMESTAMP | ISO 8601 creation timestamp       |
| updated_at   | TEXT    | NOT NULL DEFAULT CURRENT_TIMESTAMP | ISO 8601 last-updated timestamp   |
| is_active    | INTEGER | NOT NULL DEFAULT 0           | 1 if this is the currently active project|
| metadata     | TEXT    | DEFAULT '{}'                 | JSON blob for extensible project config  |

```sql
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 0,
    metadata TEXT DEFAULT '{}'
);
```

---

## Table: sessions

Represents a chat session within a project.

| Column       | Type    | Constraints                  | Description                              |
|--------------|---------|------------------------------|------------------------------------------|
| id           | TEXT    | PRIMARY KEY                  | UUID v4                                  |
| project_id   | TEXT    | NOT NULL, FK -> projects.id  | Owning project                           |
| title        | TEXT    | NOT NULL DEFAULT 'New Chat'  | Session display title                    |
| created_at   | TEXT    | NOT NULL DEFAULT CURRENT_TIMESTAMP | ISO 8601 creation timestamp       |
| updated_at   | TEXT    | NOT NULL DEFAULT CURRENT_TIMESTAMP | ISO 8601 last-updated timestamp   |
| is_active    | INTEGER | NOT NULL DEFAULT 0           | 1 if this is the currently active session|
| system_prompt| TEXT    | DEFAULT ''                   | Custom system prompt for this session    |
| model        | TEXT    | DEFAULT 'claude-sonnet-4-20250514' | AI model used for this session      |
| metadata     | TEXT    | DEFAULT '{}'                 | JSON blob for extensible session config  |

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Chat',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 0,
    system_prompt TEXT DEFAULT '',
    model TEXT DEFAULT 'claude-sonnet-4-20250514',
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

## Table: chat_messages

Stores individual messages within a session.

| Column       | Type    | Constraints                  | Description                              |
|--------------|---------|------------------------------|------------------------------------------|
| id           | TEXT    | PRIMARY KEY                  | UUID v4                                  |
| session_id   | TEXT    | NOT NULL, FK -> sessions.id  | Owning session                           |
| role         | TEXT    | NOT NULL                     | 'user', 'assistant', or 'system'         |
| content      | TEXT    | NOT NULL                     | Message text (may contain Markdown/code) |
| created_at   | TEXT    | NOT NULL DEFAULT CURRENT_TIMESTAMP | ISO 8601 timestamp                |
| token_count  | INTEGER | DEFAULT 0                    | Estimated token count for this message   |
| model        | TEXT    | DEFAULT NULL                 | Model that generated this response       |
| metadata     | TEXT    | DEFAULT '{}'                 | JSON blob (code blocks, attachments, etc)|

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    token_count INTEGER DEFAULT 0,
    model TEXT DEFAULT NULL,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

---

## Table: settings

Key-value store for application settings.

| Column       | Type    | Constraints                  | Description                              |
|--------------|---------|------------------------------|------------------------------------------|
| key          | TEXT    | PRIMARY KEY                  | Setting key (dot-notation namespace)     |
| value        | TEXT    | NOT NULL                     | Setting value (JSON-encoded)             |
| updated_at   | TEXT    | NOT NULL DEFAULT CURRENT_TIMESTAMP | ISO 8601 last-updated timestamp   |

```sql
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Default Settings Keys

| Key                        | Default Value                  | Description                      |
|----------------------------|--------------------------------|----------------------------------|
| `ai.provider`              | `"anthropic"`                  | Active AI provider               |
| `ai.model`                 | `"claude-sonnet-4-20250514"`        | Default model                    |
| `ai.apiKey`                | `""`                           | Anthropic API key (encrypted)    |
| `ai.maxTokens`             | `4096`                         | Max response tokens              |
| `ai.temperature`           | `0.7`                          | Response temperature             |
| `editor.fontSize`          | `14`                           | Monaco editor font size          |
| `editor.tabSize`           | `2`                            | Tab width in editor              |
| `editor.wordWrap`          | `"on"`                         | Word wrap setting                |
| `editor.minimap`           | `true`                         | Show minimap in editor           |
| `terminal.shell`           | `"auto"`                       | Preferred shell (auto-detect)    |
| `terminal.fontSize`        | `14`                           | Terminal font size               |
| `appearance.theme`         | `"dark"`                       | App theme                        |
| `appearance.sidebarWidth`  | `260`                          | Sidebar width in pixels          |
| `appearance.terminalHeight` | `300`                         | Terminal panel height in pixels   |

---

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
```

---

## Migration Strategy

Migrations are stored in `src/main/database/migrations/` as numbered SQL files:
- `001_initial_schema.sql` -- Creates all tables and indexes above
- Subsequent migrations follow the `NNN_description.sql` naming convention
- Migrations are applied in order and tracked in a `_migrations` meta-table
