import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const TitleBar: React.FC = () => {
  const minimize = () => getCurrentWindow().minimize();
  const toggleMax = () => getCurrentWindow().toggleMaximize();
  const close = () => getCurrentWindow().close();

  return (
    <div
      className="h-9 flex items-center justify-between px-3 bg-[var(--bg-panel)] border-b border-[var(--border)] select-none"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2 pointer-events-none">
        <span className="text-sm font-semibold tracking-wide">Agicore Studio</span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] ml-2">
          Sprint 0 · Bench
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        <button onClick={minimize}  className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-input)]" title="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"/></svg>
        </button>
        <button onClick={toggleMax} className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-input)]" title="Maximize">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="0.5" y="0.5" width="7" height="7"/></svg>
        </button>
        <button onClick={close}     className="w-7 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-red-700 hover:text-white" title="Close">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.2"><line x1="1" y1="1" x2="8" y2="8"/><line x1="8" y1="1" x2="1" y2="8"/></svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
