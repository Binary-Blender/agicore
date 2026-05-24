# Adding a Platform or a Lesson to the Gen-X Simulator

The simulator ships with one fully implemented platform — the **Commodore 64**
— and three honest stubs: Apple ][, IBM PC, Atari 800. The architecture is
designed so a contributor can ship a new platform path in a weekend, or a new
lesson for an existing platform in an afternoon.

This is the community on-ramp.

---

## Part 1 — Adding a New Lesson (15 minutes)

Lessons live in `src-tauri/content/<platform_dir>/lessons/`. Each lesson is
a single JSON file. To add one:

### Step 1 — write the lesson JSON

Copy `src-tauri/content/c64/lessons/01_multiplication.json` to a new file
in the same directory and edit the fields:

| Field                  | What goes here                                                                    |
|------------------------|-----------------------------------------------------------------------------------|
| `id`                   | Unique slug — `<platform>-<magazine-short>-<issue>-<topic>`                       |
| `platform`             | Must match a Platform MODULE name (`Commodore64`, etc.)                           |
| `magazineTitle`        | e.g. `COMPUTE!'s Gazette`, `RUN Magazine`, `Ahoy!`, `Compute!`, `Family Computing`|
| `magazineIssue`        | e.g. `October 1984`                                                               |
| `page`                 | Page number within the magazine                                                   |
| `title`                | The lesson's display title — also what appears at the top of the magazine page    |
| `articleMarkdown`      | The full editorial article + listing, in markdown. **This is what the user reads.** |
| `printedListing`       | The program AS PRINTED in the magazine (with the deliberate defect)               |
| `canonicalProgram`     | The correct version (never shown to the user)                                     |
| `defectKind`           | `typo` \| `missing_line` \| `ambiguous_instruction` \| `errata_uncorrected`       |
| `defectDescription`    | Human description of the defect (for tests + auditing)                            |
| `successSubstring`     | A substring that appears in the output ONLY when the program runs correctly       |
| `errataText`           | Optional — hidden hint, ideally somewhere off-page in the article                 |
| `difficulty`           | 1 (single-line) through 10 (assembly DATA statement type-in)                      |

### Step 2 — register the lesson

Add a single line to `src-tauri/src/platforms/lessons.rs`:

```rust
fn c64_lessons() -> Vec<Lesson> {
    let sources: &[&str] = &[
        include_str!("../../content/c64/lessons/01_multiplication.json"),
        include_str!("../../content/c64/lessons/02_your_new_lesson.json"),  // <-- add here
    ];
    sources.iter().filter_map(|s| serde_json::from_str(s).ok()).collect()
}
```

### Step 3 — playtest

```bash
npm run tauri:dev
```

Open the magazine, type the listing exactly as printed, hit RUN. The
verdict banner should report **wrong_output** or **runtime_error**. Then
correct the defect, hit RUN again — it should report **success**.

If the listing-as-printed accidentally produces the correct output, your
defect isn't a real defect. Tighten the `successSubstring` so it only
matches the canonical run.

### Style notes for lesson authoring

- **The defect must be findable.** The kid should be able to discover it by
  re-reading the article carefully — not by guessing. Bury the hint in the
  prose (a sidebar, an errata blurb, an "as we mentioned last month" aside).
- **The article must read like a real 1984 magazine article.** Earnest tone,
  technical but accessible, occasional smugness, period-correct slang
  (`type-in listing`, `keyword`, `parser`, `addressing modes`). Avoid 2026
  vocabulary (no "stack overflow," no "github," no "AI").
- **Listings under 30 lines for v1.** Longer listings come once the kid has
  built some persistence_score.
- **One defect per lesson, ideally.** Multiple bugs make the lesson
  ambiguous — was the kid supposed to find both? Did they find a third one
  that wasn't intentional?

---

## Part 2 — Adding a New Platform (one weekend)

A platform is a self-contained era-computer simulation: boot sequence,
shell prompt, BASIC dialect, peripheral failure modes, magazine library.

### Step 1 — declare the platform in `.agi`

In `gen_x_simulator.agi`, find the `MODULE` declarations and edit the
existing stub to mark it implemented (or add a new one):

```
MODULE AppleII {
  DESCRIPTION  "..."
  RELEASE      1977
  STATUS       implemented        // was: stub

  BOOT_SCREEN  apple2/boot_screen.txt
  SHELL_PROMPT "]"
  BASIC_DIALECT "applesoft"

  PERIPHERAL_FAILURE_MODES {
    floppy_read_error_rate   0.06
    floppy_write_error_rate  0.03
  }

  MAGAZINES   nibble, call_apple, softalk
  SCORE       applesoft_proficiency
}
```

### Step 2 — implement the platform in Rust

Create `src-tauri/src/platforms/<your_platform>.rs`. Copy `c64.rs` as a
starting point. Implement the `Platform` trait:

```rust
pub struct AppleII;

const BOOT_SCREEN: &str = "\nAPPLE ][\n\n]\n";

impl Platform for AppleII {
    fn name(&self) -> &'static str { "AppleII" }
    fn display_name(&self) -> &'static str { "Apple ][" }
    fn release_year(&self) -> u32 { 1977 }
    fn cultural_lineage(&self) -> &'static str { "..." }
    fn is_implemented(&self) -> bool { true }
    fn shell_prompt(&self) -> &'static str { "]" }
    fn boot_screen(&self) -> &'static str { BOOT_SCREEN }
    fn lessons(&self) -> Vec<Lesson> {
        super::lessons::lessons_for("AppleII")
    }
    // The default `run_program` / `resume` use the v1 BASIC v2 interpreter.
    // If your platform needs a different dialect (AppleSoft, GW-BASIC,
    // Atari BASIC), override them — see "BASIC dialect divergence" below.
}
```

### Step 3 — register the platform

In `src-tauri/src/platforms/mod.rs`:

```rust
pub mod apple2;   // <-- add module
// ...
pub fn all_platforms() -> Vec<Box<dyn Platform>> {
    vec![
        Box::new(c64::Commodore64),
        Box::new(apple2::AppleII),   // <-- add to registry
        // ...
    ]
}
```

Remove the corresponding stub from `platforms/stubs.rs`.

### Step 4 — update the migration

In `migrations/001_core.sql`, find the `INSERT OR IGNORE` for platforms and
flip your platform's `is_implemented` to `1`. (Or write a new migration
file — `002_apple2_implemented.sql` — if the user might have an existing
database.)

