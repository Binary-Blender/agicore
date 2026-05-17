import { useAppStore } from '../store/appStore';
import { modelLabel, modelContextWindow } from '../lib/models';
import type { ChatMessage } from '../lib/types';

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  messages: ChatMessage[];
  onClose: () => void;
}

export function ContextWindowViewer({ messages, onClose }: Props) {
  const sessions = useAppStore((s) => s.sessions);
  const currentSessionId = useAppStore((s) => s.currentSessionId);
  const selectedModel = useAppStore((s) => s.selectedModel);

  const session = sessions.find((s) => s.id === currentSessionId);
  const contextWindow = modelContextWindow(selectedModel);

  const active   = messages.filter((m) => !m.isExcluded && !m.isArchived && !m.isPruned);
  const excluded = messages.filter((m) => m.isExcluded);
  const pruned   = messages.filter((m) => m.isPruned);
  const archived = messages.filter((m) => m.isArchived);

  const activeTokens   = active.reduce((s, m) => s + (m.totalTokens || 0), 0);
  const systemTokens   = Math.ceil((session?.systemPrompt?.length ?? 0) / 4);
  const totalInFlight  = activeTokens + systemTokens;
  const pct            = Math.min((totalInFlight / contextWindow) * 100, 100);

  const barColor = pct >= 85 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-500';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-white">Context Window</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{modelLabel(selectedModel)}</span>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none transition">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Token budget bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium">Token budget</span>
              <span className="text-xs text-gray-400 tabular-nums">{fmtK(totalInFlight)} / {fmtK(contextWindow)}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.max(pct, 0.5)}%` }} />
            </div>
          </div>

          {/* System prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">System Prompt</span>
              <span className="text-xs text-gray-600">{systemTokens > 0 ? `~${fmtK(systemTokens)} tokens` : 'none'}</span>
            </div>
            {session?.systemPrompt ? (
              <pre className="text-xs text-gray-300 bg-slate-900/60 rounded-lg p-3 whitespace-pre-wrap break-words max-h-28 overflow-y-auto font-mono">
                {session.systemPrompt}
              </pre>
            ) : (
              <p className="text-xs text-gray-600 italic">No system prompt set for this session.</p>
            )}
          </div>

          {/* Active history */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Active History</span>
              <span className="text-xs text-gray-600">{active.length} messages · ~{fmtK(activeTokens)} tokens</span>
            </div>
            {active.length === 0 ? (
              <p className="text-xs text-gray-600 italic">No active messages.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {active.map((m, i) => (
                  <div key={m.id} className="flex items-start gap-2 text-xs text-gray-400 bg-slate-900/40 rounded px-2.5 py-1.5">
                    <span className="text-gray-600 flex-shrink-0 tabular-nums w-5 text-right">{i + 1}</span>
                    <span className="flex-1 truncate text-gray-300">{m.userMessage.slice(0, 60)}{m.userMessage.length > 60 ? '…' : ''}</span>
                    <span className="text-gray-600 flex-shrink-0 tabular-nums">{fmtK(m.totalTokens || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Excluded / pruned / archived */}
          {(excluded.length > 0 || pruned.length > 0 || archived.length > 0) && (
            <div className="grid grid-cols-3 gap-2">
              {excluded.length > 0 && (
                <div className="bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-red-400 font-medium">{excluded.length}</p>
                  <p className="text-xs text-gray-600">excluded</p>
                </div>
              )}
              {pruned.length > 0 && (
                <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-orange-400 font-medium">{pruned.length}</p>
                  <p className="text-xs text-gray-600">pruned</p>
                </div>
              )}
              {archived.length > 0 && (
                <div className="bg-slate-700/40 border border-slate-600/40 rounded-lg px-3 py-2 text-center">
                  <p className="text-xs text-gray-400 font-medium">{archived.length}</p>
                  <p className="text-xs text-gray-600">archived</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-700 text-xs text-gray-600">
          This is what gets sent on the next message. Excluded, pruned, and archived messages are omitted.
        </div>
      </div>
    </div>
  );
}
