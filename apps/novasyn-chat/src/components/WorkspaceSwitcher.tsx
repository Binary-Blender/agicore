import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Plus, Database, ChevronDown } from 'lucide-react';

// WorkspaceSwitcher — switch the active SQLite database at runtime.
// Lists .db files in the same directory as the current DB via get_db_path,
// then calls switch_db with the chosen path.

export function WorkspaceSwitcher() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const path = await invoke<string>('get_db_path');
      setCurrentPath(path);
    } catch { /* command unavailable */ }
  };

  useEffect(() => { load(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchTo = async (path: string) => {
    try {
      await invoke<void>('switch_db', { newPath: path });
      setCurrentPath(path);
      setIsOpen(false);
      // Reload to re-initialize all stores with the new DB
      window.location.reload();
    } catch (e) {
      console.error('Failed to switch workspace:', e);
    }
  };

  const openExisting = async () => {
    const selected = await open({ multiple: false, filters: [{ name: 'Database', extensions: ['db'] }] });
    if (typeof selected === 'string') await switchTo(selected);
    setIsOpen(false);
  };

  const createNew = async () => {
    const dir = currentPath ? currentPath.split('/').slice(0, -1).join('/') : undefined;
    const path = await save({
      defaultPath: dir ? dir + '/workspace.db' : 'novasyn_chat_workspace.db',
      filters: [{ name: 'Database', extensions: ['db'] }],
    });
    if (path) await switchTo(path);
    setIsOpen(false);
  };

  const label = currentPath ? currentPath.split('/').pop() ?? currentPath : 'No workspace';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
        title={currentPath}
      >
        <Database size={13} className="shrink-0" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown size={11} className="shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1 text-sm">
          {currentPath && (
            <div className="px-3 py-1.5 text-xs text-[var(--text-muted)] truncate border-b border-[var(--border)] mb-1">
              {currentPath}
            </div>
          )}
          <button
            onClick={openExisting}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <FolderOpen size={13} />
            Open workspace…
          </button>
          <button
            onClick={createNew}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Plus size={13} />
            New workspace…
          </button>
        </div>
      )}
    </div>
  );
}
