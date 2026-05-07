import React from 'react';
import { useCouncilStore } from '../store/councilStore';

export default function SettingsPanel() {
  const {
    settings,
    apiKeys,
    models,
    saveSettings,
    setShowSettings,
  } = useCouncilStore();

  const providers = ['anthropic', 'openai', 'google', 'xai', 'babyai'] as const;
  const providerLabels: Record<string, string> = {
    anthropic: 'Anthropic',
    openai: 'OpenAI',
    google: 'Google',
    xai: 'xAI',
    babyai: 'BabyAI',
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-[480px] max-h-[70vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-surface-500 hover:text-surface-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
          {/* Theme */}
          <div>
            <label className="text-xs text-surface-400 mb-2 block">Theme</label>
            <div className="flex gap-2">
              {(['dark', 'light'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => saveSettings({ theme })}
                  className={`px-4 py-1.5 text-sm rounded transition-colors capitalize ${
                    settings.theme === theme
                      ? 'bg-primary-600 text-white'
                      : 'bg-white/5 text-surface-400 hover:bg-white/10'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          {/* Default Model */}
          <div>
            <label className="text-xs text-surface-400 mb-1 block">Default Model</label>
            <select
              value={settings.defaultModel}
              onChange={(e) => saveSettings({ defaultModel: e.target.value })}
              className="w-full bg-[var(--bg-input)] text-surface-200 text-sm rounded px-3 py-2 border border-white/10 focus:border-primary-500 focus:outline-none"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.provider})</option>
              ))}
            </select>
          </div>

          {/* Default Temperature */}
          <div>
            <label className="text-xs text-surface-400 mb-1 block">
              Default Temperature: {settings.defaultTemperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.defaultTemperature}
              onChange={(e) => saveSettings({ defaultTemperature: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* API Keys Status */}
          <div>
            <label className="text-xs text-surface-400 mb-2 block">API Keys</label>
            <div className="space-y-2">
              {providers.map((provider) => (
                <div
                  key={provider}
                  className="flex items-center justify-between bg-white/[0.03] rounded px-3 py-2 border border-white/5"
                >
                  <span className="text-sm text-surface-300">{providerLabels[provider]}</span>
                  <span className={`text-xs flex items-center gap-1.5 ${
                    apiKeys[provider] ? 'text-green-400' : 'text-surface-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      apiKeys[provider] ? 'bg-green-400' : 'bg-surface-600'
                    }`} />
                    {apiKeys[provider] ? 'Connected' : 'Not set'}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-surface-600 mt-2">
              API keys are managed in the shared NovaSyn key store at %APPDATA%/NovaSyn/api-keys.json
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
