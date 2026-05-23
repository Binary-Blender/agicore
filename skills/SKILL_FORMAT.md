# Skill Doc Format — Specification v1.1

A packaging convention for **teaching AI models how to do a specific thing well**.

This is not a runtime. It's a Markdown file with a small frontmatter contract. Drop it in front of a model and the model gains a constrained authoring environment for the skill's domain — the AI equivalent of those wheeled rings babies learn to walk in.

---

## The walker-ring principle

> Constrain and free at the same time.

A skill doc tells a model what *not* to try as forcefully as what *to* try. **Anti-patterns are load-bearing.** A skill doc that only shows correct patterns assumes the model will discover the wrong ones quickly enough to recover. With small models, that assumption fails — they explore wrong directions confidently and don't notice until production breaks.

Every section of a skill doc earns its tokens by either (a) narrowing the search space or (b) accelerating a correct first attempt. Sections that do neither must be cut.

---

## Two tiers

| Tier | Filename suffix | Context budget | Use case |
|---|---|---|---|
| **Baby Step** | `*.baby.skill.md` | ≤16k tokens | Small open-source models, tight context windows, fast iteration loops, mobile / edge inference |
| **Super Skill Doc** | `*.super.skill.md` | ≤100k tokens | Frontier models with long context (Claude Code, Cursor, etc.), authoring sessions, deep design work |

Both tiers are valid skill docs. They are not the same artifact at different sizes — they are different artifacts serving different model classes. A great Baby Step is a discipline-forcing distillation; a great Super Skill Doc is comprehensive enough that the model never has to leave it to answer a question in the domain.

**Rule:** Write the Baby Step first. If you can't fit the skill in 16k tokens, you don't understand it well enough to teach a larger model either.

---

## Required structure

### 1. Frontmatter

YAML, between `---` fences, at the top of the file:

```yaml
---
name:           short-slug
version:        1.0.0
tier:           baby                       # or "super"
context_budget: 16000                       # token budget the author targeted
domain:         agicore-dsl-authoring       # short human-readable domain tag
self_check:     mechanical                  # or "rubric" (v1.1)
target_models:                              # non-binding hints
  - claude-haiku-4-5
  - llama-3.1-8b-instruct
license:        MIT                         # how this doc may be reused
checksum:       sha256:abc123…              # optional; for integrity verification
---
```

**Required fields:** `name`, `version`, `tier`, `context_budget`, `domain`, `self_check`, `license`.

**Optional fields:** `target_models`, `checksum`, `depends_on` (a list of other skill docs this one assumes), `extends` (a Baby Step that this Super extends), `target_audience` (more specific than `domain`), `homepage`, `repository`.

### 2. Body sections

The body is Markdown with six required (or near-required) section levels. **Order matters** — a model that reads top-down should land on the most useful content first.

#### `## L0 — When to use me`
At most five sentences. Answers: which task triggers this skill? Which tasks does NOT trigger this skill? What's the success criterion?

A model reading L0 should be able to decide in ~50 tokens whether to continue.

#### `## L1 — Mental model`
The smallest possible representation of how the domain works. One diagram (ASCII), three rules, no prose padding.

After L1, the model should have a frame to hang the rest of the doc on.

#### `## L2 — Compressed reference`
The densest section. Tables over prose. Every entry should be the shortest correct statement of a fact. This is where a complete coverage of the surface area lives — every keyword, every option, every type.

For domains with a formal grammar, this section is the grammar in compressed form. For domains without one, it's the API/option matrix.

#### `## L3 — Anti-patterns & error → fix`
The walker ring itself. Two subsections:

- **Anti-patterns** — wrong approaches with the reason they're wrong and the correct alternative
- **Error → fix table** — common error messages mapped to their cause + repair

This section earns the highest token-per-utility ratio in the doc. Cut from L4 before cutting from here.

#### `## L4 — Worked examples`
Self-contained, *valid*, copy-pasteable examples. For domains with a compiler/parser, every example must compile. **A skill doc that ships uncompilable examples is broken.**

