## Summary

<!-- One paragraph: what changed and why. The "why" matters more than the "what" — the diff shows what. -->

## Test results

Paste the output of `npm test` from the repo root.

```
Parser:     843 passed, 0 failed
Compiler: 1,582 passed, 0 failed
Validator:   34 passed, 0 failed
```

## Doc updates

- [ ] `dsl/grammar.md` — for new/changed declaration syntax
- [ ] `docs/dsl-reference.md` — for new/changed declaration semantics
- [ ] `docs/cookbook.md` — for new user-facing patterns
- [ ] `ROADMAP.md` — for phase / declaration-count updates
- [ ] N/A — internal change with no doc surface

## Canary check

If this change affects codegen for declarations the canary (`apps/novasyn-chat/`) uses:

- [ ] Regenerated the canary and `cargo build` + `tsc --noEmit` both pass
- [ ] N/A — change doesn't touch generated code

## Backward compatibility

- [ ] Pure addition (new declaration / field / sugar) — no existing apps affected
- [ ] Breaking change — bumps minor or major version; release notes drafted
- [ ] Bugfix — existing apps benefit from the fix on regeneration
