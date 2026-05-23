import { useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { MODELS } from '../lib/models';

const PROVIDER_LABELS: Record<string, string> = {
  anthropic:    'Anthropic (Claude)',
  openai:       'OpenAI (GPT)',
  google:       'Google (Gemini)',
  xai:          'xAI (Grok)',
  huggingface:  'BabyAI (HuggingFace)',
};

export function ModelPicker() {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const councilModels = useAppStore((s) => s.councilModels);
  const setCouncilModels = useAppStore((s) => s.setCouncilModels);
  const hiddenModels = useAppStore((s) => s.hiddenModels);

  const visibleModels = useMemo(
    () => MODELS.filter((m) => !hiddenModels.includes(m.id)),
    [hiddenModels],
  );

  const providers = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of visibleModels) {
      if (!seen.has(m.provider)) { seen.add(m.provider); out.push(m.provider); }
    }
    return out;
  }, [visibleModels]);

  const [provider, setProvider] = useState<string>(() => {
    const current = visibleModels.find((m) => m.id === selectedModel);
    return current?.provider ?? providers[0] ?? '';
  });

  const modelsForProvider = visibleModels.filter((m) => m.provider === provider);
  const [draftModel, setDraftModel] = useState<string>(() => modelsForProvider[0]?.id ?? '');

  // Keep draftModel valid as provider changes
  const validDraft = modelsForProvider.some((m) => m.id === draftModel)
    ? draftModel
    : (modelsForProvider[0]?.id ?? '');

  const allSelected = [selectedModel, ...councilModels];

  function addModel(modelId: string) {
    if (!modelId) return;
    if (allSelected.includes(modelId)) return;
    setCouncilModels([...councilModels, modelId]);
  }

  function removeModel(modelId: string) {
    if (modelId === selectedModel) {
      // Promote the first council model to primary, or no-op if none left
      if (councilModels.length === 0) return;
      const [next, ...rest] = councilModels;
      setSelectedModel(next);
      setCouncilModels(rest);
    } else {
      setCouncilModels(councilModels.filter((m) => m !== modelId));
    }
  }

  function promote(modelId: string) {
    if (modelId === selectedModel) return;
    const without = councilModels.filter((m) => m !== modelId);
    setCouncilModels([selectedModel, ...without]);
    setSelectedModel(modelId);
  }

  return (
    <div className="px-3 py-2 border-b border-slate-700 space-y-1.5">
      <label className="text-xs text-gray-500 block">Models</label>
      <div className="flex items-center gap-1">
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="flex-1 min-w-0 bg-slate-700 border border-slate-600 text-white text-xs px-1.5 py-1 rounded focus:outline-none focus:border-blue-500"
          title="Provider"
        >
          {providers.map((p) => (
            <option key={p} value={p}>{PROVIDER_LABELS[p] ?? p}</option>
          ))}
        </select>
        <select
          value={validDraft}
          onChange={(e) => setDraftModel(e.target.value)}
          className="flex-1 min-w-0 bg-slate-700 border border-slate-600 text-white text-xs px-1.5 py-1 rounded focus:outline-none focus:border-blue-500"
          title="Model"
        >
          {modelsForProvider.map((m) => (
            <option key={m.id} value={m.id} disabled={allSelected.includes(m.id)}>
              {m.label}{allSelected.includes(m.id) ? ' ✓' : ''}
            </option>
          ))}
        </select>
        <button
          onClick={() => addModel(validDraft)}
          disabled={!validDraft || allSelected.includes(validDraft)}
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded disabled:bg-slate-700 disabled:text-gray-500 transition flex-shrink-0"
          title="Add this model"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {allSelected.map((id) => {
          const m = MODELS.find((x) => x.id === id);
          const label = m?.label ?? id;
          const isPrimary = id === selectedModel;
          return (
            <span
              key={id}
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                isPrimary
                  ? 'bg-blue-600/30 text-blue-200 border border-blue-500/50'
                  : 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
              }`}
              title={isPrimary ? 'Primary model' : 'Click to set as primary'}
            >
              <button
                onClick={() => promote(id)}
                disabled={isPrimary}
                className={`max-w-[8rem] truncate ${isPrimary ? 'cursor-default' : 'hover:underline'}`}
              >
                {label}
              </button>
              <button
                onClick={() => removeModel(id)}
                disabled={allSelected.length === 1 && isPrimary}
                className="text-current opacity-60 hover:opacity-100 disabled:opacity-20 leading-none"
                title="Remove"
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      {councilModels.length > 0 && (
        <p className="text-xs text-purple-400/70">⚡ Council mode — {allSelected.length} models will respond in parallel.</p>
      )}
    </div>
  );
}
