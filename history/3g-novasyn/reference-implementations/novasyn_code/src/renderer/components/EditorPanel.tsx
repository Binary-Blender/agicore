import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { useCodeStore } from '../store/codeStore';

// ─── Monaco environment: disable workers (basic mode, still functional) ──────
// @ts-ignore
self.MonacoEnvironment = {
  getWorker: () => new Promise(() => {}),
};

// ─── Language detection map ──────────────────────────────────────────────────
const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  css: 'css',
  html: 'html',
  md: 'markdown',
  sql: 'sql',
  py: 'python',
  rs: 'rust',
  go: 'go',
  yaml: 'yaml',
  yml: 'yaml',
};

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? 'plaintext';
}

function extractFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath;
}

// ─── Open file tab descriptor ────────────────────────────────────────────────
interface OpenFile {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  model: monaco.editor.ITextModel;
}

// ─── EditorPanel Component ───────────────────────────────────────────────────
export default function EditorPanel() {
  const selectedFilePath = useCodeStore((s) => s.selectedFilePath);
  const setSelectedFilePath = useCodeStore((s) => s.setSelectedFilePath);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const openFilesRef = useRef<OpenFile[]>([]);

  // Keep ref in sync for use inside callbacks
  openFilesRef.current = openFiles;

  // ── Create editor instance on mount ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const editor = monaco.editor.create(containerRef.current, {
      theme: 'vs-dark',
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
      minimap: { enabled: false },
      wordWrap: 'on',
      tabSize: 2,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      padding: { top: 8 },
    });

    editorRef.current = editor;

    // Ctrl+S / Cmd+S — save active file
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const model = editor.getModel();
      if (!model) return;
      const file = openFilesRef.current.find((f) => f.model === model);
      if (!file) return;
      saveFile(file.path, model.getValue());
    });

    return () => {
      editor.dispose();
      editorRef.current = null;
    };
  }, []);

  // ── Save helper ──────────────────────────────────────────────────────────
  const saveFile = useCallback(async (filePath: string, content: string) => {
    try {
      await window.electronAPI.writeFile(filePath, content);
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === filePath ? { ...f, content, isDirty: false } : f,
        ),
      );
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, []);

  // ── React to selectedFilePath changes (file tree clicks) ─────────────────
  useEffect(() => {
    if (!selectedFilePath) return;

    const existing = openFilesRef.current.find((f) => f.path === selectedFilePath);
    if (existing) {
      // Already open — just switch model
      editorRef.current?.setModel(existing.model);
      return;
    }

    // Load file from disk
    (async () => {
      try {
        const content = await window.electronAPI.readFile(selectedFilePath);
        const lang = detectLanguage(selectedFilePath);
        const uri = monaco.Uri.file(selectedFilePath);

        // Reuse existing model if one already exists for this URI
        let model = monaco.editor.getModel(uri);
        if (model) {
          model.setValue(content);
        } else {
          model = monaco.editor.createModel(content, lang, uri);
        }

        const newFile: OpenFile = {
          path: selectedFilePath,
          name: extractFileName(selectedFilePath),
          content,
          isDirty: false,
          model,
        };

        // Track dirty state
        model.onDidChangeContent(() => {
          setOpenFiles((prev) =>
            prev.map((f) =>
              f.path === newFile.path ? { ...f, isDirty: true } : f,
            ),
          );
        });

        setOpenFiles((prev) => [...prev, newFile]);
        editorRef.current?.setModel(model);
      } catch (err) {
        console.error('Failed to read file:', err);
      }
    })();
  }, [selectedFilePath]);

  // ── Tab click — switch active file ───────────────────────────────────────
  const handleTabClick = useCallback(
    (filePath: string) => {
      setSelectedFilePath(filePath);
      const file = openFilesRef.current.find((f) => f.path === filePath);
      if (file) {
        editorRef.current?.setModel(file.model);
      }
    },
    [setSelectedFilePath],
  );

  // ── Tab close ────────────────────────────────────────────────────────────
  const handleTabClose = useCallback(
    (e: React.MouseEvent, filePath: string) => {
      e.stopPropagation();

      setOpenFiles((prev) => {
        const idx = prev.findIndex((f) => f.path === filePath);
        if (idx === -1) return prev;

        const closing = prev[idx];
        closing.model.dispose();

        const next = prev.filter((f) => f.path !== filePath);

        // If closing the active tab, switch to an adjacent one
        if (filePath === selectedFilePath) {
          if (next.length > 0) {
            const newIdx = Math.min(idx, next.length - 1);
            setSelectedFilePath(next[newIdx].path);
            editorRef.current?.setModel(next[newIdx].model);
          } else {
            setSelectedFilePath(null);
            editorRef.current?.setModel(null);
          }
        }

        return next;
      });
    },
    [selectedFilePath, setSelectedFilePath],
  );

  // ── Empty state ──────────────────────────────────────────────────────────
  if (openFiles.length === 0 && !selectedFilePath) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="text-sm text-slate-600">
            Select a file from the tree to open it
          </div>
          <div className="text-xs text-slate-700 mt-1">
            Ctrl+S to save &middot; Multiple tabs supported
          </div>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center bg-slate-900 border-b border-slate-700 overflow-x-auto select-none shrink-0">
        {openFiles.map((file) => {
          const isActive = file.path === selectedFilePath;
          return (
            <div
              key={file.path}
              onClick={() => handleTabClick(file.path)}
              className={`
                flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer border-r border-slate-700
                whitespace-nowrap min-w-0 shrink-0
                ${isActive
                  ? 'bg-slate-800 text-slate-100 border-t-2 border-t-blue-500'
                  : 'bg-slate-900 text-slate-400 border-t-2 border-t-transparent hover:bg-slate-800/60 hover:text-slate-300'
                }
              `}
              title={file.path}
            >
              <span className="truncate max-w-[160px]">{file.name}</span>
              {file.isDirty && (
                <span className="text-amber-400 font-bold ml-0.5">*</span>
              )}
              <button
                onClick={(e) => handleTabClose(e, file.path)}
                className="ml-1 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded px-0.5"
                title="Close"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Monaco editor container */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
