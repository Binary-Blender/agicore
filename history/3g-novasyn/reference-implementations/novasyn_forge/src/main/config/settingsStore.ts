import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { ForgeSettings } from '../../shared/types';

const DEFAULTS: ForgeSettings = {
  theme: 'dark',
  defaultModel: 'babyai-auto',
  devStackDocsPath: '',
  babyaiUrl: 'https://novasynchris-babyai.hf.space',
  babyaiApiKey: '',
  hfToken: '',
  debugLog: false,
};

function getPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): ForgeSettings {
  const p = getPath();
  if (!fs.existsSync(p)) return { ...DEFAULTS };
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return { ...DEFAULTS, ...raw };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(updates: Partial<ForgeSettings>): void {
  const current = loadSettings();
  fs.writeFileSync(getPath(), JSON.stringify({ ...current, ...updates }, null, 2));
}
