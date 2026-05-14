import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
  const win = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="h-9 bg-[var(--bg-titlebar)] flex items-center justify-between px-3 select-none shrink-0"
    >
      <span className="text-sm font-medium text-[var(--text-secondary)] pointer-events-none">
        NovaSyn Chat
      </span>
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => win.minimize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Minimize"
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
            <rect width="12" height="2" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Maximize"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="0.75" y="0.75" width="9.5" height="9.5" rx="1.25" />
          </svg>
        </button>
        <button
          onClick={() => win.close()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/80 text-[var(--text-secondary)] hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="10" y2="10" />
            <line x1="10" y1="1" x2="1" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
