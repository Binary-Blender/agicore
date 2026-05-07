import React, { useState } from 'react';
import { useCodeStore } from '../store/codeStore';

const PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { key: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { key: 'google', label: 'Google', placeholder: 'AIza...' },
  { key: 'xai', label: 'xAI', placeholder: 'xai-...' },
];

const FEATURES = [
  { title: 'Chat with any AI', desc: 'Claude, GPT, Gemini, and Grok — all in one interface.' },
  { title: 'Integrated terminal', desc: 'A real terminal powered by xterm.js, right inside the editor.' },
  { title: 'Monaco editor', desc: 'The same editor engine behind VS Code, with full syntax highlighting.' },
  { title: 'Apply code from chat', desc: 'One-click to apply AI-generated code blocks directly to files.' },
];

export default function OnboardingScreen() {
  const { setApiKeys, setHasCompletedOnboarding } = useCodeStore();
  const [keys, setKeys] = useState<Record<string, string>>({});

  const handleKeyChange = (provider: string, value: string) => {
    setKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const handleGetStarted = async () => {
    // Save any entered keys via IPC
    for (const [provider, key] of Object.entries(keys)) {
      if (key.trim()) {
        await window.electronAPI.setApiKey(provider, key.trim());
      }
    }

    // Reload keys into store
    const freshKeys = await window.electronAPI.getApiKeys();
    setApiKeys(freshKeys);
    setHasCompletedOnboarding(true);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="max-w-xl w-full px-8">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400 mb-2">NovaSyn Code</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            An AI-native code editor. Chat with AI models, browse your project files,
            edit code, and run commands — all in one place.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <div className="text-sm font-semibold text-blue-300 mb-1">{f.title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* API key inputs */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">API Keys (optional — add any later in Settings)</h2>
          <div className="space-y-2">
            {PROVIDERS.map((p) => (
              <div key={p.key} className="flex items-center gap-3">
                <label className="text-xs text-slate-400 w-20 text-right flex-shrink-0">{p.label}</label>
                <input
                  type="password"
                  value={keys[p.key] || ''}
                  onChange={(e) => handleKeyChange(p.key, e.target.value)}
                  placeholder={p.placeholder}
                  className="flex-1 bg-slate-800 text-slate-200 text-sm px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500 placeholder-slate-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Get Started button */}
        <div className="text-center">
          <button
            onClick={handleGetStarted}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