### Step 5 — ship at least one lesson

Same procedure as Part 1, but in `content/apple2/lessons/`. Source a real
type-in program from `Nibble` or `Call-A.P.P.L.E.` for period authenticity.

### Step 6 — playtest

```bash
npm run tauri:dev
```

Your platform should appear in the chooser as **implemented**. Pick it, boot
into the ] prompt, open the magazine, type the listing, hit RUN.

### BASIC dialect divergence

V1 ships a Commodore 64 BASIC v2 interpreter. The other platforms used
different dialects:

| Platform   | Dialect             | Key differences from C64 BASIC v2                 |
|------------|---------------------|---------------------------------------------------|
| Apple ][   | AppleSoft BASIC     | HOME for clear, HCOLOR=, HPLOT, HGR, no POKE-RAM  |
| IBM PC     | BASICA / GW-BASIC   | KEY OFF, SCREEN n, CLS, COLOR, no PEEK/POKE       |
| Atari 800  | Atari BASIC         | GRAPHICS n, COLOR/PLOT/DRAWTO, ? for PRINT, no LET-strings |

For v1 simplicity, the Platform trait's default `run_program` uses the
shared BASIC v2 interpreter. To implement a dialect-correct interpreter:

1. Add a new module under `src-tauri/src/basic/` (e.g. `basic_applesoft.rs`)
   that exposes a similar interface to `Interpreter`
2. Override `run_program` and `resume` on your Platform impl to delegate
   to your dialect's interpreter

For v1 contributors who don't want to write a whole dialect: it's
acceptable to use the shared v2 interpreter and pick lessons that only use
the common-subset features (`PRINT`, `INPUT`, `FOR/NEXT`, `IF/THEN`,
`GOTO`, integer math, string vars). This still teaches the meta-skill;
the dialect divergence becomes a v2 contribution.

---

## What we'd love to see contributed

- **Apple ][** — for the LOGO / Pascal lineage. Lessons sourced from
  *Nibble* or *Call-A.P.P.L.E.*
- **Atari 800** — for the demoscene / sound / arcade-ports lineage.
  Lessons from *ANTIC* magazine; bonus points for POKEY sound-chip lessons.
- **IBM PC** — for the GW-BASIC / utility-programming lineage. Lessons
  from *PC Magazine* or *Compute!*'s IBM edition.
- **TRS-80, ZX Spectrum, Amiga, Atari ST** — second-tier platforms with
  passionate communities and well-documented BASIC dialects.
- **More C64 lessons.** The C64 had thousands of type-in listings in
  print. Some of our favorites to port:
  - A sprite-mover with hex DATA statements
  - A simple text adventure (`SCOTT ADAMS`-style)
  - A SID synthesizer demo (POKE to $D400–$D418)
  - A starfield with screen-RAM POKE
  - A "what's your name" greeter that loops PRINT-with-semicolon

---

## Submitting

1. Fork [`Binary-Blender/agicore`](https://github.com/Binary-Blender/agicore)
2. Branch: `gen-x-simulator/<your-contribution>`
3. Commit format:
   - `feat(gen-x/lessons): <PLATFORM> — <LESSON TITLE>`
   - `feat(gen-x/platforms): <Platform> implementation`
4. PR description: the cognitive skill the lesson trains, and (for new
   platforms) a short note on the dialect choices

We'd particularly love contributions from people who actually used these
machines back then. Period authenticity beats technical perfection. If
your lesson reads like it came out of a real 1984 magazine, you've
already won.
