import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function TagManager() {
  const tags = useAppStore((s) => s.tags);
  const load = useAppStore((s) => s.loadTags);

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">TagManager</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-2 px-3">name</th>
            <th className="text-left py-2 px-3">color</th>
            <th className="text-left py-2 px-3">usageCount</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((item) => (
            <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
              <td className="py-2 px-3">{String(item.name ?? '')}</td>
              <td className="py-2 px-3">{String(item.color ?? '')}</td>
              <td className="py-2 px-3">{String(item.usageCount ?? '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
