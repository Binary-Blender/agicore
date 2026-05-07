import React, { useState, useRef, useEffect } from 'react';
import { useCodeStore } from '../store/codeStore';

const PROVIDER_ORDER = ['anthropic', 'openai', 'google', 'xai'];
const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'ANTHROPIC',
  openai: 'OPENAI',
  google: 'GOOGLE',
  xai: 'XAI',
};

export default function ModelSelector() {
  const { models, apiKeys, selectedModels, setSelectedModels } = useCodeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currentId = selectedModels[0] || '';
  const currentModel = models.find((m) => m.id === currentId);
  const displayName = currentModel ? currentModel.name : currentId || 'Select model';

  // Group models by provider
  const grouped: Record<string, typeof models> = {};
  for (const m of models) {
    if (!grouped[m.provider]) grouped[m.provider] = [];
    grouped[m.provider].push(m);
  }

  const hasKey = (provider: string) => !!apiKeys[provider];

  const selectModel = (id: string) => {
    setSelectedModels([id]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition-colors flex items-center gap-1 max-w-[160px]"
        title={displayName}
      >
        <span className="truncate">{displayName}</span>
        <svg className="w-3 h-3 flex-shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {PROVIDER_ORDER.map((provider) => {
            const providerModels = grouped[provider];
            if (!providerModels || providerModels.length === 0) return null;
            const enabled = hasKey(provider);

            return (
              <div key={provider}>
                <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase border-b border-slate-700/50">
                  {PROVIDER_LABELS[provider] || provider.toUpperCase()}
                  {!enabled && <span className="ml-1 text-slate-600">(no key)</span>}
                </div>
                {providerModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => enabled && selectModel(m.id)}
                    disabled={!enabled}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      m.id === currentId
                        ? 'bg-blue-600/20 text-blue-300'
                        : enabled
                        ? 'text-slate-300 hover:bg-slate-700'
                        : 'text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
