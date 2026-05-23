import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { Key, Database, Info, Cpu, RefreshCw } from 'lucide-react';
import { MODELS } from '../lib/models';
import { useAppStore } from '../store/appStore';
import { check as checkUpdate } from '@tauri-apps/plugin-updater';

const PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-...', url: 'https://console.anthropic.com/settings/keys' },
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-...', url: 'https://platform.openai.com/api-keys' },
  { id: 'google', label: 'Google (Gemini)', placeholder: 'AIza...', url: 'https://aistudio.google.com/app/apikey' },
  { id: 'xai', label: 'xAI (Grok)', placeholder: 'xai-...', url: 'https://x.ai/api' },
  { id: 'babyai', label: 'BabyAI (HuggingFace)', placeholder: 'hf_...', url: 'https://huggingface.co/settings/tokens' },
];

export function SettingsView() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const hiddenModels = useAppStore((s) => s.hiddenModels);
  const setHiddenModels = useAppStore((s) => s.setHiddenModels);
  const modelContextOverrides = useAppStore((s) => s.modelContextOverrides);
  const setModelContextOverride = useAppStore((s) => s.setModelContextOverride);
  const synthesisModel = useAppStore((s) => s.synthesisModel);
  const setSynthesisModel = useAppStore((s) => s.setSynthesisModel);
  const pruneWarnPercent = useAppStore((s) => s.pruneWarnPercent);
  const setPruneWarnPercent = useAppStore((s) => s.setPruneWarnPercent);
  const pruneTriggerPercent = useAppStore((s) => s.pruneTriggerPercent);
  const setPruneTriggerPercent = useAppStore((s) => s.setPruneTriggerPercent);
  const defaultSystemPrompt = useAppStore((s) => s.defaultSystemPrompt);
  const setDefaultSystemPrompt = useAppStore((s) => s.setDefaultSystemPrompt);

  const [ctxDraft, setCtxDraft] = useState<Record<string, string>>({});
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'none' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [updateHandle, setUpdateHandle] = useState<Awaited<ReturnType<typeof checkUpdate>> | null>(null);
  const [dbPath, setDbPath] = useState('');
  const [switchingDb, setSwitchingDb] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  async function handleRefreshModels() {
    setRefreshingModels(true);
    setRefreshResult(null);
    try {
      const models = await invoke<Array<{ provider: string }>>('discover_models', { forceRefresh: true });
      const providers = new Set(models.map((m) => m.provider));
      setRefreshResult(`Found ${models.length} models across ${providers.size} provider${providers.size === 1 ? '' : 's'}.`);
    } catch (e) {
      setRefreshResult(`Refresh failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRefreshingModels(false);
    }
  }

  function toggleHidden(modelId: string) {
    if (hiddenModels.includes(modelId)) {
      setHiddenModels(hiddenModels.filter((id) => id !== modelId));
    } else {
      setHiddenModels([...hiddenModels, modelId]);
    }
  }

  function commitCtxOverride(modelId: string) {
    const raw = ctxDraft[modelId];
    if (raw === undefined) return;
    const n = parseInt(raw, 10);
    setModelContextOverride(modelId, isNaN(n) || n <= 0 ? null : n);
  }

  async function handleCheckUpdate() {
    setUpdateStatus('checking');
    setUpdateVersion(null);
    setUpdateHandle(null);
    try {
      const update = await checkUpdate();
      if (update?.available) {
        setUpdateStatus('available');
        setUpdateVersion(update.version ?? null);
        setUpdateHandle(update);
      } else {
        setUpdateStatus('none');
      }
    } catch {
      setUpdateStatus('error');
    }
  }

  async function handleSwitchDb() {
    setSwitchingDb(true);
    try {
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      });
      if (!selected) return;
      await invoke('switch_db', { newPath: selected });
      setDbPath(selected);
      // Reload the page so all store state re-initialises against the new DB
      window.location.reload();
    } catch (err) { console.error('Switch DB failed:', err); }
    finally { setSwitchingDb(false); }
  }

  async function handleInstallUpdate() {
    if (!updateHandle) return;
    setInstalling(true);
    try {
      await updateHandle.downloadAndInstall();
    } catch {
      setUpdateStatus('error');
      setInstalling(false);
    }
  }

  useEffect(() => {
    loadKeys();
    invoke<string>('get_db_path').then(setDbPath).catch(() => {});
  }, []);

  async function loadKeys() {
    try {
      const masked = await invoke<Record<string, string>>('get_api_keys');
      setMaskedKeys(masked);
    } catch (err) { console.error('Load keys failed:', err); }
  }

  async function handleSave(provider: string) {
    const key = keys[provider]?.trim() ?? '';
    try {
      await invoke('set_api_key', { provider, key });
      setEditing(null);
      setKeys((prev) => ({ ...prev, [provider]: '' }));
      setSaved(provider);
      setTimeout(() => setSaved(null), 2000);
      await loadKeys();
    } catch (err) { console.error('Save key failed:', err); }
  }

  async function handleRemove(provider: string) {
    try {
      await invoke('set_api_key', { provider, key: '' });
      await loadKeys();
    } catch (err) { console.error('Remove key failed:', err); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      <h2 className="text-xl font-semibold text-white mb-6">Settings</h2>
      {PROVIDERS.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-blue-400" />
            <h3 className="text-sm font-medium text-white">API Keys</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Stored locally in <code className="bg-slate-800 px-1.5 py-0.5 rounded">%APPDATA%/NovaSyn/api-keys.json</code>.
            Never sent anywhere except the provider you're calling.
          </p>
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const isEditing = editing === p.id;
              const hasKey = Boolean(maskedKeys[p.id]);
              return (
                <div key={p.id} className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-200 font-medium">{p.label}</label>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition">Get key →</a>
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={keys[p.id] || ''}
                        onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(p.id); if (e.key === 'Escape') setEditing(null); }}
                        placeholder={p.placeholder}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button onClick={() => handleSave(p.id)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition">Save</button>
                      <button onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded transition">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-gray-400 bg-slate-900/50 px-3 py-1.5 rounded">
                        {hasKey ? maskedKeys[p.id] : 'Not configured'}
                      </code>
                      <button onClick={() => setEditing(p.id)} className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white px-3 py-1.5 rounded transition">
                        {hasKey ? 'Update' : 'Add Key'}
                      </button>
                      {hasKey && (
                        <button onClick={() => handleRemove(p.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded transition" title="Remove">Remove</button>
                      )}
                      {saved === p.id && <span className="text-xs text-green-400">✓ Saved</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={16} className="text-emerald-400" />
          <h3 className="text-sm font-medium text-white">Models</h3>
          <button
            onClick={handleRefreshModels}
            disabled={refreshingModels}
            className="ml-auto flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white px-2.5 py-1 rounded transition disabled:opacity-50"
            title="Discover available models from configured providers"
          >
            <RefreshCw size={12} className={refreshingModels ? 'animate-spin' : ''} />
            {refreshingModels ? 'Refreshing…' : 'Refresh from providers'}
          </button>
        </div>
        {refreshResult && (
          <p className={`text-xs mb-2 ${refreshResult.startsWith('Found') ? 'text-emerald-400' : 'text-amber-400'}`}>{refreshResult}</p>
        )}
        <p className="text-xs text-gray-500 mb-4">
          Hide models from the picker. Override context window size if a model has been updated since this release.
        </p>
        <div className="space-y-2 mb-4">
          {MODELS.map((m) => {
            const hidden = hiddenModels.includes(m.id);
            const override = modelContextOverrides[m.id];
            const draftVal = ctxDraft[m.id] ?? (override ? String(override) : '');
            return (
              <div key={m.id} className={`bg-slate-800/60 border rounded-lg p-3 transition ${hidden ? 'border-slate-700/40 opacity-50' : 'border-slate-700'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => toggleHidden(m.id)}
                    className={`w-8 h-4 rounded-full transition flex-shrink-0 relative ${hidden ? 'bg-slate-600' : 'bg-emerald-600'}`}
                    title={hidden ? 'Show in picker' : 'Hide from picker'}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${hidden ? 'left-0.5' : 'left-4'}`} />
                  </button>
                  <span className="text-sm text-gray-200 font-medium flex-1 min-w-0 truncate">{m.label}</span>
                  <span className="text-xs text-gray-500 bg-slate-700/50 px-1.5 py-0.5 rounded flex-shrink-0">{m.provider}</span>
                  <span className="text-xs text-gray-600 flex-shrink-0">{override ? `${(override / 1000).toFixed(0)}K*` : `${(m.contextWindow / 1000).toFixed(0)}K`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-28 flex-shrink-0">Context override</span>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={draftVal}
                    placeholder={String(m.contextWindow)}
                    onChange={(e) => setCtxDraft((p) => ({ ...p, [m.id]: e.target.value }))}
                    onBlur={() => commitCtxOverride(m.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitCtxOverride(m.id); }}
                    className="w-32 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  {override && (
                    <button onClick={() => { setModelContextOverride(m.id, null); setCtxDraft((p) => ({ ...p, [m.id]: '' })); }} className="text-xs text-gray-500 hover:text-red-400 transition">reset</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 mb-3">
          <label className="text-sm text-gray-200 font-medium block mb-2">Default system prompt</label>
          <p className="text-xs text-gray-500 mb-3">Applied to every newly-created session. Per-session prompts (via the session menu) override this.</p>
          <textarea
            value={defaultSystemPrompt}
            onChange={(e) => setDefaultSystemPrompt(e.target.value)}
            placeholder="e.g. You are a concise senior engineer. Prefer code examples over prose."
            rows={3}
            spellCheck={false}
            className="w-full bg-slate-700/70 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 font-mono resize-y focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 mb-3">
          <label className="text-sm text-gray-200 font-medium block mb-2">Auto-prune thresholds</label>
          <p className="text-xs text-gray-500 mb-3">Warn when context usage reaches the first threshold; show the auto-prune button (and require a manual click) at the second.</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-16 flex-shrink-0">Warn at</span>
              <input
                type="range"
                min={10}
                max={Math.min(pruneTriggerPercent - 1, 99)}
                step={1}
                value={pruneWarnPercent}
                onChange={(e) => setPruneWarnPercent(parseInt(e.target.value, 10))}
                className="flex-1 accent-amber-500"
              />
              <span className="text-xs text-amber-400 font-mono w-10 text-right">{pruneWarnPercent}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-16 flex-shrink-0">Prune at</span>
              <input
                type="range"
                min={Math.max(pruneWarnPercent + 1, 11)}
                max={99}
                step={1}
                value={pruneTriggerPercent}
                onChange={(e) => setPruneTriggerPercent(parseInt(e.target.value, 10))}
                className="flex-1 accent-red-500"
              />
              <span className="text-xs text-red-400 font-mono w-10 text-right">{pruneTriggerPercent}%</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
          <label className="text-sm text-gray-200 font-medium block mb-2">Synthesis model</label>
          <p className="text-xs text-gray-500 mb-3">Used when synthesizing council/broadcast responses.</p>
          <select
            value={synthesisModel}
            onChange={(e) => setSynthesisModel(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            {MODELS.filter((m) => !hiddenModels.includes(m.id)).map((m) => (
              <option key={m.id} value={m.id}>{m.label} ({m.provider})</option>
            ))}
          </select>
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} className="text-purple-400" />
          <h3 className="text-sm font-medium text-white">Database</h3>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-3 text-sm text-gray-300">
          <div>
            <p className="text-xs text-gray-500 mb-1">Active database</p>
            <code className="block bg-slate-900/50 px-2 py-1.5 rounded text-xs text-gray-300 break-all">{dbPath || 'novasyn_chat.db'}</code>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSwitchDb}
              disabled={switchingDb}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white px-3 py-1.5 rounded transition disabled:opacity-50"
            >
              {switchingDb ? 'Switching…' : 'Open another database…'}
            </button>
            <span className="text-xs text-gray-600">App restarts on switch</span>
          </div>
        </div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-amber-400" />
          <h3 className="text-sm font-medium text-white">About</h3>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-sm text-gray-300 space-y-1">
          <p><span className="text-gray-500">App:</span> NovaSyn Chat</p>
          <p><span className="text-gray-500">Version:</span> 0.1.0</p>
          <p><span className="text-gray-500">Framework:</span> Agicore</p>
          <div className="pt-3 border-t border-slate-700/50 mt-2 flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCheckUpdate}
              disabled={updateStatus === 'checking' || installing}
              className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white px-3 py-1.5 rounded transition disabled:opacity-50"
            >
              <RefreshCw size={12} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
              {updateStatus === 'checking' ? 'Checking…' : 'Check for updates'}
            </button>
            {updateStatus === 'none' && <span className="text-xs text-green-400">✓ You're up to date</span>}
            {updateStatus === 'error' && <span className="text-xs text-amber-400">Update check unavailable — configure release endpoint in tauri.conf.json</span>}
            {updateStatus === 'available' && updateVersion && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-300">v{updateVersion} available</span>
                <button
                  onClick={handleInstallUpdate}
                  disabled={installing}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition disabled:opacity-50"
                >
                  {installing ? 'Installing…' : 'Install & restart'}
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 pt-1">
            Generated by Agicore DSL. <a href="https://github.com/Binary-Blender/agicore" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">GitHub</a>
          </p>
        </div>
      </section>
    </div>
  );
}