Baby Step: 3-6 canonical patterns covering the high-frequency cases.
Super Skill Doc: 15-30 examples spanning the full surface.

#### `## L5 — Edge cases, known limits, gotchas`
**Super Skill Doc only.** Baby Step omits this — small models will misapply edge-case knowledge.

What doesn't work yet. What works but counterintuitively. What looks like a bug but isn't. Incidents from the field with the fix.

#### `## L6 — Self-check prompts`
3-5 (Baby) or 5-15 (Super) prompts the author of this doc believes a model who has read it should be able to satisfy. Each prompt is followed by an "expected shape" — the structural features the output must have.

The self-check section is what turns a doc into a teaching artifact. A skill doc without it has no way to know if it landed.

##### Two self-check modes (v1.1)

The format supports two distinct ways to verify a self-check output:

**Mechanical self-check.** The output is a constrained artifact (source file, JSON document, SQL schema, etc.) and a verifier (parser, validator, schema checker) can mechanically accept or reject it. Used when the domain is *authoring* — the AI produces a single artifact constrained by a grammar.

Declare with `self_check: mechanical` in frontmatter. Example: Agicore. Every L4 example must compile with the domain's compiler; every L6 self-check expects a verifiable artifact.

**Rubric self-check.** The output is a strategic plan, deployment sequence, recommendation, or other open-ended artifact that cannot be mechanically verified. A checklist verifies substantive completeness — "does the plan cover X, Y, Z?" — but a human or second model judges quality. Used when the domain is *composition / consulting* — the AI produces guidance, not an artifact.

Declare with `self_check: rubric` in frontmatter. Example: Accelerando (manufacturing ERP deployment consulting). Every L6 self-check ships with a numbered expected-shape rubric: each item is either present (pass) or absent (fail).

A great rubric tests three dimensions at once:

1. **Domain knowledge** — does the output use correct domain vocabulary, regulatory acronyms, industry standards? (e.g., "Identifies IATF 16949 (not AS9100) as the automotive-tier-2 compliance target.")
2. **Structural completeness** — does the output address every dimension a competent practitioner would cover? (e.g., "Names master data setup, executive sponsor, phased go-live, training plan, KPIs, risks.")
3. **Pragmatic sequencing** — does the output order things in a sequence that won't fail? (e.g., "Training rollout via LMS BEFORE ERP go-live, not after.")

If you can't write a good rubric for your L6 prompts, your skill doc isn't ready. The rubric forces the author to make tacit knowledge explicit.

---

## Authoring discipline

### Token-density rules

These apply to **every** sentence:

1. **Tables > prose** for any list of facts longer than 3 entries.
2. **Symbols > words** for repeated structural marks (`:=` for definition, `→` for transformation, `↔` for equivalence — but never decorative emoji).
3. **No narrative scaffolding.** Cut "Now let's look at…", "It's important to note that…", "In this section we'll cover…" — start with the fact.
4. **No examples in prose.** If something needs an example, give it a code fence. Don't write inline-quoted snippets.
5. **No marketing.** A skill doc is a tool, not a sales page. Cut "powerful", "elegant", "robust", etc.

### Section budget discipline (Baby Step targets)

| Section | Token budget | If you blow the budget… |
|---|---|---|
| Frontmatter + scaffolding | ~500 | tighten field set |
| L0 — When to use me | ~150 | rewrite, you're padding |
| L1 — Mental model | ~500 | diagram is too detailed |
| L2 — Compressed reference | ~6,000 | acceptable; this is the surface |
| L3 — Anti-patterns + error→fix | ~3,000 | acceptable; this is the walker ring |
| L4 — Worked examples | ~5,000 | trim examples, not anti-patterns |
| L6 — Self-check | ~1,000 | acceptable |
| **Total** | **~16,000** | rewrite L4 |

### Section budget discipline (Super Skill Doc targets)

