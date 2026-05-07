import React from 'react';

interface Props {
  onOpenVault?: () => void;
  onOpenOrchestrations?: () => void;
}

export default function TitleBar({ onOpenVault, onOpenOrchestrations }: Props) {
  return (
    <div
      className="h-9 flex items-center justify-between px-3 bg-[var(--bg-panel)] border-b border-[var(--border)] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">🎓</span>
        <span className="text-xs font-semibold text-[var(--text-heading)]">
          NovaSyn Academy
        </span>
      </div>

      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {onOpenOrchestrations && (
          <button
            onClick={onOpenOrchestrations}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-heading)] bg-[var(--border)]/50 hover:bg-[var(--border)] px-2.5 py-1 rounded transition-colors mr-1"
            title="Orchestrations"
          >
            Orch
          </button>
        )}
        {onOpenVault && (
          <button
            onClick={onOpenVault}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-heading)] bg-[var(--border)]/50 hover:bg-[var(--border)] px-2.5 py-1 rounded transition-colors mr-1"
            title="NS Vault"
          >
            Vault
          </button>
        )}
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
          title="Maximize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1" y="1" width="8" height="8" />
          </svg>
        </button>

        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/80 text-[var(--text-muted)] hover:text-white transition-colors"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.4">
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
