import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic',  sublabel: 'Claude Sonnet / Haiku',   placeholder: 'sk-ant-...',  docs: 'console.anthropic.com' },
  { id: 'openai',    label: 'OpenAI',     sublabel: 'GPT-4o / GPT-4o Mini',    placeholder: 'sk-...',      docs: 'platform.openai.com' },
  { id: 'google',    label: 'Google',     sublabel: 'Gemini 2.5 Flash',         placeholder: 'AIza...',     docs: 'aistudio.google.com' },
  { id: 'xai',       label: 'xAI',        sublabel: 'Grok 3',                  placeholder: 'xai-...',     docs: 'console.x.ai' },
];

interface Props {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: Props) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAnyKey = PROVIDERS.some((p) => (keys[p.id] ?? '').trim().length > 0);

  async function handleSave() {
    setSaving(true);
    setError(null);
    let saved = 0;
    for (const p of PROVIDERS) {
      const value = (keys[p.id] ?? '').trim();
      if (value) {
        try {
          await invoke('set_api_key', { provider: p.id, key: value });
          saved++;
        } catch (e) {
          setError(`Failed to save ${p.label} key: ${e}`);
          setSaving(false);
          return;
        }
      }
    }
    if (saved === 0) {
      setError('Enter at least one API key to continue.');
      setSaving(false);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome to NovaSyn Chat</h1>
          <p className="text-sm text-gray-400">Add at least one API key to get started. Keys are stored locally on your device.</p>
        </div>

        {/* Key fields */}
        <div className="space-y-3 mb-6">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-semibold text-white">{p.label}</span>
                <span className="text-xs text-gray-500">{p.sublabel}</span>
              </div>
              <input
                type="password"
                placeholder={p.placeholder}
                value={keys[p.id] ?? ''}
                onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-4 text-center">{error}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleSave}
          disabled={!hasAnyKey || saving}
          className="w-full py-3 rounded-xl font-semibold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white"
        >
          {saving ? 'Saving…' : "Let's go →"}
        </button>

        <p className="text-xs text-gray-600 text-center mt-4">
          You can add or update keys any time from the API Keys button in the sidebar.
        </p>
      </div>
    </div>
  );
}
