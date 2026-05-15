import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

interface Props {
  onSend: (text: string) => Promise<void>;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function MessageInput({ onSend }: Props) {
  // placeholder — wire to real sending state from the store later
  void useAppStore((s) => s.currentView === 'ChatView');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const savedInputRef = useRef('');

  const inputTokens = estimateTokens(input);
  const canSend = input.trim().length > 0 && !sending;

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  // Restore focus after sending
  useEffect(() => {
    if (!sending) textareaRef.current?.focus();
  }, [sending]);

  async function handleSend() {
    if (!canSend) return;
    const text = input.trim();
    if (text && historyRef.current[historyRef.current.length - 1] !== text) {
      historyRef.current.push(text);
    }
    historyIndexRef.current = -1;
    savedInputRef.current = '';
    setInput('');
    setSending(true);
    await onSend(text);
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    const ta = textareaRef.current;
    if (!ta) return;
    const history = historyRef.current;

    if (e.key === 'ArrowUp' && history.length > 0) {
      if (ta.selectionStart !== 0 || ta.selectionEnd !== 0) return;
      e.preventDefault();
      if (historyIndexRef.current === -1) {
        savedInputRef.current = input;
        historyIndexRef.current = history.length - 1;
      } else if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
      }
      setInput(history[historyIndexRef.current]);
    }

    if (e.key === 'ArrowDown' && historyIndexRef.current !== -1) {
      const afterCursor = ta.value.slice(ta.selectionEnd);
      if (afterCursor.includes('\n')) return;
      e.preventDefault();
      if (historyIndexRef.current < history.length - 1) {
        historyIndexRef.current++;
        setInput(history[historyIndexRef.current]);
      } else {
        historyIndexRef.current = -1;
        setInput(savedInputRef.current);
      }
    }
  }

  const showSlashHint = input === '/' || input.startsWith('/s');
  const slashCommands = [{ cmd: '/search', desc: 'search the web and inject results as context' }];

  return (
    <div className="border-t border-slate-700/50 bg-slate-900/80 backdrop-blur px-4 py-3">
      {showSlashHint && (
        <div className="mb-2 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {slashCommands
            .filter((c) => c.cmd.startsWith(input.split(' ')[0] ?? ''))
            .map((c) => (
              <button
                key={c.cmd}
                onMouseDown={(e) => { e.preventDefault(); setInput(c.cmd + ' '); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition flex items-baseline gap-2"
              >
                <span className="text-blue-400 font-mono">{c.cmd}</span>
                <span className="text-gray-500 text-xs">{c.desc}</span>
              </button>
            ))}
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message… or /search <query> for web context"
            rows={1}
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition caret-white"
          />
          {input && (
            <span className="absolute bottom-2.5 right-14 text-xs text-gray-600">~{inputTokens}t</span>
          )}
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`absolute right-2 bottom-1.5 w-9 h-9 rounded-xl flex items-center justify-center transition flex-shrink-0 ${
              canSend
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                : 'bg-slate-700 text-gray-500 cursor-not-allowed'
            }`}
            title="Send message"
          >
            {sending ? (
              <span className="animate-spin text-sm">⟳</span>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-x-[1px]">
                <path d="M3 13L13 8L3 3V7L9 8L3 9V13Z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
