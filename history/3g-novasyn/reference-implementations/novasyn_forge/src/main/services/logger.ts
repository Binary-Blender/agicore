import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { loadSettings } from '../config/settingsStore';

let logPath: string | null = null;
let logStream: fs.WriteStream | null = null;
let enabled: boolean | null = null;

function isEnabled(): boolean {
  if (enabled === null) {
    try { const s = loadSettings(); enabled = !!(s as any).debugLog; }
    catch { enabled = false; }
  }
  return enabled;
}

export function refreshLoggerEnabled(): void {
  const was = enabled; enabled = null;
  if (was && !isEnabled()) closeLogger();
}

function getLogPath(): string {
  if (!logPath) {
    const dir = path.join(app.getPath('documents'), 'NovaSyn Forge');
    fs.mkdirSync(dir, { recursive: true });
    logPath = path.join(dir, 'debug.log');
  }
  return logPath;
}

function ensureStream(): fs.WriteStream | null {
  if (!isEnabled()) return null;
  if (!logStream) {
    logStream = fs.createWriteStream(getLogPath(), { flags: 'w' });
    logStream.write(`=== NovaSyn Forge Debug Log ===\nStarted: ${new Date().toISOString()}\n\n`);
  }
  return logStream;
}

export function trace(...args: any[]): void {
  const s = ensureStream(); if (!s) return;
  const ts = new Date().toISOString().slice(11, 23);
  s.write(`[${ts}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ')}\n`);
}

export function traceError(label: string, error: any): void {
  if (!isEnabled()) return;
  trace(`ERROR [${label}]`, error instanceof Error ? error.message : String(error));
}

export function closeLogger(): void {
  if (logStream) { logStream.write(`\nClosed: ${new Date().toISOString()}\n`); logStream.end(); logStream = null; }
}

export function getLogFilePath(): string { return getLogPath(); }
