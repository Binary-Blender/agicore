# Agicore Tech Stack

All versions are pinned. No `^` or `~` ranges. A fresh install on any machine produces an identical dependency tree.

---

## Framework Core

| Package | Version | Purpose |
|---------|---------|---------|
| TypeScript | 5.9.3 | Type safety across parser, compiler, and generated apps |
| tsx | 4.21.0 | TypeScript test runner (no compile step for tests) |

---

## Parser (`core/parser`)

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | 5.9.3 | Compiler for parser source |
| tsx | 4.21.0 | Test runner (`node --import tsx test/parser.test.ts`) |

No runtime dependencies. The parser is pure TypeScript with no external imports.

---

## Compiler (`core/compiler`)

| Package | Version | Purpose |
|---------|---------|---------|
| @agicore/parser | file:../parser | DSL parser (local path dep) |
| typescript | 5.9.3 | Compiler for compiler source |
| tsx | 4.21.0 | Test runner |
| @types/node | 25.6.0 | Node.js type definitions |

No runtime dependencies beyond the parser. The compiler generates code but does not depend on the frameworks it generates.

---

## Generated Apps — TypeScript / Frontend

These are the pinned versions used in all Agicore-generated Tauri applications. The NovaSyn Chat reference app (`apps/novasyn-chat`) is the canonical source.

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI framework |
| react-dom | 18.3.1 | React DOM renderer |
| zustand | 4.5.7 | State management (one store per app) |
| lucide-react | 0.400.0 | Icon library |
| typescript | 5.9.3 | Type safety |
| vite | 5.4.21 | Bundler + dev server |
| tailwindcss | 3.4.19 | Utility-first CSS |
| autoprefixer | 10.5.0 | PostCSS autoprefixer |
| postcss | 8.5.14 | CSS processing |
| @tauri-apps/api | 2.11.0 | Tauri JavaScript API |
| @tauri-apps/cli | 2.11.1 | Tauri CLI (dev dependency) |
| @tauri-apps/plugin-dialog | 2.7.1 | File picker dialogs |
| @tauri-apps/plugin-updater | 2.10.1 | Auto-updater |
| @vitejs/plugin-react | 4.7.0 | Vite React plugin |
| @types/react | 18.3.28 | React type definitions |
| @types/react-dom | 18.3.7 | React DOM type definitions |

---

## Generated Apps — Rust / Backend

These are the pinned versions used in the Tauri backend of all Agicore-generated applications.

| Crate | Version | Purpose |
|-------|---------|---------|
| tauri | 2.11.1 | Desktop runtime (replaces Electron — 5MB vs 200MB) |
| tauri-build | 2.6.1 | Build script helper |
| tauri-plugin-global-shortcut | 2.3.1 | Global hotkey registration |
| tauri-plugin-dialog | 2.7.1 | Native file dialogs |
| tauri-plugin-updater | 2.10.1 | Auto-update support |
| serde | 1.0.228 | Serialization framework |
| serde_json | 1.0.149 | JSON serialization |
| rusqlite | 0.31.0 | SQLite (bundled — no system dep) |
| tokio | 1.52.3 | Async runtime |
| reqwest | 0.12.28 | HTTP client (AI provider streaming) |
| futures-util | 0.3.32 | Async stream utilities |
| uuid | 1.23.1 | UUID v4/v5 generation |
| chrono | 0.4.44 | Date/time with serde support |
| dirs | 5.0.1 | Platform config/data directories |
| epub | 2.1.5 | EPUB generation |

---

## Architecture Choices

### Tauri (not Electron)
- 5MB app bundles vs 200MB for Electron
- Rust backend vs Node.js — memory-safe, no GC pauses
- WebView uses system renderer (no bundled Chromium)
- Same React/TypeScript/Vite frontend as Electron would use
- `tauri-plugin-global-shortcut` + `tray-icon` feature replaces Electron's equivalents

### React 18 (not Next.js, not Svelte)
- Tauri renderer is a local SPA — no SSR, no routing needed
- Zustand controls the current view instead of a router
- `createRoot` direct rendering

### Zustand (not Redux, not Jotai)
- One store per app with all state and actions
- No providers, no reducers, no action types
- Direct store access from any component
- Zustand 4.x `create` API — same pattern from 3G NovaSyn

### rusqlite (not Prisma, not sqlx)
- Synchronous API matches Tauri's command model
- Bundled feature = no system SQLite dep, identical behavior everywhere
- WAL mode for concurrent reads
- Auto-migrations from generated `.sql` files on startup
- No ORM — direct SQL from generated Rust commands

### Vite (not webpack, not Parcel)
- Fast HMR in dev mode
- Minimal config for Tauri SPA use case
- `base: './'` not needed for Tauri (uses `tauri://localhost`)

