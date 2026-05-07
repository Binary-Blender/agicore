# NovaSyn Writer — TipTap Editor Guide

## Overview

The editor uses [TipTap](https://tiptap.dev/) (a headless wrapper around ProseMirror) for rich text editing. Content is stored as TipTap JSON in the SQLite database.

## Current Extensions

Configured in `src/renderer/components/Editor.tsx`:

| Extension | Purpose |
|-----------|---------|
| `StarterKit` | Bold, italic, strike, headings, lists, blockquote, code block, horizontal rule, history |
| `Placeholder` | Shows "Start writing..." when editor is empty |
| `CharacterCount` | Provides `editor.storage.characterCount.words()` and `.characters()` |
| `Highlight` | Text highlighting (mark) |
| `Focus` (`@tiptap/extension-focus`) | Focus mode — adds `has-focus` class to active node for dimming non-active paragraphs |

## Split Preview Pane

The editor supports a side-by-side split view with a live WYSIWYG preview panel:

- **Toggle**: Click the "Preview" button in EditorToolbar, or use `settings.showPreview`
- **Layout**: Editor and PreviewPane render side-by-side at 50/50 width
- **Rendering**: `PreviewPane.tsx` converts TipTap JSON to formatted HTML in real-time
- **Style**: Print-like layout with Georgia serif font, 6.5in max width, text indentation
- **Supports**: Headings (H1-H3), paragraphs, blockquotes, code blocks, lists, horizontal rules, and all text marks (bold, italic, strike, highlight, code)
- **Persistence**: `showPreview` boolean in `WriterSettings`

## Inline Comments

Comments can be attached to text ranges in the editor:

- **CommentsPanel**: 264px sidebar with comment list, filter tabs (All/Open/Resolved), and CRUD controls
- **Text anchoring**: Comments reference `fromPos` and `toPos` (ProseMirror positions) in the document
- **Click-to-navigate**: Clicking a comment scrolls the editor to the anchored text location
- **Resolve/Reopen**: Toggle comment status between open and resolved
- **IPC**: 4 channels (GET_COMMENTS, CREATE_COMMENT, UPDATE_COMMENT, DELETE_COMMENT)
- **Database**: `writer_comments` table (migration 014)

## Enhanced Status Bar

The editor status bar displays comprehensive writing metrics:

| Metric | Computation |
|--------|-------------|
| Words | `editor.storage.characterCount.words()` |
| Characters | `editor.storage.characterCount.characters()` |
| Sentences | Regex count of sentence-ending punctuation (`.?!`) |
| Paragraphs | Count of paragraph nodes in TipTap JSON |
| Reading Time | `Math.ceil(words / 250)` minutes (250 wpm average) |
| Flesch Reading Ease | `206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)` |

The Flesch score is color-coded:
- **Green** (60+): Easy to read
- **Yellow** (30-59): Moderate difficulty
- **Red** (<30): Difficult to read

A `countSyllables` helper function estimates syllable count per word for the Flesch calculation.

## Content Format

TipTap stores content as a JSON document:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Chapter Title" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "The story begins..." },
        { "type": "text", "marks": [{ "type": "bold" }], "text": "here" }
      ]
    }
  ]
}
```

An empty document is: `{"type":"doc","content":[{"type":"paragraph"}]}`

This is the default value in the database migration.

## Auto-Save Flow

1. User types in TipTap editor
2. `onUpdate` callback fires on every change
3. Debounce timer resets (default: 2000ms, configurable in Settings)
4. After debounce period, saves:
   - `JSON.stringify(editor.getJSON())` → `content` column
   - `editor.storage.characterCount.words()` → `word_count` column
5. Calls `updateChapter(id, { content, wordCount })` → IPC → SQLite

**Guard**: `isSettingContent` ref prevents save triggers when programmatically loading content.

**Discovery Mode integration**: When `discoveryMode` is active, `onUpdate` also calls `resetDiscoveryPause()` to restart the 15-second pause timer. When the user stops typing for 15 seconds, Discovery Mode auto-generates 3 "what if" suggestions. The `DiscoveryPanel` component is rendered as a floating overlay within the editor area.

## Editor ↔ Toolbar Communication

The editor instance is shared with the toolbar via `window.__tiptapEditor`:

```ts
// Editor.tsx — exposes
(window as any).__tiptapEditor = editor;

// EditorToolbar.tsx — consumes
const editor = (window as any).__tiptapEditor;
editor.chain().focus().toggleBold().run();
```

This is a pragmatic approach. For a more robust solution in the future, consider a React context or Zustand slice.

## Toolbar Commands

All toolbar buttons use TipTap's chainable command API:

```ts
// Toggle formatting
editor.chain().focus().toggleBold().run()
editor.chain().focus().toggleItalic().run()
editor.chain().focus().toggleStrike().run()
editor.chain().focus().toggleHighlight().run()

// Headings
editor.chain().focus().toggleHeading({ level: 1 }).run()

// Lists
editor.chain().focus().toggleBulletList().run()
editor.chain().focus().toggleOrderedList().run()

// Block elements
editor.chain().focus().toggleBlockquote().run()
editor.chain().focus().toggleCodeBlock().run()
editor.chain().focus().setHorizontalRule().run()

// History
editor.chain().focus().undo().run()
editor.chain().focus().redo().run()

// Check active state
editor.isActive('bold')  // returns boolean
editor.isActive('heading', { level: 1 })
```

## AI Result Insertion

When user clicks "Accept & Insert" in the AI panel:

```ts
editor.chain().focus().insertContent(aiResponse).run();
```

This inserts plain text at the current cursor position. For future phases, consider inserting as parsed rich text.

## Styling

TipTap editor styles are in `src/renderer/styles/globals.css` under the `.ProseMirror` class:

- Dark theme colors (`#e9ecef` text on `#1a1a2e` background)
- Heading sizes (h1: 2rem, h2: 1.5rem, h3: 1.25rem)
- Blockquote (left blue border, italic, muted color)
- Code blocks (dark background, monospace font)
- Highlight (yellow at 30% opacity)
- Placeholder text (gray, positioned with `::before` pseudo-element)
- Lists with proper indentation
- Horizontal rules

## Adding New Extensions

To add a TipTap extension:

1. Install: `npm install @tiptap/extension-xxx`
2. Import in `Editor.tsx`
3. Add to the `extensions` array in `useEditor()`
4. Add toolbar button in `EditorToolbar.tsx` if needed
5. Add CSS styles in `globals.css` if needed

### Planned Extensions (Phase 2+)

| Extension | Purpose |
|-----------|---------|
| `@tiptap/extension-collaboration` | Real-time collaboration (future) |
| `@tiptap/extension-image` | Inline images |
| `@tiptap/extension-table` | Tables |
| `@tiptap/extension-text-align` | Text alignment |
| `@tiptap/extension-underline` | Underline formatting |
| `@tiptap/extension-color` | Text color |
| `@tiptap/extension-font-family` | Font switching |
| `@tiptap/extension-typography` | Smart quotes, em-dashes |
| Custom | Word count targets, AI inline suggestions |

## Plain Text Extraction

Two implementations exist for extracting plain text from TipTap JSON (used for AI context and export):

1. **Main process** (`src/main/index.ts:extractText()`) — used in export handler
2. **Renderer** (`src/renderer/store/writerStore.ts:extractTextFromDoc()`) — used for AI context

Both recursively walk the JSON tree, joining paragraphs and headings with newlines.

For future phases, consider a shared utility or using TipTap's built-in `editor.getText()` method.
