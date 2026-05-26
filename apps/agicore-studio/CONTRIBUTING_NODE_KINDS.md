# Adding a Node Kind to Agicore Studio

The Studio ships nine node kinds: `start`, `http_call`, `ai_call`,
`qc_checkpoint`, `branch`, `loop`, `parallel_fanout`, `router_call`,
`end`. This guide walks you through adding a tenth.

The registry — `src/lib/node-kinds/index.ts` — is the central place for
node-kind metadata. Adding a kind there gets you the palette card,
canvas accent colors, minimap dots, and the node's display detail
line for free. Several other surfaces still need manual updates, and
this guide names each one explicitly. Future sprints will pull more
surfaces into the registry; the list will shrink.

---

## Step 1 — register the kind

Open `src/lib/node-kinds/index.ts` and add an entry to the
`DEFINITIONS` array. Use one of the existing kinds as a template.

```ts
{
  kind: 'my_new_kind',
  shortLabel: 'mykind',            // shown inside the node card
  paletteLabel: 'My New Kind',     // shown in the palette
  description: 'One-line pitch shown under the palette card',
  cssVar: 'var(--node-my-kind)',   // see step 2
  miniMapHex: '#abcdef',           // pure hex for React Flow's minimap
  defaultProperties: () => ({ field_one: 'default' }),
  defaultNameBase: 'mykind',       // the user's node will be named "mykind",
                                   // "mykind_2", "mykind_3", ...
  detailFor: (n) => n.properties.field_one
    ? `field_one: ${n.properties.field_one}`
    : undefined,
  hasInput: true,                  // receives an inbound edge
  hasOutput: true,                 // emits outbound edges
}
```

## Step 2 — add the CSS color variable

`src/styles/globals.css`:

```css
:root {
  /* ...existing... */
  --node-my-kind: #abcdef;
}
```

## Step 3 — extend `NodeKind` union

`src/types/workflow.ts` — add `'my_new_kind'` to the `NodeKind` union.
TypeScript will guide you to the rest from here.

## Step 4 — surfaces still needing manual updates

The registry covers display, defaults, and the canvas detail line. The
following surfaces still have per-kind logic that you'll need to touch:

### 4a. NodeInspector form

`src/components/NodeInspector.tsx` — add a `case 'my_new_kind':` to
`PropertyForm` that renders the editable fields. Use the existing
cases as templates. Keep field copy short and add hint text under each
input.

Also add an entry to `KIND_LABEL` so the inspector header shows the
human-readable name.

### 4b. .agi emitter

`src/lib/agi-emitter.ts` —

1. Add to `KIND_TO_AGI_TYPE` so the emitted `TYPE` keyword matches.
2. Add a `case 'my_new_kind':` to `emitNode` for the per-kind field
   serialization (METHOD, URL, etc.).

### 4c. .agi parser

`src/lib/agi-parser.ts` —

1. Add the kind to `NODE_KIND_RE`.
2. Add a `case 'my_new_kind':` to `parseProperties` that extracts the
   per-kind fields from the parsed source.

### 4d. Stub runner output

`src/lib/runner/stub-runner.ts` — add a `case 'my_new_kind':` to
`syntheticOutput` so the canvas paints something believable when the
user clicks Run. Add an optional log line in the main `runOne` body
if the kind has semantics the stub can't simulate (loop, parallel
fanout, and router_call all do this — be honest about what the stub
isn't doing).

### 4e. Autocomplete entry

`src/lib/agi-completion.ts` —

1. Add the kind name to `NODE_TYPE_VALUES`.
2. Optionally add an entry to `EXAMPLES` so the autocomplete tooltip
   shows a sample snippet when the user lands on your kind.

---

## Step 5 — playtest

```bash
npm run tauri:dev
```

Your kind should now appear in the palette. Drag it onto the canvas,
edit its properties, hit Save, switch to the Source tab to verify the
emitted `.agi` reads correctly, then hit Run to see the stub produce
synthetic output.

Run the canonical example workflow too — make sure nothing else
broke.

---

## Style guidelines

- **One word for `shortLabel`.** It has to fit in a small space inside
  the node card. Two words max if absolutely necessary.
- **Pick a color nobody else uses.** The nine existing kinds cover
  green / slate / violet / cyan / amber / pink / teal / orange / gray.
  Stay distinct.
- **`defaultProperties` should be useful, not empty.** A user drops your
  kind on the canvas and should see plausible starter values they can
  edit, not blank fields they have to guess at.
- **`detailFor` is one line.** It's the small third row on the node
  card — keep it under 60 chars or your node will overflow.

---

## Submitting

1. Fork [`Binary-Blender/agicore`](https://github.com/Binary-Blender/agicore).
2. Branch: `studio/node-kinds/<your-kind>`.
3. Commit format: `feat(agicore-studio/node-kinds): <kind_name> — <one-line thesis>`.
4. PR description: what the kind is for, what other Agicore primitives
   it pairs with, what the stub-runner simulates vs leaves for the CLI.

---

## What's coming

A future Beta sprint will pull more surfaces into the registry:

- Inspector form schemas (declare fields in the registry; the
  Inspector renders generic controls)
- Emit/parse field tables (declare the mapping in the registry; the
  emitter and parser become generic)
- Stub-runner output (declare the synthetic-output shape in the
  registry)
- Autocomplete entry (auto-derived from the registry entry)

Once that lands, adding a kind will be a single-file change.
