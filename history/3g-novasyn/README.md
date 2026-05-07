# NovaSyn Electron Dev Stack

**The authoritative specification for building NovaSyn desktop applications.**

## What Is This?

This is everything an AI coding agent needs to build a new NovaSyn Electron desktop app from scratch. It documents the exact stack, patterns, conventions, and boilerplate shared across all NovaSyn apps (AI, Studio, Writer, Council, Academy, Orchestrator).

Every NovaSyn app shares >95% of its boilerplate. This documentation captures that shared foundation so new apps can be scaffolded correctly on the first attempt.

## Documentation Index

### Core Philosophy
- **[00_PHILOSOPHY.md](00_PHILOSOPHY.md)** - Core principles for AI-to-AI development

### Stack & Standards
- **[01_TECH_STACK.md](01_TECH_STACK.md)** - Exact dependency versions, tools, and rationale
- **[02_CODING_STANDARDS.md](02_CODING_STANDARDS.md)** - TypeScript standards, naming, IPC contracts, row mappers
- **[03_ARCHITECTURE_PATTERNS.md](03_ARCHITECTURE_PATTERNS.md)** - IPC bridge, main/renderer split, Zustand store, migrations

### Error Handling & Testing
- **[04_ERROR_HANDLING.md](04_ERROR_HANDLING.md)** - Electron-specific error handling patterns
- **[05_TESTING_STRATEGY.md](05_TESTING_STRATEGY.md)** - Testing approach for Electron apps

### Code Generation & Infrastructure
- **[06_SCHEMA_FIRST.md](06_SCHEMA_FIRST.md)** - Schema-first development: migration -> types -> preload -> handlers -> store -> components
- **[07_SHARED_INFRASTRUCTURE.md](07_SHARED_INFRASTRUCTURE.md)** - API keys, themes, cross-app integration, Send-To protocol
- **[08_AI_SERVICE_PATTERNS.md](08_AI_SERVICE_PATTERNS.md)** - Multi-provider AI, streaming, cost tracking

### Collaboration & Setup
- **[09_AI_COLLABORATION.md](09_AI_COLLABORATION.md)** - AI-to-AI handoff and collaboration protocols
- **[10_QUICK_START.md](10_QUICK_START.md)** - Step-by-step guide to scaffold a new NovaSyn app
- **[11_PROJECT_TEMPLATE.md](11_PROJECT_TEMPLATE.md)** - Complete boilerplate files with exact contents
- **[12_APP_REGISTRY.md](12_APP_REGISTRY.md)** - All existing apps: ports, DB names, features, status

## For AI Developers

If you are an AI building a NovaSyn app:
1. Start with **[00_PHILOSOPHY.md](00_PHILOSOPHY.md)** to understand the principles
2. Read **[10_QUICK_START.md](10_QUICK_START.md)** for the step-by-step scaffold process
3. Use **[11_PROJECT_TEMPLATE.md](11_PROJECT_TEMPLATE.md)** for exact boilerplate code
4. Reference **[03_ARCHITECTURE_PATTERNS.md](03_ARCHITECTURE_PATTERNS.md)** when adding features
5. Follow **[06_SCHEMA_FIRST.md](06_SCHEMA_FIRST.md)** for the feature development flow

## Version

**Version**: 1.0.0
**Last Updated**: 2026-03-03
**Stack**: Electron 28 / React 18 / TypeScript 5.3 / Vite 5 / SQLite / Tailwind 3 / Zustand 4
