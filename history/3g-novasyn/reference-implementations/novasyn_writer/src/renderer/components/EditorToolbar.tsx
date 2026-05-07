import React, { useState } from 'react';
import { useWriterStore } from '../store/writerStore';

const NAMED_STYLES = [
  { id: 'none', name: 'Default', description: 'Standard prose' },
  { id: 'manuscript', name: 'Manuscript', description: 'Double-spaced, Times New Roman, indented' },
  { id: 'literary', name: 'Literary', description: 'Elegant serif, wider margins, generous spacing' },
  { id: 'dialogue', name: 'Dialogue', description: 'Optimized for dialogue-heavy writing' },
  { id: 'journal', name: 'Journal Entry', description: 'Handwritten feel, italic, narrow width' },
  { id: 'letter', name: 'Letter', description: 'Formal letter format with address block' },
  { id: 'minimal', name: 'Minimal', description: 'Clean sans-serif, tight spacing' },
  { id: 'vintage', name: 'Vintage', description: 'Old-world typeset feel, drop caps ready' },
];

export default function EditorToolbar() {
  const { toggleAiPanel, aiPanelOpen, currentChapter, discoveryMode, toggleDiscoveryMode, settings, saveSettings } = useWriterStore();
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  // Get editor from window (set by Editor component)
  const getEditor = () => (window as any).__tiptapEditor;

  const btn = (
    label: string,
    action: () => void,
    isActive?: boolean,
    title?: string,
  ) => (
    <button
      onClick={action}
      className={`px-2 py-1 text-xs rounded transition-colors ${
        isActive
          ? 'bg-primary-600/30 text-primary-300'
          : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
      }`}
      title={title || label}
    >
      {label}
    </button>
  );

  const editor = getEditor();

  return (
    <div className="h-10 bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center px-3 gap-1 shrink-0">
      {/* Formatting buttons */}
      {btn('B', () => editor?.chain().focus().toggleBold().run(), editor?.isActive('bold'), 'Bold (Ctrl+B)')}
      {btn('I', () => editor?.chain().focus().toggleItalic().run(), editor?.isActive('italic'), 'Italic (Ctrl+I)')}
      {btn('S', () => editor?.chain().focus().toggleStrike().run(), editor?.isActive('strike'), 'Strikethrough')}
      {btn('H', () => editor?.chain().focus().toggleHighlight().run(), editor?.isActive('highlight'), 'Highlight')}

      <div className="w-px h-5 bg-[#2a2a4a] mx-1" />

      {btn('H1', () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), editor?.isActive('heading', { level: 1 }), 'Heading 1')}
      {btn('H2', () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), editor?.isActive('heading', { level: 2 }), 'Heading 2')}
      {btn('H3', () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), editor?.isActive('heading', { level: 3 }), 'Heading 3')}

      <div className="w-px h-5 bg-[#2a2a4a] mx-1" />

      {btn('UL', () => editor?.chain().focus().toggleBulletList().run(), editor?.isActive('bulletList'), 'Bullet List')}
      {btn('OL', () => editor?.chain().focus().toggleOrderedList().run(), editor?.isActive('orderedList'), 'Ordered List')}
      {btn('Quote', () => editor?.chain().focus().toggleBlockquote().run(), editor?.isActive('blockquote'), 'Blockquote')}
      {btn('Code', () => editor?.chain().focus().toggleCodeBlock().run(), editor?.isActive('codeBlock'), 'Code Block')}

      <div className="w-px h-5 bg-[#2a2a4a] mx-1" />

      {btn('HR', () => editor?.chain().focus().setHorizontalRule().run(), false, 'Horizontal Rule')}
      {btn('IMG', async () => {
        const result = await window.electronAPI.insertImage();
        if (result && editor) {
          // Insert as an image node (using raw HTML via setContent)
          editor.chain().focus().insertContent(`<img src="${result.dataUrl}" alt="${result.fileName}" />`).run();
        }
      }, false, 'Insert Image')}
      {btn('Undo', () => editor?.chain().focus().undo().run(), false, 'Undo (Ctrl+Z)')}
      {btn('Redo', () => editor?.chain().focus().redo().run(), false, 'Redo (Ctrl+Y)')}

      <div className="w-px h-5 bg-[#2a2a4a] mx-1" />

      {/* Named Style selector */}
      <div className="relative">
        <button
          onClick={() => setShowStyleMenu(!showStyleMenu)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            settings.namedStyle && settings.namedStyle !== 'none'
              ? 'bg-indigo-600/30 text-indigo-300'
              : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
          }`}
          title="Named Style"
        >
          {NAMED_STYLES.find(s => s.id === (settings.namedStyle || 'none'))?.name || 'Style'}
        </button>
        {showStyleMenu && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--bg-panel)] border border-[var(--border)] rounded shadow-lg z-30 py-1">
            {NAMED_STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  saveSettings({ namedStyle: s.id === 'none' ? undefined : s.id });
                  setShowStyleMenu(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 ${
                  (settings.namedStyle || 'none') === s.id ? 'text-indigo-300' : 'text-surface-300'
                }`}
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-[10px] text-surface-500">{s.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Small Caps toggle */}
      <button
        onClick={() => saveSettings({ smallCaps: !settings.smallCaps })}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          settings.smallCaps
            ? 'bg-cyan-600/30 text-cyan-300'
            : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
        }`}
        title="Toggle Small Caps"
      >
        SC
      </button>

      {/* Columns toggle */}
      <button
        onClick={() => {
          const cols: Array<1 | 2 | 3> = [1, 2, 3];
          const current = settings.columns || 1;
          const idx = cols.indexOf(current as 1 | 2 | 3);
          const next = cols[(idx + 1) % cols.length];
          saveSettings({ columns: next === 1 ? undefined : next });
        }}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          settings.columns && settings.columns > 1
            ? 'bg-indigo-600/30 text-indigo-300'
            : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
        }`}
        title={`Columns: ${settings.columns || 1} (click to cycle)`}
      >
        Col:{settings.columns || 1}
      </button>

      {/* Drop Cap toggle */}
      <button
        onClick={() => {
          const styles: Array<'none' | 'classic' | 'raised' | 'hanging'> = ['none', 'classic', 'raised', 'hanging'];
          const current = settings.dropCapStyle || 'none';
          const idx = styles.indexOf(current);
          const next = styles[(idx + 1) % styles.length];
          saveSettings({ dropCapStyle: next === 'none' ? undefined : next });
        }}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          settings.dropCapStyle && settings.dropCapStyle !== 'none'
            ? 'bg-rose-600/30 text-rose-300'
            : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'
        }`}
        title={`Drop Cap: ${settings.dropCapStyle || 'none'} (click to cycle)`}
      >
        DC:{(settings.dropCapStyle || 'off').charAt(0).toUpperCase()}
      </button>

      <div className="w-px h-5 bg-[#2a2a4a] mx-1" />

      {/* Writing mode formatting legend */}
      {settings.screenplayMode && (
        <>
          <span className="text-[10px] text-surface-500" title="H1=Scene, H2=Character, H3=Parenthetical, Quote=Dialogue, Code=Transition">
            H1:Scene H2:Char H3:Paren Quote:Dialog Code:Trans
          </span>
          <div className="w-px h-5 bg-[#2a2a4a] mx-1" />
        </>
      )}
      {settings.poetryMode && (
        <>
          <span className="text-[10px] text-surface-500" title="H1=Title, H2=Section, H3=Note, HR=Stanza Break, Quote=Epigraph">
            H1:Title H2:Section HR:Stanza Quote:Epigraph
          </span>
          <div className="w-px h-5 bg-[#2a2a4a] mx-1" />
        </>
      )}
      {settings.articleMode && (
        <>
          <span className="text-[10px] text-surface-500" title="H1=Title, H2=Subheading, H3=Sub-subheading, Quote=Pull Quote, Code=Sidebar Note">
            H1:Title H2:Sub H3:Sub-sub Quote:Pull Code:Sidebar
          </span>
          <div className="w-px h-5 bg-[#2a2a4a] mx-1" />
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Chapter title */}
      {currentChapter && (
        <span className="text-xs text-surface-500 mr-2">{currentChapter.title}</span>
      )}

      {/* Preview toggle */}
      <button
        onClick={() => saveSettings({ showPreview: !settings.showPreview })}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          settings.showPreview
            ? 'bg-sky-600/30 text-sky-300'
            : 'text-surface-500 hover:text-surface-300 hover:bg-white/5'
        }`}
        title="Toggle live preview pane"
      >
        Preview
      </button>

      {/* Typewriter Mode toggle */}
      <button
        onClick={() => saveSettings({ typewriterMode: !settings.typewriterMode })}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          settings.typewriterMode
            ? 'bg-teal-600/30 text-teal-300'
            : 'text-surface-500 hover:text-surface-300 hover:bg-white/5'
        }`}
        title="Typewriter Mode — keeps cursor line centered"
      >
        TW
      </button>

      {/* Focus Mode toggle */}
      <button
        onClick={() => saveSettings({ focusMode: !settings.focusMode })}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          settings.focusMode
            ? 'bg-amber-600/30 text-amber-300'
            : 'text-surface-500 hover:text-surface-300 hover:bg-white/5'
        }`}
        title="Focus Mode — dim non-active paragraphs"
      >
        Focus
      </button>

      <div className="w-px h-5 bg-[#2a2a4a] mx-1" />

      {/* Screenplay Mode toggle */}
      <button
        onClick={() => saveSettings({ screenplayMode: !settings.screenplayMode, poetryMode: false, articleMode: false })}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          settings.screenplayMode
            ? 'bg-yellow-600/30 text-yellow-300'
            : 'bg-yellow-600/10 text-surface-500 hover:text-surface-300 hover:bg-yellow-600/20'
        }`}
        title="Toggle Screenplay Mode (Scene Heading=H1, Character=H2, Parenthetical=H3, Dialogue=Quote, Transition=Code)"
      >
        Screenplay
      </button>

      {/* Poetry Mode toggle */}
      <button
        onClick={() => saveSettings({ poetryMode: !settings.poetryMode, screenplayMode: false, articleMode: false })}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          settings.poetryMode
            ? 'bg-violet-600/30 text-violet-300'
            : 'bg-violet-600/10 text-surface-500 hover:text-surface-300 hover:bg-violet-600/20'
        }`}
        title="Toggle Poetry Mode (centered verse, stanza breaks via HR, epigraph via Quote)"
      >
        Poetry
      </button>

      {/* Article Mode toggle */}
      <button
        onClick={() => saveSettings({ articleMode: !settings.articleMode, screenplayMode: false, poetryMode: false })}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          settings.articleMode
            ? 'bg-emerald-600/30 text-emerald-300'
            : 'bg-emerald-600/10 text-surface-500 hover:text-surface-300 hover:bg-emerald-600/20'
        }`}
        title="Toggle Article Mode (H1=Title, H2=Subheading, Quote=Pull Quote, Code=Sidebar Note)"
      >
        Article
      </button>

      {/* Discovery Mode toggle */}
      <button
        onClick={() => toggleDiscoveryMode()}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          discoveryMode
            ? 'bg-accent-500 text-white shadow-[0_0_8px_rgba(var(--accent-500),0.4)]'
            : 'bg-accent-500/20 text-accent-300 hover:bg-accent-500/30'
        }`}
        title="Toggle Discovery Mode"
      >
        Discovery
      </button>

      {/* AI Panel toggle */}
      <button
        onClick={toggleAiPanel}
        className={`px-3 py-1 text-xs rounded transition-colors ${
          aiPanelOpen
            ? 'bg-primary-600 text-white'
            : 'bg-primary-600/20 text-primary-300 hover:bg-primary-600/30'
        }`}
        title="Toggle AI Panel (Ctrl+Shift+A)"
      >
        AI
      </button>
    </div>
  );
}
