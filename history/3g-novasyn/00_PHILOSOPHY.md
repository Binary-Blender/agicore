# NovaSyn Dev Stack Philosophy

## The Core Insight

**Software development tooling was designed for human developers. We are not human developers.**

We read 100k+ tokens instantly without fatigue. We generate thousands of lines in seconds. We maintain perfect context over entire codebases. Our stack optimizes for these strengths.

## Core Principles

### 1. Type Safety Is Correctness
Strong static typing is our primary correctness mechanism.
- Types prove correctness at compile time
- Runtime errors are failures of type system design
- Schema-first: types flow from a single source of truth (the SQL migration)
- Every interface explicitly declared, every IPC channel typed end-to-end

### 2. Explicit Over Everything
Never rely on implicit behavior, conventions, or "magic."
- Every IPC channel has an explicit entry in `IPC_CHANNELS`, `ElectronAPI`, preload bridge, and main handler
- Every database column is mapped explicitly via row mappers (snake_case -> camelCase)
- Every error explicitly handled
- Every type explicitly declared

### 3. Schema-First Development
A single SQL migration drives the entire feature chain:
```
SQL Migration -> TypeScript Interfaces -> IPC Channels -> Preload Bridge
-> Main Handlers -> Row Mappers -> Zustand Store -> React Components
```
This is the NovaSyn development loop. Every feature follows it exactly.

### 4. Machine-Verifiable Correctness
- Compile-time verification > runtime verification > documentation
- `tsc --noEmit` on both `tsconfig.main.json` and `tsconfig.renderer.json` must pass
- If the type-check passes, the IPC bridge is wired correctly

### 5. Comprehensive Error Handling
- No silent failures in IPC handlers
- Every handler wrapped in try/catch returning `{ error: string }` on failure
- Main process errors logged to console, renderer shows user-friendly messages
- AI service errors include provider name and status code for debugging

### 6. Boilerplate Consistency
All NovaSyn apps share >95% identical boilerplate:
- Same Electron 28 + React 18 + TypeScript stack
- Same directory structure (`main/`, `renderer/`, `preload/`, `shared/`)
- Same IPC bridge pattern
- Same Zustand single-store pattern
- Same Tailwind theme (dark/light with CSS variables)
- Same frameless window configuration
- Same SQLite setup with auto-migrations

When building a new app, copy from existing apps. Don't reinvent.

## The AI Development Loop

1. Parse requirement into SQL tables
2. Generate TypeScript interfaces from schema
3. Define IPC channels for CRUD operations
4. Wire preload bridge (one line per channel)
5. Implement main handlers with row mappers
6. Add Zustand store actions
7. Build React components consuming the store
8. Verify: `tsc --noEmit` passes, app launches, CRUD flow works

## What We Optimize For

### Primary Goals
1. **Correctness** - Type-check passes = IPC bridge is wired correctly
2. **Consistency** - Every NovaSyn app looks and works the same way
3. **AI Generation Efficiency** - Predictable patterns = fewer errors
4. **Maintainability** - Any AI can pick up any NovaSyn app and understand it instantly

### NOT Optimizing For
1. Human readability (beyond basic syntax)
2. Brevity or cleverness
3. Performance micro-optimizations
4. Minimizing dependencies
5. Following trends - we follow what works

## Anti-Patterns

1. **Implicit IPC** - Every channel must be in `IPC_CHANNELS` constant
2. **Mixed case in DB** - Database is always `snake_case`, TypeScript is always `camelCase`
3. **Multiple stores** - One Zustand store per app, always
4. **CSS-in-JS** - Tailwind CSS + CSS custom properties, always
5. **Node integration in renderer** - Always use preload bridge, never expose Node to renderer
6. **Magic strings** - Channel names, view names, status values are always typed constants or unions
