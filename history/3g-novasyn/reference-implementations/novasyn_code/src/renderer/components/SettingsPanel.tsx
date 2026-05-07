import React, { useState, useEffect } from 'react';
import { useCodeStore } from '../store/codeStore';

const PROVIDERS = ['anthropic', 'openai', 'google', 'xai'];

export default function SettingsPanel() {
  const { apiKeys, setApiKeys } = useCodeStore();
  const [localKeys, setLocalKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  const handleSave = async (provider: string) => {
    await window.electronAPI.setApiKey(provider, localKeys[provider] || '');
    const keys = await window.electronAPI.getApiKeys();
    setApiKeys(keys);
  };

  const maskKey = (key: string): string => {
    if (!key || key.length < 8) return key || '';
    return key.slice(0, 4) + '...' + key.slice(-4);
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-slate-200 mb-6">Settings</h2>

      {/* API Keys */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">API Keys</h3>
        {PROVIDERS.map((provider) => (
          <div key={provider} className="flex items-center gap-2">
            <label className="w-24 text-sm text-slate-400 capitalize">{provider}</label>
            <input
              type="password"
              value={localKeys[provider] || ''}
              onChange={(e) => setLocalKeys({ ...localKeys, [provider]: e.target.value })}
              placeholder={apiKeys[provider] ? maskKey(apiKeys[provider]) : 'Enter API key...'}
              className="flex-1 bg-slate-800 text-slate-300 text-sm px-3 py-1.5 rounded border border-slate-700 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSave(provider)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
            >
              Save
            </button>
            {apiKeys[provider] && (
              <span className="w-2 h-2 bg-green-500 rounded-full" title="Key set" />
            )}
          </div>
        ))}
      </div>

      {/* Projects */}
      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Projects</h3>
        <button
          onClick={async () => {
            const dirPath = await window.electronAPI.selectProjectDir();
            if (dirPath) {
              const name = dirPath.split(/[/\\]/).pop() || 'Untitled';
              const project = await window.electronAPI.createProject(name, dirPath);
              useCodeStore.getState().addProject(project);
              useCodeStore.getState().setCurrentProjectId(project.id);
            }
          }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded border border-slate-700 transition-colors"
        >
          + Add Project
        </button>
      </div>
    </div>
  );
}
