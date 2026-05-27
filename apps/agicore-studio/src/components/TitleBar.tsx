import React, { useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import SettingsPanel from './SettingsPanel';

const TitleBar: React.FC = () => {
  const minimize = () => getCurrentWindow().minimize();
  const toggleMax = () => getCurrentWindow().toggleMaximize();
  const close = () => getCurrentWindow().close();
  const newWindow = () => {
    void invoke('open_studio_window').catch((e) =>
      console.error('open_studio_window failed:', e),
    );
  };
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div
        className="h-9 flex items-center justify-between px-3 bg-[var(--bg-panel)] border-b border-[var(--border)] select-none"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <span className="text-sm font-semibold tracking-wide">Agicore Studio</span>
          <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] ml-2">
            MVP
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={newWindow}
            className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]"
            title="Open a new Studio window"
            aria-label="Open a new Studio window"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="13" height="13" rx="1.5" />
              <path d="M8 10h13v9a1 1 0 0 1-1 1h-12a1 1 0 0 1-1-1z" />
            </svg>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]"
            title="Settings"
            aria-label="Open settings"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button onClick={minimize}  className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-input)]" title="Minimize" aria-label="Minimize window">
            <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor" aria-hidden="true"><rect width="10" height="1"/></svg>
          </button>
          <button onClick={toggleMax} className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-input)]" title="Maximize" aria-label="Maximize window">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="0.5" y="0.5" width="7" height="7"/></svg>
          </button>
          <button onClick={close}     className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-red-700 hover:text-white" title="Close" aria-label="Close window">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><line x1="1" y1="1" x2="8" y2="8"/><line x1="8" y1="1" x2="1" y2="8"/></svg>
          </button>
        </div>
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </>
  );
};

export default TitleBar;
