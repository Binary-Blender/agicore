import React, { useEffect, useRef, useState } from 'react';
import { useAcademyStore } from '../store/academyStore';

export default function AITutor() {
  const {
    currentStudent,
    currentSchoolYear,
    subjects,
    models,
    settings,
    tutorSessions,
    currentTutorSession,
    tutorMessages,
    tutorStreaming,
    tutorStreamContent,
    createTutorSession,
    selectTutorSession,
    sendTutorMessage,
    endTutorSession,
    deleteTutorSession,
    handleTutorChunk,
  } = useAcademyStore();

  const [topic, setTopic] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [mode, setMode] = useState<'guided' | 'free' | 'review'>('guided');
  const [messageInput, setMessageInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [showNewSession, setShowNewSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set up tutor chunk listener
  useEffect(() => {
    window.electronAPI.onTutorChunk(handleTutorChunk);
    return () => {
      window.electronAPI.offTutorChunk();
    };
  }, [handleTutorChunk]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages, tutorStreamContent]);

  if (!currentStudent) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Select a student to use the AI Tutor
      </div>
    );
  }

  if (!currentSchoolYear) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Create a school year first to use the AI Tutor
      </div>
    );
  }

  const handleStartSession = async () => {
    if (!topic.trim()) return;
    await createTutorSession({
      studentId: currentStudent.id,
      schoolYearId: currentSchoolYear.id,
      topic: topic.trim(),
      subjectId: subjectId || undefined,
      mode,
      model: selectedModel || undefined,
    });
    setTopic('');
    setShowNewSession(false);
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !currentTutorSession || tutorStreaming) return;

    // Optimistically add student message to display
    const tempMsg = {
      id: `temp-${Date.now()}`,
      sessionId: currentTutorSession.id,
      role: 'student' as const,
      content: messageInput.trim(),
      filtered: false,
      filterReason: null,
      tokensIn: 0,
      tokensOut: 0,
      cost: 0,
      createdAt: new Date().toISOString(),
    };

    useAcademyStore.setState((s) => ({ tutorMessages: [...s.tutorMessages, tempMsg] }));
    const msg = messageInput.trim();
    setMessageInput('');

    await sendTutorMessage({
      sessionId: currentTutorSession.id,
      content: msg,
      model: selectedModel || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = async () => {
    if (currentTutorSession) {
      await endTutorSession(currentTutorSession.id);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Session sidebar */}
      <div className="w-56 flex flex-col bg-[var(--bg-panel)] border-r border-[var(--border)]">
        <div className="p-3 border-b border-[var(--border)]">
          <button
            onClick={() => setShowNewSession(true)}
            className="w-full px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            New Session
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {tutorSessions.map((session) => (
            <div
              key={session.id}
              className={`p-2 rounded-lg cursor-pointer text-xs transition-colors group ${
                currentTutorSession?.id === session.id
                  ? 'bg-primary-500/20 ring-1 ring-primary-500'
                  : 'hover:bg-[var(--border)]'
              }`}
              onClick={() => selectTutorSession(session)}
            >
              <div className="font-medium text-[var(--text-primary)] truncate">{session.topic}</div>
              <div className="text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`} />
                {session.totalMessages} msgs
                {session.totalCost > 0 && <span> &middot; ${session.totalCost.toFixed(4)}</span>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteTutorSession(session.id); }}
                className="hidden group-hover:block absolute right-2 top-2 text-[var(--text-muted)] hover:text-red-400"
                title="Delete session"
              >
                &times;
              </button>
            </div>
          ))}
          {tutorSessions.length === 0 && (
            <div className="text-xs text-[var(--text-muted)] text-center py-4">No sessions yet</div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* New session form */}
        {showNewSession && (
          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-panel)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Start a Tutoring Session</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-[var(--text-muted)] mb-1">Topic *</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Fractions and decimals, Ancient Egypt..."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleStartSession(); }}
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Subject</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">General</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as typeof mode)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="guided">Guided (Socratic)</option>
                  <option value="free">Free Exploration</option>
                  <option value="review">Review</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--text-muted)] mb-1">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Default ({settings.defaultModel})</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleStartSession}
                  disabled={!topic.trim()}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Start
                </button>
                <button
                  onClick={() => setShowNewSession(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--border)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session header */}
        {currentTutorSession && (
          <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-panel)] flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-[var(--text-primary)]">{currentTutorSession.topic}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">
                {currentTutorSession.mode} &middot; {currentTutorSession.totalMessages} msgs
                {currentTutorSession.durationSeconds > 0 && ` &middot; ${formatDuration(currentTutorSession.durationSeconds)}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentTutorSession.safetyAlerts > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                  {currentTutorSession.safetyAlerts} safety alert{currentTutorSession.safetyAlerts !== 1 ? 's' : ''}
                </span>
              )}
              {currentTutorSession.status === 'active' && (
                <button
                  onClick={handleEndSession}
                  className="px-3 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  End Session
                </button>
              )}
              {currentTutorSession.status === 'completed' && (
                <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-[var(--text-muted)]">Completed</span>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentTutorSession && !showNewSession && (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
              <div className="text-4xl mb-3">🤖</div>
              <div className="text-sm">Start a new tutoring session or select an existing one</div>
            </div>
          )}

          {tutorMessages.filter(m => m.role !== 'system').map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'student'
                    ? 'bg-primary-500 text-white'
                    : 'bg-[var(--bg-panel)] border border-[var(--border)] text-[var(--text-primary)]'
                } ${msg.filtered ? 'opacity-50' : ''}`}
              >
                {msg.filtered && (
                  <div className="text-xs text-yellow-400 mb-1">
                    Message filtered: {msg.filterReason}
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.cost > 0 && (
                  <div className="text-xs opacity-50 mt-1">${msg.cost.toFixed(4)}</div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {tutorStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-[var(--bg-panel)] border border-[var(--border)] text-[var(--text-primary)]">
                {tutorStreamContent ? (
                  <div className="whitespace-pre-wrap">{tutorStreamContent}<span className="animate-pulse">|</span></div>
                ) : (
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    Thinking...
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {currentTutorSession?.status === 'active' && (
          <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-panel)]">
            <div className="flex gap-2">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
              />
              <button
                onClick={handleSend}
                disabled={!messageInput.trim() || tutorStreaming}
                className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
