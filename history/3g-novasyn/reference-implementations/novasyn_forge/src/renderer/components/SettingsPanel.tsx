import React, { useState, useEffect } from 'react';
import { useForgeStore } from '../store/forgeStore';

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...' },
  { id: 'openai', label: 'OpenAI (GPT)', placeholder: 'sk-...' },
  { id: 'google', label: 'Google (Gemini)', placeholder: 'AIza...' },
  { id: 'xai', label: 'xAI (Grok)', placeholder: 'gsk_...' },
  { id: 'babyai', label: 'BabyAI (HuggingFace)', placeholder: 'hf_...' },
];

export function SettingsPanel() {
  const { apiKeys, setApiKeys, settings, setSettings, setCurrentView } = useForgeStore();
  const [tempKeys, setTempKeys] = useState<Record<string, string>>({ ...apiKeys });
  const [devStackPath, setDevStackPath] = useState(settings?.devStackDocsPath || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTempKeys({ ...apiKeys });
    setDevStackPath(settings?.devStackDocsPath || '');
  }, [apiKeys, settings]);

  async function handleSaveKey(provider: string) {
    const key = tempKeys[provider]?.trim() || '';
    await window.electronAPI.setApiKey(provider, key);
    const updated = await window.electronAPI.getApiKeys();
    setApiKeys(updated);
  }

  async function handleSaveDevStackPath() {
    const dir = await window.electronAPI.selectProjectDir();
    if (dir) {
      setDevStackPath(dir);
      await window.electronAPI.saveSettings({ devStackDocsPath: dir });
      const s = await window.electronAPI.getSettings();
      setSettings(s);
    }
  }

  function maskKey(key: string): string {
    if (!key || key.length < 8) return key;
    return key.slice(0, 4) + '...' + key.slice(-4);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="text-xs text-gray-400 hover:text-white mb-4 transition"
        >
          &larr; Back
        </button>

        <h1 className="text-xl font-bold text-white mb-6">Settings</h1>

        {/* API Keys */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">API Keys</h2>
          <p className="text-xs text-gray-500 mb-3">
            Shared across all NovaSyn apps via %APPDATA%\NovaSyn\api-keys.json
          </p>
          <div className="space-y-3">
            {PROVIDERS.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <label className="text-xs text-gray-300 w-32 flex-shrink-0">{p.label}</label>
                <input
                  type="password"
                  value={tempKeys[p.id] || ''}
                  onChange={(e) => setTempKeys({ ...tempKeys, [p.id]: e.target.value })}
                  placeholder={apiKeys[p.id] ? maskKey(apiKeys[p.id]) : p.placeholder}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  onClick={() => handleSaveKey(p.id)}
                  className="text-xs text-amber-400 hover:text-amber-300 transition"
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Debug Log */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Debug</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.debugLog || false}
              onChange={async (e) => {
                await window.electronAPI.saveSettings({ debugLog: e.target.checked });
                const s = await window.electronAPI.getSettings();
                setSettings(s);
              }}
              className="accent-amber-500 w-4 h-4"
            />
            <div>
              <div className="text-xs text-white">Enable debug logging</div>
              <div className="text-xs text-gray-500">
                Writes a debug.log file to Documents/NovaSyn Forge
              </div>
            </div>
          </label>
        </section>

        {/* Dev Stack Path */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Dev Stack Docs</h2>
          <p className="text-xs text-gray-500 mb-3">
            Path to the NovaSyn Windows Dev Stack documentation directory. Used as AI context.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={devStackPath}
              readOnly
              placeholder="Not configured"
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-gray-300 font-mono"
            />
            <button
              onClick={handleSaveDevStackPath}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition"
            >
              Browse
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
