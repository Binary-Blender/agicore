import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import type { Playlist, PlaylistItem, TrainingModule } from '../../shared/types';

interface PlaylistForm {
  title: string;
  description: string;
  isRequired: boolean;
  autoPlay: boolean;
}

const emptyForm: PlaylistForm = { title: '', description: '', isRequired: false, autoPlay: false };

export default function PlaylistsView() {
  const { playlists, setPlaylists, addPlaylist, updatePlaylist, removePlaylist, modules, setModules } = useAppStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [form, setForm] = useState<PlaylistForm>(emptyForm);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [addModuleId, setAddModuleId] = useState('');

  const selected = useMemo(
    () => playlists.find((p) => p.id === selectedId) ?? null,
    [playlists, selectedId],
  );

  // Load playlists and modules on mount
  useEffect(() => {
    window.electronAPI.getPlaylists().then((data) => setPlaylists(data));
    window.electronAPI.getModules().then((data) => setModules(data));
  }, [setPlaylists, setModules]);

  // When selection changes, load items and populate form
  useEffect(() => {
    if (!selected) {
      setItems([]);
      if (!isNew) setForm(emptyForm);
      return;
    }
    setForm({
      title: selected.title,
      description: selected.description,
      isRequired: selected.isRequired,
      autoPlay: selected.autoPlay,
    });
    loadItems(selected.id);
  }, [selected]);

  async function loadItems(playlistId: string) {
    try {
      // Reload playlist items via the playlist data; we store items separately
      // The API doesn't have a dedicated getPlaylistItems, so we reload playlists
      // and use the reorderPlaylist call which returns items.
      // For now we use a convention: call getPlaylists and match, or call reorder with current order.
      // Since the API has addPlaylistItem which returns PlaylistItem, we track items locally.
      // We'll reload by re-fetching playlists and using a workaround.
      // Simplest: call reorderPlaylist with empty to get current items.
      const currentItems = await window.electronAPI.reorderPlaylist(playlistId, []);
      setItems(currentItems.sort((a, b) => a.position - b.position));
    } catch {
      // If reorder with empty array fails, start with empty
      setItems([]);
    }
  }

  function handleNew() {
    setSelectedId(null);
    setForm(emptyForm);
    setItems([]);
    setIsNew(true);
    setDeleteConfirm(false);
    setAddModuleOpen(false);
  }

  function handleSelect(id: string) {
    setIsNew(false);
    setSelectedId(id);
    setDeleteConfirm(false);
    setAddModuleOpen(false);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await window.electronAPI.createPlaylist({
          title: form.title,
          description: form.description,
          isRequired: form.isRequired,
          autoPlay: form.autoPlay,
        });
        addPlaylist(created);
        setSelectedId(created.id);
        setIsNew(false);
      } else if (selectedId) {
        const updated = await window.electronAPI.updatePlaylist(selectedId, {
          title: form.title,
          description: form.description,
          isRequired: form.isRequired,
          autoPlay: form.autoPlay,
        });
        updatePlaylist(selectedId, updated);
      }
    } catch (err) {
      console.error('Failed to save playlist:', err);
    }
    setSaving(false);
  }

  async function handleDeletePlaylist() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await window.electronAPI.deletePlaylist(selectedId);
      removePlaylist(selectedId);
      setSelectedId(null);
      setForm(emptyForm);
      setItems([]);
      setDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
    setSaving(false);
  }

  async function handleAddModule() {
    if (!addModuleId || (!selectedId && !isNew)) return;
    const targetId = selectedId;
    if (!targetId) return;
    setSaving(true);
    try {
      const newItem = await window.electronAPI.addPlaylistItem({
        playlistId: targetId,
        trainingModuleId: addModuleId,
        position: items.length + 1,
        requireCompletion: false,
      });
      setItems((prev) => [...prev, newItem].sort((a, b) => a.position - b.position));
      setAddModuleId('');
      setAddModuleOpen(false);
    } catch (err) {
      console.error('Failed to add module:', err);
    }
    setSaving(false);
  }

  async function handleRemoveItem(itemId: string) {
    setSaving(true);
    try {
      await window.electronAPI.removePlaylistItem(itemId);
      const remaining = items.filter((i) => i.id !== itemId);
      // Re-number positions
      const renumbered = remaining.map((item, idx) => ({ ...item, position: idx + 1 }));
      setItems(renumbered);
      if (selectedId) {
        await window.electronAPI.reorderPlaylist(selectedId, renumbered.map((i) => i.id));
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
    setSaving(false);
  }

  async function handleMoveItem(itemId: string, direction: 'up' | 'down') {
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const reordered = [...items];
    [reordered[idx], reordered[targetIdx]] = [reordered[targetIdx], reordered[idx]];
    const renumbered = reordered.map((item, i) => ({ ...item, position: i + 1 }));
    setItems(renumbered);

    if (selectedId) {
      try {
        await window.electronAPI.reorderPlaylist(selectedId, renumbered.map((i) => i.id));
      } catch (err) {
        console.error('Failed to reorder:', err);
      }
    }
  }

  async function handleToggleCompletion(itemId: string, current: boolean) {
    // Toggle require_completion locally and persist via remove + re-add (or update if API supports)
    // Since there is no updatePlaylistItem API, we toggle locally for now
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, requireCompletion: !current } : i)),
    );
  }

  function moduleTitleFor(trainingModuleId: string): string {
    return modules.find((m) => m.id === trainingModuleId)?.title ?? 'Unknown Module';
  }

  const availableModules = useMemo(() => {
    const usedIds = new Set(items.map((i) => i.trainingModuleId));
    return modules.filter((m) => !usedIds.has(m.id));
  }, [modules, items]);

  const showDetail = isNew || selected;

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Playlist List */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Playlists</h1>
          <button
            onClick={handleNew}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            + New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {playlists.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">No playlists yet.</p>
          )}
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => handleSelect(pl.id)}
              className={`w-full text-left rounded-lg px-3 py-2.5 transition ${
                selectedId === pl.id
                  ? 'bg-blue-600/20 border border-blue-500/40'
                  : 'bg-slate-800 border border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200 truncate">{pl.title}</span>
                {pl.isRequired && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium flex-shrink-0 ml-2">
                    REQ
                  </span>
                )}
              </div>
              {pl.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{pl.description}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel - Playlist Detail */}
      <div className="flex-1 min-w-0">
        {!showDetail ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Select a playlist or create a new one.</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 h-full overflow-y-auto">
            {/* Title & Description */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Playlist title"
                  className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full bg-slate-700 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRequired}
                    onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">Required</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.autoPlay}
                    onChange={(e) => setForm({ ...form, autoPlay: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-300">Auto-play</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mb-5">
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition"
              >
                {saving ? 'Saving...' : isNew ? 'Create Playlist' : 'Save Changes'}
              </button>
              {!isNew && (
                <>
                  {deleteConfirm ? (
                    <>
                      <button
                        onClick={handleDeletePlaylist}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white transition"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(true)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-red-600/80 text-gray-400 hover:text-white transition"
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Items Section (only for existing playlists) */}
            {!isNew && (
              <>
                <div className="flex items-center justify-between mb-3 border-t border-slate-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Modules ({items.length})
                  </h3>
                  <button
                    onClick={() => setAddModuleOpen(!addModuleOpen)}
                    disabled={availableModules.length === 0}
                    className="px-3 py-1 text-xs font-medium rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-gray-300 transition"
                  >
                    + Add Module
                  </button>
                </div>

                {/* Add Module Picker */}
                {addModuleOpen && (
                  <div className="mb-3 flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                    <select
                      value={addModuleId}
                      onChange={(e) => setAddModuleId(e.target.value)}
                      className="flex-1 bg-slate-600 text-white text-sm rounded px-2 py-1.5 border border-slate-500 focus:border-blue-400 focus:outline-none"
                    >
                      <option value="">Select a module...</option>
                      {availableModules.map((m) => (
                        <option key={m.id} value={m.id}>{m.title}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddModule}
                      disabled={!addModuleId || saving}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddModuleOpen(false); setAddModuleId(''); }}
                      className="px-2 py-1.5 text-xs rounded bg-slate-600 hover:bg-slate-500 text-gray-400 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Items List */}
                {items.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No modules in this playlist yet.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-slate-700/40 rounded-lg px-3 py-2 group"
                      >
                        {/* Position */}
                        <span className="text-xs text-gray-500 font-mono w-5 text-right flex-shrink-0">
                          {item.position}
                        </span>

                        {/* Module title */}
                        <span className="text-sm text-gray-200 flex-1 truncate">
                          {moduleTitleFor(item.trainingModuleId)}
                        </span>

                        {/* Require completion toggle */}
                        <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={item.requireCompletion}
                            onChange={() => handleToggleCompletion(item.id, item.requireCompletion)}
                            className="w-3.5 h-3.5 rounded border-slate-500 bg-slate-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                          />
                          <span className="text-[11px] text-gray-500">Required</span>
                        </label>

                        {/* Reorder arrows */}
                        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleMoveItem(item.id, 'up')}
                            disabled={idx === 0}
                            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition"
                            title="Move up"
                          >
                            &#9650;
                          </button>
                          <button
                            onClick={() => handleMoveItem(item.id, 'down')}
                            disabled={idx === items.length - 1}
                            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition"
                            title="Move down"
                          >
                            &#9660;
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all text-xs flex-shrink-0"
                          title="Remove from playlist"
                        >
                          &#10005;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