| Section | Token budget |
|---|---|
| Frontmatter + scaffolding | ~1,000 |
| L0 — When to use me | ~400 |
| L1 — Mental model | ~2,000 |
| L2 — Compressed reference | ~25,000 |
| L3 — Anti-patterns + error→fix | ~15,000 |
| L4 — Worked examples | ~35,000 |
| L5 — Edge cases + gotchas | ~15,000 |
| L6 — Self-check | ~5,000 |
| **Total** | **~100,000** |

---

## Validation

A skill doc is **valid** if:

1. Frontmatter parses as YAML and contains all required fields.
2. All six `L*` headers exist (L5 omitted in Baby tier).
3. Token count is within `context_budget`.
4. Every code example in L4 (and L5 for Super) passes the domain's verifier (compiler, parser, schema validator).
5. Every self-check prompt in L6 has an expected-shape specification.

A skill doc is **landed** (qualitative) if:

1. A model in `target_models` reading the doc cold can satisfy ≥80% of L6 prompts on first attempt.
2. Common failure modes appear in L3, not as surprises.

Authors test landing by running the self-check prompts against representative target models and recording outcomes in a sibling `*.landing.md` file. This is optional but recommended.

---

## Versioning

Semantic versioning:
- **Major (X.0.0):** breaking changes to the domain itself that invalidate prior examples
- **Minor (1.X.0):** new sections, new patterns, expanded surface coverage
- **Patch (1.0.X):** clarifications, typos, anti-pattern additions

The frontmatter `version` should match the **domain** the doc teaches — if Agicore v1.0 ships, the skill doc for Agicore v1.0 is `agicore.baby.skill.md` version `1.0.0`. Skill docs for the same domain at different tiers (Baby vs Super) share a major version line but evolve independently within it.

---

## File naming

```
{domain-slug}.baby.skill.md
{domain-slug}.super.skill.md
```

Examples:
- `agicore.baby.skill.md`
- `agicore.super.skill.md`
- `tauri-acl.baby.skill.md`
- `rust-ownership.super.skill.md`

A `skills/` directory at repo root is the conventional location.

---

## Why a convention, not a runtime

The format is intentionally just Markdown + YAML frontmatter. No build step, no schema package, no SDK. This means:

- Any model can read it without tooling
- Any harness can ship it as a system prompt or attached file
- Diffs are reviewable in plain text
- Adoption cost is "drop in a folder"

A v2 of this convention could add structured tool-call hooks (e.g., a `self_check_validator` schema the harness can run automatically). It hasn't been added in v1 because the simpler form has fewer ways to fail and more places to spread.

---

## Related work

- **`llm.txt` / `llms-full.txt`** ([llmstxt.org](https://llmstxt.org)) — a similar idea aimed at *whole-site context for AI consumption* rather than skill-acquisition. Compatible in spirit; orthogonal in purpose.
- **Anthropic's "Skills" concept** — files attached to a Claude conversation. The skill doc format is what you'd attach.
- **System prompts** — a skill doc is a structured system prompt with a self-check section bolted on.

---

## Reference implementations

This format is proven by skill docs in the same directory, covering both self-check modes:

**Mechanical self-check (authoring domain):**
- [`agicore.baby.skill.md`](agicore.baby.skill.md) — Baby Step for the Agicore DSL (~7.5k tokens; small open-source models). Every L4 example compiles.
- [`agicore.super.skill.md`](agicore.super.skill.md) — Super Skill Doc for the Agicore DSL (~18k tokens; frontier models). Every L4 recipe compiles.

**Rubric self-check (consulting domain):**
- [`accelerando.manufacturing.baby.skill.md`](accelerando.manufacturing.baby.skill.md) — Baby Step for advising mid-sized discrete manufacturers on Accelerando ERP deployment (~16k tokens).
- [`accelerando.manufacturing.super.skill.md`](accelerando.manufacturing.super.skill.md) — Super Skill Doc with 4+ industry archetypes, per-app config playbooks, KPI frameworks, failure modes (~60k tokens).

If you adopt this format for a new domain, the matching pair (Agicore for authoring, Accelerando for consulting) is the pattern to copy.

---

*Format v1.1 · 2026-05-23 · MIT*
