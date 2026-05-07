import React from 'react';

export function TitleBar() {
  return (
    <div
      className="flex items-center justify-between h-9 bg-slate-950 border-b border-slate-800 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3">
        <span className="text-amber-400 text-sm">&#9776;</span>
        <span className="text-xs font-semibold text-gray-300 tracking-wide">NovaSyn Forge</span>
      </div>
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="h-full px-3 text-gray-400 hover:bg-slate-800 hover:text-white text-xs transition"
        >
          &#8212;
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="h-full px-3 text-gray-400 hover:bg-slate-800 hover:text-white text-xs transition"
        >
          &#9633;
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="h-full px-3 text-gray-400 hover:bg-red-600 hover:text-white text-xs transition"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
