# NovaSyn Chat: 3G → 4G Port Plan

**Old app (3G):** `novasyn_suite/novasyn_chat_lite/` — Electron + Node.js + SQLite  
**New app (4G):** `agicore/apps/novasyn-chat/` — Tauri 2 + Rust + SQLite  
**Agicore:** Phase 5 complete — 34 declaration types, 1,382 tests passing, all codegen implemented  
**Last updated:** 2026-05-17  

---

## The Two-Layer Rule

Every feature in this port has two layers:

1. **`.agi` source** — declare it in `novasyn_chat.agi` first (ENTITY field, ACTION, VIEW, COMPILER, etc.)
2. **Implementation** — write or regenerate the Rust/TS/SQL that the declaration implies

If a feature exists in the implementation but NOT in the `.agi` file, that's **schema drift** — the `.agi` is no longer the source of truth. Keep them in sync.

---

## Current Schema Drift (Fix First)

These are things that exist in the implementation but are missing from `novasyn_chat.agi`:

| Gap | `.agi` fix needed |
|---|---|
| `Session.system_prompt` (migration 002) | Add `system_prompt: string` to `ENTITY Session` |
| `ChatMessage.is_pruned` field in logic | Already in `.agi` ✅ |
| Council mode (frontend-only) | Wire to the existing `council_chat` ACTION declaration |
| Session filter (frontend-only) | Pure UI — no `.agi` change needed |
| Token bar + auto-prune (frontend-only) | Pure UI — no `.agi` change needed |
| Onboarding screen | Pure UI — no `.agi` change needed |

**Action:** Fix Session drift in `.agi` before starting Sprint 7.

---

## Already Done (Sprints 1–6 + filter)

| Feature | Status | Notes |
|---|---|---|
| Core chat (single model, streaming) | ✅ | `send_chat` ACTION |
| Multi-provider (Anthropic, OpenAI, Google, xAI) | ✅ | AI_SERVICE declaration |
| Council mode (parallel multi-model, tab UI) | ✅ | Frontend-only; `council_chat` ACTION in `.agi` not yet wired |
| System prompt per session | ✅ | Schema drift — fix `.agi` |
| Token counting + auto-prune | ✅ | Frontend-only; `is_pruned` field already in `.agi` |
| First-run onboarding screen | ✅ | Pure UI |
| Session search/filter in sidebar | ✅ | Pure UI |
| Web search (`/search` prefix) | ✅ | `web_search` ACTION in `.agi` ✅ |
| Session rename / delete / export MD | ✅ | `export_session_md` ACTION in `.agi` ✅ |
| Message tagging | ✅ | ChatMessageTag entity in `.agi` ✅ |
| Folder reference system | ✅ | Folder/FolderItem entities in `.agi` ✅ |
| Document editor | ✅ | Document entity + VIEW in `.agi` ✅ |
| Exchange library | ✅ | Exchange entity + VIEW in `.agi` ✅ |

---

## Sprint 7 — Chat UX Parity

### 7.0 — Fix `.agi` Drift
**Before any Sprint 7 feature work:**
- Add `system_prompt: string` to `ENTITY Session` in `novasyn_chat.agi`
- Regenerate `session.rs` from the updated `.agi` (or manually add the field to keep in sync)

### 7.1 — Response Synthesis
Merge council alternatives into one superior response via a configurable model + style.

**`.agi` change:** `council_chat` ACTION already declared with `synthesis_model` input and a synthesis AI prompt. Wire it. The ACTION declaration becomes the Tauri command that takes alternatives JSON + synthesis style → fires AI → returns merged response.

**Implementation:**
- New Rust command `council_chat` (generated from ACTION declaration — currently a stub)
- ChatView: "Synthesize" button in council tab bar → calls `invoke('council_chat', { alternatives, synthesisModel, style })`
- Three synthesis styles: concise / balanced / thorough (passed as part of the AI prompt)
- Result replaces the tab bar with a single synthesized message (alternatives still accessible)

**Agicore note:** The `council_chat` ACTION stub in `actions.rs` needs to be promoted from stub → real implementation. This is a pattern that could inform an `IMPLEMENTATION` keyword in the DSL (see Framework Enhancements).

### 7.2 — Broadcast Mode
Send to exactly one default model per provider simultaneously.

**`.agi` change:** `broadcast_chat` ACTION already declared. Wire it.

