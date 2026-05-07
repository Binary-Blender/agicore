# NovaSyn Code Feature List

## Sprint 1 -- Foundation

- **Project scaffold**: Electron 28 + React 18 + TypeScript + Vite + Tailwind
- **SQLite database**: Local project/session/message storage via better-sqlite3
- **AI chat interface**: Conversational panel with streaming responses from Anthropic Claude
- **File tree**: Live-updating file/folder tree powered by chokidar, displayed in the sidebar
- **Project management**: Open and switch between project directories
- **TitleBar**: Custom frameless window title bar with minimize/maximize/close
- **Sidebar**: Collapsible sidebar with file tree and project list
- **StatusBar**: Model indicator, token count, project path display
- **Settings storage**: Persistent user preferences (API keys, model selection)

## Sprint 2 -- Terminal Integration

- **Integrated terminal**: xterm.js terminal embedded in the app UI
- **Shell spawning**: node-pty backend supporting cmd, PowerShell, and WSL bash
- **Terminal tabs**: Multiple simultaneous terminal sessions
- **Dynamic resizing**: FitAddon for automatic terminal resize on panel changes
- **Clickable links**: WebLinksAddon for clickable URLs in terminal output
- **Keyboard toggle**: Ctrl+` to show/hide terminal panel
- **Resizable split**: Drag handle between chat/editor area and terminal

## Sprint 3 -- Monaco Editor

- **Code editor**: Full Monaco Editor with syntax highlighting
- **File open/save**: Open files from file tree, save with Ctrl+S
- **Editor tabs**: Multiple open files with tab management
- **Language detection**: Auto-detect syntax highlighting from file extension
- **Dirty indicators**: Visual indicator for unsaved changes
- **Split layout**: Chat and editor as switchable or side-by-side views

## Sprint 4 -- Code Actions

- **Code block parsing**: Extract language and content from AI response code blocks
- **Copy button**: One-click copy of code block content to clipboard
- **Apply to file**: Write code block content to a target file on disk
- **Create file**: Create a new file with code block content at a specified path
- **Run in terminal**: Send code block content as a command to the active terminal
- **Confirmation dialogs**: Safety prompts before overwriting existing files
- **Toast notifications**: Success/error feedback for all code actions

## Sprint 5 -- Context System

- **Context panel**: Collapsible right panel for managing conversation context
- **Folder context**: Attach entire directories as context for AI conversations
- **File context**: Attach specific files as context
- **Tag system**: Label and filter context items with tags
- **Token budget**: Visual token bar showing context usage vs. model limit
- **Prompt injection**: Automatic inclusion of context in AI system prompts
- **Project docs**: Convention-based loading from .novasyn/context/ directory

## Sprint 6 -- Cross-App Integration

- **NS Vault**: Shared SQLite database for cross-app asset exchange
- **Shared templates**: Access prompt templates from NovaSyn Chat
- **Shared snippets**: Read/write reusable context snippets across apps
- **Macro registry**: Declare and discover cross-app actions
- **Macro queue**: Receive coding tasks dispatched from NovaSyn Chat
- **Result dispatch**: Send outputs/results back to originating app
- **Deep links**: novasyn-code:// protocol for external app launching
- **Suite status**: StatusBar indicator showing connected NovaSyn apps

## Sprint 7 -- Polish and Packaging

- **Keybindings**: Configurable keyboard shortcuts for all major actions
- **Theming**: Dark/light mode with customizable accent colors
- **Settings UI**: Full settings panel for API keys, models, editor, terminal
- **Welcome screen**: First-launch onboarding with setup wizard
- **Error handling**: Graceful recovery from API failures and file errors
- **Performance**: Virtualized file tree, lazy-loaded Monaco, optimized renders
- **Packaging**: Windows portable and NSIS installer via electron-builder
- **Branding**: App icon, splash screen, about dialog
