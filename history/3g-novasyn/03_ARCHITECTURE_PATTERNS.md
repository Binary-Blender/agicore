# NovaSyn Architecture Patterns

## The IPC Bridge Pattern

This is the most important pattern in the entire stack. Every feature in every NovaSyn app follows this exact flow:

```
[SQL Migration] → [types.ts] → [preload/index.ts] → [main/index.ts] → [store.ts] → [Component.tsx]
     ↓                ↓              ↓                    ↓               ↓              ↓
  Tables &       Interfaces,     contextBridge      ipcMain.handle    Zustand        React UI
  Indexes        IPC_CHANNELS    one line each      + row mapper      actions
```

### Step-by-Step

**1. SQL Migration** defines the data:
```sql
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date_of_birth TEXT,
  grade_level TEXT NOT NULL DEFAULT '',
  avatar_emoji TEXT DEFAULT '🎓',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**2. types.ts** defines the TypeScript interface + IPC channels:
```typescript
export interface Student {
  id: string;
  name: string;
  dateOfBirth: string;
  gradeLevel: string;
  avatarEmoji: string;
  createdAt: string;
  updatedAt: string;
}

export const IPC_CHANNELS = {
  GET_STUDENTS: 'get-students',
  CREATE_STUDENT: 'create-student',
  UPDATE_STUDENT: 'update-student',
  DELETE_STUDENT: 'delete-student',
  // ...
} as const;

export interface ElectronAPI {
  getStudents: () => Promise<Student[]>;
  createStudent: (input: CreateStudentInput) => Promise<Student>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
}
```

**3. preload/index.ts** wires the bridge (one line per channel):
```typescript
const electronAPI: ElectronAPI = {
  getStudents: () => ipcRenderer.invoke(IPC_CHANNELS.GET_STUDENTS),
  createStudent: (input) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_STUDENT, input),
  updateStudent: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_STUDENT, id, updates),
  deleteStudent: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_STUDENT, id),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
```

**4. main/index.ts** handles IPC + row mapper:
```typescript
function mapStudent(row: Record<string, unknown>): Student {
  return {
    id: row.id as string,
    name: row.name as string,
    dateOfBirth: row.date_of_birth as string,
    gradeLevel: row.grade_level as string,
    avatarEmoji: row.avatar_emoji as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

ipcMain.handle(IPC_CHANNELS.GET_STUDENTS, async () => {
  try {
    const rows = db.prepare('SELECT * FROM students ORDER BY name').all();
    return rows.map((r) => mapStudent(r as Record<string, unknown>));
  } catch (error) {
    console.error('GET_STUDENTS error:', error);
    return { error: (error as Error).message };
  }
});
```

**5. store.ts** adds state + actions:
```typescript
interface AcademyState {
  students: Student[];
  currentStudent: Student | null;
  loadStudents: () => Promise<void>;
  createStudent: (input: CreateStudentInput) => Promise<void>;
}

export const useAcademyStore = create<AcademyState>((set, get) => ({
  students: [],
  currentStudent: null,

  loadStudents: async () => {
    const students = await window.electronAPI.getStudents();
    set({ students });
  },

  createStudent: async (input) => {
    const student = await window.electronAPI.createStudent(input);
    set((s) => ({ students: [...s.students, student] }));
  },
}));
```

**6. Component.tsx** consumes the store:
```typescript
export default function StudentList() {
  const { students, loadStudents, createStudent } = useAcademyStore();

  useEffect(() => { loadStudents(); }, []);

  return (
    <div className="h-full overflow-y-auto p-6">
      {students.map((s) => <div key={s.id}>{s.name}</div>)}
    </div>
  );
}
```

## Database & Migration Pattern

### Auto-Migration System

On app startup, `runMigrations()` in `db.ts`:
1. Creates a `migrations` tracking table
2. Reads all `.sql` files from `src/main/database/migrations/`
3. Skips already-applied migrations
4. Runs pending migrations in alphabetical order
5. Records each applied migration

### Migration Conventions

```
migrations/
  001_core.sql              # Initial tables
  002_assessments.sql       # Sprint 2 tables
  003_tutor_resources.sql   # Sprint 3 tables
  004_gamification.sql      # Sprint 4 tables
  005_compliance.sql        # Sprint 5 tables
```

Rules:
- Three-digit prefix for ordering
- Descriptive suffix
- Always use `CREATE TABLE IF NOT EXISTS`
- Always include `id TEXT PRIMARY KEY`
- Always include `created_at TEXT DEFAULT CURRENT_TIMESTAMP`
- Always include `updated_at TEXT DEFAULT CURRENT_TIMESTAMP`
- Foreign keys reference parent table's `id` column
- Indexes for foreign key columns and common query patterns

### SQLite Configuration

```typescript
db.pragma('journal_mode = WAL');   // Write-Ahead Logging for concurrent reads
db.pragma('foreign_keys = ON');    // Enforce foreign key constraints
```

## Zustand Store Pattern

### Single Store Per App

Every NovaSyn app has exactly ONE Zustand store. No multiple stores, no context providers.

```typescript
import { create } from 'zustand';

interface AppState {
  // === UI State ===
  currentView: 'dashboard' | 'schedule' | 'settings';
  showModal: boolean;

  // === Data State ===
  items: Item[];
  currentItem: Item | null;

  // === Settings ===
  settings: Settings;

  // === UI Actions ===
  setCurrentView: (view: AppState['currentView']) => void;
  setShowModal: (show: boolean) => void;

  // === Data Actions ===
  loadItems: () => Promise<void>;
  createItem: (input: CreateItemInput) => Promise<void>;
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // === Settings Actions ===
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<Settings>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ... implementation
}));
```

### Store Naming Convention

- `novasyn_ai` → `useAIStore` or `useChatStore`
- `novasyn_studio` → `useStudioStore`
- `novasyn_council` → `useCouncilStore`
- `novasyn_home_academy` → `useAcademyStore`

### View Navigation

No React Router. Views are controlled by a `currentView` state property:

```typescript
// In store
currentView: 'dashboard' as const,
setCurrentView: (view) => set({ currentView: view }),

