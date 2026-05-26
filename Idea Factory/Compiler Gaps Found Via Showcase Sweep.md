# Compiler Gaps Found Via Showcase Sweep

**Date:** First sweep against the agicore-examples + apps corpus, 42 `.agi` files total.

## Results at a glance

| Bucket | Count | Files |
|--------|------:|-------|
| Parse ✓ + Generate ✓ | 16 | All 12 `reference/*`, accelerando `erp/es/oie`, `patterns/01`, `showcase/novasyn-mba` |
| Parse ✓ + Generate ✗ | 1 | `reference/invoice-approval` |
| Parse ✗ | 25 | 15 Accelerando, 9 patterns, **the canary `novasyn-chat`** |

About 40% of the corpus compiles cleanly end-to-end. The other 60% surfaces real, fixable issues in the parser/lexer.

## What's broken, grouped by likely fix

### 1. `VERSION` field on `APP` is rejected (6 Accelerando files)

```agi
APP accelerando_clinical {
  VERSION "1.0.0"   // ← ParseError: Unexpected field in APP: VERSION
  PORT 3009
  ...
}
```

Affected: `clinical`, `lms`, `patient-portal`, `pharmacy`, `population-health`, `qms`, `radiology`, `scheduling`. (Several others probably want it too.)

**Read:** Every shipped framework has app-version metadata. The fact that 6+ examples independently reach for it tells us the AI considers it idiomatic. The parser should accept it.

**Fix:** Add `VERSION` to the APP block schema in `core/parser/src/types.ts` as an optional `string` field. Codegen target: write it into `tauri.conf.json` / `Cargo.toml`.

### 2. `DESCRIPTION` field on non-entity declarations is rejected (3 patterns + likely many)

```agi
QC content_quality_gate {
  DESCRIPTION "Statistical process control gate for AI-generated content quality"
  METRICS { ... }
}
```

Affected: QC, SCORE, REASONER all reject `DESCRIPTION`. Specifically:
- `patterns/07-monitoring-loop` (REASONER)
- `patterns/08-content-pipeline` (QC)
- `patterns/09-competitive-intel` (SCORE)
- `patterns/10-moderation-loop` (SCORE)

**Read:** `DESCRIPTION` should be a universal optional field on every top-level declaration — it's the inline-docs slot. ENTITY accepts it; the others should too.

**Fix:** Generalize `DESCRIPTION` parsing into a shared optional-field helper that runs on every declaration's block. Codegen target: include in `// ` doc comments above generated code; expose in generated TypeScript types as `__description?`.

### 3. STAGES state names collide with reserved keywords (3 Accelerando files)

```agi
STAGES NonConformance.status {
  open -> assigned -> root_cause -> ...   // ← Unexpected token in STAGES: open
}
```

Affected states: `open` (qms), `pending` (lms), `define` (pi-coe).

**Read:** State names inside `STAGES` are domain identifiers — they should accept any identifier, even ones the lexer treats as keywords elsewhere. Today the parser's STAGES rule uses the same identifier-or-keyword logic as the rest of the grammar, which means innocuous state names like `open`/`pending`/`define` blow up.

**Fix:** In the STAGES parser, accept any token that *could be* an identifier (including soft keywords). Or — cheaper — make `open`/`pending`/`define`/etc. soft keywords that demote to identifiers when not in their keyword position. The Rust language did this with `dyn`, `async`, etc.

### 4. The `CONTEXT` keyword collides with model config (NOVASYN-CHAT — THE CANARY)

```agi
huggingface "Qwen/Qwen3-72B" LABEL "Qwen 3 72B" CONTEXT 32768
                                                ^^^^^^^^^^^^^
                                                ParseError: Expected identifier, got: CONTEXT
```

**This is the most concerning failure** — the canonical reference app, the one that's supposed to be the "broken-when-platform-is-broken canary," doesn't parse against its own platform. Either:

- novasyn-chat added a `CONTEXT 32768` field for HuggingFace model context-window declaration, and the parser hasn't caught up (regression in the canary's lockstep with platform).
- The parser reserved `CONTEXT` as a keyword for some other use without updating model-line parsing.

Either way, the canary contract — "this file breaks when the framework breaks" — silently failed. The framework broke a while back, and nobody noticed because nobody was running this sweep.

**Fix:** Either treat `CONTEXT` as a valid field on the model-line subgrammar in AI_SERVICE/MODELS blocks, or rename the field in novasyn-chat to something the parser accepts (e.g. `CONTEXT_WINDOW`).

**Also:** This is the strongest argument for the migration tool proposal in `Agicore Migration Tool.md`. A `CONTEXT` → `CONTEXT_WINDOW` rename would be a one-line codemod that auto-updated every app that used it.

### 5. Lexer doesn't accept `+` or `-` in expressions (6 files)

