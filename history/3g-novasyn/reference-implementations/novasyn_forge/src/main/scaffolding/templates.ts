// ============================================================
// NovaSyn Forge — Project Scaffolding Templates
// Sprint 3: Generate boilerplate files for a new NovaSyn Electron app
// ============================================================

export interface ScaffoldConfig {
  projectName: string;    // "My Cool App"
  packageName: string;    // "my-cool-app"
  displayName: string;    // "My Cool App"
  port: number;           // 5178
  dbName: string;         // "my_cool_app.db"
  appId: string;          // "com.novasyn.mycoolapp"
}

export interface ScaffoldFile {
  relativePath: string;
  content: string;
}

// ============================================================
// 1. package.json
// ============================================================

export function packageJsonTemplate(config: ScaffoldConfig): string {
  return JSON.stringify(
    {
      name: config.packageName,
      version: '0.1.0',
      description: `${config.displayName} \u2014 A NovaSyn Electron App`,
      main: 'dist/main/main/index.js',
      private: true,
      scripts: {
        dev: 'npm run dev:renderer & npm run dev:main',
        'dev:renderer': 'vite',
        'dev:main': `tsc -p tsconfig.main.json && xcopy /E /I /Y src\\main\\database\\migrations dist\\main\\main\\database\\migrations && set NODE_ENV=development&& electron .`,
        build: 'npm run build:main && npm run build:renderer',
        'build:main':
          'tsc -p tsconfig.main.json && xcopy /E /I /Y src\\main\\database\\migrations dist\\main\\main\\database\\migrations',
        'build:renderer': 'vite build',
        'build:prod': 'npm run build:main && vite build --mode production',
        package: 'npm run build:prod && electron-builder',
        'type-check':
          'tsc --noEmit -p tsconfig.renderer.json && tsc --noEmit -p tsconfig.main.json',
      },
      dependencies: {
        'better-sqlite3': '^9.2.2',
        'electron-squirrel-startup': '^1.0.1',
        uuid: '^9.0.1',
      },
      devDependencies: {
        '@types/better-sqlite3': '^7.6.8',
        '@types/node': '^20.10.6',
        '@types/react': '^18.2.47',
        '@types/react-dom': '^18.2.18',
        '@types/uuid': '^9.0.7',
        '@vitejs/plugin-react': '^4.2.1',
        electron: '^28.1.0',
        'electron-builder': '^24.9.1',
        postcss: '^8.4.32',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        tailwindcss: '^3.4.0',
        typescript: '^5.3.3',
        vite: '^5.0.10',
        zustand: '^4.4.7',
      },
      build: {
        appId: config.appId,
        productName: config.displayName,
        directories: { output: 'release' },
        files: [
          { from: 'dist', to: 'dist', filter: ['**/*'] },
          'package.json',
        ],
        win: { target: ['portable'] },
      },
    },
    null,
    2,
  ) + '\n';
}

// ============================================================
// 2. vite.config.ts
// ============================================================

export function viteConfigTemplate(config: ScaffoldConfig): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  server: {
    port: ${config.port},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
});
`;
}

// ============================================================
// 3. tsconfig.json (base)
// ============================================================

export function tsconfigBaseTemplate(_config: ScaffoldConfig): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2021',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '@main/*': ['src/main/*'],
          '@renderer/*': ['src/renderer/*'],
          '@shared/*': ['src/shared/*'],
        },
      },
      exclude: ['node_modules', 'dist', 'release'],
    },
    null,
    2,
  ) + '\n';
}

// ============================================================
// 4. tsconfig.main.json
// ============================================================

export function tsconfigMainTemplate(_config: ScaffoldConfig): string {
  return JSON.stringify(
    {
      extends: './tsconfig.json',
      compilerOptions: {
        outDir: 'dist/main',
        module: 'commonjs',
        target: 'ES2021',
      },
      include: ['src/main/**/*', 'src/shared/**/*', 'src/preload/**/*'],
      exclude: ['src/renderer/**/*', 'node_modules', 'dist'],
    },
    null,
    2,
  ) + '\n';
}

// ============================================================
// 5. tsconfig.renderer.json
// ============================================================

export function tsconfigRendererTemplate(_config: ScaffoldConfig): string {
  return JSON.stringify(
    {
      extends: './tsconfig.json',
      compilerOptions: {
        module: 'ESNext',
        target: 'ES2020',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        jsx: 'react-jsx',
        moduleResolution: 'bundler',
        noEmit: true,
      },
      include: ['src/renderer/**/*', 'src/shared/**/*'],
      exclude: ['src/main/**/*', 'src/preload/**/*', 'node_modules', 'dist'],
    },
    null,
    2,
  ) + '\n';
}

// ============================================================
// 6. tailwind.config.js
// ============================================================

export function tailwindConfigTemplate(_config: ScaffoldConfig): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
}

// ============================================================
// 7. postcss.config.js
// ============================================================

export function postcssConfigTemplate(_config: ScaffoldConfig): string {
  return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

// ============================================================
// 8. .gitignore
// ============================================================

export function gitignoreTemplate(_config: ScaffoldConfig): string {
  return `node_modules
