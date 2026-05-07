import React, { useState, useCallback, useEffect, useRef } from 'react';

interface FindReplaceBarProps {
  onClose: () => void;
}

export default function FindReplaceBar({ onClose }: FindReplaceBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const getEditor = () => (window as any).__tiptapEditor;

  // Focus search input on mount
  useEffect(() => {
    searchRef.current?.focus();
    // Pre-fill with selected text
    const editor = getEditor();
    if (editor) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to);
        if (selectedText.length < 100) {
          setSearchTerm(selectedText);
        }
      }
    }
  }, []);

  // Find matches and highlight them
  const findMatches = useCallback(() => {
    const editor = getEditor();
    if (!editor || !searchTerm) {
      setMatchCount(0);
      setCurrentMatch(0);
      // Clear decorations
      clearDecorations(editor);
      return [];
    }

    const doc = editor.state.doc;
    const matches: { from: number; to: number }[] = [];
    const searchStr = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    doc.descendants((node: any, pos: number) => {
      if (node.isText) {
        const text = caseSensitive ? node.text : node.text.toLowerCase();
        let index = text.indexOf(searchStr);
        while (index !== -1) {
          matches.push({
            from: pos + index,
            to: pos + index + searchTerm.length,
          });
          index = text.indexOf(searchStr, index + 1);
        }
      }
    });

    setMatchCount(matches.length);
    if (matches.length > 0 && currentMatch >= matches.length) {
      setCurrentMatch(0);
    }

    // Apply decorations
    applyDecorations(editor, matches, currentMatch);

    return matches;
  }, [searchTerm, caseSensitive, currentMatch]);

  // Re-search when term or case changes
  useEffect(() => {
    findMatches();
  }, [searchTerm, caseSensitive]);

  // Update decorations when currentMatch changes
  useEffect(() => {
    const editor = getEditor();
    if (!editor || !searchTerm) return;
    const doc = editor.state.doc;
    const matches: { from: number; to: number }[] = [];
    const searchStr = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    doc.descendants((node: any, pos: number) => {
      if (node.isText) {
        const text = caseSensitive ? node.text : node.text.toLowerCase();
        let index = text.indexOf(searchStr);
        while (index !== -1) {
          matches.push({ from: pos + index, to: pos + index + searchTerm.length });
          index = text.indexOf(searchStr, index + 1);
        }
      }
    });

    applyDecorations(editor, matches, currentMatch);

    // Scroll to current match
    if (matches.length > 0 && matches[currentMatch]) {
      const match = matches[currentMatch];
      editor.commands.setTextSelection({ from: match.from, to: match.to });
      editor.commands.scrollIntoView();
    }
  }, [currentMatch]);

  const applyDecorations = (editor: any, matches: { from: number; to: number }[], activeIndex: number) => {
    if (!editor) return;
    const { Plugin, PluginKey } = require('@tiptap/pm/state');
    const { Decoration, DecorationSet } = require('@tiptap/pm/view');

    const pluginKey = new PluginKey('find-replace');

    // Remove existing plugin
    const existingPlugin = editor.state.plugins.find((p: any) => p.spec.key === pluginKey);
    if (existingPlugin) {
      const newPlugins = editor.state.plugins.filter((p: any) => p.spec.key !== pluginKey);
      const newState = editor.state.reconfigure({ plugins: newPlugins });
      editor.view.updateState(newState);
    }

    if (matches.length === 0) return;

    const decorations = matches.map((m, i) =>
      Decoration.inline(m.from, m.to, {
        class: i === activeIndex ? 'find-result-active' : 'find-result',
      })
    );

    const plugin = new Plugin({
      key: pluginKey,
      props: {
        decorations: () => DecorationSet.create(editor.state.doc, decorations),
      },
    });

    const newState = editor.state.reconfigure({
      plugins: [...editor.state.plugins, plugin],
    });
    editor.view.updateState(newState);
  };

  const clearDecorations = (editor: any) => {
    if (!editor) return;
    const { PluginKey } = require('@tiptap/pm/state');
    const pluginKey = new PluginKey('find-replace');
    const existingPlugin = editor.state.plugins.find((p: any) => p.spec?.key?.key === 'find-replace$');
    if (existingPlugin) {
      const newPlugins = editor.state.plugins.filter((p: any) => p !== existingPlugin);
      const newState = editor.state.reconfigure({ plugins: newPlugins });
      editor.view.updateState(newState);
    }
  };

  const goToNext = () => {
    if (matchCount === 0) return;
    setCurrentMatch((prev) => (prev + 1) % matchCount);
  };

  const goToPrev = () => {
    if (matchCount === 0) return;
    setCurrentMatch((prev) => (prev - 1 + matchCount) % matchCount);
  };

  const replaceOne = () => {
    const editor = getEditor();
    if (!editor || matchCount === 0 || !searchTerm) return;

    const doc = editor.state.doc;
    const matches: { from: number; to: number }[] = [];
    const searchStr = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    doc.descendants((node: any, pos: number) => {
      if (node.isText) {
        const text = caseSensitive ? node.text : node.text.toLowerCase();
        let index = text.indexOf(searchStr);
        while (index !== -1) {
          matches.push({ from: pos + index, to: pos + index + searchTerm.length });
          index = text.indexOf(searchStr, index + 1);
        }
      }
    });

    if (matches.length > 0 && matches[currentMatch]) {
      const match = matches[currentMatch];
      editor.chain().focus().setTextSelection(match).insertContent(replaceTerm).run();
      // Re-search after replace
      setTimeout(() => findMatches(), 50);
    }
  };

  const replaceAll = () => {
    const editor = getEditor();
    if (!editor || matchCount === 0 || !searchTerm) return;

    const doc = editor.state.doc;
    const matches: { from: number; to: number }[] = [];
    const searchStr = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    doc.descendants((node: any, pos: number) => {
      if (node.isText) {
        const text = caseSensitive ? node.text : node.text.toLowerCase();
        let index = text.indexOf(searchStr);
        while (index !== -1) {
          matches.push({ from: pos + index, to: pos + index + searchTerm.length });
          index = text.indexOf(searchStr, index + 1);
        }
      }
    });

    // Replace from end to start so positions don't shift
    const chain = editor.chain().focus();
    const sortedMatches = [...matches].reverse();
    for (const match of sortedMatches) {
      chain.setTextSelection(match).insertContent(replaceTerm);
    }
    chain.run();

    setTimeout(() => {
      setCurrentMatch(0);
      findMatches();
    }, 50);
  };

  const handleClose = () => {
    const editor = getEditor();
    clearDecorations(editor);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      goToNext();
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      goToPrev();
    }
  };

  return (
    <div className="absolute top-0 right-4 z-40 bg-[var(--bg-panel)] border border-[var(--border)] rounded-b-lg shadow-lg p-2" onKeyDown={handleKeyDown}>
      <div className="flex items-center gap-1.5">
        {/* Search input */}
        <input
          ref={searchRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentMatch(0);
          }}
          placeholder="Find..."
          className="w-48 bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
        />

        {/* Match count */}
        <span className="text-[10px] text-surface-500 w-12 text-center shrink-0">
          {searchTerm ? `${matchCount > 0 ? currentMatch + 1 : 0}/${matchCount}` : ''}
        </span>

        {/* Navigation */}
        <button onClick={goToPrev} className="text-surface-400 hover:text-surface-200 text-xs px-1" title="Previous (Shift+Enter)">
          ^
        </button>
        <button onClick={goToNext} className="text-surface-400 hover:text-surface-200 text-xs px-1" title="Next (Enter)">
          v
        </button>

        {/* Case sensitive */}
        <button
          onClick={() => setCaseSensitive(!caseSensitive)}
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
            caseSensitive ? 'bg-primary-600/30 text-primary-300' : 'text-surface-500 hover:text-surface-300'
          }`}
          title="Case Sensitive"
        >
          Aa
        </button>

        {/* Toggle replace */}
        <button
          onClick={() => setShowReplace(!showReplace)}
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
            showReplace ? 'bg-primary-600/20 text-primary-300' : 'text-surface-500 hover:text-surface-300'
          }`}
          title="Toggle Replace"
        >
          R
        </button>

        {/* Close */}
        <button onClick={handleClose} className="text-surface-500 hover:text-surface-300 text-xs px-1" title="Close (Esc)">
          x
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <input
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Replace with..."
            className="w-48 bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                replaceOne();
              }
            }}
          />
          <button
            onClick={replaceOne}
            disabled={matchCount === 0}
            className="text-xs px-2 py-0.5 rounded bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 disabled:opacity-50 transition-colors"
          >
            Replace
          </button>
          <button
            onClick={replaceAll}
            disabled={matchCount === 0}
            className="text-xs px-2 py-0.5 rounded bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 disabled:opacity-50 transition-colors"
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}
