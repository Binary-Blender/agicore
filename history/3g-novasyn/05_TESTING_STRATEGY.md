# NovaSyn Testing Strategy

## Current Testing Approach

NovaSyn apps currently use a **manual verification** approach during development, with the following automated checks:

### Type Checking (Primary Verification)

The type system is the primary correctness mechanism:

```bash
# Must pass for both configs
tsc --noEmit -p tsconfig.main.json
tsc --noEmit -p tsconfig.renderer.json
```

If the type-check passes, the IPC bridge is wired correctly end-to-end:
- `types.ts` defines the interfaces and channels
- `preload/index.ts` uses those types (compile-time verified)
- `main/index.ts` handles those channels (runtime, but shape verified)
- Store actions call `window.electronAPI.*` methods (compile-time verified)
- Components consume store state (compile-time verified)

### Manual Verification Checklist

After each sprint or feature implementation:

1. **Type-check passes** for both tsconfigs
2. **App launches** without console errors
3. **DB migration auto-applies** (check console output)
4. **Full CRUD flow** works for new entities
5. **AI generation** produces expected output format
6. **IPC channel count** matches across types, preload, and main

### Sprint Verification Pattern

After each sprint, verify:
```
✅ Migration file creates tables without error
✅ types.ts has interfaces for all new entities
✅ IPC_CHANNELS has entries for all new operations
✅ ElectronAPI has method signatures for all channels
✅ preload/index.ts wires all new channels
✅ main/index.ts has handlers for all new channels
✅ Row mappers exist for all new tables
✅ Store has state + actions for all new operations
✅ Components render and interact correctly
✅ Sidebar + App.tsx routing updated for new views
```

## Future Testing Infrastructure

When the project matures, add:

### Unit Tests (Jest)

Already configured in package.json:
```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage"
  }
}
```

Priority test targets:
1. **Row mappers** — Verify snake_case to camelCase conversion
2. **Store actions** — Mock `window.electronAPI`, verify state updates
3. **AI service** — Mock fetch/SDK calls, verify prompt construction
4. **Migration SQL** — Run against in-memory SQLite, verify schema

### Integration Tests

Test the full IPC flow:
1. Call IPC handler directly with test data
2. Verify database state
3. Verify return value matches expected interface

### Component Tests (React Testing Library)

Test component rendering and user interactions:
1. Render component with mock store
2. Verify correct elements rendered
3. Simulate user actions (click, type, select)
4. Verify store actions called with correct arguments

## Test File Conventions

```
tests/
  unit/
    mappers.test.ts         # Row mapper tests
    store.test.ts           # Store action tests
  integration/
    ipc-handlers.test.ts    # Full IPC flow tests
  components/
    Dashboard.test.tsx      # Component tests
```

## Key Testing Principle

**The type system is the first line of defense.** If `tsc --noEmit` passes on both tsconfigs, the most common class of bugs (mismatched IPC channels, wrong types, missing methods) is already prevented. Manual testing covers runtime behavior that types can't express (correct SQL queries, correct AI prompts, correct UI rendering).
