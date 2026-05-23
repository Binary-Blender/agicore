# Changelog

All notable changes to Agicore are recorded here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [SemVer](https://semver.org/).

## [1.0.0] — 2026-05-22

First public release. The full pipeline is proven end-to-end: a single `.agi` file compiles to a running Tauri application; the canary (NovaSyn Chat 2.0) ships from generated code.

### Engineering core

- **2,459 tests passing** across parser (843), compiler (1,582), and validator (34); zero failures
- **58 declaration types** across 10 layers — Application, Orchestration, Expert System, Cooperative Intelligence, Semantic Infrastructure, Adaptive Intelligence, Semantic Operating Environment, Ambient + Embedded, Deployment, Primitives
- **Codegen surface:** Rust commands, TypeScript types, Zustand store, React components, SQLite migrations, Tauri config, integration tests
- **Static validator** with 34 semantic checks (cross-entity referential integrity, workflow step references, AI_SERVICE provider consistency, COMPILER FROM/TO cross-checks, etc.)

### Documentation

- [`README.md`](README.md), [`ROADMAP.md`](ROADMAP.md), [`WHITEPAPER.md`](WHITEPAPER.md) reconciled with code reality (test counts, declaration counts, architecture diagram, repository structure)
- [`dsl/grammar.md`](dsl/grammar.md) covers all 58 declarations in formal EBNF
- [`docs/dsl-reference.md`](docs/dsl-reference.md) — practitioner reference with example for every declaration
- [`docs/cookbook.md`](docs/cookbook.md) — 22 self-contained recipes
- [`docs/getting-started.md`](docs/getting-started.md), [`docs/tutorial.md`](docs/tutorial.md) — onboarding paths
- Per-layer guides: [`CHANNEL.md`](CHANNEL.md), [`VAULT.md`](VAULT.md), [`MACROS.md`](MACROS.md), [`EMBEDDED.md`](EMBEDDED.md), [`NULLCLAW.md`](NULLCLAW.md), [`SKILLDOCS.md`](SKILLDOCS.md), [`LOGGING.md`](LOGGING.md), [`TESTING.md`](TESTING.md), [`WEB_TARGET.md`](WEB_TARGET.md)

### Skill docs (teach-an-AI artifacts)

- New [`skills/SKILL_FORMAT.md`](skills/SKILL_FORMAT.md) — packaging convention for "teach an AI to use this domain" Markdown files. v1.1 formalizes two self-check modes: **mechanical** (parser/schema verifies output, used by Agicore authoring docs) and **rubric** (checklist verifies output, used by Accelerando consulting docs). Defines two tiers (Baby Step, Super Skill Doc), required L0–L6 body sections, validation criteria. Reusable beyond Agicore.

**Authoring skill docs (mechanical self-check):**
- New [`skills/agicore.baby.skill.md`](skills/agicore.baby.skill.md) — ~7.5k token Baby Step for small-context models. 5 worked examples, all parse and compile.
- New [`skills/agicore.super.skill.md`](skills/agicore.super.skill.md) — ~18k token Super Skill Doc for frontier models. 14 worked recipes, all parse and compile; 30 anti-patterns with rationale; comprehensive error→fix table; 12 self-check prompts.

**Consulting skill docs (rubric self-check) — ship in the `agicore-examples` repo:**

Skill docs that advise on deploying the Accelerando apps live alongside those apps in the [agicore-examples](https://github.com/Binary-Blender/agicore-examples) repository. This keeps each skill doc adjacent to the artifact it teaches about.

- [`agicore-examples/skills/accelerando.manufacturing.baby.skill.md`](https://github.com/Binary-Blender/agicore-examples/blob/main/skills/accelerando.manufacturing.baby.skill.md) — ~8.3k token Baby Step for advising mid-sized discrete manufacturers (100–300 employees) on Accelerando ERP deployment. Catalog of all 12 Enterprise Core apps in manufacturing context. The "Acme Machining" 18-month deployment walked end-to-end. 10 anti-patterns from real ERP failures (Hershey, FoxMeyer, HP, Lidl). 5 rubric self-checks.
- [`agicore-examples/skills/accelerando.manufacturing.super.skill.md`](https://github.com/Binary-Blender/agicore-examples/blob/main/skills/accelerando.manufacturing.super.skill.md) — ~25k token Super Skill Doc. 5 industry archetypes (greenfield discrete, legacy ERP replacement, multi-plant rollout, M&A integration, customer-pressure rescue). Per-app deployment guidance. KPI framework. Change-management playbook. 20 anti-patterns. 10 rubric self-checks.

### Packaging

- npm packages `@agicore/parser@1.0.0` and `@agicore/compiler@1.0.0` with proper `files`, `exports`, `keywords`, `repository`, `engines` fields
- Root `package.json` declares npm workspaces — `npm install` from the root wires everything up
- CLI: `agicore generate` and `agicore parse`; accepts `--help`/`-h`/`help`
- `.github/workflows/ci.yml` runs the test matrix (Node 18/20/22 × Ubuntu/macOS/Windows) plus a canary-compile smoke test on every push and PR
- Issue + PR templates land in `.github/`

### Pre-release fixes (folded in for 1.0.0)

- **Codegen — `tokio::spawn` → `tauri::async_runtime::spawn`** in `reasoner.rs`, `trigger.rs`, `router.rs`. The previous emitter generated startup-hook spawns that panicked because tokio runtime isn't current at app-startup time.
- **Codegen — inline `validation_errors` column** in `channels.sql` instead of `ALTER TABLE` from `packets.sql`. The ALTER pattern ran on every app start (write-amplification) and broke clean replay of the initial migration.
- **CLI — accept `--help` flag** instead of printing "Unknown command: --help" before the usage banner.
- Six new regression tests cover all three fixes.

---

## [0.x] — Pre-release evolution (2026-05 and earlier)

The pre-1.0 history is the evolutionary record of the framework. See `git log` for the full sprint-by-sprint sequence:

- **Sprints X.1 – X.8** (May 2026) — Showcase sweep hardening: universal `VERSION`/`DESCRIPTION`/`PROMPT` fields, soft keywords for state names, lexer expressions (`+5`, `-5`, `+=`), block-shape flexibility, `TRIGGER EVENT`, `SEED` bracket form, `ASSERT` dot-access. Brought the showcase corpus from 16/42 → 39/42 clean compiles.
- **Phase 9** — Cognitive Tier Hierarchy: `COGNITION_ROLE TIER` + `SPC_FLOOR`, `cheapestViableRole`, SQL metrics.
- **Phase 8.1 – 8.3** — Distributed orchestration: `MESH`, `NODE` network fields, `CHANNEL OVERFLOW_TO`, `EVENT SUBSCRIBERS`, `AUTHORITY GOVERNS`, `NODE CONTRIBUTES`, `MESH ACCOUNTING`.
- **Phase 7.1 – 7.3** — Adaptive Intelligence: `EVENT`, `NBVE`, `CONTRACT`, `REPUTATION`, `SUBSCRIPTION`, `DISPUTE` declarations + full codegen.
- **Phase 5** — Ecosystem completeness: `REASONER`, `TRIGGER`, `CHANNEL`, `PACKET`, `IDENTITY`, `FEED`, `SESSION`, `MODULE`, `AUTHORITY`, `SEMANTIC MEMORY`.
- **Phase 4** — Hardening: `ACTION` emitter, validator expansion (cross-entity / workflow / TRIGGER / COMPILER checks).
- **Phase 3** — Reference build: NovaSyn Chat 2.0 generated from `novasyn_chat.agi`.
- **Phase 2** — Tauri codegen: full Rust + TS + SQL + Zustand + React emitters.
- **Phase 1** — DSL foundation: 34 declarations, formal grammar specification.
