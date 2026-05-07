import React from 'react';
import { useCodeStore } from '../store/codeStore';

export default function TitleBar() {
  const { currentProjectId, projects } = useCodeStore();
  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div
      className="h-9 flex items-center justify-between bg-slate-900 border-b border-slate-700 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3">
        <span className="text-sm font-bold text-blue-400">NS</span>
        <span className="text-sm font-medium text-slate-300">Code</span>
        {currentProject && (
          <>
            <span className="text-slate-600 text-xs">—</span>
            <span className="text-xs text-slate-400 truncate max-w-[300px]">{currentProject.name}</span>
          </>
        )}
      </div>
      <div
        className="flex"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="w-11 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
        >
          ─
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="w-11 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-700 transition-colors"
        >
          □
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="w-11 h-9 flex items-center justify-center text-slate-400 hover:bg-red-600 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}
