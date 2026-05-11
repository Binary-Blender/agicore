import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function FolderPanel() {
  const folders = useAppStore((s) => s.folders);
  const selectedId = useAppStore((s) => s.selectedFolderId);
  const select = useAppStore((s) => s.selectFolder);
  const load = useAppStore((s) => s.loadFolders);

  useEffect(() => { load(); }, []);

  const selected = folders.find((i) => i.id === selectedId);

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-64 border-r border-[var(--border)] overflow-y-auto">
        {folders.map((item) => (
          <div
            key={item.id}
            onClick={() => select(item.id)}
            className={`p-3 cursor-pointer border-b border-[var(--border)] ${
              item.id === selectedId ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
            }`}
          >
            <div className="font-medium">{String(item.name)}</div>
            <div className="text-xs text-[var(--text-secondary)]">{String(item.totalTokens ?? '')}</div>
          </div>
        ))}
      </div>

      {/* Detail */}
      <div className="flex-1 p-6">
        {selected ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">{String(selected.name)}</h2>
            <div className="mb-2"><span className="text-[var(--text-secondary)]">name:</span> {String(selected.name ?? '')}</div>
            <div className="mb-2"><span className="text-[var(--text-secondary)]">totalTokens:</span> {String(selected.totalTokens ?? '')}</div>
          </div>
        ) : (
          <div className="text-[var(--text-secondary)]">Select an item to view details</div>
        )}
      </div>
    </div>
  );
}
