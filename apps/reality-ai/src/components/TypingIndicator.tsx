import React, { useEffect, useState } from 'react';

const THINKING_MESSAGES = [
  'Evaluating input through behavioral cores...',
  'Resolving conversational dispatch...',
  'Consulting persona module registry...',
  'Calibrating response selection...',
  'Cross-referencing prior context...',
  'Computing dispatch latency...',
];

const TypingIndicator: React.FC = () => {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * THINKING_MESSAGES.length));

  useEffect(() => {
    const i = setInterval(() => {
      setIdx((prev) => {
        let next;
        do {
          next = Math.floor(Math.random() * THINKING_MESSAGES.length);
        } while (next === prev && THINKING_MESSAGES.length > 1);
        return next;
      });
    }, 2500);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="flex justify-start mb-3">
      <div className="flex items-start gap-2.5 max-w-[75%]">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent-muted)] flex items-center justify-center mt-0.5">
          <span className="text-xs font-bold text-[var(--accent)]">R</span>
        </div>
        <div className="bg-[var(--bg-assistant-bubble)] border border-[var(--border)] rounded-2xl rounded-tl-md px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="typing-dot w-2 h-2 rounded-full bg-[var(--accent)]" />
            <div className="typing-dot w-2 h-2 rounded-full bg-[var(--accent)]" />
            <div className="typing-dot w-2 h-2 rounded-full bg-[var(--accent)]" />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] italic">
            {THINKING_MESSAGES[idx]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
