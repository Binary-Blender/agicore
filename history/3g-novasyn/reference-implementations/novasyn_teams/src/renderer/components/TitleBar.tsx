import React from 'react';
import { useTeamsStore } from '../store/teamsStore';

export function TitleBar() {
  const setShowVaultBrowser = useTeamsStore((s) => s.setShowVaultBrowser);
  const setShowOrchestrationBuilder = useTeamsStore((s) => s.setShowOrchestrationBuilder);
  const setShowSettings = useTeamsStore((s) => s.setShowSettings);

  const handleMinimize = () => window.electronAPI.windowMinimize();
  const handleMaximize = () => window.electronAPI.windowMaximize();
  const handleClose = () => window.electronAPI.windowClose();

  return (
    <div
      className="flex items-center justify-between h-10 px-4 bg-gradient-to-r from-teal-900 via-teal-800 to-blue-900 border-b border-slate-700 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left: App title */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">T</span>
        </div>
        <span className="text-sm font-semibold text-white tracking-wide">NovaSyn Teams</span>
      </div>

      {/* Right: Action buttons + window controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Vault button */}
        <button
          onClick={() => setShowVaultBrowser(true)}
          className="px-2.5 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
          title="NS Vault"
        >
          Vault
        </button>

        {/* Orchestrations button */}
        <button
          onClick={() => setShowOrchestrationBuilder(true)}
          className="px-2.5 py-1 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
          title="Orchestrations"
        >
          Orch
        </button>

        {/* Settings gear */}
        <button
          onClick={() => setShowSettings(true)}
          className="px-2 py-1 text-gray-300 hover:text-white hover:bg-white/10 rounded transition"
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* Separator */}
        <div className="w-px h-4 bg-white/20 mx-1" />

        {/* Window controls */}
        <button onClick={handleMinimize} className="px-2 py-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition text-sm">
          &#8211;
        </button>
        <button onClick={handleMaximize} className="px-2 py-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition text-sm">
          &#9633;
        </button>
        <button onClick={handleClose} className="px-2 py-1 text-gray-400 hover:text-white hover:bg-red-600/80 rounded transition text-sm">
          &times;
        </button>
      </div>
    </div>
  );
}
