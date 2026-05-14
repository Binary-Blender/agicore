import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';

export function ExchangeLibrary() {
  const exchanges = useAppStore((s) => s.exchanges);
  const selectedId = useAppStore((s) => s.selectedExchangeId);
  const select = useAppStore((s) => s.selectExchange);
  const load = useAppStore((s) => s.loadExchanges);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const selected = exchanges.find((i) => i.id === selectedId) ?? null;
  const filtered = search
    ? exchanges.filter((i) => String(i.prompt ?? '').toLowerCase().includes(search.toLowerCase()))
    : exchanges;

  async function handleCreate() {
    try {
      await invoke('create_exchange', { input: { prompt: form.prompt ?? '', response: form.response ?? '', model: form.model ?? '', provider: form.provider ?? '', rating: Number(form.rating) || 0, success: form.success === 'true', userId: 'default-user' } });
      await load();
      setCreating(false);
      setForm({});
    } catch (err) { console.error('Create failed:', err); }
  }
  async function handleDelete(id: string) {
    try {
      await invoke('delete_exchange', { id });
      if (selectedId === id) select(null);
      await load();
      setConfirmDeleteId(null);
    } catch (err) { console.error('Delete failed:', err); }
  }
  return (
    <div className="flex h-full relative">
      {/* List pane */}
      <div className="w-64 border-r border-[var(--border)] flex flex-col flex-shrink-0">
        <div className="flex items-center gap-1 p-2 border-b border-[var(--border)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-[var(--bg-hover)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => { setCreating(true); setForm({}); }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg leading-none flex-shrink-0"
            title="New"
          >+</button>
        </div>
        {creating && (
          <div className="border-b border-[var(--border)] p-3 bg-[var(--bg-panel)]/50">
            <div className="mb-2">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">prompt</label>
              <input type="text" value={form.prompt || ''} onChange={(e) => setForm((p) => ({...p, prompt: e.target.value}))} className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
            </div>
            <div className="mb-2">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">response</label>
              <input type="text" value={form.response || ''} onChange={(e) => setForm((p) => ({...p, response: e.target.value}))} className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
            </div>
            <div className="mb-2">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">model</label>
              <input type="text" value={form.model || ''} onChange={(e) => setForm((p) => ({...p, model: e.target.value}))} className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
            </div>
            <div className="mb-2">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">provider</label>
              <input type="text" value={form.provider || ''} onChange={(e) => setForm((p) => ({...p, provider: e.target.value}))} className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
            </div>
            <div className="mb-2">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">rating</label>
              <input type="number" min="1" max="5" value={form.rating || ''} onChange={(e) => setForm((p) => ({...p, rating: e.target.value}))} placeholder="1–5" className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
            </div>
            <div className="mb-2">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">success</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-primary)]"><input type="checkbox" checked={form.success === 'true'} onChange={(e) => setForm((p) => ({...p, success: String(e.target.checked)}))} className="w-4 h-4 rounded" /><span>Enabled</span></label>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={handleCreate} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition">Create</button>
              <button onClick={() => { setCreating(false); setForm({}); }} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded transition">Cancel</button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)] px-3 py-4 text-center">
              {search ? 'No results.' : 'No items. Click + to create.'}
            </p>
          )}
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => select(item.id)}
              className={`group flex items-center gap-1 px-3 py-2 cursor-pointer border-b border-[var(--border)] ${item.id === selectedId ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate"><span className="break-words">{String(item.prompt ?? '')}</span></div>
                <div className="flex items-center gap-1"><span className="break-words">{String(item.model ?? '')}</span></div>
                <div className="flex items-center gap-1"><span className="text-yellow-400">{'★'.repeat(Math.min(5, Number(item.rating) || 0))}{'☆'.repeat(Math.max(0, 5 - (Number(item.rating) || 0)))}</span></div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-red-400 p-0.5 rounded hover:bg-[var(--bg-hover)] transition flex-shrink-0 text-xs ml-1"
                title="Delete"
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selected ? (
          <div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setConfirmDeleteId(selected.id)} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-1.5 rounded transition">Delete</button>
            </div>
            <div>
              <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border)]/40 last:border-0">
                <span className="text-[var(--text-secondary)] text-xs w-32 flex-shrink-0 pt-0.5">prompt</span>
                <div className="text-sm flex-1 min-w-0"><span className="break-words">{String(selected.prompt ?? '')}</span></div>
              </div>
              <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border)]/40 last:border-0">
                <span className="text-[var(--text-secondary)] text-xs w-32 flex-shrink-0 pt-0.5">model</span>
                <div className="text-sm flex-1 min-w-0"><span className="break-words">{String(selected.model ?? '')}</span></div>
              </div>
              <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border)]/40 last:border-0">
                <span className="text-[var(--text-secondary)] text-xs w-32 flex-shrink-0 pt-0.5">rating</span>
                <div className="text-sm flex-1 min-w-0"><span className="text-yellow-400">{'★'.repeat(Math.min(5, Number(selected.rating) || 0))}{'☆'.repeat(Math.max(0, 5 - (Number(selected.rating) || 0)))}</span></div>
              </div>
              <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border)]/40 last:border-0">
                <span className="text-[var(--text-secondary)] text-xs w-32 flex-shrink-0 pt-0.5">createdAt</span>
                <div className="text-sm flex-1 min-w-0"><span className="break-words">{String(selected.createdAt ?? '')}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--text-secondary)] text-sm">Select an item to view details</p>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-2xl w-72 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Delete this item?</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded transition">Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
