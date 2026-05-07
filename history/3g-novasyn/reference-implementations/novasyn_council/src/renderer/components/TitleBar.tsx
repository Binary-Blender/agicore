import React from 'react';

interface Props {
  onOpenVault?: () => void;
  onOpenOrchestrations?: () => void;
}

export default function TitleBar({ onOpenVault, onOpenOrchestrations }: Props) {
  return (
    <div
      className="h-10 bg-[var(--bg-panel)] flex items-center justify-between px-4 select-none shrink-0 border-b border-white/5"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">🏛️</span>
        <span className="text-primary-400 font-bold text-sm">NovaSyn Council</span>
      </div>

      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {onOpenOrchestrations && (
          <button
            onClick={onOpenOrchestrations}
            className="text-xs text-surface-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded transition-colors mr-1"
            title="Orchestrations"
          >
            Orch
          </button>
        )}
        {onOpenVault && (
          <button
            onClick={onOpenVault}
            className="text-xs text-surface-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded transition-colors mr-1"
            title="NS Vault"
          >
            Vault
          </button>
        )}
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-surface-400 hover:text-white transition-colors"
          title="Minimize"
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
            <rect width="12" height="2" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-surface-400 hover:text-white transition-colors"
          title="Maximize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="10" height="10" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-500/80 rounded text-surface-400 hover:text-white transition-colors"
          title="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
