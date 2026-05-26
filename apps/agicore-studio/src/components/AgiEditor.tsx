// AgiEditor — CodeMirror 6 with the custom .agi language extension.
//
// Sprint 0 scope: render the canonical workflow's .agi source with keyword
// highlighting. Read-only is fine — MVP unlocks editing once we have the
// two-way binding worked out (Alpha milestone).

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { agicoreLanguageSupport } from '../lib/agi-language';

interface Props {
  initialDoc: string;
  readOnly?: boolean;
  onChange?: (doc: string) => void;
}

const AgiEditor: React.FC<Props> = ({ initialDoc, readOnly = true, onChange }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        indentOnInput(),
        ...agicoreLanguageSupport(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.editable.of(!readOnly),
        EditorState.readOnly.of(readOnly),
        EditorView.theme({
          '&':              { height: '100%' },
          '.cm-scroller':   { overflow: 'auto' },
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && onChange) {
            onChange(u.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [initialDoc, readOnly, onChange]);

  return <div ref={hostRef} className="h-full w-full" />;
};

export default AgiEditor;
