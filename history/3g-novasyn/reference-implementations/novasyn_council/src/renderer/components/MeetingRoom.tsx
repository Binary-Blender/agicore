import React, { useState, useRef, useEffect } from 'react';
import { useCouncilStore } from '../store/councilStore';
import type { MeetingMessage, MeetingAnalysis, ActionItem, DecisionRecord, MeetingVoteResult, PersonaVote } from '../../shared/types';

const MODEL_COLORS: Record<string, string> = {
  anthropic: 'text-orange-400',
  openai: 'text-green-400',
  google: 'text-blue-400',
  xai: 'text-purple-400',
};

const MEETING_TYPE_LABELS: Record<string, string> = {
  brainstorm: 'Brainstorm',
  review: 'Review',
  standup: 'Standup',
  decision: 'Decision',
  pipeline: 'Pipeline',
};

const MEETING_TYPE_COLORS: Record<string, string> = {
  brainstorm: 'bg-yellow-600/20 text-yellow-300',
  review: 'bg-blue-600/20 text-blue-300',
  standup: 'bg-green-600/20 text-green-300',
  decision: 'bg-red-600/20 text-red-300',
  pipeline: 'bg-purple-600/20 text-purple-300',
};

export default function MeetingRoom() {
  const {
    currentMeeting,
    meetingMessages,
    meetingLoading,
    meetingAnalysis,
    analyzingMeeting,
    actionItems,
    decisionRecords,
    streamingContent,
    streamingPersonaId,
    personas,
    models,
    leaveMeeting,
    endMeeting,
    sendMeetingMessage,
    deleteMeeting,
    analyzeMeetingIntel,
    clearMeetingAnalysis,
    exportMeeting,
    createActionItem,
    updateActionItem,
    deleteActionItem,
    createDecisionRecord,
    deleteDecisionRecord,
    suggestRelationshipsFromMeeting,
    suggestingRelationships,
    setShowRelationshipPanel,
    meetingVoteResult,
    callingVote,
    callMeetingVote,
    clearMeetingVote,
  } = useCouncilStore();

  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [showVotePrompt, setShowVotePrompt] = useState(false);
  const [voteQuestion, setVoteQuestion] = useState('');
  const [showIntel, setShowIntel] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meetingMessages, meetingLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  if (!currentMeeting) return null;

  const participants = currentMeeting.participantIds
    .map(id => personas.find(p => p.id === id))
    .filter(Boolean) as typeof personas;

  const getPersona = (id: string | null) => id ? personas.find(p => p.id === id) : null;
  const getModel = (modelId: string) => models.find(m => m.id === modelId);

  const isActive = currentMeeting.status === 'active';

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || meetingLoading || !isActive) return;

    setInput('');
    setError('');

    try {
      await sendMeetingMessage(trimmed);
    } catch (e: any) {
      setError(e.message || 'Failed to send message');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndMeeting = () => {
    if (confirm('End this meeting? You can still view it but no new messages can be sent.')) {
      endMeeting();
    }
  };

  const handleDelete = () => {
    if (confirm('Delete this meeting and all its messages? This cannot be undone.')) {
      deleteMeeting(currentMeeting.id);
    }
  };

  // Calculate round cost (total cost of last batch of persona responses)
  const totalCost = meetingMessages.reduce((sum, m) => sum + (m.cost || 0), 0);
  const totalTokens = meetingMessages.reduce((sum, m) => sum + (m.tokensIn || 0) + (m.tokensOut || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Meeting Header */}
      <div className="px-4 py-3 border-b border-white/5 bg-[var(--bg-panel)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={leaveMeeting}
              className="text-xs text-surface-400 hover:text-surface-200 transition-colors"
            >
              ← Back
            </button>
            <span className="text-xs text-surface-500">|</span>
            <h2 className="text-sm font-semibold text-surface-200">{currentMeeting.title}</h2>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${MEETING_TYPE_COLORS[currentMeeting.meetingType] || ''}`}>
              {MEETING_TYPE_LABELS[currentMeeting.meetingType] || currentMeeting.meetingType}
            </span>
            {currentMeeting.status === 'completed' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-600/30 text-surface-400">Ended</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Action Items / Decisions toggle */}
            <button
              onClick={() => { setShowItems(!showItems); if (!showItems) setShowIntel(false); }}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                showItems
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30'
                  : 'bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-600/20'
              }`}
            >
              {showItems ? 'Hide Items' : `Items${actionItems.length ? ` (${actionItems.length})` : ''}`}
            </button>
            {meetingMessages.length >= 2 && (
              <button
                onClick={() => {
                  if (meetingAnalysis && showIntel) {
                    setShowIntel(false);
                  } else if (meetingAnalysis) {
                    setShowIntel(true);
                    setShowItems(false);
                  } else {
                    analyzeMeetingIntel();
                    setShowIntel(true);
                    setShowItems(false);
                  }
                }}
                disabled={analyzingMeeting}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  showIntel && meetingAnalysis
                    ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-600/30'
                    : 'bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-300 border border-cyan-600/20'
                } disabled:opacity-40`}
              >
                {analyzingMeeting ? 'Analyzing...' : showIntel ? 'Hide Intel' : 'Meeting Intel'}
              </button>
            )}
            <button
              onClick={exportMeeting}
              className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 text-surface-400 border border-white/10 rounded transition-colors"
              title="Export as Markdown"
            >
              Export
            </button>
            {/* Call Vote — decision meetings only */}
            {currentMeeting.meetingType === 'decision' && meetingMessages.length >= 2 && (
              <button
                onClick={() => setShowVotePrompt(true)}
                disabled={callingVote}
                className="px-2 py-1 text-[10px] bg-red-600/10 hover:bg-red-600/20 text-red-300 border border-red-600/20 rounded transition-colors disabled:opacity-40"
                title="Call a vote on a decision"
              >
                {callingVote ? 'Voting...' : 'Call Vote'}
              </button>
            )}
            {meetingMessages.length > 0 && (
              <button
                onClick={async () => {
                  await suggestRelationshipsFromMeeting();
                  setShowRelationshipPanel(true);
                }}
                disabled={suggestingRelationships}
                className="px-2 py-1 text-[10px] bg-purple-600/10 hover:bg-purple-600/20 text-purple-300 border border-purple-600/20 rounded transition-colors disabled:opacity-40"
                title="Analyze meeting for relationship dynamics"
              >
                {suggestingRelationships ? 'Analyzing...' : 'Relationships'}
              </button>
            )}
            {isActive && (
              <button
                onClick={handleEndMeeting}
                className="px-2 py-1 text-[10px] bg-white/5 hover:bg-white/10 text-surface-300 rounded transition-colors"
              >
                End Meeting
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-2 py-1 text-[10px] bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Participants row */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {participants.map((p, i) => {
              const model = getModel(p.model);
              const modelColor = model ? MODEL_COLORS[model.provider] || 'text-surface-400' : 'text-surface-400';
              return (
                <div key={p.id} className="flex items-center gap-1 bg-white/[0.03] rounded-lg px-2 py-1" title={`${p.name} — ${p.role} (${model?.name || p.model})`}>
                  <span className="text-sm">{p.avatarEmoji}</span>
                  <span className="text-[10px] text-surface-300">{p.name}</span>
                  <span className={`text-[9px] ${modelColor}`}>{model?.name?.split(' ')[0] || ''}</span>
                </div>
              );
            })}
            <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg px-2 py-1">
              <span className="text-sm">👤</span>
              <span className="text-[10px] text-surface-300">You</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-surface-500 ml-auto">
            <span>{totalTokens.toLocaleString()} tokens</span>
            <span>${totalCost.toFixed(4)}</span>
          </div>
        </div>

        {/* Agenda */}
        {currentMeeting.agenda && (
          <div className="mt-2 px-2 py-1.5 bg-white/[0.02] rounded border border-white/5">
            <span className="text-[10px] text-surface-500">Agenda: </span>
            <span className="text-[11px] text-surface-400">{currentMeeting.agenda}</span>
          </div>
        )}
      </div>

      {/* Main area: messages + optional intel panel */}
      <div className="flex flex-1 overflow-hidden">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {meetingMessages.length === 0 && !meetingLoading && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🏛️</p>
            <p className="text-sm text-surface-400 mb-1">Meeting is ready</p>
            <p className="text-xs text-surface-500">
              Send a message to address the team. Each persona will respond in order.
            </p>
          </div>
        )}

        {meetingMessages.map(msg => (
          <MeetingBubble
            key={msg.id}
            message={msg}
            persona={getPersona(msg.senderPersonaId)}
            model={msg.modelUsed ? getModel(msg.modelUsed) : null}
          />
        ))}

        {meetingLoading && (() => {
          const streamingPersona = streamingPersonaId ? getPersona(streamingPersonaId) : null;
          return (
            <div className="flex items-start gap-3">
              <div className="text-lg shrink-0">
                {streamingPersona?.avatarEmoji || '🏛️'}
              </div>
              <div className="max-w-[80%]">
                {streamingPersona && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-surface-300 font-medium">{streamingPersona.name}</span>
                    <span className="text-[10px] text-surface-500">{streamingPersona.role}</span>
                  </div>
                )}
                <div className="rounded-lg px-4 py-3 bg-white/[0.03] border border-white/5">
                  {streamingContent ? (
                    <div className="text-sm text-surface-200 whitespace-pre-wrap leading-relaxed">
                      <MeetingMarkdown content={streamingContent} />
                      <span className="inline-block w-1.5 h-4 bg-primary-400/60 ml-0.5 animate-pulse" />
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-surface-500 mb-1">
                        {streamingPersona ? `${streamingPersona.name} is thinking...` : 'Team is responding...'}
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div ref={messagesEndRef} />
      </div>

      {/* Intel Panel */}
      {showIntel && (meetingAnalysis || analyzingMeeting) && (
        <IntelPanel
          analysis={meetingAnalysis}
          analyzing={analyzingMeeting}
          meetingId={currentMeeting.id}
          personas={personas}
          onAcceptActionItem={async (ai) => {
            const persona = personas.find(p => p.name.toLowerCase() === ai.assignee.toLowerCase());
            await createActionItem({
              meetingId: currentMeeting.id,
              assigneePersonaId: persona?.id,
              assigneeName: ai.assignee,
              task: ai.task,
              priority: ai.priority,
            });
          }}
          onAcceptDecision={async (decision: string) => {
            await createDecisionRecord({
              meetingId: currentMeeting.id,
              decision,
              decidedBy: 'Meeting Intel',
            });
          }}
          onRefresh={() => { clearMeetingAnalysis(); analyzeMeetingIntel(); }}
          onClose={() => setShowIntel(false)}
        />
      )}

      {/* Action Items & Decisions Panel */}
      {showItems && (
        <ItemsPanel
          actionItems={actionItems}
          decisionRecords={decisionRecords}
          personas={personas}
          meetingId={currentMeeting.id}
          onUpdateItem={updateActionItem}
          onDeleteItem={deleteActionItem}
          onCreateItem={createActionItem}
          onDeleteDecision={deleteDecisionRecord}
          onCreateDecision={createDecisionRecord}
          onClose={() => setShowItems(false)}
        />
      )}

      </div>{/* end flex main area */}

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 bg-red-600/10 border border-red-600/20 rounded-lg text-xs text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-red-300 hover:text-red-200">✕</button>
        </div>
      )}

      {/* Input */}
      {isActive ? (
        <div className="p-4 border-t border-white/5">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Address the team..."
              rows={1}
              disabled={meetingLoading}
              className="flex-1 px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50 resize-none disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || meetingLoading}
              className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Send
            </button>
          </div>
          <p className="text-[10px] text-surface-600 mt-1">
            Enter to send to all {participants.length} participants. Shift+Enter for new line.
          </p>
        </div>
      ) : (
        <div className="p-4 border-t border-white/5 text-center">
          <p className="text-xs text-surface-500">This meeting has ended. Messages are read-only.</p>
        </div>
      )}

      {/* Vote Question Prompt */}
      {showVotePrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setShowVotePrompt(false)}>
          <div className="w-[420px] bg-[#16213e] rounded-lg border border-white/10 shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-surface-200 mb-3">Call a Vote</h3>
            <p className="text-xs text-surface-500 mb-2">What question should the team vote on?</p>
            <input
              type="text"
              value={voteQuestion}
              onChange={e => setVoteQuestion(e.target.value)}
              placeholder="e.g., Should we proceed with Option A?"
              className="w-full px-3 py-2 text-sm bg-[var(--bg-input)] border border-white/10 rounded-lg text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-primary-500/50 mb-3"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && voteQuestion.trim()) {
                  setShowVotePrompt(false);
                  callMeetingVote(voteQuestion.trim());
                  setVoteQuestion('');
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowVotePrompt(false)}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-surface-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!voteQuestion.trim()) return;
                  setShowVotePrompt(false);
                  callMeetingVote(voteQuestion.trim());
                  setVoteQuestion('');
                }}
                disabled={!voteQuestion.trim()}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-40"
              >
                Call Vote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vote Results */}
      {meetingVoteResult && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => clearMeetingVote()}>
          <div className="w-[520px] max-h-[70vh] flex flex-col bg-[#16213e] rounded-lg border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-surface-200">Vote Results</h3>
              <button onClick={() => clearMeetingVote()} className="text-surface-500 hover:text-surface-300 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Question */}
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Question</p>
                <p className="text-sm text-surface-200">{meetingVoteResult.question}</p>
              </div>

              {/* Summary */}
              <div className={`rounded-lg p-3 border ${
                meetingVoteResult.summary.includes('passes')
                  ? 'bg-green-600/10 border-green-600/20'
                  : meetingVoteResult.summary.includes('fails')
                    ? 'bg-red-600/10 border-red-600/20'
                    : 'bg-yellow-600/10 border-yellow-600/20'
              }`}>
                <p className={`text-sm font-medium ${
                  meetingVoteResult.summary.includes('passes')
                    ? 'text-green-300'
                    : meetingVoteResult.summary.includes('fails')
                      ? 'text-red-300'
                      : 'text-yellow-300'
                }`}>
                  {meetingVoteResult.summary}
                </p>
              </div>

              {/* Individual votes */}
              <div className="space-y-2">
                {meetingVoteResult.votes.map(vote => (
                  <div key={vote.personaId} className="flex items-start gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                    <span className="text-lg shrink-0">{vote.avatarEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-surface-200 font-medium">{vote.personaName}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          vote.position === 'approve'
                            ? 'bg-green-600/20 text-green-300'
                            : vote.position === 'oppose'
                              ? 'bg-red-600/20 text-red-300'
                              : 'bg-surface-600/20 text-surface-400'
                        }`}>
                          {vote.position.charAt(0).toUpperCase() + vote.position.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400 leading-relaxed">{vote.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save as decision */}
            <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-surface-600">{meetingVoteResult.votes.length} votes cast</span>
              <button
                onClick={async () => {
                  await createDecisionRecord({
                    meetingId: currentMeeting!.id,
                    decision: `Vote: "${meetingVoteResult!.question}" — ${meetingVoteResult!.summary}`,
                    reason: meetingVoteResult!.votes.map(v => `${v.personaName}: ${v.position} — ${v.reasoning}`).join('; '),
                    decidedBy: 'Team Vote',
                  });
                  clearMeetingVote();
                }}
                className="px-3 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-600/20 rounded-lg transition-colors"
              >
                Save as Decision Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Intelligence Panel ───────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-600/20 text-red-300',
  medium: 'bg-yellow-600/20 text-yellow-300',
  low: 'bg-surface-600/20 text-surface-400',
};

function IntelPanel({ analysis, analyzing, meetingId, personas, onAcceptActionItem, onAcceptDecision, onRefresh, onClose }: {
  analysis: MeetingAnalysis | null;
  analyzing: boolean;
  meetingId: string;
  personas: any[];
  onAcceptActionItem: (ai: { assignee: string; task: string; priority: 'high' | 'medium' | 'low' }) => Promise<void>;
  onAcceptDecision: (decision: string) => Promise<void>;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const [acceptedItems, setAcceptedItems] = useState<Set<number>>(new Set());
  const [acceptedDecisions, setAcceptedDecisions] = useState<Set<number>>(new Set());
  return (
    <div className="w-72 border-l border-white/5 bg-[var(--bg-panel)] flex flex-col overflow-hidden shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-xs font-semibold text-cyan-300">Meeting Intelligence</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefresh}
            disabled={analyzing}
            className="text-[10px] text-surface-400 hover:text-surface-200 transition-colors disabled:opacity-40"
            title="Refresh analysis"
          >
            ↻
          </button>
          <button
            onClick={onClose}
            className="text-surface-500 hover:text-surface-300 transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {analyzing ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-2">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-[10px] text-surface-500">Analyzing meeting...</p>
          </div>
        </div>
      ) : analysis ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Summary */}
          {analysis.summary && (
            <IntelSection title="Summary" color="text-surface-300">
              <p className="text-[11px] text-surface-300 leading-relaxed">{analysis.summary}</p>
            </IntelSection>
          )}

          {/* Consensus */}
          {analysis.consensus.length > 0 && (
            <IntelSection title="Consensus" color="text-green-300" count={analysis.consensus.length}>
              {analysis.consensus.map((c, i) => (
                <div key={i} className="bg-green-600/10 border border-green-600/20 rounded p-2 mb-1.5">
                  <p className="text-[11px] text-surface-200 mb-0.5">{c.point}</p>
                  <p className="text-[10px] text-surface-500">{c.support}</p>
                </div>
              ))}
            </IntelSection>
          )}

          {/* Disagreements */}
          {analysis.disagreements.length > 0 && (
            <IntelSection title="Disagreements" color="text-red-300" count={analysis.disagreements.length}>
              {analysis.disagreements.map((d, i) => (
                <div key={i} className="bg-red-600/10 border border-red-600/20 rounded p-2 mb-1.5">
                  <p className="text-[11px] text-surface-200 mb-0.5">{d.topic}</p>
                  <p className="text-[10px] text-surface-500">{d.sides}</p>
                </div>
              ))}
            </IntelSection>
          )}

          {/* Insights */}
          {analysis.insights.length > 0 && (
            <IntelSection title="Insights" color="text-cyan-300" count={analysis.insights.length}>
              {analysis.insights.map((insight, i) => (
                <div key={i} className="bg-cyan-600/10 border border-cyan-600/20 rounded p-2 mb-1.5">
                  <p className="text-[11px] text-surface-200">{insight}</p>
                </div>
              ))}
            </IntelSection>
          )}

          {/* Missing Perspectives */}
          {analysis.missingPerspectives.length > 0 && (
            <IntelSection title="Blind Spots" color="text-orange-300" count={analysis.missingPerspectives.length}>
              {analysis.missingPerspectives.map((mp, i) => (
                <div key={i} className="bg-orange-600/10 border border-orange-600/20 rounded p-2 mb-1.5">
                  <p className="text-[11px] text-surface-200">{mp}</p>
                </div>
              ))}
            </IntelSection>
          )}

          {/* Action Items */}
          {analysis.actionItems.length > 0 && (
            <IntelSection title="Action Items" color="text-purple-300" count={analysis.actionItems.length}>
              {analysis.actionItems.map((ai, i) => (
                <div key={i} className="bg-purple-600/10 border border-purple-600/20 rounded p-2 mb-1.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] px-1 py-0.5 rounded ${PRIORITY_COLORS[ai.priority] || PRIORITY_COLORS.medium}`}>
                        {ai.priority}
                      </span>
                      <span className="text-[10px] text-surface-400">{ai.assignee}</span>
                    </div>
                    {acceptedItems.has(i) ? (
                      <span className="text-[9px] text-green-400">Saved</span>
                    ) : (
                      <button
                        onClick={async () => {
                          await onAcceptActionItem(ai);
                          setAcceptedItems(prev => new Set(prev).add(i));
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 transition-colors"
                      >
                        Accept
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-surface-200">{ai.task}</p>
                </div>
              ))}
            </IntelSection>
          )}

          {/* Consensus as potential decisions */}
          {analysis.consensus.length > 0 && (
            <div className="mt-2">
              <p className="text-[9px] text-surface-500 mb-1">Save consensus points as decision records:</p>
              {analysis.consensus.map((c, i) => (
                <div key={i} className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-surface-400 truncate flex-1 mr-2">{c.point}</p>
                  {acceptedDecisions.has(i) ? (
                    <span className="text-[9px] text-green-400 shrink-0">Saved</span>
                  ) : (
                    <button
                      onClick={async () => {
                        await onAcceptDecision(c.point);
                        setAcceptedDecisions(prev => new Set(prev).add(i));
                      }}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-green-600/20 hover:bg-green-600/40 text-green-300 transition-colors shrink-0"
                    >
                      Save
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function IntelSection({ title, color, count, children }: {
  title: string;
  color: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <h3 className={`text-[10px] font-semibold uppercase tracking-wider ${color}`}>{title}</h3>
        {count != null && (
          <span className="text-[9px] text-surface-500">({count})</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Action Items & Decisions Panel ──────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-600/20 text-yellow-300',
  in_progress: 'bg-blue-600/20 text-blue-300',
  completed: 'bg-green-600/20 text-green-300',
  cancelled: 'bg-surface-600/20 text-surface-400',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Done',
  cancelled: 'Cancelled',
};

function ItemsPanel({ actionItems, decisionRecords, personas, meetingId, onUpdateItem, onDeleteItem, onCreateItem, onDeleteDecision, onCreateDecision, onClose }: {
  actionItems: ActionItem[];
  decisionRecords: DecisionRecord[];
  personas: any[];
  meetingId: string;
  onUpdateItem: (id: string, updates: Partial<ActionItem>) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onCreateItem: (input: any) => Promise<void>;
  onDeleteDecision: (id: string) => Promise<void>;
  onCreateDecision: (input: any) => Promise<void>;
  onClose: () => void;
}) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newAssignee, setNewAssignee] = useState('User');
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showAddDecision, setShowAddDecision] = useState(false);
  const [newDecision, setNewDecision] = useState('');
  const [newReason, setNewReason] = useState('');

  const handleAddItem = async () => {
    if (!newTask.trim()) return;
    const persona = personas.find(p => p.name === newAssignee);
    await onCreateItem({
      meetingId,
      assigneePersonaId: persona?.id,
      assigneeName: newAssignee,
      task: newTask.trim(),
      priority: newPriority,
    });
    setNewTask('');
    setShowAddItem(false);
  };

  const handleAddDecision = async () => {
    if (!newDecision.trim()) return;
    await onCreateDecision({
      meetingId,
      decision: newDecision.trim(),
      reason: newReason.trim() || undefined,
      decidedBy: 'User',
    });
    setNewDecision('');
    setNewReason('');
    setShowAddDecision(false);
  };

  const cycleStatus = (current: string): string => {
    const order = ['pending', 'in_progress', 'completed', 'cancelled'];
    const idx = order.indexOf(current);
    return order[(idx + 1) % order.length];
  };

  return (
    <div className="w-72 border-l border-white/5 bg-[var(--bg-panel)] flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <span className="text-xs font-semibold text-purple-300">Action Items & Decisions</span>
        <button onClick={onClose} className="text-surface-500 hover:text-surface-300 transition-colors text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Action Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-purple-300">
              Action Items ({actionItems.length})
            </h3>
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
            >
              + Add
            </button>
          </div>

          {showAddItem && (
            <div className="bg-purple-600/10 border border-purple-600/20 rounded p-2 mb-2 space-y-1.5">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Task description..."
                className="w-full px-2 py-1 text-[11px] bg-black/20 border border-white/10 rounded text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-purple-500/50"
              />
              <div className="flex gap-1.5">
                <select
                  value={newAssignee}
                  onChange={e => setNewAssignee(e.target.value)}
                  className="flex-1 px-1.5 py-1 text-[10px] bg-black/20 border border-white/10 rounded text-surface-300 focus:outline-none"
                >
                  <option value="User">User</option>
                  {personas.map(p => (
                    <option key={p.id} value={p.name}>{p.avatarEmoji} {p.name}</option>
                  ))}
                </select>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="px-1.5 py-1 text-[10px] bg-black/20 border border-white/10 rounded text-surface-300 focus:outline-none"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handleAddItem}
                  disabled={!newTask.trim()}
                  className="px-2 py-0.5 text-[10px] bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded transition-colors disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddItem(false)}
                  className="px-2 py-0.5 text-[10px] text-surface-400 hover:text-surface-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {actionItems.length === 0 ? (
            <p className="text-[10px] text-surface-600 italic">No action items yet. Use Meeting Intel to extract them.</p>
          ) : (
            actionItems.map(item => (
              <div key={item.id} className="bg-white/[0.02] border border-white/5 rounded p-2 mb-1.5 group">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateItem(item.id, { status: cycleStatus(item.status) as any })}
                      className={`text-[9px] px-1 py-0.5 rounded cursor-pointer transition-colors ${STATUS_COLORS[item.status]}`}
                      title="Click to cycle status"
                    >
                      {STATUS_LABELS[item.status]}
                    </button>
                    <span className={`text-[9px] px-1 py-0.5 rounded ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium}`}>
                      {item.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-surface-200 mb-0.5">{item.task}</p>
                <p className="text-[10px] text-surface-500">{item.assigneeName}</p>
              </div>
            ))
          )}
        </div>

        {/* Decision Records */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-green-300">
              Decisions ({decisionRecords.length})
            </h3>
            <button
              onClick={() => setShowAddDecision(!showAddDecision)}
              className="text-[10px] text-green-400 hover:text-green-300 transition-colors"
            >
              + Add
            </button>
          </div>

          {showAddDecision && (
            <div className="bg-green-600/10 border border-green-600/20 rounded p-2 mb-2 space-y-1.5">
              <input
                value={newDecision}
                onChange={e => setNewDecision(e.target.value)}
                placeholder="Decision made..."
                className="w-full px-2 py-1 text-[11px] bg-black/20 border border-white/10 rounded text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-green-500/50"
              />
              <input
                value={newReason}
                onChange={e => setNewReason(e.target.value)}
                placeholder="Reason (optional)..."
                className="w-full px-2 py-1 text-[11px] bg-black/20 border border-white/10 rounded text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-green-500/50"
              />
              <div className="flex gap-1">
                <button
                  onClick={handleAddDecision}
                  disabled={!newDecision.trim()}
                  className="px-2 py-0.5 text-[10px] bg-green-600/30 hover:bg-green-600/50 text-green-200 rounded transition-colors disabled:opacity-40"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddDecision(false)}
                  className="px-2 py-0.5 text-[10px] text-surface-400 hover:text-surface-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {decisionRecords.length === 0 ? (
            <p className="text-[10px] text-surface-600 italic">No decisions recorded yet.</p>
          ) : (
            decisionRecords.map(dr => (
              <div key={dr.id} className="bg-green-600/5 border border-green-600/10 rounded p-2 mb-1.5 group">
                <div className="flex items-start justify-between">
                  <p className="text-[11px] text-surface-200 flex-1">{dr.decision}</p>
                  <button
                    onClick={() => onDeleteDecision(dr.id)}
                    className="text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all ml-1 shrink-0"
                  >
                    ✕
                  </button>
                </div>
                {dr.reason && <p className="text-[10px] text-surface-500 mt-0.5">{dr.reason}</p>}
                <p className="text-[9px] text-surface-600 mt-0.5">{dr.decidedBy || 'Unknown'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Message Bubble ───────────────────────────────────────────────────

function MeetingBubble({ message, persona, model }: {
  message: MeetingMessage;
  persona: any;
  model: any;
}) {
  const isHuman = message.senderType === 'human';
  const isError = !isHuman && message.content.startsWith('[Error:');

  return (
    <div className={`flex items-start gap-3 ${isHuman ? 'flex-row-reverse' : ''}`}>
      <div className="text-lg shrink-0">
        {isHuman ? '👤' : persona?.avatarEmoji || '🤖'}
      </div>

      <div className={`max-w-[80%] ${isHuman ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isHuman && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-surface-300 font-medium">{persona?.name || 'Unknown'}</span>
            <span className="text-[10px] text-surface-500">{persona?.role || ''}</span>
          </div>
        )}

        <div className={`rounded-lg px-4 py-3 ${
          isHuman
            ? 'bg-primary-600/20 border border-primary-500/20'
            : isError
              ? 'bg-red-600/10 border border-red-600/20'
              : 'bg-white/[0.03] border border-white/5'
        }`}>
          <div className="text-sm text-surface-200 whitespace-pre-wrap leading-relaxed">
            <MeetingMarkdown content={message.content} />
          </div>
        </div>

        {/* Meta */}
        <div className={`flex items-center gap-2 mt-1 text-[10px] text-surface-600 ${isHuman ? 'justify-end' : ''}`}>
          {isHuman ? (
            <span>You</span>
          ) : (
            <>
              {model && <span>{model.name}</span>}
              {message.responseTimeMs && <span>{(message.responseTimeMs / 1000).toFixed(1)}s</span>}
              {message.tokensIn != null && message.tokensOut != null && (
                <span>{message.tokensIn + message.tokensOut} tokens</span>
              )}
              {message.cost != null && message.cost > 0 && (
                <span>${message.cost.toFixed(4)}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Simple Markdown (same pattern as SoloChat) ──────────────────────────────

function MeetingMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockContent = [];
      } else {
        elements.push(
          <pre key={i} className="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto border border-white/5">
            <code className="text-xs text-surface-300 font-mono">{codeBlockContent.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) { codeBlockContent.push(line); continue; }

    if (line.startsWith('### ')) { elements.push(<h4 key={i} className="text-sm font-semibold text-surface-200 mt-3 mb-1">{line.slice(4)}</h4>); continue; }
    if (line.startsWith('## ')) { elements.push(<h3 key={i} className="text-base font-semibold text-surface-200 mt-3 mb-1">{line.slice(3)}</h3>); continue; }
    if (line.startsWith('# ')) { elements.push(<h2 key={i} className="text-lg font-bold text-surface-200 mt-3 mb-1">{line.slice(2)}</h2>); continue; }

    if (line.match(/^\s*[-*]\s/)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-surface-500 shrink-0">•</span>
          <span>{renderMeetingInline(line.replace(/^\s*[-*]\s/, ''))}</span>
        </div>
      );
      continue;
    }

    if (line.match(/^\s*\d+\.\s/)) {
      const match = line.match(/^\s*(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-2">
            <span className="text-surface-500 shrink-0">{match[1]}.</span>
            <span>{renderMeetingInline(match[2])}</span>
          </div>
        );
        continue;
      }
    }

    if (line.trim() === '') { elements.push(<div key={i} className="h-2" />); continue; }
    elements.push(<p key={i}>{renderMeetingInline(line)}</p>);
  }

  return <>{elements}</>;
}

function renderMeetingInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(<code key={key++} className="bg-black/30 px-1 py-0.5 rounded text-xs text-primary-300 font-mono">{codeMatch[2]}</code>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={key++} className="font-semibold text-surface-100">{boldMatch[2]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    parts.push(remaining);
    break;
  }

  return <>{parts}</>;
}
