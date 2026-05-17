# NovaSyn Chat: 3G → 4G Port Plan

**Old app (3G):** `novasyn_suite/novasyn_chat_lite/` — Electron + Node.js + SQLite  
**New app (4G):** `agicore/apps/novasyn-chat/` — Tauri 2 + Rust + SQLite  
**Last updated:** 2026-05-17  

---

## Already Done (Sprints 1–6 + filter)

| Feature | Status | Commit |
|---|---|---|
| Core chat (single model, streaming) | ✅ | — |
| Multi-provider (Anthropic, OpenAI, Google, xAI) | ✅ | — |
| Council mode (parallel multi-model, tab UI) | ✅ | e34be88 |
| System prompt per session | ✅ | 1e1b236 |
| Token counting + auto-prune | ✅ | aeff3c1 |
| First-run onboarding screen | ✅ | dc94619 |
| Session search/filter in sidebar | ✅ | 8629cb6 |
| Web search (`/search` prefix, Rust `web_search` command) | ✅ | — |
| Session rename / delete / export MD | ✅ | — |
| Message tagging | ✅ | — |
| Folder reference system | ✅ | — |
| Document editor | ✅ | — |
| Exchange library | ✅ | — |
| Tag manager | ✅ | — |

---

## Sprint 7 — Chat UX Parity  
*Core power features that made 3G distinctive*

### 7.1 — Response Synthesis
When council mode returns multiple alternatives, a **Synthesize** button merges them into one superior response using a configurable synthesis model and style (concise / balanced / thorough).

- **Where:** `ChatView.tsx` → new `synthesizeAlternatives()` function  
- **How:** POST to the primary model with a synthesis prompt containing all alternatives as labeled blocks. Save synthesized result as a new `aiMessage` on the record (or replace the primary alternative).  
- **UI:** Button appears in the council tab bar when `alternatives.length > 1`. Synthesis style selector (3 options) shown inline.  
- **Rust:** No new commands needed — reuses `send_chat`.

### 7.2 — Broadcast Mode
Send to exactly one model per provider simultaneously. Results display as council alternatives with provider-colored tabs.

- **Where:** `ModelPicker.tsx` — new "Broadcast" toggle button (distinct from council checkboxes)  
- **How:** When broadcast active, derive `allModels = [defaultPerProvider]` where default = first model of each provider that has a key. Fire parallel `send_chat` calls, same path as council.  
- **Store:** Add `broadcastMode: boolean` / `setBroadcastMode` to `appStore.ts`.  
- **UI:** Broadcast button in ModelPicker shows `📡 Broadcast (N)` badge when active.

### 7.3 — Context Window Viewer
An HTML popup showing exactly what was sent to the AI: system prompt, folder items, pruned/excluded summary, and each message in the history payload.

- **Where:** New `ContextWindowViewer.tsx` component  
- **How:** Button in chat footer reconstructs the payload client-side from `chatMessages`, `selectedFolderItems`, and `currentSession.systemPrompt`. Renders into a `<dialog>` or Tauri webview popup.  
- **No Rust changes needed** — all data is already in the frontend store.

---

## Sprint 8 — Folder & File Management Parity

### 8.1 — File Upload to Folders
Drag-or-click upload of `.txt`, `.md`, `.pdf`, `.epub` files directly into a folder as FolderItems.

- **Rust:** New command `upload_file_to_folder(folder_id, file_path) -> FolderItem`. Reads file bytes, converts to text (PDF via `pdf-extract` crate or `lopdf`, EPUB below), stores as `FolderItem`.  
- **UI:** Upload button in `FolderPanel.tsx` opens a Tauri file dialog (`tauri-plugin-dialog`).

### 8.2 — EPUB Parsing
Convert EPUB files to Markdown text for storage as FolderItems.

- **Rust:** New `epub_to_markdown(path: &str) -> String` using the `epub` crate. Called from `upload_file_to_folder` when extension is `.epub`.  
- **Dependency:** Add `epub = "2"` to `Cargo.toml`.

### 8.3 — Save Chat to Folder
Export the current session's message history as a single Markdown FolderItem.

- **Where:** Chat footer toolbar  
- **How:** Client-side — concatenate messages into a Markdown string, call `create_folder_item`. Show a folder-picker modal (reuse `FolderPanel` logic).  
- **No Rust changes needed.**

### 8.4 — Advanced Folder Browser (FolderContentModal)
Full modal for viewing, editing, moving, and deleting individual FolderItems. Currently `FolderPanel` shows folders but item-level management is limited.

- **Where:** New `FolderContentModal.tsx`  
- **UI:** Click a folder → modal opens showing all items with edit/delete/move actions. Item content editable inline. Token count shown per item.

