import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';

export function TagManager() {
  const tags = useAppStore((s) => s.tags);
  const load = useAppStore((s) => s.loadTags);
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const filtered = search
    ? tags.filter((i) => String(i.name ?? '').toLowerCase().includes(search.toLowerCase()))
    : tags;

  async function handleCreate() {
    try {
      await invoke('create_tag', { input: { name: form.name ?? '', color: form.color ?? '', userId: 'default-user' } });
      await load();
      setModalMode(null);
      setForm({});
    } catch (err) { console.error('Create failed:', err); }
  }
  async function handleUpdate() {
    if (!editingId) return;
    try {
      await invoke('update_tag', { id: editingId, input: { name: form.name ?? '', color: form.color ?? '' } });
      await load();
      setModalMode(null);
      setEditingId(null);
    } catch (err) { console.error('Update failed:', err); }
  }
  async function handleDelete(id: string) {
    try {
      await invoke('delete_tag', { id });
      await load();
      setConfirmDeleteId(null);
    } catch (err) { console.error('Delete failed:', err); }
  }
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] flex-shrink-0">
        <h2 className="text-lg font-semibold flex-shrink-0">TagManager</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => { setModalMode('create'); setForm({}); }}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition flex-shrink-0"
        >+ New</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-page)] z-10">
            <tr className="border-b border-[var(--border)]">
            <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">name</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">color</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">usageCount</th>
            <th className="w-24"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-[var(--text-secondary)] text-sm">
                  {search ? 'No results.' : 'No items yet. Click + New to create one.'}
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id} className="group border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition">
              <td className="py-2.5 px-3 text-sm"><span className="break-words">{String(item.name ?? '')}</span></td>
              <td className="py-2.5 px-3 text-sm"><span className="flex items-center gap-1.5"><span style={{background: String(item.color || '#888')}} className="inline-block w-3 h-3 rounded-full border border-[var(--border)] flex-shrink-0" /><span>{String(item.color ?? '')}</span></span></td>
              <td className="py-2.5 px-3 text-sm"><span>{item.usageCount != null ? Number(item.usageCount).toLocaleString() : '—'}</span></td>
              <td className="py-2.5 px-3">
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setModalMode('edit'); setForm({name: String(item.name ?? ''), color: String(item.color ?? '')}); }} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-hover)] px-2 py-0.5 rounded transition">Edit</button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 px-2 py-0.5 rounded transition">Delete</button>
                </div>
              </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMode !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setModalMode(null)}>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-2xl w-96 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">{modalMode === 'create' ? 'New Tag' : 'Edit Tag'}</h3>
            <div className="mb-3">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">name</label>
              <input type="text" value={form.name || ''} onChange={(e) => setForm((p) => ({...p, name: e.target.value}))} className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" />
            </div>
            <div className="mb-3">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">color</label>
              <div className="flex gap-2 items-center"><input type="color" value={form.color || '#3B82F6'} onChange={(e) => setForm((p) => ({...p, color: e.target.value}))} className="h-8 w-12 rounded border border-[var(--border)] bg-[var(--bg-hover)] cursor-pointer p-0.5 flex-shrink-0" /><input type="text" value={form.color || ''} onChange={(e) => setForm((p) => ({...p, color: e.target.value}))} placeholder="#3B82F6" className="flex-1 bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setModalMode(null)} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-hover)] px-4 py-1.5 rounded transition">Cancel</button>
              <button onClick={async () => { if (modalMode === 'create') { await handleCreate(); } else { await handleUpdate(); } }} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded transition">{modalMode === 'create' ? 'Create' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-2xl w-72 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Delete this tag?</h3>
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