### TypeScript 5.9.3 (all layers)
- Same version across parser, compiler, and generated app
- `tsc --noEmit` is the correctness gate — if it passes, it works

---

## AI Provider Strategy

Agicore generates a multi-provider AI service from the `AI_SERVICE` declaration. The provider integration strategy is inherited from the 3G NovaSyn stack:

| Provider | Integration | Reason |
|----------|-------------|--------|
| Anthropic (Claude) | `@anthropic-ai/sdk` | Best native streaming support |
| OpenAI / xAI | Raw `fetch()` + SSE parsing | No SDK dep; API is stable and well-documented |
| Google Gemini | Raw `fetch()` | No SDK dep; consistent with OpenAI approach |

The generated Rust backend proxies all AI calls. The TypeScript frontend receives streaming chunks via Tauri events (`listen()` from `@tauri-apps/api/event`). API keys are stored encrypted in `%APPDATA%\NovaSyn\api-keys.json` — shared across all NovaSyn apps.

---

## 3G NovaSyn → 4G Agicore: What Changed and Why

For anyone familiar with the 3G NovaSyn stack, this table shows every significant architectural change:

| Concern | 3G (NovaSyn / Electron) | 4G (Agicore / Tauri) | Why changed |
|---------|------------------------|---------------------|-------------|
| Desktop runtime | Electron 28 (200MB) | Tauri 2 (5MB) | Bundled Chromium is wasteful; system WebView + Rust is leaner |
| App wiring | Manual: IPC channels → preload → main → store | Generated from DSL | Eliminates entire class of wiring bugs; zero drift between layers |
| Database access | `better-sqlite3` (Node, synchronous) | `rusqlite` (Rust, bundled) | Same synchronous philosophy; Rust provides memory safety |
| Migrations | Manual `.sql` files run by `db.ts` | Generated `001_initial.sql` | Compiler owns the schema; no hand-written migration needed |
| Row mappers | Hand-written (snake_case → camelCase) | Auto via `serde` | Serde rename attributes handle conversion; no mapper drift |
| IPC wiring | `IPC_CHANNELS` → preload → main process | Tauri commands + typed invoke wrappers | Compiler generates both ends; impossible to forget a channel |
| Type safety gate | `tsc --noEmit` (renderer + main) | `cargo build` + `tsc --noEmit` | Two compilers verify correctness: Rust + TypeScript |
| Client settings | localStorage or settings table in DB | `PREFERENCE` declaration (localStorage) | DSL-declared, typed get/set/hook generated automatically |
| Shared API keys | `%APPDATA%\NovaSyn\api-keys.json` | Same | Preserved exactly — all NovaSyn apps share one key store |
| Dev workflow | Two terminals (renderer + main) | Single `tauri dev` | Tauri CLI orchestrates both; simpler DX |
| App bundle size | ~200MB (Electron + Chromium) | ~5MB (Tauri + system WebView) | Order-of-magnitude improvement |
| Primary key type | UUID v4 (`TEXT PRIMARY KEY`) | Integer auto-increment | Integer FKs are simpler for CRUD; UUIDs available via `uuid` crate in IMPL stubs |
| Cross-app comms | File-based queue + Vault SQLite | CHANNEL / EVENT / VAULT (DSL layer) | Same concept, now first-class DSL primitives |

### What stayed the same

- React 18 (SPA, no Next.js, no router)
- Zustand (one store per app)
- Tailwind CSS (utility-first, CSS custom properties for theming)
- Vite (bundler, HMR)
- TypeScript strict mode
- Schema-first development philosophy
- Frameless window with custom TitleBar
- Multi-provider AI with Anthropic SDK + raw fetch for others
- `%APPDATA%\NovaSyn\api-keys.json` for shared keys
- No ORM — direct SQL from generated commands

---

## Runtime Environment

- **Platform**: Windows (primary), macOS/Linux (compatible)
- **Rust**: 1.85+ (stable)
- **Node.js**: 20+ (LTS)
- **Dev workflow**: `tauri dev` starts both Vite and the Rust backend
- **Database location**: `%APPDATA%\NovaSyn\<app-name>.db` (Windows) / `~/.local/share/` (Linux)
- **API keys**: `%APPDATA%\NovaSyn\api-keys.json` (shared across NovaSyn apps)

---

## Upgrading a Dependency

When a dependency needs upgrading:

1. Run `npm install <package>@<exact-version>` — this updates both `package.json` and `package-lock.json`
2. Remove the `^` npm adds automatically — edit `package.json` to use the bare version string
3. Update `TECH_STACK.md` with the new version
4. Run `npm test` in `core/parser` and `core/compiler` to verify nothing broke
5. For Rust deps: update `Cargo.toml` to the exact version, run `cargo build`, update `TECH_STACK.md`

Do not upgrade dependencies speculatively. Upgrade when a specific fix or feature is needed.
