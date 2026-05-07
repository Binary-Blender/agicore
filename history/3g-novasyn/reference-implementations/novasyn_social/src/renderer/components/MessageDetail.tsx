import React, { useEffect, useState, useRef } from 'react';
import { useSocialStore } from '../store/socialStore';
import type { Message, Draft, ResponseMode } from '../../shared/types';

const CHANNEL_COLORS: Record<string, string> = {
  email: 'bg-blue-500',
  linkedin_dm: 'bg-blue-700',
  linkedin_comment: 'bg-blue-700',
  youtube: 'bg-red-500',
  twitter: 'bg-sky-500',
  manual: 'bg-gray-500',
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  linkedin_dm: 'LinkedIn DM',
  linkedin_comment: 'LinkedIn Comment',
  youtube: 'YouTube',
  twitter: 'Twitter',
  manual: 'Manual',
};

const SENTIMENT_STYLES: Record<string, string> = {
  positive: 'bg-green-500/20 text-green-400 border-green-500/30',
  neutral: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  negative: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  hostile: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const RESPONSE_MODE_STYLES: Record<string, string> = {
  standard: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  agree_amplify: 'bg-green-500/20 text-green-400 border-green-500/30',
  educate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  battle: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const RESPONSE_MODE_LABELS: Record<string, string> = {
  standard: 'Standard',
  agree_amplify: 'Agree & Amplify',
  educate: 'Educate',
  battle: 'High Stakes',
};

const RESPONSE_MODES: { value: ResponseMode; label: string; color: string }[] = [
  { value: 'standard', label: 'Standard', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  { value: 'agree_amplify', label: 'Agree & Amplify', color: 'bg-green-600 hover:bg-green-700 text-white' },
  { value: 'educate', label: 'Educate', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  { value: 'battle', label: 'High Stakes', color: 'bg-red-600 hover:bg-red-700 text-white' },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MessageDetail: React.FC = () => {
  const selectedMessageId = useSocialStore((s) => s.selectedMessageId);
  const loadMessage = useSocialStore((s) => s.loadMessage);
  const updateMessage = useSocialStore((s) => s.updateMessage);
  const deleteMessage = useSocialStore((s) => s.deleteMessage);
  const selectMessage = useSocialStore((s) => s.selectMessage);
  const setCurrentView = useSocialStore((s) => s.setCurrentView);

  // AI state
  const isClassifying = useSocialStore((s) => s.isClassifying);
  const isGenerating = useSocialStore((s) => s.isGenerating);
  const streamedText = useSocialStore((s) => s.streamedText);
  const selectedModel = useSocialStore((s) => s.selectedModel);
  const models = useSocialStore((s) => s.models);
  const classifyMessageAction = useSocialStore((s) => s.classifyMessage);
  const generateDraftAction = useSocialStore((s) => s.generateDraft);
  const stopGeneration = useSocialStore((s) => s.stopGeneration);
  const setSelectedModel = useSocialStore((s) => s.setSelectedModel);

  const submitFeedback = useSocialStore((s) => s.submitFeedback);
  const createKBEntry = useSocialStore((s) => s.createKBEntry);
  const sendDraftAction = useSocialStore((s) => s.sendDraft);
  const getAutomationTierFor = useSocialStore((s) => s.getAutomationTierFor);

  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResponseMode, setSelectedResponseMode] = useState<ResponseMode>('standard');
  const draftTextRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [addedToKB, setAddedToKB] = useState<Record<string, boolean>>({});
  const [sendingDraftId, setSendingDraftId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ draftId: string; ok: boolean; error?: string } | null>(null);
  const [currentTier, setCurrentTier] = useState<number | null>(null);
  const autoTriggered = useRef(false);

  useEffect(() => {
    if (!selectedMessageId) {
      setCurrentView('inbox');
      return;
    }
    autoTriggered.current = false;
    setLoading(true);
    loadMessage(selectedMessageId).then((msg) => {
      setMessage(msg);
      setLoading(false);

      // Check automation tier for this channel+mode → Tier 1 auto-draft
      if (msg && !msg.drafts?.length) {
        getAutomationTierFor(msg.channelType, selectedResponseMode).then((tier) => {
          const tierLevel = tier?.currentTier ?? 0;
          setCurrentTier(tierLevel);
          // Tier 1+: auto-generate draft when message opened (Option A)
          if (tierLevel >= 1 && !autoTriggered.current) {
            autoTriggered.current = true;
            generateDraftAction(msg.id, selectedResponseMode);
          }
        });
      } else if (msg) {
        getAutomationTierFor(msg.channelType, selectedResponseMode).then((tier) => {
          setCurrentTier(tier?.currentTier ?? 0);
        });
      }
    });
  }, [selectedMessageId]);

  const handleBack = () => {
    selectMessage(null);
    setCurrentView('inbox');
  };

  const handleStar = async () => {
    if (!message) return;
    await updateMessage(message.id, { isStarred: !message.isStarred } as any);
    setMessage((prev) => (prev ? { ...prev, isStarred: !prev.isStarred } : prev));
  };

  const handleArchive = async () => {
    if (!message) return;
    await updateMessage(message.id, { isArchived: true } as any);
    handleBack();
  };

  // --- Feedback handlers (feed the SPC pipeline) ---
  const handleAcceptDraft = async (draft: Draft) => {
    await submitFeedback({
      draftId: draft.id,
      finalText: draft.draftText,
      editDistance: 0,
      wasAccepted: true,
      wasSent: false,
    });
    const updated = await loadMessage(message!.id);
    if (updated) setMessage(updated);
  };

  const handleEditAndSendDraft = async (draft: Draft) => {
    const editedText = draftTextRefs.current[draft.id]?.value ?? draft.draftText;
    // Simple Levenshtein-approximate edit distance (character-level ratio)
    const original = draft.draftText;
    const editDist = original === editedText
      ? 0
      : Math.abs(original.length - editedText.length) / Math.max(original.length, editedText.length, 1);
    await submitFeedback({
      draftId: draft.id,
      finalText: editedText,
      editDistance: Math.min(1, editDist + (original !== editedText ? 0.1 : 0)),
      editClassification: 'tone',
      wasAccepted: true,
      wasSent: true,
    });
    const updated = await loadMessage(message!.id);
    if (updated) setMessage(updated);
  };

  const handleRejectDraft = async (draft: Draft) => {
    await submitFeedback({
      draftId: draft.id,
      wasAccepted: false,
      userRating: 1,
    });
    const updated = await loadMessage(message!.id);
    if (updated) setMessage(updated);
  };

  const handleSendDraft = async (draft: Draft) => {
    if (!message) return;
    setSendingDraftId(draft.id);
    setSendResult(null);
    const editedText = draftTextRefs.current[draft.id]?.value ?? draft.draftText;
    const result = await sendDraftAction({
      draftId: draft.id,
      finalText: editedText !== draft.draftText ? editedText : undefined,
    });
    setSendingDraftId(null);
    setSendResult({ draftId: draft.id, ok: result.sent, error: result.error });
    if (result.sent) {
      const updated = await loadMessage(message.id);
      if (updated) setMessage(updated);
    }
  };

  const handleDelete = async () => {
    if (!message) return;
    await deleteMessage(message.id);
    handleBack();
  };

  const handleClassify = async () => {
    if (!message) return;
    await classifyMessageAction(message.id);
    // Reload to get classification
    const updated = await loadMessage(message.id);
    if (updated) setMessage(updated);
  };

  const handleGenerateDraft = async () => {
    if (!message) return;
    await generateDraftAction(message.id, selectedResponseMode);
    // Reload to get updated drafts
    const updated = await loadMessage(message.id);
    if (updated) setMessage(updated);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!message) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
        <p className="mb-4">Message not found</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
        >
          Back to Inbox
        </button>
      </div>
    );
  }

  const classification = message.classification;
  const drafts = message.drafts;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[var(--bg-panel)] border-b border-[var(--border)]">
        <button
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="Back to Inbox"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-[var(--text-heading)] truncate flex-1">
          {message.subject || 'No subject'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleStar}
            className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] transition-colors text-lg ${
              message.isStarred ? 'text-amber-400' : 'text-[var(--text-muted)]'
            }`}
            title={message.isStarred ? 'Unstar' : 'Star'}
          >
            {message.isStarred ? '\u2605' : '\u2606'}
          </button>
          <button
            onClick={handleArchive}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Archive"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Message Panel */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5">
          {/* Sender info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              {(message.senderName || message.senderHandle || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-heading)]">
                  {message.senderName || 'Unknown'}
                </span>
                {message.senderHandle && (
                  <span className="text-xs text-[var(--text-muted)]">{message.senderHandle}</span>
                )}
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${
                    CHANNEL_COLORS[message.channelType] || 'bg-gray-500'
                  }`}
                >
                  {CHANNEL_LABELS[message.channelType] || message.channelType}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {message.createdAt ? formatDate(message.createdAt) : 'Unknown time'}
                {message.threadId && (
                  <span className="ml-2">Thread: {message.threadId}</span>
                )}
              </p>
            </div>
          </div>

          {/* Subject */}
          {message.subject && (
            <h3 className="text-base font-semibold text-[var(--text-heading)] mb-3">
              {message.subject}
            </h3>
          )}

          {/* Body */}
          <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {message.body || 'No message content'}
          </div>
        </div>

        {/* Classification Panel */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[var(--text-heading)] mb-4">Classification</h3>

          {classification ? (
            <div className="space-y-4">
              {/* Badges row */}
              <div className="flex flex-wrap gap-2">
                {/* Opportunity type */}
                {classification.opportunityType && (
                  <span className="inline-flex items-center px-2 py-1 rounded-lg border text-xs font-medium bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                    {classification.opportunityType}
                  </span>
                )}
                {/* Sentiment */}
                {classification.sentiment && (
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-lg border text-xs font-medium ${
                      SENTIMENT_STYLES[classification.sentiment] || SENTIMENT_STYLES.neutral
                    }`}
                  >
                    {classification.sentiment}
                  </span>
                )}
                {/* Intent */}
                {classification.intent && (
                  <span className="inline-flex items-center px-2 py-1 rounded-lg border text-xs font-medium bg-sky-500/20 text-sky-400 border-sky-500/30">
                    {classification.intent}
                  </span>
                )}
              </div>

              {/* Confidence meter */}
              {classification.confidence != null && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--text-muted)]">Confidence</span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {Math.round(classification.confidence)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[var(--bg-input)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        classification.confidence >= 75
                          ? 'bg-green-500'
                          : classification.confidence >= 50
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, classification.confidence)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Hostility level */}
              {classification.hostilityLevel != null && classification.hostilityLevel > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span className="text-xs text-red-400">
                    Hostility Level: {classification.hostilityLevel}/10
                  </span>
                </div>
              )}

              {/* AI explanation */}
              {classification.explanation && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">AI Explanation</p>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {classification.explanation}
                  </p>
                </div>
              )}

              {/* Model used */}
              {classification.modelUsed && (
                <p className="text-xs text-[var(--text-muted)]">
                  Model: <span className="text-[var(--text-primary)]">{classification.modelUsed}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--text-muted)] mb-3">Not yet classified</p>
              <button
                onClick={handleClassify}
                disabled={isClassifying}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isClassifying && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {isClassifying ? 'Classifying...' : 'Classify'}
              </button>
            </div>
          )}
        </div>

        {/* Drafts Panel */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-heading)]">Response Drafts</h3>
            {currentTier != null && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                currentTier === 0 ? 'bg-gray-500/20 text-gray-400' :
                currentTier === 1 ? 'bg-blue-500/20 text-blue-400' :
                currentTier === 2 ? 'bg-green-500/20 text-green-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {currentTier === 0 ? 'Tier 0: Review Required' :
                 currentTier === 1 ? 'Tier 1: Auto-Draft' :
                 currentTier === 2 ? 'Tier 2: Auto-Send' :
                 'Tier 3: Autonomous'}
              </span>
            )}
          </div>

          {/* Draft Generation Controls */}
          <div className="mb-5 space-y-3">
            {/* Response Mode Selector */}
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-2 block">Response Mode</label>
              <div className="flex flex-wrap gap-2">
                {RESPONSE_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setSelectedResponseMode(mode.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedResponseMode === mode.value
                        ? mode.color
                        : 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {mode.value === 'battle' && (
                      <svg className="w-3 h-3 inline-block mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    )}
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Battle Mode Warning */}
            {selectedResponseMode === 'battle' && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <p className="text-xs text-red-400 font-medium">Manual Only</p>
                  <p className="text-xs text-red-400/80">
                    High Stakes drafts ALWAYS require manual approval. Auto-send is permanently disabled for this mode.
                  </p>
                </div>
              </div>
            )}

            {/* Model Selector + Generate Button */}
            <div className="flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {models.length > 0 ? (
                  models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </option>
                  ))
                ) : (
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (anthropic)</option>
                )}
              </select>

              {isGenerating ? (
                <button
                  onClick={stopGeneration}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleGenerateDraft}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate New Draft
                </button>
              )}
            </div>
          </div>

          {/* Streaming Response Display */}
          {isGenerating && (
            <div className="mb-5 border border-indigo-500/30 rounded-lg p-4 bg-indigo-500/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                <span className="text-xs font-medium text-indigo-400">Generating draft...</span>
              </div>
              <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {streamedText}
                <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-text-bottom" />
              </div>
            </div>
          )}

          {/* Existing Drafts */}
          {drafts && drafts.length > 0 ? (
            <div className="space-y-4">
              {drafts.map((draft, idx) => (
                <div
                  key={draft.id || idx}
                  className="border border-[var(--border)] rounded-lg p-4"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${
                        RESPONSE_MODE_STYLES[draft.responseMode] || RESPONSE_MODE_STYLES.standard
                      }`}
                    >
                      {RESPONSE_MODE_LABELS[draft.responseMode] || draft.responseMode}
                    </span>
                    {draft.responseMode === 'battle' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                        Manual Only
                      </span>
                    )}
                    {draft.confidence != null && (
                      <span className="text-xs text-[var(--text-muted)]">
                        Confidence: {Math.round(draft.confidence)}%
                      </span>
                    )}
                    {draft.isAccepted && (
                      <>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          Accepted
                        </span>
                        {addedToKB[draft.id] ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            Added to KB
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              await createKBEntry({
                                entryType: 'gold_reply',
                                title: `${RESPONSE_MODE_LABELS[draft.responseMode] || draft.responseMode} — ${message?.subject || message?.senderName || 'Draft'}`,
                                content: draft.draftText,
                                channelType: message?.channelType,
                                responseMode: draft.responseMode,
                                tags: [draft.responseMode, 'manual-add'],
                              });
                              setAddedToKB((prev) => ({ ...prev, [draft.id]: true }));
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors cursor-pointer"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                            Add to KB
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Draft text */}
                  <textarea
                    ref={(el) => { draftTextRefs.current[draft.id] = el; }}
                    defaultValue={draft.draftText}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[80px]"
                    rows={4}
                  />

                  {/* Rationale */}
                  {draft.rationale && (
                    <p className="text-xs text-[var(--text-muted)] mt-2 italic">
                      {draft.rationale}
                    </p>
                  )}

                  {/* Actions */}
                  {!draft.isAccepted ? (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleAcceptDraft(draft)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Accept
                      </button>
                      {message?.channelType === 'email' && message?.recipientEmail && (
                        <button
                          onClick={() => handleSendDraft(draft)}
                          disabled={sendingDraftId === draft.id}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1"
                        >
                          {sendingDraftId === draft.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Accept & Send via Gmail'
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleEditAndSendDraft(draft)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Edit & Accept
                      </button>
                      <button
                        onClick={() => handleRejectDraft(draft)}
                        className="px-3 py-1.5 bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-muted)] hover:text-red-400 rounded-lg text-xs font-medium transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-3">
                      {!draft.isSent && message?.channelType === 'email' && message?.recipientEmail && (
                        <button
                          onClick={() => handleSendDraft(draft)}
                          disabled={sendingDraftId === draft.id}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1"
                        >
                          {sendingDraftId === draft.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Send via Gmail'
                          )}
                        </button>
                      )}
                      {draft.isSent && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          Sent
                        </span>
                      )}
                    </div>
                  )}
                  {sendResult && sendResult.draftId === draft.id && (
                    <p className={`text-xs mt-1 ${sendResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {sendResult.ok ? 'Reply sent successfully' : `Send failed: ${sendResult.error}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : !isGenerating ? (
            <div className="text-center py-4">
              <p className="text-sm text-[var(--text-muted)]">No drafts generated yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Select a response mode and click Generate New Draft
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MessageDetail;
