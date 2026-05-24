# Gen-X Simulator Roadmap

## Sprint 1 — Foundation (current)
- [x] `gen_x_simulator.agi` source of truth
- [x] Tauri + Vite + React + Tailwind scaffold
- [x] BASIC v2 interpreter — PRINT, INPUT, GOTO, IF/THEN, FOR/NEXT, LET, line numbers, integer math, string vars
- [x] Commodore 64 platform module — boot, shell, color/font fidelity
- [x] Magazine reader (faux-newsprint markdown rendering)
- [x] One complete C64 lesson — "STARFIELD" with deliberate typo
- [x] Datasette tape peripheral simulator
- [x] Honest stubs for AppleII, IBMPc, Atari800
- [x] Skill-progression scoring (debugging, persistence, peripheral fluency)

## Sprint 2 — Lesson library expansion
- [ ] Five more C64 lessons covering:
  - PRINT formatting (commas vs semicolons)
  - INPUT loop with validation
  - Simple animation with PEEK/POKE to screen RAM
  - Sound generation with SID registers
  - Sprite drawing with hex DATA statements
- [ ] Difficulty curve calibration based on Attempt outcome distribution
- [ ] Lesson authoring docs: `content/AUTHORING.md`

## Sprint 3 — Peripherals deepening
- [ ] Datasette load/save UI with period-correct timing and audio
- [ ] Floppy disk module (1541 emulator subset — directory, LOAD, SAVE)
- [ ] Modem 300/1200 baud with phone-call interrupt mechanic
- [ ] "Phone is ringing" interrupt sound + UI overlay during a save

## Sprint 4 — Cultural texture (LLM layer)
- [ ] API key configuration UI (Anthropic, OpenAI)
- [ ] `SysopBlackbeard` BBS persona — connect-screen, login, file listing
- [ ] `MagazineEditor_Lou` — generates new lesson editorial blurbs
- [ ] `UsenetFlamer_GreyBeard` — Usenet view with simulated thread replies
- [ ] Offline canned-content fallback for all three personas

## Sprint 5 — Apple ][ platform (or community contribution)
- [ ] AppleSoft BASIC dialect adapter
- [ ] Apple ][ boot screen + ] prompt
- [ ] Apple-specific peripheral set (Disk II, no tape)
- [ ] Three Apple ][ lessons sourced from Nibble / Call-A.P.P.L.E.

## Sprint 6 — Packaging
- [ ] Tauri portable Windows binary
- [ ] macOS .dmg and Linux AppImage
- [ ] Code-sign Windows binary
- [ ] Verify zero outbound network calls when LLM provider unconfigured

## Sprint 7 — Educator surfaces
- [ ] Classroom mode: instructor dashboard for shared profile cohort
- [ ] Lesson export: instructor can author + share lesson JSON files
- [ ] Anonymous metrics export for cohort skill-distribution research
