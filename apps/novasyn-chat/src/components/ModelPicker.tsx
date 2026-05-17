import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { MODELS, broadcastModelIds } from '../lib/models';

export function ModelPicker() {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);
  const councilModels = useAppStore((s) => s.councilModels);
  const setCouncilModels = useAppStore((s) => s.setCouncilModels);
  const broadcastMode = useAppStore((s) => s.broadcastMode);
  const setBroadcastMode = useAppStore((s) => s.setBroadcastMode);
  const [showCouncil, setShowCouncil] = useState(false);

  const bcastIds = broadcastModelIds();

  function toggleCouncilModel(modelId: string) {
    if (modelId === selectedModel) return;
    setCouncilModels(
      councilModels.includes(modelId)
        ? councilModels.filter((m) => m !== modelId)
        : [...councilModels, modelId]
    );
  }

  const isCouncilActive = councilModels.length > 0;

  return (
    <div className="px-3 py-2 border-b border-slate-700">
      <label className="text-xs text-gray-500 block mb-1">Model</label>
      <select
        value={selectedModel}
        onChange={(e) => {
          setSelectedModel(e.target.value);
          setCouncilModels(councilModels.filter((m) => m !== e.target.value));
        }}
        className="w-full bg-slate-700 border border-slate-600 text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>

      <button
        onClick={() => { setShowCouncil((v) => !v); if (broadcastMode) setBroadcastMode(false); }}
        className={`mt-1.5 w-full text-left text-xs flex items-center justify-between px-2 py-1 rounded transition ${
          isCouncilActive
            ? 'text-purple-300 bg-purple-900/30'
            : 'text-gray-500 hover:text-gray-300 hover:bg-slate-700/50'
        }`}
      >
        <span>{isCouncilActive ? `⚡ Council (${councilModels.length + 1})` : 'Council mode'}</span>
        <span>{showCouncil ? '▲' : '▼'}</span>
      </button>

      <button
        onClick={() => { setBroadcastMode(!broadcastMode); setCouncilModels([]); setShowCouncil(false); }}
        className={`mt-0.5 w-full text-left text-xs flex items-center justify-between px-2 py-1 rounded transition ${
          broadcastMode
            ? 'text-sky-300 bg-sky-900/30'
            : 'text-gray-500 hover:text-gray-300 hover:bg-slate-700/50'
        }`}
      >
        <span>{broadcastMode ? `📡 Broadcast (${bcastIds.length} providers)` : 'Broadcast mode'}</span>
      </button>

      {showCouncil && (
        <div className="mt-1 space-y-0.5">
          {MODELS.filter((m) => m.id !== selectedModel).map((m) => (
            <label key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-700/50 cursor-pointer">
              <input
                type="checkbox"
                checked={councilModels.includes(m.id)}
                onChange={() => toggleCouncilModel(m.id)}
                className="accent-purple-500 w-3 h-3"
              />
              <span className="text-xs text-gray-300">{m.label}</span>
            </label>
          ))}
          {isCouncilActive && (
            <button
              onClick={() => setCouncilModels([])}
              className="w-full text-xs text-gray-500 hover:text-gray-300 text-center py-0.5 transition"
            >
              Clear council
            </button>
          )}
        </div>
      )}
    </div>
  );
}