**Implementation:**
- `broadcast_chat` Rust command: takes `model_ids: json` → fires parallel `send_chat` for each → returns results array
- ModelPicker: "Broadcast" toggle button (distinct from council checkboxes). Derives `allModels = [defaultPerProvider]` from configured keys.
- Store: Add `broadcastMode: boolean` / `setBroadcastMode` to `appStore.ts`
- UI: Shows `📡 Broadcast (N providers)` badge when active; results display in same council tab UI

### 7.3 — Context Window Viewer
Popup showing exactly what was sent to the AI: system prompt, folder items, history, token budget.

**`.agi` change:** Add `VIEW ContextWindowViewer { LAYOUT custom }` to `novasyn_chat.agi`

**Implementation:**
- New `ContextWindowViewer.tsx` — reconstructs payload client-side from store state
- Opens as a Tauri dialog or `<dialog>` overlay
- Sections: System Prompt / Folder Context / Chat History / Token Budget bar
- No Rust changes — all data is already in frontend store

---

## Sprint 8 — Folder & File Management

### 8.0 — `.agi` Updates for Sprint 8
Add to `novasyn_chat.agi` before implementing:
```
// In ENTITY Session:
selected_folders: json = []

// New ACTIONs:
ACTION upload_file_to_folder {
  INPUT   folder_id: string, file_path: string
  OUTPUT  item: FolderItem
}

ACTION save_chat_to_folder {
  INPUT   session_id: string, folder_id: string
  OUTPUT  item: FolderItem
}

// New VIEW:
VIEW FolderContentModal {
  ENTITY   FolderItem
  LAYOUT   custom
  ACTIONS  create, edit, delete, move
}
```

### 8.1 — File Upload to Folders
Drag-or-click upload of `.txt`, `.md`, `.pdf`, `.epub` files into a folder as FolderItems.

**Implementation:**
- Tauri file dialog (`tauri-plugin-dialog`) → path → `invoke('upload_file_to_folder', { folderId, filePath })`
- Rust: read bytes, detect extension, convert to text, create FolderItem
- PDF: `lopdf` or `pdf-extract` crate
- EPUB: see 8.2

### 8.2 — EPUB Parsing
Convert EPUB files to Markdown text for storage as FolderItems.

**Implementation:**
- Rust: `epub_to_markdown(path: &str) -> Result<String, String>` using `epub = "2"` crate
- Called from `upload_file_to_folder` when extension is `.epub`
- Add `epub` to `Cargo.toml`

**Agicore note:** The `upload_file_to_folder` ACTION stub should detect the file type and branch. This is a case where the ACTION codegen's `FILE_HANDLER` pattern would help (see Framework Enhancements).

### 8.3 — Save Chat to Folder
Export current session's message history as a single Markdown FolderItem.

**Implementation:**
- Client-side: concatenate messages → Markdown string → `invoke('create_folder_item', ...)`
- UI: button in chat footer toolbar, opens folder-picker overlay
- No new Rust commands needed

### 8.4 — FolderContentModal
Full modal for viewing, editing, moving, and deleting individual FolderItems.

**Implementation:**
- New `FolderContentModal.tsx` — triggered by clicking a folder in FolderPanel
- Shows all items with inline edit, token count, move-to-folder, delete
- Reuses existing `update_folder_item`, `delete_folder_item`, `move_folder_item` Rust commands

### 8.5 — Session Folder Persistence
Remember which folders were selected when user returns to a session.

**Implementation:**
- Migration `003_session_folders.sql`: `ALTER TABLE sessions ADD COLUMN selected_folders TEXT`
- Update `session.rs` Rust struct + `update_session` handler
- Update `Session` TypeScript type
- ChatView: on session switch, restore `selectedFolders` from `currentSession.selectedFolders`

---

## Sprint 9 — Settings & Model Management

### 9.0 — `.agi` Updates for Sprint 9
Add to `novasyn_chat.agi`:
```
// Extend AI_SERVICE MODELS block — add CONTEXT metadata:
anthropic  "claude-sonnet-4-20250514"  LABEL "Claude Sonnet 4"  CONTEXT 200000  DEFAULT
// ... (all models get CONTEXT annotation)

// New ACTION:
ACTION discover_models {
  INPUT   provider: string
  OUTPUT  models: json
}

// New PREFERENCE declaration (pending framework support — see below):
PREFERENCE app_settings {
  synthesis_model: string = "claude-sonnet-4-20250514"
  hidden_models: json = []
  context_window_overrides: json = {}
}
```

