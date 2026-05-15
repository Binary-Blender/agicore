// @agicore-protected — edit freely, this file will NOT be overwritten on regen.
// Remove this line to let agicore regenerate it.

import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Terminal, ChevronRight, Loader2, Trash2 } from 'lucide-react';

type Stream = 'stdout' | 'stderr' | 'system';

interface OutputLine {
  id: number;
  stream: Stream;
  text: string;
}

const QUICK_COMMANDS = [
  { label: 'agicore', cmd: 'agicore --version' },
  { label: 'npm install', cmd: 'npm install' },
  { label: 'tauri dev', cmd: 'npm run tauri:dev' },
  { label: 'cargo build', cmd: 'cargo build' },
  { label: 'tsc check', cmd: 'npx tsc --noEmit' },
];

let _lineId = 0;

export function TerminalView() {
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [cwd, setCwd] = useState('');
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Track cwd in a ref so the run callback always sees the latest value
  const cwdRef = useRef('');

  useEffect(() => {
    invoke<string>('shell_get_home')
      .then((home) => { setCwd(home); cwdRef.current = home; })
      .catch(() => {});
  }, []);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    const el = outputRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const addLine = useCallback((stream: Stream, text: string) => {
    setLines((prev) => [...prev, { id: _lineId++, stream, text }]);
  }, []);

  const runCommand = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;

    // Update history
    setHistory((prev) => [cmd, ...prev.filter((h) => h !== cmd)].slice(0, 200));
    setHistoryIdx(-1);

    // Handle clear locally
    if (cmd === 'clear' || cmd === 'cls') {
      setLines([]);
      return;
    }

    // Handle cd locally — update cwd state, no subprocess needed
    if (cmd.startsWith('cd ')) {
      const target = cmd.slice(3).trim();
      addLine('system', `$ ${cmd}`);
      const isAbsolute = target.startsWith('/') || /^[A-Za-z]:[/\\]/.test(target) || target === '~';
      const next = isAbsolute ? target : `${cwdRef.current}/${target}`;
      cwdRef.current = next;
      setCwd(next);
      return;
    }

    addLine('system', `$ ${cmd}`);
    setRunning(true);

    const unlisten = await listen<{ stream: string; text: string }>('shell-line', (event) => {
      addLine(event.payload.stream as Stream, event.payload.text);
    });

    try {
      const code = await invoke<number>('shell_run', {
        command: cmd,
        cwd: cwdRef.current || undefined,
      });
      addLine('system', code === 0 ? `✓ exit 0` : `✗ exit ${code}`);
    } catch (e) {
      addLine('stderr', String(e));
    } finally {
      unlisten();
      setRunning(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [addLine]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !running) {
      const cmd = input;
      setInput('');
      runCommand(cmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      setInput(history[next] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(historyIdx - 1, -1);
      setHistoryIdx(next);
      setInput(next === -1 ? '' : (history[next] ?? ''));
    }
  };

  const lineColor = (stream: Stream) => {
    if (stream === 'stderr') return 'text-red-400';
    if (stream === 'system') return 'text-[var(--text-secondary)]';
    return 'text-[var(--text-primary)]';
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)] text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
        <Terminal size={14} className="text-[var(--text-secondary)] shrink-0" />
        <span className="font-mono text-xs text-[var(--text-secondary)] truncate flex-1">{cwd || '~'}</span>
        <button
          onClick={() => setLines([])}
          title="Clear output"
          className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.length === 0 && (
          <div className="text-[var(--text-secondary)] text-xs">
            NovaSyn Terminal — run commands, watch builds, generate apps.
          </div>
        )}
        {lines.map((l) => (
          <div
            key={l.id}
            className={`leading-5 whitespace-pre-wrap break-all ${lineColor(l.stream)}`}
          >
            {l.text}
          </div>
        ))}
        {running && (
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs mt-1">
            <Loader2 size={11} className="animate-spin" />
            running…
          </div>
        )}
      </div>

      {/* Quick commands */}
      <div className="flex gap-1.5 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-surface)] shrink-0 flex-wrap">
        {QUICK_COMMANDS.map(({ label, cmd }) => (
          <button
            key={label}
            disabled={running}
            onClick={() => runCommand(cmd)}
            className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
        <ChevronRight size={13} className="text-[var(--text-secondary)] shrink-0" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setHistoryIdx(-1); }}
          onKeyDown={onKeyDown}
          disabled={running}
          placeholder={running ? 'running…' : 'enter command  ↑↓ history'}
          className="flex-1 bg-transparent outline-none font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        {running && <Loader2 size={13} className="animate-spin text-[var(--text-secondary)] shrink-0" />}
      </div>
    </div>
  );
}
