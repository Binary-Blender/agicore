import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface CodeSettings {
  selectedModels: string[];
  tokenBudget: number;
  systemPrompt: string;
  defaultShell: string;
}

const DEFAULTS: CodeSettings = {
  selectedModels: ['claude-sonnet-4-6'],
  tokenBudget: 16000,
  systemPrompt: '',
  defaultShell: 'wsl',
};

function getPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): CodeSettings {
  const p = getPath();
  if (!fs.existsSync(p)) return { ...DEFAULTS };
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(updates: Partial<CodeSettings>): void {
  const current = loadSettings();
  fs.writeFileSync(getPath(), JSON.stringify({ ...current, ...updates }, null, 2));
}
