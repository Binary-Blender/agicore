# NovaSyn Schema-First Development

## The Pipeline

Every feature in a NovaSyn app follows this exact pipeline. No steps are skipped.

```
1. SQL Migration
2. TypeScript Interfaces (types.ts)
3. IPC Channel Constants (types.ts)
4. ElectronAPI Methods (types.ts)
5. Preload Bridge (preload/index.ts)
6. Row Mappers (main/index.ts)
7. IPC Handlers (main/index.ts)
8. Zustand State + Actions (store.ts)
9. React Components (components/*.tsx)
10. Sidebar + App.tsx Routing
```

## Worked Example: Adding a "Notes" Feature

### Step 1: SQL Migration

Create `migrations/003_notes.sql`:

```sql
-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  is_pinned INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_student ON notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(category);
```

### Step 2: TypeScript Interface

Add to `src/shared/types.ts`:

```typescript
export interface Note {
  id: string;
  studentId: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  studentId: string;
  title: string;
  content?: string;
  category?: string;
}
```

### Step 3: IPC Channel Constants

Add to `IPC_CHANNELS` in `types.ts`:

```typescript
// Notes
GET_NOTES: 'get-notes',
CREATE_NOTE: 'create-note',
UPDATE_NOTE: 'update-note',
DELETE_NOTE: 'delete-note',
```

### Step 4: ElectronAPI Methods

Add to `ElectronAPI` interface in `types.ts`:

```typescript
// Notes
getNotes: (studentId: string) => Promise<Note[]>;
createNote: (input: CreateNoteInput) => Promise<Note>;
updateNote: (id: string, updates: Partial<Note>) => Promise<Note>;
deleteNote: (id: string) => Promise<void>;
```

### Step 5: Preload Bridge

Add to `preload/index.ts`:

```typescript
// Notes
getNotes: (studentId) => ipcRenderer.invoke(IPC_CHANNELS.GET_NOTES, studentId),
createNote: (input) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_NOTE, input),
updateNote: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_NOTE, id, updates),
deleteNote: (id) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_NOTE, id),
```

### Step 6: Row Mapper

Add to `main/index.ts`:

```typescript
function mapNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    title: row.title as string,
    content: row.content as string,
    category: row.category as string,
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
```

### Step 7: IPC Handlers

Add to `main/index.ts` inside `app.whenReady()`:

```typescript
ipcMain.handle(IPC_CHANNELS.GET_NOTES, async (_event, studentId: string) => {
  try {
    const rows = db.prepare('SELECT * FROM notes WHERE student_id = ? ORDER BY is_pinned DESC, updated_at DESC').all(studentId);
    return rows.map((r) => mapNote(r as Record<string, unknown>));
  } catch (error) {
    console.error('GET_NOTES error:', error);
    return { error: (error as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.CREATE_NOTE, async (_event, input: CreateNoteInput) => {
  try {
    const id = uuid();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO notes (id, student_id, title, content, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, input.studentId, input.title, input.content || '', input.category || 'general', now, now);
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    return mapNote(row as Record<string, unknown>);
  } catch (error) {
    console.error('CREATE_NOTE error:', error);
    return { error: (error as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.UPDATE_NOTE, async (_event, id: string, updates: Partial<Note>) => {
  try {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (updates.title !== undefined) { sets.push('title = ?'); values.push(updates.title); }
    if (updates.content !== undefined) { sets.push('content = ?'); values.push(updates.content); }
    if (updates.category !== undefined) { sets.push('category = ?'); values.push(updates.category); }
    if (updates.isPinned !== undefined) { sets.push('is_pinned = ?'); values.push(updates.isPinned ? 1 : 0); }
    sets.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
    return mapNote(row as Record<string, unknown>);
  } catch (error) {
    console.error('UPDATE_NOTE error:', error);
    return { error: (error as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.DELETE_NOTE, async (_event, id: string) => {
  try {
    db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  } catch (error) {
    console.error('DELETE_NOTE error:', error);
    return { error: (error as Error).message };
  }
});
```

### Step 8: Zustand State + Actions

Add to the store:

```typescript
// State
notes: [] as Note[],

// Actions
loadNotes: async () => {
  const student = get().currentStudent;
  if (!student) return;
  const notes = await window.electronAPI.getNotes(student.id);
  if (Array.isArray(notes)) set({ notes });
},

createNote: async (input: CreateNoteInput) => {
  const result = await window.electronAPI.createNote(input);
  if (result && !('error' in result)) {
    set((s) => ({ notes: [result, ...s.notes] }));
  }
},

updateNote: async (id: string, updates: Partial<Note>) => {
  const result = await window.electronAPI.updateNote(id, updates);
  if (result && !('error' in result)) {
    set((s) => ({ notes: s.notes.map((n) => n.id === id ? result : n) }));
  }
},

deleteNote: async (id: string) => {
  await window.electronAPI.deleteNote(id);
  set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
},
```

Also update `selectStudent` to load notes, and `deleteStudent` to clear notes.

### Step 9: React Component

Create `src/renderer/components/Notes.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export default function Notes() {
  const { notes, currentStudent, loadNotes, createNote, updateNote, deleteNote } = useAppStore();
  const [title, setTitle] = useState('');

  useEffect(() => { loadNotes(); }, [currentStudent?.id]);

  const handleCreate = async () => {
    if (!currentStudent || !title.trim()) return;
    await createNote({ studentId: currentStudent.id, title: title.trim() });
    setTitle('');
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-xl font-semibold text-[var(--text-heading)] mb-4">Notes</h2>
      {/* Input + note list */}
    </div>
  );
}
```

### Step 10: Routing

Add to `Sidebar.tsx` navItems:
```typescript
{ view: 'notes', icon: '📝', label: 'Notes' },
```

Add to `App.tsx`:
```typescript
import Notes from './components/Notes';
// ...
{currentView === 'notes' && <Notes />}
```

Add `'notes'` to the `currentView` union type in the store.

## Checklist

After completing all 10 steps, verify:

- [ ] Migration creates table without error
- [ ] Interface matches migration columns (camelCase)
- [ ] IPC_CHANNELS has all CRUD channels
- [ ] ElectronAPI has method signatures
- [ ] Preload bridges all channels
- [ ] Row mapper converts all columns
- [ ] Handlers implement all CRUD operations
- [ ] Store has state + all actions
- [ ] Component renders and interacts correctly
- [ ] Sidebar + App.tsx routing updated
- [ ] `tsc --noEmit` passes both configs
