import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import TitleBar from './TitleBar';
import PlatformChooser from './PlatformChooser';
import BootSequence from './BootSequence';
import Workspace from './Workspace';

const App: React.FC = () => {
  const { stage, profile, initialize, chooseProfileHandle } = useAppStore();
  const [handle, setHandle] = useState('');

  useEffect(() => {
    initialize();
  }, [initialize]);

  // First-run: ask for handle (BBS-style)
  if (!profile) {
    return (
      <div className="flex flex-col h-screen bg-[var(--bg-page)]">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md px-8">
            <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-2">
              GEN-X LAYER SIMULATOR / NEW USER REGISTRATION
            </p>
            <h1 className="text-2xl font-bold mb-6">Choose a handle.</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
              This is the name you would have used on a BBS. Letters, numbers,
              underscores. Any length you want; eight characters or fewer was
              the convention.
            </p>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && handle.trim()) {
                  chooseProfileHandle(handle.trim());
                }
              }}
              autoFocus
              placeholder="e.g. zardoz, megablast, sysop"
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              disabled={!handle.trim()}
              onClick={() => chooseProfileHandle(handle.trim())}
              className="mt-4 w-full py-2 rounded-md bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 text-black font-semibold text-sm"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-page)]">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        {stage === 'chooser' && <PlatformChooser />}
        {stage === 'booting' && <BootSequence />}
        {stage === 'workspace' && <Workspace />}
      </div>
    </div>
  );
};

export default App;
