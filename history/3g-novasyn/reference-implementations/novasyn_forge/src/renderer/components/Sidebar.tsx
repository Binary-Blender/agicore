import React from 'react';
import { useForgeStore, ForgeView } from '../store/forgeStore';

const NAV_ITEMS: { view: ForgeView; icon: string; label: string }[] = [
  { view: 'dashboard', icon: '\u2302', label: 'Dashboard' },
  { view: 'new-project', icon: '+', label: 'New Project' },
];

export function Sidebar() {
  const { currentView, setCurrentView } = useForgeStore();

  return (
    <div className="w-14 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3 gap-1 flex-shrink-0">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.view}
          onClick={() => setCurrentView(item.view)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition ${
            currentView === item.view
              ? 'bg-amber-500/20 text-amber-400'
              : 'text-gray-500 hover:bg-slate-800 hover:text-gray-300'
          }`}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={() => setCurrentView('settings')}
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition ${
          currentView === 'settings'
            ? 'bg-amber-500/20 text-amber-400'
            : 'text-gray-500 hover:bg-slate-800 hover:text-gray-300'
        }`}
        title="Settings"
      >
        &#9881;
      </button>
    </div>
  );
}
