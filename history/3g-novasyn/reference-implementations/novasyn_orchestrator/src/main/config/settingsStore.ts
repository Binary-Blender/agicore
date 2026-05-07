import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface AppSettings {
  theme: 'dark' | 'light';
  defaultModel: string;
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  defaultModel: 'claude-sonnet-4-6',
};

function getPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): AppSettings {
  const p = getPath();
  if (!fs.existsSync(p)) return { ...DEFAULTS };
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(updates: Partial<AppSettings>): void {
  const current = loadSettings();
  fs.writeFileSync(getPath(), JSON.stringify({ ...current, ...updates }, null, 2));
}
