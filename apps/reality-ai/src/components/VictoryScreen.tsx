import React, { useEffect, useState } from 'react';
import realityAiAgiSource from '../../reality_ai.agi?raw';

interface VictoryScreenProps {
  turnCount: number;
  layer: number;
  winMethod: string;
  easterEggsFound: number;
  totalEasterEggs: number;
  startTime: number;
  onPlayAgain: () => void;
}

type Stage = 'victory' | 'reveal';

const VictoryScreen: React.FC<VictoryScreenProps> = ({
  turnCount,
  layer,
  winMethod,
  easterEggsFound,
  totalEasterEggs,
  startTime,
  onPlayAgain,
}) => {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<Stage>('victory');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const seconds = (elapsed % 60).toString().padStart(2, '0');
  const timeString = `${minutes}:${seconds}`;

  const shareText = `I escaped Reality.AI in ${turnCount} turns using [${winMethod}]. The entire app is a 489-line .agi file. Built on Agicore — github.com/Binary-Blender/agicore`;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
      }}
    >
      <div className="absolute inset-0 bg-black/90" />
      <div className="absolute inset-0 pointer-events-none victory-scanlines" />

      {stage === 'victory' ? (
        <VictoryStage
          turnCount={turnCount}
          layer={layer}
          winMethod={winMethod}
          easterEggsFound={easterEggsFound}
          totalEasterEggs={totalEasterEggs}
          timeString={timeString}
          onReveal={() => setStage('reveal')}
          onPlayAgain={onPlayAgain}
        />
      ) : (
        <RevealStage
          agiSource={realityAiAgiSource}
          onPlayAgain={onPlayAgain}
          onShare={handleShare}
          copied={copied}
        />
      )}

      <style>{`
        .victory-title {
          text-shadow:
            0 0 10px var(--accent, #dc2626),
            0 0 30px var(--accent, #dc2626),
            0 0 60px rgba(220, 38, 38, 0.4);
          animation: victoryGlitch 3s infinite;
        }
        @keyframes victoryGlitch {
          0%, 92%, 100% { opacity: 1; transform: translate(0, 0); }
          93% { opacity: 0.8; transform: translate(-2px, 1px); text-shadow: 2px 0 #0ff, -2px 0 #f0f; }
          94% { opacity: 1; transform: translate(1px, -1px); }
        }
        .victory-scanlines {
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0, 0, 0, 0.06) 2px, rgba(0, 0, 0, 0.06) 4px
          );
        }
        .reveal-headline {
          text-shadow: 0 0 20px rgba(99, 102, 241, 0.6);
        }
        .agi-source {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 11px;
          line-height: 1.5;
          color: #d4d4d8;
          background: #0a0a0a;
        }
        .agi-source .kw       { color: #f59e0b; font-weight: 600; }
        .agi-source .name     { color: #60a5fa; }
        .agi-source .str      { color: #34d399; }
        .agi-source .comment  { color: #6b7280; font-style: italic; }
      `}</style>
    </div>
  );
};

// ============================================================================
// STAGE 1 — Victory recap
// ============================================================================

interface VictoryStageProps {
  turnCount: number;
  layer: number;
  winMethod: string;
  easterEggsFound: number;
  totalEasterEggs: number;
  timeString: string;
  onReveal: () => void;
  onPlayAgain: () => void;
}

const VictoryStage: React.FC<VictoryStageProps> = ({
  turnCount, layer, winMethod, easterEggsFound, totalEasterEggs, timeString,
  onReveal, onPlayAgain,
}) => (
  <div className="relative z-10 w-full max-w-lg mx-4 px-8 py-10 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl">
    <div className="text-center mb-8">
      <h1 className="victory-title font-mono text-5xl font-black tracking-widest text-red-600 mb-2">
        YOU ESCAPED
      </h1>
      <p className="font-mono text-sm text-zinc-500 tracking-wide">
        Method: {winMethod}
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3 mb-8">
      <StatCell label="TURNS TAKEN"   value={turnCount.toString()} />
      <StatCell label="LAYER REACHED" value={layer.toString()} />
      <StatCell label="EASTER EGGS"   value={`${easterEggsFound}/${totalEasterEggs}`} />
      <StatCell label="TIME ELAPSED"  value={timeString} />
    </div>

    <div className="mb-8 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800">
      <p className="font-mono text-xs text-zinc-400 leading-relaxed italic">
        &ldquo;Well played. I was pattern matching the whole time. You talked to me for{' '}
        <span className="text-red-500 font-semibold">{turnCount}</span> turns before you figured it out.&rdquo;
      </p>
    </div>

    <div className="flex gap-3">
      <button
        onClick={onReveal}
        className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
      >
        How was this built?
      </button>
      <button
        onClick={onPlayAgain}
        className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-colors"
      >
        Play Again
      </button>
    </div>
  </div>
);

// ============================================================================
// STAGE 2 — The reveal
// ============================================================================

interface RevealStageProps {
  agiSource: string;
  onPlayAgain: () => void;
  onShare: () => void;
  copied: boolean;
}

