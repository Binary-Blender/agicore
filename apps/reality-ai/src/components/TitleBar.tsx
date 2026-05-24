import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const TitleBar: React.FC = () => {
  const handleMinimize = () => getCurrentWindow().minimize();
  const handleMaximize = () => getCurrentWindow().toggleMaximize();
  const handleClose = () => getCurrentWindow().close();

  return (
    <div
      className="h-9 flex items-center justify-between px-4 bg-[var(--bg-panel)] border-b border-[var(--border)] select-none"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2 pointer-events-none">
        <div className="relative flex items-center justify-center w-4 h-4">
          <div
            className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]"
            style={{ animation: 'pulse-red 2s ease-in-out infinite' }}
          />
          <div
            className="absolute w-4 h-4 rounded-full border border-[var(--accent)]"
            style={{ animation: 'pulse-red 2s ease-in-out infinite', opacity: 0.3 }}
          />
        </div>
        <span className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
          Reality.AI
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title="Maximize"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="0.5" y="0.5" width="8" height="8" rx="0.5" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-white hover:bg-[var(--accent)] transition-colors"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3">
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
