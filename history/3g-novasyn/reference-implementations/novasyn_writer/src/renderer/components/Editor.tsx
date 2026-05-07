import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Focus from '@tiptap/extension-focus';
import { useWriterStore } from '../store/writerStore';
import EditorContextMenu from './EditorContextMenu';
import DiscoveryPanel from './DiscoveryPanel';
import FindReplaceBar from './FindReplaceBar';
import PreviewPane from './PreviewPane';
import CommentsPanel from './CommentsPanel';

export default function Editor() {
  const { currentChapter, updateChapter, settings } = useWriterStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSettingContent = useRef(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
  }>({ visible: false, x: 0, y: 0, selectedText: '' });

  // Find & Replace
  const [showFindReplace, setShowFindReplace] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      CharacterCount,
      Highlight,
      Focus.configure({
        className: 'has-focus',
        mode: 'closest',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'ProseMirror',
      },
    },
    onUpdate: ({ editor }) => {
      if (isSettingContent.current) return;

      // Reset idle timer on every keystroke
      useWriterStore.getState().resetIdleTimer();

      // Reset discovery pause timer when typing
      if (useWriterStore.getState().discoveryMode) {
        useWriterStore.getState().resetDiscoveryPause();
      }

      // Debounced auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const chapter = useWriterStore.getState().currentChapter;
        if (!chapter) return;

        const json = JSON.stringify(editor.getJSON());
        const words = editor.storage.characterCount.words();

        updateChapter(chapter.id, {
          content: json,
          wordCount: words,
        });
      }, settings.autoSaveInterval || 2000);
    },
  });

  // Load chapter content when chapter changes
  useEffect(() => {
    if (!editor || !currentChapter) return;

    isSettingContent.current = true;
    try {
      const content = JSON.parse(currentChapter.content);
      editor.commands.setContent(content);
    } catch {
      editor.commands.setContent('');
    }
    isSettingContent.current = false;
  }, [editor, currentChapter?.id]);

  // Expose editor to toolbar via window (simple approach)
  useEffect(() => {
    if (editor) {
      (window as any).__tiptapEditor = editor;
    }
    return () => {
      delete (window as any).__tiptapEditor;
    };
  }, [editor]);

  // Clean up save timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Ctrl+F for Find & Replace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setShowFindReplace(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Right-click context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      if (from === to) return; // No selection — let browser default handle it

      e.preventDefault();
      const selectedText = editor.state.doc.textBetween(from, to);
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, selectedText });
    },
    [editor],
  );

  const wordCount = editor?.storage.characterCount.words() ?? 0;
  const charCount = editor?.storage.characterCount.characters() ?? 0;

  // Enhanced stats
  const textStats = useMemo(() => {
    if (!editor) return { sentences: 0, paragraphs: 0, readingTime: '0 min', flesch: 0 };
    const text = editor.getText();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length || 1;
    const readingMinutes = Math.max(1, Math.ceil(wordCount / 250));
    const readingTime = readingMinutes < 60 ? `${readingMinutes} min` : `${Math.floor(readingMinutes / 60)}h ${readingMinutes % 60}m`;

    // Flesch Reading Ease (simplified)
    let flesch = 0;
    if (wordCount > 0 && sentences > 0) {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
      flesch = Math.round(206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount));
      flesch = Math.max(0, Math.min(100, flesch));
    }
    return { sentences, paragraphs, readingTime, flesch };
  }, [editor, wordCount]);

  // Comments panel
  const [showComments, setShowComments] = useState(false);

  const discoveryMode = useWriterStore((s) => s.discoveryMode);
  const screenplayMode = useWriterStore((s) => s.settings.screenplayMode);
  const poetryMode = useWriterStore((s) => s.settings.poetryMode);
  const articleMode = useWriterStore((s) => s.settings.articleMode);
  const typewriterMode = useWriterStore((s) => s.settings.typewriterMode);
  const focusModeEnabled = useWriterStore((s) => s.settings.focusMode);
  const showPreview = useWriterStore((s) => s.settings.showPreview);
  const fontFamily = useWriterStore((s) => s.settings.fontFamily);
  const fontSize = useWriterStore((s) => s.settings.fontSize);
  const lineHeight = useWriterStore((s) => s.settings.lineHeight);
  const namedStyle = useWriterStore((s) => s.settings.namedStyle);
  const dropCapStyle = useWriterStore((s) => s.settings.dropCapStyle);
  const paragraphSpacing = useWriterStore((s) => s.settings.paragraphSpacing);
  const paragraphIndent = useWriterStore((s) => s.settings.paragraphIndent);
  const textAlignment = useWriterStore((s) => s.settings.textAlignment);
  const headingFont = useWriterStore((s) => s.settings.headingFont);
  const codeFont = useWriterStore((s) => s.settings.codeFont);
  const smallCaps = useWriterStore((s) => s.settings.smallCaps);
  const letterSpacing = useWriterStore((s) => s.settings.letterSpacing);
  const kerning = useWriterStore((s) => s.settings.kerning);
  const ligatures = useWriterStore((s) => s.settings.ligatures);
  const columns = useWriterStore((s) => s.settings.columns);

  const modeClass = screenplayMode ? 'screenplay-mode' : poetryMode ? 'poetry-mode' : articleMode ? 'article-mode' : '';
  const styleClass = namedStyle && namedStyle !== 'none' ? `style-${namedStyle}` : '';
  const dropCapClass = dropCapStyle && dropCapStyle !== 'none' ? `dropcap-${dropCapStyle}` : '';
  const extraClasses = [
    modeClass,
    styleClass,
    dropCapClass,
    typewriterMode ? 'typewriter-mode' : '',
    focusModeEnabled ? 'focus-mode' : '',
    smallCaps ? 'small-caps-mode' : '',
  ].filter(Boolean).join(' ');

  const typographyStyle: React.CSSProperties = {
    ...(fontFamily ? { '--editor-font': fontFamily } as any : {}),
    ...(fontSize ? { '--editor-font-size': `${fontSize}px` } as any : {}),
    ...(lineHeight ? { '--editor-line-height': String(lineHeight) } as any : {}),
    ...(paragraphSpacing !== undefined ? { '--editor-paragraph-spacing': `${paragraphSpacing}em` } as any : {}),
    ...(paragraphIndent !== undefined ? { '--editor-paragraph-indent': `${paragraphIndent}em` } as any : {}),
    ...(textAlignment ? { '--editor-text-align': textAlignment } as any : {}),
    ...(headingFont ? { '--editor-heading-font': headingFont } as any : {}),
    ...(codeFont ? { '--editor-code-font': codeFont } as any : {}),
    ...(letterSpacing !== undefined ? { '--editor-letter-spacing': `${letterSpacing}em` } as any : {}),
    ...(kerning !== undefined ? { '--editor-kerning': `${kerning}em` } as any : {}),
    ...(ligatures !== undefined ? { '--editor-ligatures': ligatures ? 'common-ligatures' : 'no-common-ligatures' } as any : {}),
    ...(columns && columns > 1 ? { '--editor-columns': String(columns) } as any : {}),
  };

  // Typewriter mode: scroll cursor to center on update
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!typewriterMode || !editor) return;
    const handleSelectionUpdate = () => {
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const cursorEl = container.querySelector('.ProseMirror .has-focus');
        if (cursorEl) {
          const rect = cursorEl.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const offset = rect.top - containerRect.top - containerRect.height / 2;
          container.scrollBy({ top: offset, behavior: 'smooth' });
        }
      });
    };
    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => { editor.off('selectionUpdate', handleSelectionUpdate); };
  }, [typewriterMode, editor]);

  // Chapter notes
  const [showNotes, setShowNotes] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const noteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentChapter) return;
    setShowNotes(false);
    setNoteContent('');
    window.electronAPI.getChapterNotes(currentChapter.id).then((note) => {
      if (note) setNoteContent(note.content);
    });
  }, [currentChapter?.id]);

  const handleNoteChange = (value: string) => {
    setNoteContent(value);
    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(() => {
      if (currentChapter) {
        window.electronAPI.saveChapterNote(currentChapter.id, value);
      }
    }, 1000);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden bg-[var(--bg-page)] relative ${extraClasses}`} style={typographyStyle}>
      {/* Find & Replace */}
      {showFindReplace && <FindReplaceBar onClose={() => setShowFindReplace(false)} />}

      {/* Main content area: editor + optional preview + optional comments */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto" onContextMenu={handleContextMenu}>
          <div className="max-w-5xl mx-auto px-8">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Split Preview Pane */}
        {showPreview && currentChapter && (
          <div className="w-1/2 border-l border-[var(--border)] flex flex-col overflow-hidden">
            <div className="h-7 bg-[var(--bg-panel)] border-b border-[var(--border)] flex items-center px-3 shrink-0">
              <span className="text-xs text-surface-500 font-semibold">Preview</span>
            </div>
            <PreviewPane content={currentChapter.content} title={currentChapter.title} />
          </div>
        )}

        {/* Comments Panel */}
        {showComments && currentChapter && (
          <CommentsPanel chapterId={currentChapter.id} onClose={() => setShowComments(false)} />
        )}
      </div>

      {/* Chapter Notes Panel */}
      {showNotes && currentChapter && (
        <div className="h-36 bg-[var(--bg-panel)] border-t border-[var(--border)] flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-1 border-b border-[var(--border)]">
            <span className="text-xs text-surface-500 font-semibold">Chapter Notes</span>
            <button onClick={() => setShowNotes(false)} className="text-xs text-surface-500 hover:text-surface-300">x</button>
          </div>
          <textarea
            value={noteContent}
            onChange={(e) => handleNoteChange(e.target.value)}
            placeholder="Private notes for this chapter... (won't be exported)"
            className="flex-1 bg-transparent text-surface-300 text-xs px-3 py-2 resize-none focus:outline-none placeholder-surface-600"
          />
        </div>
      )}

      {/* Discovery Panel */}
      {discoveryMode && <DiscoveryPanel />}

      {/* Enhanced Status bar */}
      <div className="h-7 bg-[var(--bg-panel)] border-t border-[var(--border)] flex items-center px-4 text-xs text-surface-500 gap-3 shrink-0">
        <span>{wordCount} words</span>
        <span>{charCount} chars</span>
        <span>{textStats.sentences} sent</span>
        <span>{textStats.paragraphs} para</span>
        <span title="Estimated reading time at 250 wpm">{textStats.readingTime}</span>
        {wordCount > 0 && (
          <span
            className={textStats.flesch >= 60 ? 'text-green-500' : textStats.flesch >= 30 ? 'text-yellow-500' : 'text-red-500'}
            title={`Flesch Reading Ease: ${textStats.flesch} (${textStats.flesch >= 80 ? 'Very Easy' : textStats.flesch >= 60 ? 'Easy' : textStats.flesch >= 40 ? 'Standard' : textStats.flesch >= 20 ? 'Difficult' : 'Very Difficult'})`}
          >
            F:{textStats.flesch}
          </span>
        )}
        <div className="flex items-center gap-2 ml-1">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`hover:text-surface-300 transition-colors ${showNotes ? 'text-primary-400' : ''}`}
            title="Toggle chapter notes"
          >
            Notes
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className={`hover:text-surface-300 transition-colors ${showComments ? 'text-primary-400' : ''}`}
            title="Toggle comments panel"
          >
            Comments
          </button>
        </div>
        {currentChapter && (
          <span className="ml-auto text-surface-600">{currentChapter.title}</span>
        )}
      </div>

      {/* Context menu */}
      {contextMenu.visible && (
        <EditorContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.selectedText}
          onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        />
      )}
    </div>
  );
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}
