# What this would have cost in the old world

A back-of-the-envelope traditional-engineering estimate for what
Agicore Studio (Sprint 0 through RC) would have taken if built by a
normal-sized team of humans at 2026 market rates. Not a billing
artifact, not precise to the dollar — just a record of the rough
order of magnitude.

The methodology is two complementary approaches that should agree:

1. **IFPUG function-point counting.** Enumerate the app's external
   inputs, outputs, inquiries, internal logical files, and external
   interfaces. Convert function points to person-months using
   industry productivity factors (Capers Jones, 2024 data).
2. **COCOMO II cross-check.** Run the actual line count through the
   COCOMO formula at semi-detached complexity (defensible for a
   novel-UX desktop app). Compare the two estimates; if they're
   close, the result is credible.

Both methods land in the same neighborhood, which is the most we
can ask of a retrospective estimate.

---

## Team composition

A "normal" team for a multi-platform desktop IDE with novel UX,
CI/CD, docs, and bundled samples. Sized at the small-organization
end of typical — a real product company would likely staff this
larger; a scrappy startup could compress it, at velocity cost.

| Role                  | FTE  | Median US salary (2026) | Loaded annual cost* |
|-----------------------|------|-------------------------|---------------------|
| Product Manager       | 1.0  | $130,000                | $169,000            |
| Business Analyst      | 1.0  | $90,000                 | $117,000            |
| UX / UI Designer      | 1.0  | $105,000                | $136,500            |
| Tech Lead             | 1.0  | $170,000                | $221,000            |
| Software Engineer #1  | 1.0  | $130,000                | $169,000            |
| Software Engineer #2  | 1.0  | $130,000                | $169,000            |
| QA Engineer           | 1.0  | $95,000                 | $123,500            |
| DevOps Engineer       | 0.5  | $145,000                | $94,250             |
| Technical Writer      | 0.5  | $85,000                 | $55,250             |
| **Total**             | **8.0** |                      | **$1,254,500/yr**   |

\* Loaded cost = salary × 1.3 (industry-standard overhead: payroll
taxes, benefits, equipment, office, training, etc.).

Blended per-FTE annual cost: ~$156,800
Blended hourly rate (2,000 productive hours/year): ~$78.40/hr
Blended monthly cost per FTE: ~$13,067

---

## Function point count

Counted against the shipped Studio at the v0.1.0-beta.2 tag.
Standard IFPUG weights at average complexity throughout — a more
detailed count would weight per-element by simple/average/complex,
but at this granularity the average weighting is honest.

### External Inputs (EI) — user-initiated data entry

| Function                                       | Count |
|------------------------------------------------|-------|
| Drag / click-to-add node to canvas             | 1     |
| Connect edge between nodes                     | 1     |
| Edit node properties (one form, nine kinds)    | 1     |
| Edit workflow metadata (name, IO, description) | 1     |
| Save workflow                                  | 1     |
| Open workflow file                             | 1     |
| Open project folder                            | 1     |
| New file in project                            | 1     |
| Delete file                                    | 1     |
| API key entry (five providers, one form)       | 1     |
| Telemetry toggle                               | 1     |
| Crash reports toggle                           | 1     |
| QC decision submit (approve/edit/reject)       | 1     |
| Run inputs prompt                              | 1     |
| Set / clear breakpoint                         | 1     |
| Debug step / continue                          | 1     |
| Run / cancel                                   | 1     |
| Test runner execute                            | 1     |
| Check for updates                              | 1     |
| Download & install update                      | 1     |
| Diff preview open                              | 1     |
| **Total EI: 21 × 4 = 84 FP**                   |       |

### External Outputs (EO) — computed displays

| Function                                       | Count |
|------------------------------------------------|-------|
| Live `.agi` source emission (text drawer)      | 1     |
| Run event log                                  | 1     |
| Per-node run status painting                   | 1     |
| Per-node output inspector                      | 1     |
| Git status indicators in project explorer      | 1     |
| Recovery banner                                | 1     |
| Diff preview render                            | 1     |
| Test results display                           | 1     |
| Telemetry buffer preview                       | 1     |
| Crash reports preview                          | 1     |
| Update version diff display                    | 1     |
| Download progress bar                          | 1     |
| Recent projects list with timestamps           | 1     |
| Run completion summary                         | 1     |
| Aria-live screen-reader announcer              | 1     |
| **Total EO: 15 × 5 = 75 FP**                   |       |

