# Accessibility

The Studio is a desktop authoring tool. Most authoring happens on a
canvas with drag-and-drop semantics, which is the central
accessibility tension — HTML5 drag-and-drop has no keyboard
equivalent in the spec. Where the mouse path is the only path, we
provide a parallel keyboard path; where we can't yet, we document
the gap.

## What's accessible today

- **Keyboard-only authoring.** Every node kind in the palette is a
  `role="button"` with `tabIndex={0}`. Tab into the palette, arrow
  to the kind you want, press Enter or Space to add a node at the
  canvas center. Repeated adds cascade so the nodes don't stack.
- **Focus rings.** Every focusable control gets a 2px purple ring
  on keyboard focus. Mouse focus is suppressed (no ring on click)
  so the indicator only fires when it carries information.
- **Aria-labels on icon-only controls.** Title-bar window controls,
  the settings cog, the new-window button — anything that's an icon
  alone has an `aria-label`. SVG icons inside are marked
  `aria-hidden="true"`.
- **Form labels.** Every form input in the inspector and settings
  panel has a visible label. The screen-reader association comes
  from the label being a sibling of the input within the same
  semantic block.
- **High-contrast colors.** The dark theme uses `#f4f4f5` on
  `#0a0a0a` for primary text (contrast ratio 18.6:1, well past
  WCAG AAA's 7:1) and `#a1a1aa` on `#0a0a0a` for secondary text
  (10.4:1, also AAA).

## What's not accessible yet

These gaps are tracked for post-RC work. They're real — if any of
them blocks you, please flag in the issue tracker.

- **Connecting edges with the keyboard.** Currently mouse-only.
  The intended fix: select source node, press `e` to enter
  edge-creation mode, tab to target, Enter to connect.
- **Canvas pan / zoom keys.** React Flow ships keyboard shortcuts
  for pan and zoom but we haven't surfaced them in the docs or
  wired the standard arrow-key fallbacks.
- **Screen-reader narration of run state.** The canvas re-paints
  node status via colored borders but emits no aria-live updates.
  Screen-reader users can't follow a running workflow without
  reading the run-log drawer manually.
- **High-contrast theme.** The default dark theme passes WCAG AAA;
  no light theme exists yet, and the WCAG-AAA-Plus monochrome
  high-contrast mode is not wired.

## Standards target

We're aiming for **WCAG 2.1 AA** at 1.0. We're tracking AAA where
it doesn't fight the dense, information-rich shape of an IDE —
specifically, AA on color contrast and focus-visibility, AAA on
primary text contrast.

## Testing

Run NVDA (Windows) or VoiceOver (macOS) over the Studio for the
walkthroughs in `docs/`. The known-failing flows above will fail
loudly; everything else should narrate sensibly. If something else
breaks, it's a bug — file it.
