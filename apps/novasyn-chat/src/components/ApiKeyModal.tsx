import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "google", label: "Google (Gemini)", placeholder: "AIza..." },
  { id: "xai", label: "xAI (Grok)", placeholder: "xai-..." },
  { id: "babyai", label: "BabyAI (HuggingFace)", placeholder: "hf_..." },
];

export function ApiKeyModal({ onClose }: { onClose: () => void }) {
  const [keys, setKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    // Existing keys come back masked from the Rust side (round-1 AI_SERVICE
    // codegen). We surface the masked form as the placeholder hint rather
    // than the input value so the user can tell which providers are already
    // configured without ever rendering the raw key.
    invoke<Record<string, string>>('get_api_keys')
      .then((existing) => setKeys((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(existing)) {
          if (!(k in next)) next[k] = '';
          (next as Record<string, string>)['__existing_' + k] = v;
        }
        return next;
      }))
      .catch(() => { /* command may not exist yet — silent fail */ });
  }, []);

  async function handleSave() {
    for (const p of PROVIDERS) {
      const value = keys[p.id];
      if (value && value.trim()) {
        try {
          await invoke('set_api_key', { provider: p.id, key: value.trim() });
        } catch {
          // silent fail — keep the modal open if individual saves fail? for
          // now match the hand-written behavior and continue.
        }
      }
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">API Keys</h2>
        <p className="text-xs text-gray-400 mb-4">Stored locally via the AI_SERVICE keys file.</p>
        <div className="space-y-3">
          {PROVIDERS.map((p) => {
            const existing = (keys as Record<string, string>)['__existing_' + p.id];
            return (
              <div key={p.id}>
                <label className="text-sm text-gray-300 mb-1 block">
                  {p.label}
                  {existing ? <span className="text-xs text-gray-500 ml-2">(current: {existing})</span> : null}
                </label>
                <input
                  type="password"
                  className="w-full bg-slate-700 border border-slate-500 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder={p.placeholder}
                  value={keys[p.id] ?? ''}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition">Save Keys</button>
        </div>
      </div>
    </div>
  );
}
