import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ExchangeLibrary() {
  const exchanges = useAppStore((s) => s.exchanges);
  const selectedId = useAppStore((s) => s.selectedExchangeId);
  const select = useAppStore((s) => s.selectExchange);
  const load = useAppStore((s) => s.loadExchanges);

  useEffect(() => { load(); }, []);

  const selected = exchanges.find((i) => i.id === selectedId);

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-64 border-r border-[var(--border)] overflow-y-auto">
        {exchanges.map((item) => (
          <div
            key={item.id}
            onClick={() => select(item.id)}
            className={`p-3 cursor-pointer border-b border-[var(--border)] ${
              item.id === selectedId ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
            }`}
          >
            <div className="font-medium">{String(item.prompt)}</div>
            <div className="text-xs text-[var(--text-secondary)]">{String(item.model ?? '')}</div>
            <div className="text-xs text-[var(--text-secondary)]">{String(item.rating ?? '')}</div>
          </div>
        ))}
      </div>

      {/* Detail */}
      <div className="flex-1 p-6">
        {selected ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">{String(selected.prompt)}</h2>
            <div className="mb-2"><span className="text-[var(--text-secondary)]">prompt:</span> {String(selected.prompt ?? '')}</div>
            <div className="mb-2"><span className="text-[var(--text-secondary)]">model:</span> {String(selected.model ?? '')}</div>
            <div className="mb-2"><span className="text-[var(--text-secondary)]">rating:</span> {String(selected.rating ?? '')}</div>
            <div className="mb-2"><span className="text-[var(--text-secondary)]">createdAt:</span> {String(selected.createdAt ?? '')}</div>
          </div>
        ) : (
          <div className="text-[var(--text-secondary)]">Select an item to view details</div>
        )}
      </div>
    </div>
  );
}
