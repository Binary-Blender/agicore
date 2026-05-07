import React from 'react';
import { useCouncilStore } from '../store/councilStore';

export default function Sidebar() {
  const {
    personas,
    currentPersona,
    currentView,
    selectPersona,
    setCurrentView,
    setShowPersonaBuilder,
    setEditingPersona,
    setShowSettings,
    setShowSearchPanel,
  } = useCouncilStore();

  return (
    <div className="w-14 bg-[var(--bg-panel)] border-r border-white/5 flex flex-col items-center py-2 shrink-0">
      {/* Add persona button */}
      <button
        onClick={() => {
          setEditingPersona(null);
          setShowPersonaBuilder(true);
        }}
        className="w-10 h-10 rounded-lg bg-primary-600/20 hover:bg-primary-600/40 text-primary-400 flex items-center justify-center text-lg transition-colors mb-3"
        title="Create Persona"
      >
        +
      </button>

      {/* Persona avatars */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center gap-1.5 min-h-0 w-full px-1">
        {personas.map((persona) => (
          <button
            key={persona.id}
            onClick={() => selectPersona(persona)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all shrink-0 ${
              currentPersona?.id === persona.id
                ? 'bg-primary-600/30 ring-2 ring-primary-500'
                : 'bg-white/5 hover:bg-white/10'
            }`}
            title={`${persona.name} — ${persona.role}`}
          >
            {persona.avatarEmoji}
          </button>
        ))}
      </div>

      {/* Bottom nav */}
      <div className="flex flex-col items-center gap-1.5 mt-2">
        {/* Dashboard */}
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-colors ${
            currentView === 'dashboard'
              ? 'bg-primary-600/30 text-primary-400'
              : 'text-surface-500 hover:text-surface-300 hover:bg-white/5'
          }`}
          title="Dashboard"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
        </button>

        {/* Search */}
        <button
          onClick={() => setShowSearchPanel(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-300 hover:bg-white/5 transition-colors"
          title="Search (Ctrl+K)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        {/* Analytics */}
        <button
          onClick={() => useCouncilStore.getState().setShowAnalytics(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-300 hover:bg-white/5 transition-colors"
          title="Cost Analytics"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </button>

        {/* Meetings */}
        <button
          onClick={() => useCouncilStore.getState().setShowMeetingCreator(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-300 hover:bg-white/5 transition-colors"
          title="New Meeting"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-300 hover:bg-white/5 transition-colors"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>
    </div>
  );
}
