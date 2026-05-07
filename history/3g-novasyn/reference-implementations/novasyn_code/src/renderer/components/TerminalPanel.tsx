import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';
import { useCodeStore } from '../store/codeStore';

// Per-terminal xterm instance + addon, stored outside React state
interface XtermEntry {
  terminal: Terminal;
  fitAddon: FitAddon;
  containerEl: HTMLDivElement;
}

const XTERM_THEME = {
  background: '#0f172a',
  foreground: '#e2e8f0',
  cursor: '#e2e8f0',
  cursorAccent: '#0f172a',
  selectionBackground: '#334155',
  selectionForeground: '#e2e8f0',
  black: '#1e293b',
  red: '#f87171',
  green: '#4ade80',
  yellow: '#facc15',
  blue: '#60a5fa',
  magenta: '#c084fc',
  cyan: '#22d3ee',
  white: '#e2e8f0',
  brightBlack: '#475569',
  brightRed: '#fca5a5',
  brightGreen: '#86efac',
  brightYellow: '#fde68a',
  brightBlue: '#93c5fd',
  brightMagenta: '#d8b4fe',
  brightCyan: '#67e8f9',
  brightWhite: '#f8fafc',
};

export default function TerminalPanel() {
  const { showTerminal, terminalHeight, terminals, activeTerminalId } = useCodeStore();

  // Map of terminal id -> xterm entry (mutable, never in React state)
  const xtermMapRef = useRef<Map<string, XtermEntry>>(new Map());
  // The wrapper div that holds all terminal containers
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Track whether IPC listeners are set up
  const listenersRef = useRef(false);
  // ResizeObserver ref
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // Track whether auto-create is in flight to prevent duplicates
  const autoCreateInFlightRef = useRef(false);

  // ── Create a new terminal ──────────────────────────────────────────────────
  const createTerminal = useCallback(async () => {
    try {
      const instance = await window.electronAPI.terminalCreate();
      const store = useCodeStore.getState();
      store.addTerminal(instance);
      store.setActiveTerminalId(instance.id);
    } catch (err) {
      console.error('Failed to create terminal:', err);
    }
  }, []);

  // ── Destroy an xterm entry (cleanup only, does not touch store) ────────────
  const destroyXtermEntry = useCallback((id: string) => {
    const entry = xtermMapRef.current.get(id);
    if (entry) {
      entry.terminal.dispose();
      entry.containerEl.remove();
      xtermMapRef.current.delete(id);
    }
  }, []);

  // ── Close a terminal (IPC + store + xterm) ─────────────────────────────────
  const closeTerminal = useCallback(async (id: string) => {
    try {
      await window.electronAPI.terminalClose(id);
    } catch {
      // Process may already be dead
    }
    destroyXtermEntry(id);
    const store = useCodeStore.getState();
    store.removeTerminal(id);

    // If no terminals left, activeTerminalId is already handled by removeTerminal
    // If we closed the active one, pick the first remaining
    const remaining = store.terminals.filter((t) => t.id !== id);
    if (remaining.length > 0 && store.activeTerminalId === null) {
      store.setActiveTerminalId(remaining[0].id);
    }
  }, [destroyXtermEntry]);

  // ── Initialize xterm for a terminal id ─────────────────────────────────────
  const initXterm = useCallback((id: string) => {
    if (xtermMapRef.current.has(id) || !wrapperRef.current) return;

    const containerEl = document.createElement('div');
    containerEl.style.width = '100%';
    containerEl.style.height = '100%';
    containerEl.style.position = 'absolute';
    containerEl.style.top = '0';
    containerEl.style.left = '0';
    containerEl.style.display = 'none'; // hidden by default, shown when active
    wrapperRef.current.appendChild(containerEl);

    const fitAddon = new FitAddon();
    const terminal = new Terminal({
      theme: XTERM_THEME,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      fontSize: 13,
      cursorBlink: true,
      allowProposedApi: true,
      scrollback: 5000,
    });

    terminal.loadAddon(fitAddon);
    terminal.open(containerEl);

    // Fit after open (must be deferred slightly for DOM measurement)
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
        window.electronAPI.terminalResize(id, terminal.cols, terminal.rows);
      } catch {
        // container may not be visible yet
      }
    });

    // Send keystrokes to node-pty
    terminal.onData((data) => {
      window.electronAPI.terminalWrite(id, data);
    });

    xtermMapRef.current.set(id, { terminal, fitAddon, containerEl });
  }, []);

  // ── IPC listeners (set up once) ────────────────────────────────────────────
  useEffect(() => {
    if (listenersRef.current) return;
    listenersRef.current = true;

    const unsubData = window.electronAPI.onTerminalData((id, data) => {
      const entry = xtermMapRef.current.get(id);
      if (entry) {
        entry.terminal.write(data);
      }
    });

    const unsubExit = window.electronAPI.onTerminalExit((id) => {
      destroyXtermEntry(id);
      const store = useCodeStore.getState();
      store.removeTerminal(id);
    });

    return () => {
      unsubData();
      unsubExit();
      listenersRef.current = false;
    };
  }, [destroyXtermEntry]);

  // ── ResizeObserver on the wrapper ──────────────────────────────────────────
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    resizeObserverRef.current = new ResizeObserver(() => {
      const activeId = useCodeStore.getState().activeTerminalId;
      if (!activeId) return;
      const entry = xtermMapRef.current.get(activeId);
      if (entry) {
        try {
          entry.fitAddon.fit();
          window.electronAPI.terminalResize(activeId, entry.terminal.cols, entry.terminal.rows);
        } catch {
          // ignore fit errors during rapid resizing
        }
      }
    });

    resizeObserverRef.current.observe(wrapper);

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, [showTerminal]); // re-attach when terminal panel visibility changes

  // ── Auto-create first terminal when panel is shown ─────────────────────────
  useEffect(() => {
    if (showTerminal && terminals.length === 0 && !autoCreateInFlightRef.current) {
      autoCreateInFlightRef.current = true;
      createTerminal().finally(() => {
        autoCreateInFlightRef.current = false;
      });
    }
  }, [showTerminal, terminals.length, createTerminal]);

  // ── Initialize xterm instances for new terminals ───────────────────────────
  useEffect(() => {
    for (const t of terminals) {
      if (!xtermMapRef.current.has(t.id)) {
        initXterm(t.id);
      }
    }
    // Clean up xterm entries for terminals that no longer exist
    for (const [id] of xtermMapRef.current) {
      if (!terminals.some((t) => t.id === id)) {
        destroyXtermEntry(id);
      }
    }
  }, [terminals, initXterm, destroyXtermEntry]);

  // ── Show/hide + fit when active tab changes ────────────────────────────────
  useEffect(() => {
    for (const [id, entry] of xtermMapRef.current) {
      if (id === activeTerminalId) {
        entry.containerEl.style.display = 'block';
        // Fit after becoming visible
        requestAnimationFrame(() => {
          try {
            entry.fitAddon.fit();
            window.electronAPI.terminalResize(id, entry.terminal.cols, entry.terminal.rows);
            entry.terminal.focus();
          } catch {
            // ignore
          }
        });
      } else {
        entry.containerEl.style.display = 'none';
      }
    }
  }, [activeTerminalId]);

  // ── Re-fit when terminalHeight changes ─────────────────────────────────────
  useEffect(() => {
    if (!activeTerminalId) return;
    const entry = xtermMapRef.current.get(activeTerminalId);
    if (entry) {
      requestAnimationFrame(() => {
        try {
          entry.fitAddon.fit();
          window.electronAPI.terminalResize(activeTerminalId, entry.terminal.cols, entry.terminal.rows);
        } catch {
          // ignore
        }
      });
    }
  }, [terminalHeight, activeTerminalId]);

  // ── Cleanup all xterm instances on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      for (const [id] of xtermMapRef.current) {
        destroyXtermEntry(id);
      }
    };
  }, [destroyXtermEntry]);

  if (!showTerminal) return null;

  return (
    <div
      className="border-t border-slate-700 bg-slate-950 flex flex-col"
      style={{ height: terminalHeight }}
    >
      {/* Tab bar */}
      <div className="flex items-center border-b border-slate-800 bg-slate-900 px-2 shrink-0">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto py-1">
          {terminals.length === 0 ? (
            <span className="text-xs text-slate-600 px-2">No terminals</span>
          ) : (
            terminals.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded cursor-pointer select-none ${
                  activeTerminalId === t.id
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800'
                }`}
                onClick={() => useCodeStore.getState().setActiveTerminalId(t.id)}
              >
                <span>{t.name}</span>
                <button
                  className="ml-1 text-slate-500 hover:text-red-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTerminal(t.id);
                  }}
                  title="Close terminal"
                >
                  &times;
                </button>
              </div>
            ))
          )}
        </div>
        <button
          className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 shrink-0"
          onClick={createTerminal}
          title="New terminal"
        >
          + New
        </button>
      </div>

      {/* Terminal container wrapper */}
      <div
        ref={wrapperRef}
        className="flex-1 relative overflow-hidden"
        style={{ minHeight: 0 }}
      />
    </div>
  );
}
