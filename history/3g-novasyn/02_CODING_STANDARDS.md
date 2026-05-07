# NovaSyn Coding Standards

## TypeScript Standards

### Strict Mode Always
```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| TypeScript interfaces | PascalCase | `Student`, `SchoolYear`, `AIModel` |
| TypeScript properties | camelCase | `firstName`, `schoolYearId`, `isActive` |
| Database tables | snake_case | `school_years`, `ai_log`, `tutor_sessions` |
| Database columns | snake_case | `first_name`, `school_year_id`, `is_active` |
| IPC channels | SCREAMING_SNAKE | `GET_STUDENTS`, `CREATE_LESSON`, `GENERATE_REPORT_CARD` |
| CSS variables | kebab-case | `--bg-page`, `--text-primary`, `--border` |
| Component files | PascalCase.tsx | `Dashboard.tsx`, `LessonPlanner.tsx` |
| Store files | camelCase.ts | `academyStore.ts`, `studioStore.ts` |
| Migration files | NNN_description.sql | `001_core.sql`, `002_assessments.sql` |

### IPC Channel Naming

Every IPC channel follows a verb-noun pattern:
```typescript
const IPC_CHANNELS = {
  // CRUD operations
  GET_STUDENTS: 'get-students',          // Read all
  GET_STUDENT: 'get-student',            // Read one
  CREATE_STUDENT: 'create-student',      // Create
  UPDATE_STUDENT: 'update-student',      // Update
  DELETE_STUDENT: 'delete-student',      // Delete

  // AI operations
  GENERATE_LESSON_PLAN: 'generate-lesson-plan',
  SEND_TUTOR_MESSAGE: 'send-tutor-message',

  // Window controls
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',
} as const;
```

### Row Mapper Pattern

Database returns snake_case. TypeScript uses camelCase. Row mappers bridge the gap.

```typescript
// Always define a mapper for each table
function mapStudent(row: Record<string, unknown>): Student {
  return {
    id: row.id as string,
    name: row.name as string,
    dateOfBirth: row.date_of_birth as string,
    gradeLevel: row.grade_level as string,
    learningStyle: row.learning_style as string | null,
    avatarEmoji: row.avatar_emoji as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

Rules:
- One mapper per table
- Always cast via `as` (the DB layer is trusted)
- Nullable columns use `as string | null` (or appropriate type)
- JSON columns: `JSON.parse(row.column_name as string)` with fallback
- Boolean columns (stored as INTEGER): `Boolean(row.is_active)`

### Type Definitions

All types live in `src/shared/types.ts`. This file is shared between main and renderer via both tsconfigs.

```typescript
// Interface for a database entity
export interface Student {
  id: string;           // UUID v4
  name: string;
  dateOfBirth: string;  // ISO date string
  gradeLevel: string;
  learningStyle: string | null;
  avatarEmoji: string;
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}

// Input type for create operations (omit id, timestamps)
export interface CreateStudentInput {
  name: string;
  dateOfBirth: string;
  gradeLevel: string;
  learningStyle?: string;
  avatarEmoji?: string;
}

// IPC channels as const object
export const IPC_CHANNELS = { ... } as const;

// ElectronAPI interface for preload bridge
export interface ElectronAPI {
  getStudents: () => Promise<Student[]>;
  createStudent: (input: CreateStudentInput) => Promise<Student>;
  // ...
}
```

### Import Organization

```typescript
// 1. React/framework imports
import React, { useState, useEffect } from 'react';

// 2. Store imports
import { useAcademyStore } from '../store/academyStore';

// 3. Component imports
import Dashboard from './components/Dashboard';

// 4. Type imports
import type { Student, Lesson } from '../shared/types';

// 5. Utility imports
import { v4 as uuid } from 'uuid';
```

### Component Structure

```typescript
export default function ComponentName() {
  // 1. Store destructuring
  const { data, actions } = useStore();

  // 2. Local state
  const [localState, setLocalState] = useState('');

  // 3. Effects
  useEffect(() => { /* load data */ }, []);

  // 4. Handlers
  const handleClick = () => { /* ... */ };

  // 5. Render
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* content */}
    </div>
  );
}
```

### Error Handling in IPC Handlers

```typescript
ipcMain.handle(IPC_CHANNELS.CREATE_STUDENT, async (_event, input: CreateStudentInput) => {
  try {
    const id = uuid();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO students (id, name, date_of_birth, grade_level, avatar_emoji, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, input.name, input.dateOfBirth, input.gradeLevel, input.avatarEmoji || '🎓', now, now);
    const row = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    return mapStudent(row as Record<string, unknown>);
  } catch (error) {
    console.error('CREATE_STUDENT error:', error);
    return { error: (error as Error).message };
  }
});
```

Rules:
- Every handler wrapped in try/catch
- Errors return `{ error: string }` (not throw)
- Console.error with channel name for debugging
- UUID generated in handler, not in renderer
- Timestamps generated in handler with `new Date().toISOString()`

## File Organization

```
src/
  main/
    index.ts          # App lifecycle + ALL IPC handlers
    window.ts         # BrowserWindow creation
    models.ts         # AI model definitions
    database/
      db.ts           # Database init, migrations, close
      migrations/     # SQL migration files (auto-applied)
    services/
      aiService.ts    # Multi-provider AI calls
  preload/
    index.ts          # contextBridge — one line per IPC channel
  renderer/
    index.html        # HTML entry point
    index.tsx         # React entry point (createRoot)
    styles/
      globals.css     # Tailwind + theme CSS variables
    store/
      appStore.ts     # Single Zustand store
    components/
      TitleBar.tsx    # Frameless window controls
      Sidebar.tsx     # Left navigation
      *.tsx           # Feature components
  shared/
    types.ts          # ALL interfaces, IPC_CHANNELS, ElectronAPI
```
