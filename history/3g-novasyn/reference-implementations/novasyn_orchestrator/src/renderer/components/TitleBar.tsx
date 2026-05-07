import React from 'react';

interface Props {
  onOpenVault?: () => void;
}

const TitleBar: React.FC<Props> = ({ onOpenVault }) => {
  return (
    <div
      className="h-10 flex items-center justify-between px-3 bg-slate-900 border-b border-slate-700 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* App title */}
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-purple-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            NovaSyn Orchestrator
          </span>
          <span className="text-[10px] text-gray-500 hidden sm:inline">
            Cross-App AI Workflow Builder
          </span>
        </div>
      </div>

      {/* Window controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {onOpenVault && (
          <button
            onClick={onOpenVault}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
            title="NS Vault"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </button>
        )}
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
          title="Minimize"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
          title="Maximize"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-600 text-gray-400 hover:text-white transition-colors"
          title="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