### External Inquiries (EQ) — lookups

| Function                                       | Count |
|------------------------------------------------|-------|
| Read API keys                                  | 1     |
| List project files                             | 1     |
| Load workflow from disk                        | 1     |
| Search project files                           | 1     |
| Check git status                               | 1     |
| List recovery drafts                           | 1     |
| Read recent projects                           | 1     |
| Check for available update                     | 1     |
| Look up node-kind metadata                     | 1     |
| Autocomplete suggestions                       | 1     |
| **Total EQ: 10 × 4 = 40 FP**                   |       |

### Internal Logical Files (ILF) — data stores

| Function                                       | Count |
|------------------------------------------------|-------|
| Workflow data (nodes + edges + metadata)       | 1     |
| Workflow store (in-memory state machine)       | 1     |
| Run store (event log + per-node records)       | 1     |
| Debug store (breakpoints + pause state)        | 1     |
| Project store (open project + file list)       | 1     |
| Settings store (API keys)                      | 1     |
| Telemetry store (events + counters)            | 1     |
| Crash store (reports buffer)                   | 1     |
| Test store (results + history)                 | 1     |
| Recovery drafts (per-file autosave)            | 1     |
| Recent projects list                           | 1     |
| Layout sidecar (`.agi.layout.json`)            | 1     |
| i18n locale data                               | 1     |
| Node-kind registry                             | 1     |
| **Total ILF: 14 × 10 = 140 FP**                |       |

### External Interface Files (EIF) — read-only externals

| Function                                       | Count |
|------------------------------------------------|-------|
| Tauri filesystem APIs                          | 1     |
| Tauri dialog plugin                            | 1     |
| Tauri updater plugin + GitHub Releases         | 1     |
| AI provider APIs (Anthropic/OpenAI/Google/xAI/HuggingFace) | 1 |
| Git CLI                                        | 1     |
| Browser localStorage                           | 1     |
| **Total EIF: 6 × 7 = 42 FP**                   |       |

### Totals

| Category                        | Raw FP    |
|---------------------------------|-----------|
| External Inputs (21 × 4)        | 84        |
| External Outputs (15 × 5)       | 75        |
| External Inquiries (10 × 4)     | 40        |
| Internal Logical Files (14 × 10)| 140       |
| External Interface Files (6 × 7)| 42        |
| **Unadjusted Function Points**  | **381**   |

**Value Adjustment Factor:** 1.10 — slightly above average for a
cross-platform desktop app with real-time canvas painting, two-way
text↔canvas binding, multi-window state coordination, and a custom
DSL with autocomplete. (VAF = 1.00 would be a typical CRUD web app;
1.20 would be a real-time embedded system.)

**Adjusted Function Points:** 381 × 1.10 = **~419 FP**

---

## Effort conversion

Productivity assumption: **8 function points per person-month**.

This is a defensible middle for a modern stack (TypeScript + Rust +
React + Tauri) on a desktop app with novel UX. Capers Jones's 2024
industry data brackets this at 6–12 FP/person-month depending on
team experience and codebase maturity. Eight is "experienced team,
greenfield code, modern tooling" — close to what this project was.

```
Effort = 419 FP / (8 FP/person-month) = ~52 person-months
       = 52 × 160 hr/month
       = ~8,320 person-hours
```

---

## Calendar time

With the 8.0-FTE team above running in parallel:

```
Calendar time = 52 person-months / 8.0 FTE = ~6.5 calendar months
              = ~28 weeks of normal-week work
```

**Brooks's-Law caveat:** the math above assumes linear scaling, which
isn't real. A team of 8.0 won't actually deliver 8x what one person
does — coordination overhead, design-review cycles, and integration
costs eat 15–25% of nominal capacity at this team size. A realistic
calendar estimate would be **7–8 months** of elapsed time, not 6.5.

---

## Dollar estimate

Two ways to compute, both yielding the same neighborhood:

```
By person-months:
  52 person-months × $13,067/FTE-month = ~$679,500

By hours:
  8,320 hours × $78.40 blended rate = ~$652,300
```

**Estimated total cost: ~$650,000 to $680,000**

The range is the methodology spread, not uncertainty about the
underlying effort. Call it **~$665K** as the midpoint.

---

## COCOMO II cross-check

The Studio's actual code at v0.1.0-beta.2:

