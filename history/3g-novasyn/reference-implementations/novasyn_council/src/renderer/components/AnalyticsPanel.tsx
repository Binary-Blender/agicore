import React from 'react';
import { useCouncilStore } from '../store/councilStore';

const MODEL_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-600/20 text-orange-300',
  openai: 'bg-green-600/20 text-green-300',
  google: 'bg-blue-600/20 text-blue-300',
  xai: 'bg-purple-600/20 text-purple-300',
};

function getProviderFromModel(modelId: string): string {
  if (modelId.includes('claude')) return 'anthropic';
  if (modelId.includes('gpt') || modelId.includes('o1') || modelId.includes('o3') || modelId.includes('o4')) return 'openai';
  if (modelId.includes('gemini')) return 'google';
  if (modelId.includes('grok')) return 'xai';
  return 'unknown';
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`;
  if (cost >= 0.01) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(4)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
}

export default function AnalyticsPanel() {
  const {
    costAnalytics,
    models,
    setShowAnalytics,
    selectPersona,
    personas,
    selectConversation,
    selectMeeting,
    meetings,
  } = useCouncilStore();

  if (!costAnalytics) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[10vh]" onClick={() => setShowAnalytics(false)}>
        <div className="w-[700px] bg-[#16213e] rounded-lg border border-white/10 shadow-2xl p-8 text-center">
          <span className="text-sm text-surface-500 animate-pulse">Loading analytics...</span>
        </div>
      </div>
    );
  }

  const getModelName = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  const maxPersonaCost = Math.max(...costAnalytics.perPersona.map(p => p.totalCost), 0.0001);
  const maxModelCost = Math.max(...costAnalytics.perModel.map(m => m.totalCost), 0.0001);

  const handleTopConsumerClick = (item: typeof costAnalytics.topConsumers[0]) => {
    setShowAnalytics(false);
    if (item.type === 'conversation') {
      // Find the persona that owns this conversation, navigate to it
      const persona = personas.find(p => p.name === item.personaName);
      if (persona) {
        selectPersona(persona);
        setTimeout(async () => {
          const conversations = await window.electronAPI.getConversations(persona.id);
          const conv = conversations.find((c: any) => c.id === item.id);
          if (conv) useCouncilStore.getState().selectConversation(conv);
        }, 100);
      }
    } else {
      const meeting = meetings.find(m => m.id === item.id);
      if (meeting) selectMeeting(meeting);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[8vh]" onClick={() => setShowAnalytics(false)}>
      <div className="w-[700px] max-h-[80vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-400">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <h2 className="text-sm font-semibold text-surface-200">Cost Analytics</h2>
          </div>
          <button onClick={() => setShowAnalytics(false)} className="text-surface-500 hover:text-surface-300 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Total Cost</p>
              <p className="text-lg font-bold text-surface-200">{formatCost(costAnalytics.totalCost)}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Total Tokens</p>
              <p className="text-lg font-bold text-surface-200">{formatTokens(costAnalytics.totalTokens)}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Conversations</p>
              <p className="text-lg font-bold text-surface-200">{costAnalytics.totalConversations}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Meetings</p>
              <p className="text-lg font-bold text-surface-200">{costAnalytics.totalMeetings}</p>
            </div>
          </div>

          {/* Per Persona Breakdown */}
          {costAnalytics.perPersona.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Cost by Persona</h3>
              <div className="space-y-1.5">
                {costAnalytics.perPersona.map(p => (
                  <div key={p.personaId} className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-lg border border-white/5">
                    <span className="text-lg shrink-0">{p.avatarEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-surface-200 truncate">{p.name}</span>
                        <span className="text-xs text-surface-300 font-medium shrink-0 ml-2">{formatCost(p.totalCost)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500/60 rounded-full transition-all"
                            style={{ width: `${(p.totalCost / maxPersonaCost) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-surface-500 shrink-0">
                          {formatTokens(p.totalTokens)} tok
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-surface-600">
                        <span>{p.conversationCount} chats</span>
                        <span>{p.meetingCount} meetings</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per Model Breakdown */}
          {costAnalytics.perModel.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Cost by Model</h3>
              <div className="space-y-1.5">
                {costAnalytics.perModel.map(m => {
                  const provider = getProviderFromModel(m.modelId);
                  const colorClass = MODEL_COLORS[provider] || 'bg-surface-600/20 text-surface-400';

                  return (
                    <div key={m.modelId} className="flex items-center gap-3 p-2.5 bg-white/[0.02] rounded-lg border border-white/5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${colorClass}`}>
                        {provider}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-surface-200 truncate">{getModelName(m.modelId)}</span>
                          <span className="text-xs text-surface-300 font-medium shrink-0 ml-2">{formatCost(m.totalCost)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500/60 rounded-full transition-all"
                              style={{ width: `${(m.totalCost / maxModelCost) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-surface-500 shrink-0">{m.messageCount} msgs</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-surface-600">
                          <span>{formatTokens(m.totalTokensIn)} in</span>
                          <span>{formatTokens(m.totalTokensOut)} out</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Consumers */}
          {costAnalytics.topConsumers.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Most Expensive Sessions</h3>
              <div className="space-y-1">
                {costAnalytics.topConsumers.map((item, i) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleTopConsumerClick(item)}
                    className="w-full flex items-center gap-3 p-2.5 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg border border-white/5 text-left transition-colors"
                  >
                    <span className="text-[10px] text-surface-500 w-4 text-right shrink-0">{i + 1}</span>
                    <span className="text-sm shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-surface-200 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-surface-500">
                        <span className={`px-1 py-0.5 rounded ${
                          item.type === 'conversation' ? 'bg-blue-600/20 text-blue-300' : 'bg-yellow-600/20 text-yellow-300'
                        }`}>{item.type === 'conversation' ? 'Chat' : 'Meeting'}</span>
                        {item.personaName && <span>{item.personaName}</span>}
                        <span>{formatTokens(item.totalTokens)} tokens</span>
                      </div>
                    </div>
                    <span className="text-xs text-surface-300 font-medium shrink-0">{formatCost(item.totalCost)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {costAnalytics.totalCost === 0 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">📊</div>
              <p className="text-sm text-surface-400">No usage data yet</p>
              <p className="text-xs text-surface-600 mt-1">Start conversations and meetings to see cost analytics here</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 text-[10px] text-surface-600">
          {costAnalytics.totalMessages} AI responses across all personas
        </div>
      </div>
    </div>
  );
}