// In App.tsx
{currentView === 'dashboard' && <Dashboard />}
{currentView === 'schedule' && <DailySchedule />}
{currentView === 'settings' && <SettingsPanel />}
```

### Modals

Modals use boolean flags in the store:
```typescript
showStudentProfile: false,
setShowStudentProfile: (show: boolean) => set({ showStudentProfile: show }),

// In App.tsx (outside the view switch, at the bottom)
{showStudentProfile && <StudentProfile />}
{showSettings && <SettingsPanel />}
```

## Window Pattern

### Frameless Window Configuration

All NovaSyn apps use frameless windows:

```typescript
mainWindow = new BrowserWindow({
  width: Math.floor(width * 0.8),     // 80% of screen
  height: Math.floor(height * 0.8),
  minWidth: 1000,
  minHeight: 700,
  frame: false,                        // Frameless
  backgroundColor: '#1e293b',          // Slate-800 (prevents flash)
  show: false,                         // Show when ready
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
  },
});

mainWindow.once('ready-to-show', () => mainWindow?.show());
```

### Window Control IPC

Every app has three window control channels:
```typescript
MINIMIZE_WINDOW: 'minimize-window',
MAXIMIZE_WINDOW: 'maximize-window',
CLOSE_WINDOW: 'close-window',
```

### TitleBar Component

Custom title bar with drag region and window controls:
```typescript
export default function TitleBar() {
  return (
    <div className="h-9 flex items-center justify-between bg-[var(--bg-panel)] border-b border-[var(--border)]"
         style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="px-3 text-sm font-medium text-[var(--text-heading)]">
        NovaSyn AppName
      </div>
      <div className="flex" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={() => window.electronAPI.minimizeWindow()}>−</button>
        <button onClick={() => window.electronAPI.maximizeWindow()}>□</button>
        <button onClick={() => window.electronAPI.closeWindow()}>×</button>
      </div>
    </div>
  );
}
```

## Layout Pattern

Every NovaSyn app follows this layout:

```
┌──────────────────────────────────────┐
│ TitleBar (h-9, draggable)            │
├────┬─────────────────────────────────┤
│    │                                 │
│ S  │     Main Content Area           │
│ i  │     (flex-1, overflow-hidden)   │
│ d  │                                 │
│ e  │                                 │
│ b  │                                 │
│ a  │                                 │
│ r  │                                 │
│    │                                 │
│ w  │                                 │
│ 14 │                                 │
│    │                                 │
├────┘                                 │
└──────────────────────────────────────┘
```

```tsx
<div className="h-screen flex flex-col bg-[var(--bg-page)]">
  <TitleBar />
  <div className="flex flex-1 overflow-hidden">
    <Sidebar />
    <div className="flex-1 overflow-hidden">
      {/* View switch here */}
    </div>
  </div>
  {/* Modals here */}
</div>
```

### Sidebar (w-14, icon-only)

The sidebar is narrow (56px) with icon buttons:
```typescript
const navItems = [
  { view: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { view: 'schedule', icon: '📅', label: 'Schedule' },
  // ...
];
```

Each nav button shows a tooltip via `title` attribute. Active view gets a ring highlight:
```typescript
className={`w-9 h-9 rounded-lg ${
  currentView === item.view
    ? 'ring-2 ring-primary-500 bg-primary-500/20'
    : 'hover:bg-[var(--border)]'
}`}
```

## App Lifecycle

```typescript
// src/main/index.ts

app.whenReady().then(() => {
  const db = getDatabase();
  runMigrations();

  const mainWindow = createMainWindow();

  // Register ALL IPC handlers here
  ipcMain.handle(IPC_CHANNELS.GET_STUDENTS, async () => { ... });
  // ... all other handlers

  // Window controls
  ipcMain.on(IPC_CHANNELS.MINIMIZE_WINDOW, () => mainWindow.minimize());
  ipcMain.on(IPC_CHANNELS.MAXIMIZE_WINDOW, () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => mainWindow.close());
});

app.on('window-all-closed', () => {
  closeDatabase();
  app.quit();
});
```

## Settings Pattern

### Shared API Keys

All NovaSyn apps read API keys from a shared JSON file:

```typescript
const apiKeysPath = path.join(app.getPath('appData'), 'NovaSyn', 'api-keys.json');

ipcMain.handle(IPC_CHANNELS.GET_API_KEYS, async () => {
  try {
    const data = fs.readFileSync(apiKeysPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
});

ipcMain.handle(IPC_CHANNELS.SAVE_API_KEYS, async (_event, keys: Record<string, string>) => {
  fs.mkdirSync(path.dirname(apiKeysPath), { recursive: true });
  fs.writeFileSync(apiKeysPath, JSON.stringify(keys, null, 2));
  return true;
});
```

### App-Specific Settings

Stored in the app's SQLite database in a `settings` table:
```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Settings are key-value pairs loaded into the Zustand store on startup.
