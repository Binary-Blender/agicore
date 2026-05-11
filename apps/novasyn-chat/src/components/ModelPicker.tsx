import { useAppStore } from '../store/appStore';

const MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", provider: "anthropic" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", provider: "anthropic" },
  { id: "gpt-4o", label: "GPT-4o", provider: "openai" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", provider: "openai" },
  { id: "gemini-2.5-flash-preview-05-20", label: "Gemini 2.5 Flash", provider: "google" },
  { id: "grok-3-latest", label: "Grok 3", provider: "xai" },
];

export function ModelPicker() {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);

  return (
    <div className="px-3 py-2 border-b border-slate-700">
      <label className="text-xs text-gray-500 block mb-1">Model</label>
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="w-full bg-slate-700 border border-slate-600 text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