### 9.1 — Model Discovery
Poll provider APIs to discover available models dynamically.

**Implementation:**
- Rust: promote `discover_models` from stub → real implementation  
  - Anthropic: `GET /v1/models`  
  - OpenAI: `GET /v1/models`  
  - Google: `GET /v1beta/models`  
  - xAI: `GET /v1/models`  
- SettingsView: "Refresh models" button. Results stored in appStore, override hardcoded MODELS for the session.

**Agicore note:** Model context windows are currently hardcoded in hand-written `lib/models.ts`. Once AI_SERVICE MODELS support a `CONTEXT` keyword (Framework Enhancement 1), the compiler will generate these values — eliminating `lib/models.ts` as a hand-maintained file.

### 9.2 — Per-Model Context Window Overrides
Let the user set custom context window sizes.

**Implementation:**
- SettingsView: editable table of models + context window column
- Store: `contextWindowOverrides: Record<string, number>` — persisted via PREFERENCE (see 9.0)
- `modelContextWindow()` in `lib/models.ts` checks overrides first

### 9.3 — Visible Models Filter
Let the user hide models from the picker.

**Implementation:**
- SettingsView: checkbox list of all models
- Store: `hiddenModels: string[]` — persisted via PREFERENCE
- ModelPicker: filter against `hiddenModels`

### 9.4 — Synthesis Model Selection
Choose which model performs synthesis in council mode.

**Implementation:**
- SettingsView: dropdown "Synthesis model"  
- Store: `synthesisModel: string` — persisted via PREFERENCE  
- `council_chat` command uses this model

---

## Sprint 10 — Terminal & Auto-Update

### 10.0 — `.agi` Updates for Sprint 10
The `SESSION terminal` declaration already exists. Add terminal tool annotations:
```
SESSION terminal {
  DESCRIPTION  "Command-line workspace with WSL and PowerShell"
  TOOLS        terminal, file_edit
  TERMINAL     xterm                    // ← new keyword (Framework Enhancement 3)
  PROFILES     wsl, powershell, cmd
  CONTEXT      minimal
  MEMORY       session
  OUTPUT       code
  PERSIST      false
}
```

### 10.1 — Rich Terminal (xterm.js + PTY)
Replace basic shell view with full interactive xterm.js terminal.

**Implementation:**
- Rust: `portable-pty` crate. Commands: `terminal_create(profile)`, `terminal_write(id, data)`, `terminal_resize(id, cols, rows)`, `terminal_kill(id)`. Event: `terminal-data` streaming output.
- Frontend: `xterm` npm package in `TerminalView.tsx`. Resize observer. Profile switcher (WSL / PowerShell / cmd).

**Agicore note:** This is the highest-effort Sprint 10 item. The `SESSION terminal` codegen currently emits a basic shell view. Framework Enhancement 3 (Terminal SESSION → xterm.js codegen) would make Agicore generate the xterm scaffold automatically.

### 10.2 — Auto-Update
Use `tauri-plugin-updater` to check for and install app updates.

**Implementation:**
- Rust: wire `tauri_plugin_updater`. Commands: `check_for_update`, `install_update`.
- Frontend: check on launch. Update banner in TitleBar when available.
- `tauri.conf.json`: `updater` block pointing to GitHub releases.

---

## Framework Enhancements (Agicore Evolution)

These are changes to the **Agicore compiler/DSL** itself — not to the chat app. Each one is motivated by a concrete gap revealed during the port. Build these as the corresponding sprint starts.

### FE-1 — AI_SERVICE MODELS: `CONTEXT` keyword
**Motivation:** Context windows are hardcoded in `lib/models.ts` (a hand-maintained file). They should live in the `.agi` source.

**Change:** Parser: recognize `CONTEXT <number>` in MODELS block. Compiler (`ai-service.ts` generator): emit context window into `lib/models.ts` alongside label and provider. Once done, `lib/models.ts` becomes fully generated — no hand maintenance.

**Needed by:** Sprint 9.1 (model discovery) and the `modelContextWindow()` function.

