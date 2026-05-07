import { app } from 'electron';
import path from 'path';
import fs from 'fs';

function getStorePath(): string {
  return path.join(app.getPath('appData'), 'NovaSyn', 'api-keys.json');
}

export function loadApiKeys(): Record<string, string> {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf-8')) as Record<string, string>;
  } catch {
    return {};
  }
}

export function saveApiKey(provider: string, key: string): void {
  const storePath = getStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const keys = loadApiKeys();
  if (key) {
    keys[provider] = key;
  } else {
    delete keys[provider];
  }
  fs.writeFileSync(storePath, JSON.stringify(keys, null, 2));
}
