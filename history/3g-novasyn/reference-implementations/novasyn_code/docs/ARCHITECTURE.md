# NovaSyn Code Architecture

## Overview

NovaSyn Code is an AI-native code editor that combines a chat-based AI interface with an integrated terminal (xterm.js + node-pty), file tree (chokidar), and code editor (Monaco). It is part of the NovaSyn suite alongside NovaSyn Chat and NovaSyn Forge, sharing the NS Vault and macro queue system for cross-app orchestration.

The app enables developers to converse with AI models, receive code suggestions, apply them directly to files, and execute commands -- all within a single unified desktop environment.

## Architecture Diagram

```
+---------------------------------------------------------------------+
|                        NovaSyn Code (Electron 28)                   |
|                                                                     |
|  +-----------------------------+  IPC Bridge  +------------------+  |
|  |    Main Process (Node.js)   | <----------> | Renderer (React) |  |
|  |                             |              |                  |  |
|  |  - Window management        |              |  - TitleBar      |  |
|  |  - node-pty (terminal)      |              |  - Sidebar       |  |
|  |  - chokidar (file watcher)  |              |    - File Tree   |  |
|  |  - File system I/O          |              |    - Project List |  |
|  |  - SQLite (better-sqlite3)  |              |  - Main Area     |  |
|  |  - AI provider API calls    |              |    - Chat Panel  |  |
|  |  - Macro queue handler      |              |    - Terminal    |  |
|  |                             |              |  - Context Panel |  |
|  +-----------------------------+              |    - Folders     |  |
|         |            |                        |    - Tags        |  |
|         v            v                        |    - Token Bar   |  |
|  +------------+ +------------+                |  - Monaco Editor |  |
|  | code.db    | | vault.db   |                |  - StatusBar     |  |
|  | (local)    | | (shared)   |                +------------------+  |
|  +------------+ +------------+                        |             |
|                                                       v             |
|                                              +------------------+   |
|                                              | Vite Dev Server  |   |
|                                              | (port 5175)      |   |
|                                              +------------------+   |
+---------------------------------------------------------------------+
         |
         v
+------------------+
| AI Provider APIs |
| - Anthropic      |
| - OpenAI         |
| - Local/Ollama   |
+------------------+
```

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Runtime     | Electron 28                         |
| Frontend    | React 18 + TypeScript               |
| Bundler     | Vite 5                              |
| Styling     | Tailwind CSS 3                      |
| State       | Zustand                             |
| Database    | SQLite via better-sqlite3           |
| Terminal    | xterm.js 5 + node-pty               |
| Editor      | Monaco Editor 0.45                  |
| File Watch  | chokidar 3                          |
| AI SDK      | @anthropic-ai/sdk                   |
| IDs         | uuid v9                             |
| Builder     | electron-builder                    |

## Layout Structure

```
+---------------------------------------------------------------+
|  TitleBar (drag region, window controls, app title)           |
+----------+----------------------------------------------------+
|          |  Tab Bar (chat sessions / editor tabs)              |
| Sidebar  +----------------------------------------------------+
|          |                                                    |
| - File   |  Main Area                                         |
|   Tree   |  +----------------------------------------------+  |
|          |  | Chat Panel (messages, input, code blocks)     |  |
| - Project|  | OR                                            |  |
|   List   |  | Monaco Editor (file editing)                  |  |
|          |  +----------------------------------------------+  |
|          |  +----------------------------------------------+  |
|          |  | Terminal Panel (xterm.js, resizable, tabs)    |  |
|          |  +----------------------------------------------+  |
+----------+----------------------------------------------------+
|  StatusBar (model, tokens, project path, connection status)   |
+---------------------------------------------------------------+
```

### Component Responsibilities

- **TitleBar**: Custom frameless title bar with drag region, minimize/maximize/close buttons, and app branding.
- **Sidebar**: Collapsible panel containing the file tree (powered by chokidar for live updates) and a project selector for switching between working directories.
- **Chat Panel**: Conversational AI interface with Markdown rendering, syntax-highlighted code blocks, and action buttons ("Apply to File", "Create File", "Copy") on each code block.
- **Terminal Panel**: Integrated terminal using xterm.js on the frontend and node-pty on the backend. Supports multiple tabs, shell selection (cmd, PowerShell, WSL bash), and dynamic resizing.
- **Monaco Editor**: Full-featured code editor for viewing and editing files opened from the file tree or created via AI suggestions.
- **Context Panel**: Collapsible right panel for managing context -- attached folders, tags, token budget visualization. Mirrors the context system from NovaSyn Chat.
- **StatusBar**: Displays the active AI model, token usage, current project path, and connection status.

## Cross-App Integration

NovaSyn Code integrates with the broader NovaSyn suite through two mechanisms:

### NS Vault (vault.db)
A shared SQLite database located in the user's app data directory. All NovaSyn apps read from and write to the vault for:
- Shared prompt templates
- Reusable context snippets
- Cross-app asset references (files, outputs, generated artifacts)

### Macro Queue
A message-passing system where NovaSyn Chat can dispatch tasks to NovaSyn Code:
- "Write a function that..." -> opens in Code with the prompt pre-loaded
- "Run this command..." -> executes in Code's terminal
- Code results can be sent back to Chat's conversation

The macro registry allows each app to declare what actions it can receive, enabling a composable workflow across the suite.