### FE-2 — `PREFERENCE` Declaration Type
**Motivation:** Sprint 9 introduces user preferences (synthesis model, hidden models, context overrides). VAULT handles provenance-tracked assets. SETTINGS/PREFERENCE is a simpler, lighter concept: key-value pairs persisted to a local JSON file with typed defaults.

**Change:** Parser: new `PREFERENCE <name> { key: type = default, ... }` declaration. Compiler: generate a Rust command pair (`get_preferences`, `set_preferences`) backed by a JSON file in `%APPDATA%`, and TypeScript typed accessors + a Zustand slice that initializes from the Rust command on app load.

**Needed by:** Sprint 9.2, 9.3, 9.4 (all settings persistence).

### FE-3 — Terminal SESSION → xterm.js Codegen
**Motivation:** `SESSION terminal` currently generates a basic shell component. The `TOOLS terminal` annotation should trigger full xterm.js scaffolding.

**Change:** Compiler (`session.ts` generator): when `TOOLS` includes `terminal`, emit xterm.js component scaffold including terminal init, `terminal-data` event listener, resize observer, and profile switcher. Also emit the PTY Rust command stubs in a `commands/terminal.rs` file.

**Needed by:** Sprint 10.1.

### FE-4 — `FILE_HANDLER` Pattern in ACTION Codegen
**Motivation:** `upload_file_to_folder` is an ACTION that takes a file path, reads it, converts it, and creates an entity. The current ACTION codegen emits a stub for this pattern. A `FILE_HANDLER` pattern would generate the Tauri file dialog call, Rust file read, extension detection, and FolderItem creation scaffold.

**Change:** ACTION declaration: new `PATTERN file_handler` keyword. Compiler (`actions.ts` generator): when pattern is `file_handler`, emit Tauri file dialog invocation + Rust file-reading scaffold with extension dispatch.

**Needed by:** Sprint 8.1.

### FE-5 — Regeneration Safety: `@agicore-drift` Annotation
**Motivation:** As we add fields to the `.agi` file (e.g., `Session.system_prompt`), the compiler needs to regenerate `session.rs`, `types.ts`, `001_initial.sql` etc. But we also have hand-written SQL migrations (002, 003...) that add the same columns. We need a way to tell the compiler "this field was added post-initial-generation via migration; don't re-emit it in the initial schema."

**Change:** Parser: allow field-level annotation `// @agicore:since migration_002`. Compiler: when emitting `001_initial.sql`, skip fields annotated with `@agicore:since`. When emitting Rust structs and TypeScript types, include them regardless (since the column exists).

**Needed by:** Any time we add to an ENTITY after initial codegen.

---

## `.agi` Update Checklist (Sprint by Sprint)

```
Before Sprint 7:  Fix Session.system_prompt drift
Sprint 7:         Wire council_chat + broadcast_chat ACTIONs; add ContextWindowViewer VIEW
Sprint 8:         Add selected_folders to Session; add upload/save ACTIONs; add FolderContentModal VIEW
Sprint 9:         Add CONTEXT to AI_SERVICE MODELS; add discover_models ACTION; add PREFERENCE block
Sprint 10:        Add TERMINAL + PROFILES to SESSION terminal
```

---

## Backlog / Nice-to-Have

| Feature | Notes |
|---|---|
| Copy messages to another session | `COPY_MESSAGES_TO_SESSION` from old app |
| Archive session | Soft-delete to archive list |
| Session message count badge | Show `(N)` next to session name |
| BabyAI integration | Cooperative intelligence routing via ROUTER BabyAI |
| Tray icon / minimize to tray | `TRAY` already in APP declaration — just needs wiring |
| Multi-workspace (separate DBs) | Workspace commands exist; need WorkspaceSwitcher UI |
| Token budget alerts | Warn when estimated cost exceeds threshold |

---

## Not Porting

| Feature | Reason |
|---|---|
| Electron auto-update pipeline | Replaced by Tauri updater (Sprint 10.2) |
| electron-store (encrypted key store) | Replaced by Rust `vault.rs` |
| node-pty (Electron terminal) | Replaced by Rust PTY backend (Sprint 10.1) |

---

## Priority Order

```
Drift fix → Sprint 7 → FE-1 → Sprint 8 → FE-2,4 → Sprint 9 → FE-3 → Sprint 10
```

Framework enhancements are built just before the sprint that needs them — not speculatively ahead of time.