### 8.5 — Session Folder Persistence
Remember which folders were selected when the user returns to a session.

- **Rust:** Add `selected_folders TEXT` column to `sessions` table (migration 003). Store JSON array of folder IDs.  
- **TS:** Update `Session` type, wire into `ChatView` folder selection state.

---

## Sprint 9 — Settings & Model Management

### 9.1 — Model Discovery
Poll provider APIs to discover available models dynamically, rather than using a hardcoded list.

- **Rust:** New command `discover_models(provider: &str) -> Vec<ModelInfo>`. Calls each provider's model-list endpoint.  
  - Anthropic: `GET /v1/models`  
  - OpenAI: `GET /v1/models`  
  - Google: `GET /v1beta/models`  
  - xAI: `GET /v1/models`  
- **UI:** "Refresh models" button in `SettingsView.tsx`. Results stored in local state and override `MODELS` in `lib/models.ts` for the session.

### 9.2 — Per-Model Context Window Overrides
Let the user set a custom context window size for any model (useful when providers update limits).

- **Where:** `SettingsView.tsx` — table of models with editable context window column.  
- **Store:** `contextWindowOverrides: Record<string, number>` in `appStore.ts` (persisted to a simple JSON file via Tauri's `store` plugin or a Rust command).  
- **ChatView:** `modelContextWindow()` checks overrides first.

### 9.3 — Visible Models Filter
Let the user hide models from the picker (e.g. hide GPT-4o-mini if they never use it).

- **Where:** `SettingsView.tsx` — checkbox list of all models.  
- **Store:** `hiddenModels: string[]` in `appStore.ts` (persisted same as above).  
- **ModelPicker:** Filter `MODELS` against `hiddenModels`.

### 9.4 — Synthesis Model Selection
Let the user choose which model performs synthesis in council mode (can be different from the chat model).

- **Where:** `SettingsView.tsx` — dropdown "Synthesis model".  
- **Store:** `synthesisModel: string` in `appStore.ts`.  
- **ChatView:** `synthesizeAlternatives()` uses this model.

---

## Sprint 10 — Terminal & Auto-Update

### 10.1 — Rich Terminal (xterm.js + PTY)
Replace the current basic shell view with a full interactive terminal using xterm.js rendered in the Tauri webview and a Rust PTY backend.

- **Rust:** Use `tauri-plugin-shell` (already a dependency?) or add `portable-pty` crate. New commands: `terminal_create(profile)`, `terminal_write(id, data)`, `terminal_resize(id, cols, rows)`, `terminal_kill(id)`. Events: `terminal-data` streaming back output.  
- **Frontend:** Integrate `xterm` npm package into `TerminalView.tsx`. Wire resize observer.  
- **Profiles:** WSL (bash), PowerShell, cmd.  
- **Note:** This is the highest-effort item. Depends on PTY support being buildable in the Windows/Tauri toolchain.

### 10.2 — Auto-Update
Use `tauri-plugin-updater` to check for and install updates.

- **Rust:** Wire `tauri_plugin_updater`. Add `check_for_update` and `install_update` Tauri commands.  
- **Frontend:** Check on launch (or on Settings open). Show update banner in TitleBar when available.  
- **Config:** `tauri.conf.json` `updater` block pointing to a GitHub releases endpoint.

---

## Backlog / Nice-to-Have

| Feature | Notes |
|---|---|
| Copy messages to another session | `COPY_MESSAGES_TO_SESSION` IPC from old app |
| Archive session | Soft-delete to an archive list |
| Session message count badge | Show `(N)` next to session name |
| BabyAI integration | Specialized fine-tuned model provider |
| Tray icon / minimize to tray | Tauri system tray plugin |
| Token budget alerts | Warn when estimated cost exceeds threshold |
| Multi-workspace (separate DBs) | Switch entire database context — Rust workspace commands exist, just need UI |

---

## Not Porting

| Feature | Reason |
|---|---|
| Electron auto-update pipeline | Replaced by Tauri updater (Sprint 10.2) |
| electron-store (encrypted key store) | Replaced by Rust `vault.rs` |
| node-pty (Electron terminal) | Replaced by Rust PTY backend (Sprint 10.1) |
| Database registry (3G multi-DB) | Workspace system in 4G is architecturally cleaner |

---

## Priority Order

```
Sprint 7  →  Sprint 8  →  Sprint 9  →  Sprint 10
 (Chat UX)   (Folders)    (Settings)   (Terminal)
```

Within each sprint, tackle items top-to-bottom. Sprint 7.1 (synthesis) has the highest UX value and is pure frontend work — good starting point.