dist
release
*.db
.env
api_keys.txt
.DS_Store
`;
}

// ============================================================
// 9. src/main/database/db.ts
// ============================================================

export function dbTemplate(config: ScaffoldConfig): string {
  return `import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, '${config.dbName}');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    console.log(\`Database initialized at: \${dbPath}\`);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) { db.close(); db = null; console.log('Database closed'); }
}

export function runMigrations(): void {
  const database = getDatabase();
  const migrationsPath = path.join(__dirname, 'migrations');
  database.exec(\`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  \`);
  if (!fs.existsSync(migrationsPath)) { console.log('No migrations directory found'); return; }
  const migrationFiles = fs.readdirSync(migrationsPath).filter((f) => f.endsWith('.sql')).sort();
  const applied = new Set((database.prepare('SELECT name FROM migrations').all() as { name: string }[]).map((m) => m.name));
  for (const file of migrationFiles) {
    if (!applied.has(file)) {
      console.log(\`Running migration: \${file}\`);
      const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf-8');
      try {
        database.exec(sql);
        database.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        console.log(\`Migration \${file} applied\`);
      } catch (error) {
        console.error(\`Error applying migration \${file}:\`, error);
        throw error;
      }
    }
  }
  console.log('All migrations applied');
}
`;
}

// ============================================================
// 10. src/main/database/migrations/.gitkeep
// ============================================================

export function gitkeepTemplate(_config: ScaffoldConfig): string {
  return '';
}

// ============================================================
// 11. src/main/config/apiKeyStore.ts
// ============================================================

export function apiKeyStoreTemplate(_config: ScaffoldConfig): string {
  return `import { app } from 'electron';
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
  if (key) { keys[provider] = key; } else { delete keys[provider]; }
  fs.writeFileSync(storePath, JSON.stringify(keys, null, 2));
}

export function deleteApiKey(provider: string): void {
  const keys = loadApiKeys();
  delete keys[provider];
  const storePath = getStorePath();
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(keys, null, 2));
}
`;
}

// ============================================================
// 12. src/main/config/settingsStore.ts
// ============================================================

export function settingsStoreTemplate(_config: ScaffoldConfig): string {
  return `import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { AppSettings } from '../../shared/types';

const DEFAULTS: AppSettings = {
  selectedModels: ['babyai-auto'],
  tokenBudget: 8000,
  systemPrompt: '',
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
`;
}

// ============================================================
// 13. src/main/window.ts
// ============================================================

export function windowTemplate(config: ScaffoldConfig): string {
  return `import { BrowserWindow, screen } from 'electron';
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
    title: '${config.displayName}',
    frame: false,
    backgroundColor: '#0f172a',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:${config.port}');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => { mainWindow?.show(); });
  mainWindow.on('closed', () => { mainWindow = null; });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null { return mainWindow; }
export function closeMainWindow(): void { if (mainWindow) mainWindow.close(); }
`;
}

// ============================================================
// 14. src/main/index.ts
// ============================================================

