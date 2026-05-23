import { useEffect, useState } from 'react';
import { X, Save, FileText } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getDocument, readDocumentContent, writeDocumentContent } from '../lib/api';
import type { Document } from '../lib/types';

export function DocumentSidePanel() {
  const docId = useAppStore((s) => s.panelDocumentId);
  const setPanelDocumentId = useAppStore((s) => s.setPanelDocumentId);
  const [meta, setMeta] = useState<Document | null>(null);
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!docId) { setMeta(null); setContent(''); setOriginal(''); setError(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const m = await getDocument(docId);
        if (cancelled) return;
        setMeta(m);
        try {
          const c = await readDocumentContent(m.filePath);
          if (cancelled) return;
          setContent(c);
          setOriginal(c);
        } catch {
          // File may not exist yet for a freshly created doc — start blank.
          setContent('');
          setOriginal('');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [docId]);

  const isDirty = content !== original;

  // Esc closes the panel (but only if there are no unsaved changes;
  // dirty state requires the user to use the × button which prompts).
  useEffect(() => {
    if (!docId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || isDirty) return;
      // Skip when focus is inside the panel's textarea — let the user finish editing first.
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      setPanelDocumentId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [docId, isDirty, setPanelDocumentId]);

  async function handleSave() {
    if (!meta) return;
    setSaving(true);
    try {
      await writeDocumentContent(meta.filePath, content);
      setOriginal(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (isDirty && !confirm('Discard unsaved changes?')) return;
    setPanelDocumentId(null);
  }

  if (!docId) return null;

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border-l border-slate-700 min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={14} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-medium text-white truncate">{meta?.title ?? '…'}</span>
          {isDirty && <span className="text-xs text-amber-400 flex-shrink-0">●</span>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="text-xs flex items-center gap-1 px-2 py-0.5 rounded transition disabled:opacity-30 bg-blue-600 hover:bg-blue-500 text-white"
            title="Save (Ctrl+S)"
          >
            <Save size={11} /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white hover:bg-slate-700 w-6 h-6 flex items-center justify-center rounded transition"
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>
      {error && (
        <div className="px-3 py-1.5 bg-red-900/30 border-b border-red-700/40 text-xs text-red-300">{error}</div>
      )}
      <div className="flex-1 overflow-hidden min-h-0">
        {loading ? (
          <div className="p-4 text-xs text-gray-500">Loading…</div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); }
            }}
            placeholder="Empty document — start typing."
            spellCheck={false}
            className="w-full h-full bg-slate-900/40 text-sm text-gray-100 font-mono leading-relaxed p-4 resize-none focus:outline-none border-none"
          />
        )}
      </div>
    </div>
  );
}
