// Terminal management service using node-pty
// Spawns real shell processes (WSL bash by default on Windows)

import { platform } from 'os';

// node-pty is a native module — require at runtime to avoid bundler issues
let pty: any;
try {
  pty = require('node-pty');
} catch (err) {
  console.error('Failed to load node-pty:', err);
}

export interface TerminalProcess {
  id: string;
  name: string;
  shell: string;
  cwd: string;
  process: any; // IPty
}

const terminals = new Map<string, TerminalProcess>();
let terminalCounter = 0;

function getDefaultShell(): string {
  if (platform() === 'win32') {
    return 'wsl.exe'; // Default to WSL on Windows
  }
  return process.env.SHELL || '/bin/bash';
}

function getShellArgs(shell: string): string[] {
  if (shell === 'wsl.exe' || shell === 'wsl') {
    return [];
  }
  if (shell === 'powershell.exe' || shell === 'powershell') {
    return ['-NoLogo'];
  }
  return [];
}

export function createTerminal(
  options: { shell?: string; cwd?: string; name?: string },
  onData: (id: string, data: string) => void,
  onExit: (id: string) => void,
): TerminalProcess {
  if (!pty) {
    throw new Error('node-pty is not available');
  }

  const id = `term-${++terminalCounter}`;
  const shell = options.shell || getDefaultShell();
  const cwd = options.cwd || process.env.HOME || process.env.USERPROFILE || '.';
  const name = options.name || `Terminal ${terminalCounter}`;

  const proc = pty.spawn(shell, getShellArgs(shell), {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd,
    env: { ...process.env },
  });

  const terminal: TerminalProcess = { id, name, shell, cwd, process: proc };
  terminals.set(id, terminal);

  proc.onData((data: string) => onData(id, data));
  proc.onExit(() => {
    terminals.delete(id);
    onExit(id);
  });

  return terminal;
}

export function writeToTerminal(id: string, data: string): void {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.process.write(data);
  }
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.process.resize(cols, rows);
  }
}

export function closeTerminal(id: string): void {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.process.kill();
    terminals.delete(id);
  }
}

export function listTerminals(): { id: string; name: string; shell: string; cwd: string }[] {
  return Array.from(terminals.values()).map((t) => ({
    id: t.id,
    name: t.name,
    shell: t.shell,
    cwd: t.cwd,
  }));
}

export function closeAllTerminals(): void {
  for (const [id] of terminals) {
    closeTerminal(id);
  }
}