export function mainIndexTemplate(config: ScaffoldConfig): string {
  return `import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainWindow } from './window';
import { getDatabase, closeDatabase, runMigrations } from './database/db';
import { loadApiKeys, saveApiKey } from './config/apiKeyStore';
import { loadSettings, saveSettings } from './config/settingsStore';
import { IPC_CHANNELS } from '../shared/types';

// Squirrel startup check
if (require('electron-squirrel-startup')) app.quit();

// Single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}

// -- Models --

const AVAILABLE_MODELS = [
  { id: 'babyai-auto', name: 'BabyAI Auto', provider: 'babyai', contextWindow: 128000, requiresKey: true },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', contextWindow: 200000, requiresKey: true },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', contextWindow: 1047576, requiresKey: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', contextWindow: 1048576, requiresKey: true },
  { id: 'grok-3', name: 'Grok 3', provider: 'xai', contextWindow: 131072, requiresKey: true },
];

// -- IPC Registration --

function registerIPCHandlers() {
  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => loadSettings());
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, updates) => saveSettings(updates));

  // API Keys
  ipcMain.handle(IPC_CHANNELS.GET_API_KEYS, async () => loadApiKeys());
  ipcMain.handle(IPC_CHANNELS.SET_API_KEY, async (_event, provider: string, key: string) => saveApiKey(provider, key));

  // Models
  ipcMain.handle(IPC_CHANNELS.GET_MODELS, async () => AVAILABLE_MODELS);

  // Window controls
  ipcMain.handle(IPC_CHANNELS.MINIMIZE_WINDOW, () => { BrowserWindow.getFocusedWindow()?.minimize(); });
  ipcMain.handle(IPC_CHANNELS.MAXIMIZE_WINDOW, () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.handle(IPC_CHANNELS.CLOSE_WINDOW, () => { BrowserWindow.getFocusedWindow()?.close(); });

  // Ping
  ipcMain.handle('ping', () => 'pong');
}

// -- App lifecycle --

app.whenReady().then(() => {
  getDatabase();
  runMigrations();
  registerIPCHandlers();
  createMainWindow();
  console.log('[${config.displayName}] App ready');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  closeDatabase();
});
`;
}

// ============================================================
// 15. src/preload/index.ts
// ============================================================

export function preloadTemplate(_config: ScaffoldConfig): string {
  return `import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

const electronAPI: ElectronAPI = {
  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (updates) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, updates),

  // API Keys
  getApiKeys: () => ipcRenderer.invoke(IPC_CHANNELS.GET_API_KEYS),
  setApiKey: (provider, key) => ipcRenderer.invoke(IPC_CHANNELS.SET_API_KEY, provider, key),

  // Models
  getModels: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MODELS),

  // Window
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.CLOSE_WINDOW),

  // Ping
  ping: () => ipcRenderer.invoke('ping'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('Preload script loaded, electronAPI exposed');
`;
}

// ============================================================
// 16. src/shared/types.ts
// ============================================================

export function sharedTypesTemplate(_config: ScaffoldConfig): string {
  return `// === Model Interface ===

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  requiresKey: boolean;
}

// === Settings ===

export interface AppSettings {
  selectedModels: string[];
  tokenBudget: number;
  systemPrompt: string;
}

// === IPC Channels ===

export const IPC_CHANNELS = {
  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',

  // API Keys
  GET_API_KEYS: 'get-api-keys',
  SET_API_KEY: 'set-api-key',

  // Models
  GET_MODELS: 'get-models',

  // Window
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',
} as const;

// === Electron API ===

export interface ElectronAPI {
  // Settings
  getSettings: () => Promise<AppSettings>;
  saveSettings: (updates: Partial<AppSettings>) => Promise<void>;

  // API Keys
  getApiKeys: () => Promise<Record<string, string>>;
  setApiKey: (provider: string, key: string) => Promise<void>;

  // Models
  getModels: () => Promise<AIModel[]>;

  // Window
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // Ping
  ping: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Add your entity types here
`;
}

// ============================================================
// 17. src/renderer/index.html
// ============================================================

export function indexHtmlTemplate(config: ScaffoldConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.displayName}</title>
  </head>
  <body class="bg-slate-900 text-white overflow-hidden">
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
`;
}

// ============================================================
// 18. src/renderer/index.tsx
// ============================================================

export function indexTsxTemplate(_config: ScaffoldConfig): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);
`;
}

// ============================================================
// 19. src/renderer/styles/globals.css
// ============================================================

export function globalsCssTemplate(_config: ScaffoldConfig): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --accent: #f59e0b;
  --accent-hover: #d97706;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  user-select: none;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #64748b; }

input, textarea, select { user-select: text; }
`;
}

// ============================================================
// 20. src/renderer/store/appStore.ts
// ============================================================

export function appStoreTemplate(_config: ScaffoldConfig): string {
  return `import { create } from 'zustand';
import type { AIModel, AppSettings } from '../../shared/types';

interface AppState {
  // Data
  settings: AppSettings | null;
  models: AIModel[];
  apiKeys: Record<string, string>;

  // UI
  isLoading: boolean;
  error: string | null;