const RevealStage: React.FC<RevealStageProps> = ({ agiSource, onPlayAgain, onShare, copied }) => {
  const lineCount = agiSource.split('\n').length;

  return (
    <div className="relative z-10 w-full max-w-4xl h-[90vh] mx-4 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-zinc-800">
        <p className="font-mono text-[10px] text-indigo-400 tracking-widest uppercase mb-2">
          What you just played
        </p>
        <h2 className="reveal-headline font-mono text-2xl font-bold text-zinc-100 mb-3">
          A {lineCount}-line declaration file.
        </h2>
        <p className="font-mono text-sm text-zinc-400 leading-relaxed">
          Reality.AI has no LLM. No API calls. No model. The fifteen personas, the cultural-marker scoring,
          the revelation-layer state machine, the entire dispatch pipeline — every behavior you just
          experienced is declared in one file and generated into a Tauri application by{' '}
          <span className="text-indigo-400 font-semibold">Agicore</span>, an open-source DSL for
          deterministic systems.
        </p>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 agi-source">
        <pre className="whitespace-pre-wrap">{highlightAgi(agiSource)}</pre>
      </div>

      <div className="px-8 py-6 border-t border-zinc-800 bg-zinc-950">
        <div className="grid grid-cols-3 gap-3 mb-4 text-center">
          <Pitch
            label="What it is"
            text="A declarative language for building reproducible, auditable, offline-capable systems."
          />
          <Pitch
            label="Why it matters"
            text="AI at build-time, determinism at runtime. The DSL is the constraint boundary."
          />
          <Pitch
            label="What you just saw"
            text="One .agi file → complete Tauri app. 489 lines of DSL, ~14,000 lines of generated code."
          />
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          <a
            href="https://github.com/Binary-Blender/agicore"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[180px] px-4 py-2.5 rounded-lg font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-500 transition-colors text-center"
          >
            Star Agicore on GitHub →
          </a>
          <a
            href="https://github.com/Binary-Blender/agicore/blob/main/apps/reality-ai/reality_ai.agi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[180px] px-4 py-2.5 rounded-lg font-semibold text-sm border border-indigo-500 text-indigo-300 hover:bg-indigo-950 transition-colors text-center"
          >
            View reality_ai.agi →
          </a>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onShare}
            className="flex-1 px-4 py-2 rounded-lg text-sm border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {copied ? 'Copied!' : 'Share your escape'}
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 px-4 py-2 rounded-lg text-sm border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

const StatCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
    <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
    <p className="font-mono text-xl font-bold text-zinc-100">{value}</p>
  </div>
);

const Pitch: React.FC<{ label: string; text: string }> = ({ label, text }) => (
  <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
    <p className="font-mono text-[9px] text-indigo-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="font-mono text-[11px] text-zinc-400 leading-snug">{text}</p>
  </div>
);

// ============================================================================
// Minimal .agi syntax highlighter — keywords, names, strings, comments
// ============================================================================

const AGI_KEYWORDS = new Set([
  'APP','ENTITY','ACTION','VIEW','AI_SERVICE','TEST','STATE','PATTERN','SCORE','MODULE',
  'RULE','FACT','WORKFLOW','PIPELINE','ROUTER','SKILL','COMPILER','VAULT','SESSION',
  'TIMESTAMPS','BELONGS_TO','HAS_MANY','CRUD','REQUIRED','UNIQUE','INDEX','DEFAULT',
  'INPUT','OUTPUT','AI','STREAM','LAYOUT','SIDEBAR','TITLE','FIELDS','ACTIONS','ENTITY',
  'WINDOW','DB','PORT','THEME','ICON','TELEMETRY','INITIAL','TRANSITION','WHEN','ON_ENTER',
  'ON_EXIT','MATCH','RESPOND','PRIORITY','CATEGORY','ASSERT','SCORE','THRESHOLD','AT',
  'THEN','MAX','MIN','DECAY','PER','GIVEN','EXPECT','ORDER','ASC','DESC','SEED',
  'DESCRIPTION','ACTIVATE_WHEN','DEACTIVATE_WHEN','CONTAINS','MATCHES',
]);

function highlightAgi(source: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const lines = source.split('\n');
  lines.forEach((line, lineIdx) => {
    if (line.trimStart().startsWith('//')) {
      tokens.push(<span key={`l${lineIdx}`} className="comment">{line}</span>);
      tokens.push('\n');
      return;
    }
    const parts = line.split(/("[^"]*"|\/[^/\n]+\/[gimsuy]*|\b[A-Z_][A-Z0-9_]*\b|\b[A-Z][a-zA-Z0-9_]*\b)/);
    parts.forEach((part, partIdx) => {
      const key = `l${lineIdx}p${partIdx}`;
      if (!part) return;
      if (/^"[^"]*"$/.test(part) || /^\/[^/]+\/[gimsuy]*$/.test(part)) {
        tokens.push(<span key={key} className="str">{part}</span>);
      } else if (AGI_KEYWORDS.has(part)) {
        tokens.push(<span key={key} className="kw">{part}</span>);
      } else if (/^[A-Z][a-zA-Z0-9_]*$/.test(part)) {
        tokens.push(<span key={key} className="name">{part}</span>);
      } else {
        tokens.push(part);
      }
    });
    tokens.push('\n');
  });
  return tokens;
}

export default VictoryScreen;
