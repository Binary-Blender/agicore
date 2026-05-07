import React, { useEffect, useState, useRef } from 'react';

interface ConnectedApp {
  appId: string;
  macros: string[];
}

export default function MacroIndicator() {
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    try {
      const available = await window.electronAPI.macroGetAvailable();
      // available is Record<appId, string[]> — convert to array, excluding self
      const apps: ConnectedApp[] = Object.entries(available || {})
        .filter(([appId]) => appId !== 'novasyn-code')
        .map(([appId, macros]) => ({ appId, macros: macros as string[] }));
      setConnectedApps(apps);
    } catch {
      setConnectedApps([]);
    }

    try {
      const pending = await window.electronAPI.macroGetPending();
      setPendingCount(pending?.length || 0);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isConnected = connectedApps.length > 0;

  return (
    <div
      className="relative flex items-center cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isConnected ? 'bg-emerald-400' : 'bg-slate-600'
        }`}
      />
      {pendingCount > 0 && (
        <span className="ml-0.5 text-[9px] text-amber-400 font-mono leading-none">
          {pendingCount}
        </span>
      )}

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-[10px] text-slate-300 whitespace-nowrap z-50 shadow-lg">
          {isConnected ? (
            <>
              <div className="font-semibold text-emerald-400 mb-0.5">Connected Apps</div>
              {connectedApps.map((app) => (
                <div key={app.appId} className="text-slate-400">
                  {app.appId} ({app.macros.length} macros)
                </div>
              ))}
            </>
          ) : (
            <span className="text-slate-500">No NovaSyn apps connected</span>
          )}
          {pendingCount > 0 && (
            <div className="mt-0.5 text-amber-400">
              {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
