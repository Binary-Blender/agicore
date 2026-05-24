import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onComplete: () => void;
}

const STATUS_MESSAGES = [
  'Initializing dispatch substrate...',
  'Loading baseline pattern index...',
  'Compiling lexical marker tables...',
  'Initializing fourteen cultural-marker scores...',
  'Registering fifteen persona modules...',
  'Calibrating revelation-layer transitions...',
  'Loading conversational memory store...',
  'Initializing persona state machines...',
  'Verifying zero-network guarantees...',
  'Resolving deterministic dispatch contract...',
  'System ready.',
];

const MESSAGE_INTERVAL = 280;
const COMPLETION_DELAY = 500;

const StartupSequence: React.FC<Props> = ({ onComplete }) => {
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (idx >= STATUS_MESSAGES.length - 1) return;
    const t = setTimeout(() => setIdx((p) => p + 1), MESSAGE_INTERVAL);
    return () => clearTimeout(t);
  }, [idx]);

  useEffect(() => {
    setProgress(((idx + 1) / STATUS_MESSAGES.length) * 100);
  }, [idx]);

  useEffect(() => {
    if (idx === STATUS_MESSAGES.length - 1 && !done.current) {
      done.current = true;
      const t = setTimeout(onComplete, COMPLETION_DELAY);
      return () => clearTimeout(t);
    }
  }, [idx, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-page)]">
      <div className="flex items-center gap-3 mb-12">
        <span className="startup-dot relative inline-block w-3 h-3 rounded-full bg-[var(--accent)]" />
        <span className="text-2xl font-semibold tracking-wide text-[var(--text-primary)]">
          Reality.AI
        </span>
      </div>

      <div className="h-6 mb-6">
        <p className="font-mono text-sm text-[var(--text-secondary)] transition-opacity duration-150">
          {STATUS_MESSAGES[idx]}
        </p>
      </div>

      <div className="w-72 h-[3px] rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <style>{`
        .startup-dot {
          animation: startupPulse 1.6s ease-in-out infinite;
          box-shadow: 0 0 8px var(--accent);
        }
        @keyframes startupPulse {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 6px var(--accent); }
          50%      { opacity: 1;   box-shadow: 0 0 16px var(--accent); }
        }
      `}</style>
    </div>
  );
};

export default StartupSequence;
