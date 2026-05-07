# NovaSyn Code Sprint Plan

## Sprint 1 -- Foundation [COMPLETE]

**Goal**: Basic chat works in a scaffolded Electron app with file tree.

### Tasks
- [x] Project scaffold (package.json, tsconfig, vite, tailwind, postcss)
- [x] Architecture and planning docs
- [x] Directory structure (main, renderer, preload, shared)
- [x] Database setup (better-sqlite3, migrations, schema)
- [x] Shared types (messages, sessions, projects, settings)
- [x] Main process: window creation, IPC handlers
- [x] Preload script with contextBridge API
- [x] Chat service: Anthropic API integration, streaming responses
- [x] Settings service: model selection, API keys, preferences
- [x] Renderer: App shell with layout scaffolding
- [x] TitleBar component (frameless window controls)
- [x] Sidebar component (file tree placeholder, project list)
- [x] ChatPanel component (message list, input box, send handler)
- [x] StatusBar component (model, tokens, project path)
- [x] File tree: chokidar watcher on main, tree rendering on renderer
- [x] Basic routing between chat and placeholder editor view

### Deliverable
A working Electron app where the user can select a project folder, see its file tree in the sidebar, chat with Claude, and receive code-block responses.

---

## Sprint 2 -- Terminal Integration [COMPLETE]

**Goal**: Integrated terminal with shell spawning and tab management.

### Tasks
- [x] node-pty service on main process (spawn, write, resize, kill)
- [x] IPC channels for terminal lifecycle (create, input, output, resize, close)
- [x] xterm.js Terminal component in renderer
- [x] FitAddon for dynamic resizing on panel resize
- [x] Terminal tab management (multiple shells)
- [x] Shell selection (WSL bash default, PowerShell, cmd)
- [x] Auto-create first terminal when panel opens
- [ ] WebLinksAddon for clickable URLs in terminal output
- [ ] Terminal panel resize handle (drag to resize chat/terminal split)
- [ ] Keyboard shortcut: Ctrl+` to toggle terminal

### Deliverable
A fully functional integrated terminal panel that can run commands, supports multiple tabs, and resizes cleanly.

---

## Sprint 3 -- Monaco Editor [COMPLETE]

**Goal**: Integrated code editor for viewing and editing files.

### Tasks
- [x] Monaco Editor component wrapper
- [x] File open: click file tree item -> opens in Monaco tab
- [x] File save: Ctrl+S writes back to disk via IPC
- [x] Tab management: multiple open files, close/switch tabs
- [x] Syntax highlighting: auto-detect language from file extension (14 languages)
- [x] Editor/Chat layout: tab switching between chat and editor views
- [x] Dirty file indicator (amber * on tab)
- [ ] File tree integration: highlight currently open file

### Deliverable
Users can open files from the file tree, edit them in Monaco, and save changes. Multiple files can be open as tabs.

---

## Sprint 4 -- Code Actions [COMPLETE]

**Goal**: AI-generated code blocks have actionable buttons.

### Tasks
- [x] MarkdownRenderer: full markdown parsing (headings, bold, italic, lists, code, links)
- [x] Parse code blocks from AI responses (language, content)
- [x] File path detection from comment patterns (// src/..., # ..., -- ..., <!-- ... -->)
- [x] "Copy" button on each code block with confirmation
- [x] "Apply" button: write code to detected file path relative to project root
- [x] "Create" button: navigate to editor view for new files
- [x] Basic syntax highlighting (keywords, strings, comments, numbers)
- [x] Line numbers in code blocks
- [x] ChatMessageItem updated to use MarkdownRenderer for AI responses
- [ ] "Run in Terminal" button: send code block content to active terminal
- [ ] Confirmation dialog before overwriting existing files

### Deliverable
AI responses with code blocks display action buttons. Users can apply code to files, create new files, or run commands directly from the chat.

---

## Sprint 5 -- Context System [COMPLETE]

**Goal**: File-based context system with token tracking.

### Tasks
- [x] Context panel component (collapsible right panel, 280px)
- [x] File attachment: add specific project files as context
- [x] Token budget tracking and visualization (green/yellow/red bar)
- [x] Context injection into AI prompts (files sent with sendChat)
- [x] System prompt textarea in context panel
- [x] Model selector dropdown in context panel
- [x] Context file indicator in MessageInput
- [ ] Tag system (deferred — file-based context sufficient for now)
- [ ] Context persistence per session in database

### Deliverable
Users can attach folders, files, and tags as context. Token usage is tracked and visualized. Context is injected into AI conversations.

---

## Sprint 6 -- Cross-App Integration [COMPLETE]

**Goal**: Connect NovaSyn Code to the suite via NS Vault and macros.

### Tasks
- [x] NS Vault database connection (shared vault.db)
- [x] Macro registry with heartbeat (code.apply_file, code.read_file, code.send_prompt)
- [x] Macro executor wired to real ChatService (code.send_prompt works end-to-end)
- [x] Macro file notifications (renderer notified when cross-app file write occurs)
- [x] Queue watcher polling for incoming requests
- [x] MacroIndicator in StatusBar (green/gray dot, connected app tooltip)
- [x] Pending request count badge
- [ ] Deep link handling (deferred)
- [ ] Read shared prompt templates from vault (deferred)

### Deliverable
NovaSyn Chat can dispatch coding tasks to NovaSyn Code. Shared vault assets are accessible across apps.

---

## Sprint 7 -- Polish and Packaging [COMPLETE]

**Goal**: Production-ready desktop app.

### Tasks
- [x] Keybinding system (Ctrl+Shift+P, Ctrl+`, Ctrl+B, Ctrl+N)
- [x] Welcome/onboarding screen for first launch (API key setup)
- [x] Model selector dropdown (grouped by provider, gray for no-key)
- [x] Settings panel UI (API keys, project management)
- [x] README.md with full documentation
- [x] electron-builder packaging config (Windows portable)
- [ ] Theme support (dark/light — dark-only for now)
- [ ] App icon and branding assets
- [ ] Auto-update integration
- [ ] Smoke testing on Windows 10/11

### Deliverable
A polished, packaged desktop application ready for distribution.
