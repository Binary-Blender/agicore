import React from 'react';
import { useAcademyStore } from '../store/academyStore';

export default function SettingsPanel() {
  const {
    settings,
    apiKeys,
    models,
    setShowSettings,
    saveSettings,
  } = useAcademyStore();

  const providers = [
    { key: 'anthropic', name: 'Anthropic (Claude)', emoji: '🟣' },
    { key: 'openai', name: 'OpenAI (GPT)', emoji: '🟢' },
    { key: 'google', name: 'Google (Gemini)', emoji: '🔵' },
    { key: 'xai', name: 'xAI (Grok)', emoji: '⚫' },
    { key: 'babyai', name: 'BabyAI (HuggingFace)', emoji: '🍼' },
  ];

  const availableModels = models.filter(m => apiKeys[m.provider]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border)] w-[500px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-heading)]">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* API Keys */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-2">API Keys</h3>
            <div className="space-y-2">
              {providers.map((provider) => {
                const hasKey = !!apiKeys[provider.key];
                return (
                  <div
                    key={provider.key}
                    className="flex items-center gap-3 px-3 py-2 bg-[var(--bg-input)] rounded-lg"
                  >
                    <span>{provider.emoji}</span>
                    <span className="text-sm text-[var(--text-primary)] flex-1">{provider.name}</span>
                    {hasKey ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <span>●</span> Connected
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">Not configured</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              API keys are shared across the NovaSyn Suite. Manage them in NovaSyn AI.
            </p>
          </div>

          {/* Default Model */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-2">Default AI Model</h3>
            <select
              value={settings.defaultModel}
              onChange={(e) => saveSettings({ defaultModel: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {availableModels.length > 0 ? (
                availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))
              ) : (
                <option disabled>No API keys configured</option>
              )}
            </select>
          </div>

          {/* Theme */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-2">Theme</h3>
            <div className="flex gap-2">
              <button
                onClick={() => saveSettings({ theme: 'dark' })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                  settings.theme === 'dark'
                    ? 'bg-primary-600 text-white'
                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--border)]'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => saveSettings({ theme: 'light' })}
                className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
                  settings.theme === 'light'
                    ? 'bg-primary-600 text-white'
                    : 'bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--border)]'
                }`}
              >
                Light
              </button>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-2">About</h3>
            <div className="text-xs text-[var(--text-muted)] space-y-1">
              <p>NovaSyn Academy v0.1.0</p>
              <p>AI-Powered Homeschool Learning Management</p>
              <p>Part of the NovaSyn Suite</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-[var(--border)]">
          <button
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