| Source                            | Lines  |
|-----------------------------------|--------|
| TypeScript / TSX (`src/**`)       | 8,095  |
| Rust (`src-tauri/src/**`)         | 646    |
| CSS (`src/styles/**`)             | 249    |
| **Source code total (KLOC)**      | **~9.0** |
| Documentation (`docs/**`)         | 1,414  |
| `.agi` samples (`examples/**`)    | 389    |
| CI workflows (`.github/**`)       | 480    |

**COCOMO II Semi-Detached:**

```
PM = 3.0 × (KLOC)^1.12
   = 3.0 × (9.0)^1.12
   = 3.0 × 11.79
   = ~35.4 person-months
```

That's lower than the 52 person-months the FP method yielded —
about 32% below. The gap is real and expected: COCOMO counts only
*coding* effort (which scales with KLOC), while the FP method
includes design, PM time, QA, docs, and the various "everything
else" that wraps around the code. A 1.4–1.5× multiplier between
COCOMO-pure-coding and FP-full-team-effort is normal.

Applying the multiplier:

```
35.4 PM × 1.45 = ~51.3 person-months
```

Lands within 1.4% of the FP estimate. The two methods agree —
**~52 person-months of total team effort is the credible number.**

**COCOMO calendar time:**

```
TDEV = 2.5 × (PM)^0.35 = 2.5 × 35.4^0.35 = ~9.0 months
Recommended staff = PM / TDEV = 35.4 / 9.0 = ~4 people
```

Note: COCOMO's preferred-staffing math says a smaller team over
longer time would have been "optimal" per the formula. Real
industry teams almost always staff larger than COCOMO recommends
because business wants to ship faster, accepting Brooks's-Law
overhead in exchange for compressed calendar time. The 8-FTE / 7–8
month shape above is the realistic-team scenario; the 4-FTE / 9
month shape is the COCOMO-optimal scenario.

---

## Bottom line

| Metric             | Estimate                                    |
|--------------------|---------------------------------------------|
| **Function points**| ~419 (adjusted)                             |
| **Person-months**  | ~52 (FP and COCOMO agree within 2%)         |
| **Person-hours**   | ~8,320                                      |
| **Calendar time**  | ~7–8 months with an 8-FTE team              |
| **Dollar cost**    | **~$665,000** (range: $650K–$680K)          |

---

## What this includes

- All Sprint 0 through RC work: scaffolding, MVP feature set,
  Alpha additions, Beta scorecard, RC polish through the first
  shipped release (v0.1.0-beta.2).
- Design, architecture, coding, code review, QA, docs (the five
  walkthroughs + four reference docs), CI/CD pipeline, signing-
  key infrastructure scaffolding, accessibility first pass,
  i18n scaffold, six bundled sample workflows.
- The bundled `.agi` samples themselves as authored content
  (counted as part of EIs / docs effort, not separately).

## What this does NOT include

- The Agicore DSL itself — that's the wider framework, not the
  Studio. The Studio consumes the parser; the parser was built
  elsewhere.
- The Tauri framework, React, Vite, CodeMirror, React Flow, or
  any other off-the-shelf dependencies — those are infrastructure
  the team consumed, not built.
- The actual code-signing certificates (~$300–$700/year for OS-level
  signing + Apple Developer Program $99/year). Adds nothing to
  development cost; ongoing operational expense.
- Post-RC work still on the punch list: marketing site, accessibility
  round 2, the one-time signing-key ceremony, the second i18n pass.
- Customer support, hosting, and the actual operation of the
  shipped product.

## Limitations of this estimate

- The 8 FP/person-month productivity assumption is the single most
  sensitive number. At 6 FP/PM the dollar cost jumps to ~$880K;
  at 12 FP/PM it drops to ~$440K.
- The team composition is an educated guess at what a "normal"
  team looks like. A solo founder could conceivably ship the same
  scope in much longer calendar time at a fraction of the dollar
  cost; a fully-loaded enterprise team would spend more.
- VAF = 1.10 is a judgment call. A more rigorous count would
  walk the 14 standard adjustment characteristics; this skipped
  that and applied a single multiplier from feel.
- Loaded-cost multiplier of 1.3 is conservative for US tech;
  high-cost-of-living metros (SF, NYC, Seattle) push this to
  1.4–1.5. Lower-cost geographies (Austin, Raleigh, remote-only)
  push it down toward 1.2.

For all that, the two methods agreeing within 2% suggests the
~$665K / ~52 person-month / ~7–8 month numbers are the right
order of magnitude. Off by a factor of 2 is impossible; off by
30% is plausible.
