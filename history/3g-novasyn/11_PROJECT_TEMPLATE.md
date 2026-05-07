# NovaSyn Project Template

Complete boilerplate files for a new NovaSyn app. Replace `<APP_NAME>`, `<app-name>`, `<app_name>`, `<PORT>`, and `<DB_NAME>` with your values.

---

## package.json

```json
{
  "name": "novasyn-<app-name>",
  "version": "0.1.0",
  "description": "NovaSyn <APP_NAME> — Desktop App Description",
  "main": "dist/main/main/index.js",
  "scripts": {
    "dev": "npm run dev:renderer & npm run dev:main",
    "dev:renderer": "vite",
    "dev:main": "tsc -p tsconfig.main.json && xcopy /E /I /Y src\\main\\database\\migrations dist\\main\\main\\database\\migrations && set NODE_ENV=development&& electron .",
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "tsc -p tsconfig.main.json && xcopy /E /I /Y src\\main\\database\\migrations dist\\main\\main\\database\\migrations",
    "build:renderer": "vite build",
    "build:prod": "npm run build",
    "type-check": "tsc --noEmit -p tsconfig.main.json && tsc --noEmit -p tsconfig.renderer.json",
    "package": "npm run build:prod && electron-builder"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "better-sqlite3": "^9.2.2",
    "electron-store": "^8.1.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/node": "^20.10.6",
    "@types/react": "^18.2.47",
    "@types/react-dom": "^18.2.18",
    "@types/uuid": "^9.0.7",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.16",
    "electron": "^28.1.0",
    "electron-builder": "^24.9.1",
    "postcss": "^8.4.32",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.10",
    "zustand": "^4.4.7"
  },
  "build": {
    "appId": "com.novasyn.<app-name>",
    "productName": "NovaSyn <APP_NAME>",
    "files": ["dist/**/*"],
    "directories": {
      "output": "release"
    },
    "win": {
      "target": "portable"
    }
  }
}
```

---

## vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: path.join(__dirname, 'src/renderer'),
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
      '@renderer': path.join(__dirname, 'src/renderer'),
      '@shared': path.join(__dirname, 'src/shared'),
    },
  },
  server: {
    port: <PORT>,
  },
});
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "lib": ["ES2021"],
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@main/*": ["src/main/*"],
      "@renderer/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
```

---

## tsconfig.main.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/main",
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"]
  },
  "include": ["src/main/**/*", "src/shared/**/*", "src/preload/**/*"],
  "exclude": ["node_modules", "dist", "src/renderer"]
}
```

---

## tsconfig.renderer.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/renderer",
    "module": "ESNext",
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"],
  "exclude": ["node_modules", "dist", "src/main", "src/preload"]
}
```

---

## tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a8a',
        },
        accent: {
          50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047',
          400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207',
          800: '#854d0e', 900: '#713f12',
        },
      },
    },
  },
  plugins: [],
};
```

---

## postcss.config.js

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## .gitignore

```
node_modules/
dist/
release/
*.db
*.db-wal
*.db-shm
```

---

## src/main/database/db.ts

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, '<DB_NAME>.db');

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    console.log(`Database initialized at: ${dbPath}`);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}

export function runMigrations(): void {
  const database = getDatabase();
  const migrationsPath = path.join(__dirname, 'migrations');

  database.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (!fs.existsSync(migrationsPath)) {
    console.log('No migrations directory found, skipping migrations');
    return;
  }

  const migrationFiles = fs
    .readdirSync(migrationsPath)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const appliedMigrations = database
    .prepare('SELECT name FROM migrations')
    .all() as { name: string }[];
  const appliedNames = new Set(appliedMigrations.map((m) => m.name));

  for (const file of migrationFiles) {
    if (!appliedNames.has(file)) {
      console.log(`Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');
      try {
        database.exec(migrationSQL);
        database.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        console.log(`Migration ${file} applied successfully`);
      } catch (error) {
        console.error(`Error applying migration ${file}:`, error);
        throw error;
      }
    }
  }

  console.log('All migrations applied');
}
```

---

## src/main/window.ts

```typescript
import { BrowserWindow, screen } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'NovaSyn <APP_NAME>',
    frame: false,
    backgroundColor: '#1e293b',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:<PORT>');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
```

---

## src/renderer/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NovaSyn <APP_NAME></title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

---

## src/renderer/index.tsx

```typescript
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

---

## src/renderer/styles/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root,
[data-theme="dark"] {
  --bg-page: #1a1a2e;
  --bg-panel: #16213e;
  --bg-input: #1a1a2e;
  --border: #2a2a4a;
  --text-primary: #e9ecef;
  --text-heading: #f8f9fa;
  --text-muted: #adb5bd;
  --text-placeholder: #6c6f85;
  --scrollbar-track: #16213e;
  --scrollbar-thumb: #4a4e69;
  --scrollbar-thumb-hover: #6c6f85;
}

[data-theme="light"] {
  --bg-page: #f5f5f5;
  --bg-panel: #ffffff;
  --bg-input: #f1f5f9;
  --border: #e0e0e0;
  --text-primary: #1a1a1a;
  --text-heading: #111111;
  --text-muted: #666666;
  --text-placeholder: #999999;
  --scrollbar-track: #f0f0f0;
  --scrollbar-thumb: #c0c0c0;
  --scrollbar-thumb-hover: #a0a0a0;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
  background: var(--bg-page);
  color: var(--text-primary);
}

#root {
  height: 100vh;
  width: 100vw;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
```

---

## Minimal src/shared/types.ts Skeleton

```typescript
// === Entity Interfaces ===

export interface Settings {
  theme: 'dark' | 'light';
  selectedModel: string;
}

// === AI Models ===

export interface AIModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'xai';
  contextWindow: number;
  maxOutput: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

// === IPC Channels ===

export const IPC_CHANNELS = {
  // Settings
  GET_SETTINGS: 'get-settings',
  UPDATE_SETTINGS: 'update-settings',
  GET_API_KEYS: 'get-api-keys',
  SAVE_API_KEYS: 'save-api-keys',

  // Models
  GET_MODELS: 'get-models',

  // Window
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',

  // Add your entity channels here
} as const;

// === Electron API ===

export interface ElectronAPI {
  // Settings
  getSettings: () => Promise<Settings>;
  updateSettings: (key: string, value: string) => Promise<void>;
  getApiKeys: () => Promise<Record<string, string>>;
  saveApiKeys: (keys: Record<string, string>) => Promise<boolean>;

  // Models
  getModels: () => Promise<AIModel[]>;

  // Window
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // Add your entity methods here
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

## Minimal src/preload/index.ts Skeleton

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

const electronAPI: ElectronAPI = {
  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  updateSettings: (key, value) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, key, value),
  getApiKeys: () => ipcRenderer.invoke(IPC_CHANNELS.GET_API_KEYS),
  saveApiKeys: (keys) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_API_KEYS, keys),

  // Models
  getModels: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MODELS),

  // Window
  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.CLOSE_WINDOW),

  // Add your entity channels here
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

---

## Notes

- Window controls use `ipcRenderer.send()` (fire-and-forget), everything else uses `ipcRenderer.invoke()` (returns a promise)
- The `main/index.ts` and `store.ts` templates are app-specific and should follow the patterns in [03_ARCHITECTURE_PATTERNS.md](03_ARCHITECTURE_PATTERNS.md)
- The models.ts file is identical across all apps — copy from any existing NovaSyn app
