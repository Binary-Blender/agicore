// AgiEditor — CodeMirror 6 with the custom .agi language extension.
//
// Editable mode is the Alpha unlock: the user types in the Source tab,
// the BottomDrawer debounces, parses, and updates the workflow store.
// To make that work without yanking the editor out from under the user
// on every keystroke, the editor's underlying state is owned by the
// CodeMirror view — not React. The parent only forces a doc replacement
// when it bumps `docResetCounter` (e.g., after a canvas edit). Typing
// fires `onChange` upward but does not cause a re-mount.

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { agicoreLanguageSupport } from '../lib/agi-language';

interface Props {
  /** Initial document text. Used on mount and when docResetCounter bumps. */
  initialDoc: string;
  readOnly?: boolean;
  /** Bump to force a doc replacement (e.g., canvas overwrote the workflow). */
  docResetCounter?: number;
  onChange?: (doc: string) => void;
}

const AgiEditor: React.FC<Props> = ({
  initialDoc,
  readOnly = true,
  docResetCounter = 0,
  onChange,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Keep mutable refs of these so the long-lived EditorView always sees
  // the latest values without forcing a remount.
  const initialDocRef = useRef(initialDoc);
  initialDocRef.current = initialDoc;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Mount once, plus on readOnly toggle (rare).
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: initialDocRef.current,
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
          '&':            { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && onChangeRef.current) {
            onChangeRef.current(u.state.doc.toString());
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
  }, [readOnly]);

  // Force doc replacement when the parent says so.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const incoming = initialDocRef.current;
    if (view.state.doc.toString() === incoming) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: incoming },
    });
  }, [docResetCounter]);

  return <div ref={hostRef} className="h-full w-full" />;
};

export default AgiEditor;