```agi
SCORE eliza_confidence +5            // signed int literal (+5)
SCORE legal_risk_score -= 20         // compound assignment
```

Affected: `accelerando/billing`, `chatbot`, `config`, `eliza`, `interchange`, `legal`. The lexer rejects:
- `+N` signed-positive integer literals (in SCORE assignments)
- `-=` compound assignment (in `SCORE x -= N`)
- Likely also `+`, `-`, `*`, `/` arithmetic and `+` string concatenation in other contexts

**Read:** This is a meatier design question than the others. The DSL philosophy is "no runtime computation," but the examples here are *expressing* a constant adjustment to a score — `+5` means "this rule adds 5 to the score." That's not runtime math; that's a constant operand on a structured `ADJUST` operation. The lexer/parser needs to recognize the syntax even though it's not arbitrary arithmetic.

**Possible fixes** (need product input):

- **Option A:** Treat `SCORE x +N` / `SCORE x -N` as a specific SCORE-adjustment syntax. Lexer admits `+` and `-` as token prefixes only inside SCORE assignments. Other contexts still reject. Tight, scoped, doesn't open up arbitrary expressions.

- **Option B:** Generalize signed numeric literals at the lexer level — `+5`, `-20`, `+0.5` are all valid number tokens. Solves SCORE and other places that want signed defaults (e.g. `priority: int DEFAULT -1`).

- **Option C:** Just admit operator tokens (`+`, `-`, `*`, `/`, `+=`, `-=`) at the lexer level; whether they're valid depends on the parser. More flexible, more rope.

My recommendation: **Option B for now** (signed literals everywhere) **plus a specific `+=`/`-=` token for SCORE assignments**. Keeps the "no runtime math" principle while accommodating the patterns examples actually use.

### 6. Other one-off parse errors (5 files)

These need individual investigation; they look like they might each be different bugs:

- `patterns/02-support-router` line 217:13: `Expected identifier, got: LBRACKET ('[')`. Probably an array-literal context where the parser expects a name.
- `patterns/03-multi-model-council` line 51:14: `Expected LBRACKET, got: IDENTIFIER ('quality_score')`. Probably an array vs. identifier ambiguity.
- `patterns/04-automated-qa` line 242:7 and `patterns/05-data-extraction` line 170:7: both `Expected literal value, got: :`. Looks like a syntactic context where the parser expects a value but encountered an object-literal opening.
- `patterns/06-document-rag` line 66:10: `Expected identifier, got: LBRACE ('{')`. Anonymous block?

**Fix:** Open each one, look at the surrounding lines, decide if the syntax is intended-but-unsupported (gap) or example-is-wrong (fix the example).

### 7. Codegen bug: action validator doesn't resolve forward references (1 file)

`reference/invoice-approval` parses fine but codegen fails:

```
error: Workflow 'InvoiceReview': step 'validate_invoice' references
  undeclared action 'validate_invoice_data' (79:3)
... (4 more similar errors)
```

The actions exist later in the file, but the workflow declares first. The codegen validator runs in single-pass and complains before the actions are seen.

**Fix:** The validator should build the symbol table fully before doing cross-reference checks. Two-pass: collect all declarations, then validate references. Standard pattern for any compiler that doesn't require forward declarations.

## Sprint scope sketches

If you wanted to slice these into sprints, three natural groupings:

**Sprint X.1 — Universal field accommodations** (small, ~1-2 days)
- Add `VERSION` to APP
- Generalize `DESCRIPTION` to all top-level declarations
- Both are pure parser additions, no semantic changes

**Sprint X.2 — Reserved word relief** (small-medium, ~2-3 days)
- Soft-keyword treatment for STAGES state names
- Fix `CONTEXT` regression in novasyn-chat (the canary)
- Investigate the one-off parser errors in 5 pattern files

**Sprint X.3 — Lexer expressions for SCORE** (medium, ~3-5 days, needs design discussion)
- Decide between Options A/B/C for signed literals and compound assignment
- Update lexer + parser + tests
- This is the biggest one because it's not just mechanical — it touches DSL philosophy

**Sprint X.4 — Two-pass codegen validation** (small, ~1-2 days)
- Build symbol table fully before cross-reference checks
- Fix invoice-approval and any other forward-reference cases that surface

After these four sprints, the corpus should go from 16/42 clean to something close to 38/42 — and the canary works again.

## What this sweep buys us

- **A reproducible CI signal.** Save the sweep script. Run it on every Agicore release. The number "X of 42 files compile" becomes a regression test for the framework itself.
- **A real argument for the migration tool.** The `CONTEXT` regression in novasyn-chat is exactly the kind of break a migration would prevent.
- **A coverage map.** Every parser gap in the corpus is a known unknown now. We can prioritize fixing them based on how many files each fix unblocks.
