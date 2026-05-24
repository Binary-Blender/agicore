import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

const ChatView: React.FC = () => {
  const { currentConversationId, messages, isThinking, sendMessage } = useAppStore();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    const ta = taRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isThinking || !currentConversationId) return;
    setInput('');
    sendMessage(trimmed);
    if (taRef.current) taRef.current.style.height = 'auto';
  }, [input, isThinking, currentConversationId, sendMessage]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentConversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <div className="relative flex items-center justify-center w-20 h-20">
          <div
            className="w-10 h-10 rounded-full bg-[var(--accent)]"
            style={{ animation: 'pulse-red 2s ease-in-out infinite' }}
          />
          <div
            className="absolute w-20 h-20 rounded-full border-2 border-[var(--accent)]"
            style={{ animation: 'pulse-red 2s ease-in-out infinite', opacity: 0.2 }}
          />
        </div>
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Reality.AI
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
            Deterministic conversational reasoning. No LLM. No network. Fully reproducible.
          </p>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-4">
          Start a new conversation to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && !isThinking && (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-sm text-[var(--text-muted)]">
              Say something.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isThinking && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={isThinking ? 'Dispatching...' : 'Type a message...'}
              disabled={isThinking}
              rows={1}
              className="w-full resize-none rounded-xl bg-[var(--bg-input)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ maxHeight: '160px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-[var(--bg-active)] disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            title="Send"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 1.5L14.5 8L1.5 14.5V9.5L10 8L1.5 6.5V1.5Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