  // Actions
  setSettings: (settings: AppSettings) => void;
  setModels: (models: AIModel[]) => void;
  setApiKeys: (keys: Record<string, string>) => void;
  setIsLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  settings: null,
  models: [],
  apiKeys: {},
  isLoading: true,
  error: null,

  setSettings: (settings) => set({ settings }),
  setModels: (models) => set({ models }),
  setApiKeys: (apiKeys) => set({ apiKeys }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
`;
}

// ============================================================
// 21. src/renderer/components/TitleBar.tsx
// ============================================================

export function titleBarTemplate(config: ScaffoldConfig): string {
  return `import React from 'react';

export function TitleBar() {
  return (
    <div
      className="flex items-center justify-between h-9 bg-slate-950 border-b border-slate-800 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3">
        <span className="text-amber-400 text-sm">&#9776;</span>
        <span className="text-xs font-semibold text-gray-300 tracking-wide">${config.displayName}</span>
      </div>
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI.minimizeWindow()}
          className="h-full px-3 text-gray-400 hover:bg-slate-800 hover:text-white text-xs transition"
        >
          &#8212;
        </button>
        <button
          onClick={() => window.electronAPI.maximizeWindow()}
          className="h-full px-3 text-gray-400 hover:bg-slate-800 hover:text-white text-xs transition"
        >
          &#9633;
        </button>
        <button
          onClick={() => window.electronAPI.closeWindow()}
          className="h-full px-3 text-gray-400 hover:bg-red-600 hover:text-white text-xs transition"
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
`;
}

// ============================================================
// 22. src/renderer/App.tsx
// ============================================================

export function appTsxTemplate(_config: ScaffoldConfig): string {
  return `import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { TitleBar } from './components/TitleBar';

function App() {
  const {
    isLoading,
    error,
    setSettings,
    setModels,
    setApiKeys,
    setIsLoading,
    setError,
  } = useAppStore();

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setIsLoading(true);
      setError(null);

      const [settingsData, modelsData, apiKeysData] = await Promise.all([
        window.electronAPI.getSettings(),
        window.electronAPI.getModels(),
        window.electronAPI.getApiKeys(),
      ]);

      setSettings(settingsData);
      setModels(modelsData);
      setApiKeys(apiKeysData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app data');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500 text-sm">
              {/* Add your views here */}
              <p>Welcome! Your app is ready.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
`;
}

// ============================================================
// Manifest — generates all scaffold files
// ============================================================

export function generateScaffoldFiles(config: ScaffoldConfig): ScaffoldFile[] {
  return [
    { relativePath: 'package.json', content: packageJsonTemplate(config) },
    { relativePath: 'vite.config.ts', content: viteConfigTemplate(config) },
    { relativePath: 'tsconfig.json', content: tsconfigBaseTemplate(config) },
    { relativePath: 'tsconfig.main.json', content: tsconfigMainTemplate(config) },
    { relativePath: 'tsconfig.renderer.json', content: tsconfigRendererTemplate(config) },
    { relativePath: 'tailwind.config.js', content: tailwindConfigTemplate(config) },
    { relativePath: 'postcss.config.js', content: postcssConfigTemplate(config) },
    { relativePath: '.gitignore', content: gitignoreTemplate(config) },
    { relativePath: 'src/main/database/db.ts', content: dbTemplate(config) },
    { relativePath: 'src/main/database/migrations/.gitkeep', content: gitkeepTemplate(config) },
    { relativePath: 'src/main/config/apiKeyStore.ts', content: apiKeyStoreTemplate(config) },
    { relativePath: 'src/main/config/settingsStore.ts', content: settingsStoreTemplate(config) },
    { relativePath: 'src/main/window.ts', content: windowTemplate(config) },
    { relativePath: 'src/main/index.ts', content: mainIndexTemplate(config) },
    { relativePath: 'src/preload/index.ts', content: preloadTemplate(config) },
    { relativePath: 'src/shared/types.ts', content: sharedTypesTemplate(config) },
    { relativePath: 'src/renderer/index.html', content: indexHtmlTemplate(config) },
    { relativePath: 'src/renderer/index.tsx', content: indexTsxTemplate(config) },
    { relativePath: 'src/renderer/styles/globals.css', content: globalsCssTemplate(config) },
    { relativePath: 'src/renderer/store/appStore.ts', content: appStoreTemplate(config) },
    { relativePath: 'src/renderer/components/TitleBar.tsx', content: titleBarTemplate(config) },
    { relativePath: 'src/renderer/App.tsx', content: appTsxTemplate(config) },
  ];
}
