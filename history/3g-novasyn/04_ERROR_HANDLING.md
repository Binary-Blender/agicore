# NovaSyn Error Handling

## Principles

1. **No silent failures** — Every error is logged and surfaced
2. **Errors don't crash the app** — IPC handlers return `{ error: string }`, never throw
3. **Main process errors go to console** — For developer debugging
4. **Renderer errors show user-friendly messages** — Toast notifications or inline messages
5. **AI errors include provider context** — Provider name, status code, model name

## IPC Handler Error Pattern

Every IPC handler follows this exact pattern:

```typescript
ipcMain.handle(IPC_CHANNELS.OPERATION_NAME, async (_event, ...args) => {
  try {
    // Business logic here
    return result;
  } catch (error) {
    console.error('OPERATION_NAME error:', error);
    return { error: (error as Error).message };
  }
});
```

### Store-Side Error Handling

The Zustand store checks for error responses:

```typescript
createItem: async (input) => {
  try {
    const result = await window.electronAPI.createItem(input);
    if (result && typeof result === 'object' && 'error' in result) {
      console.error('Create item failed:', result.error);
      return;
    }
    set((state) => ({ items: [...state.items, result] }));
  } catch (error) {
    console.error('createItem error:', error);
  }
},
```

### Component-Side Error Display

Components typically use local state for error display:

```typescript
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  try {
    setError(null);
    await createItem(input);
  } catch (err) {
    setError('Failed to create item. Please try again.');
  }
};

{error && (
  <div className="text-red-400 text-sm mt-2">{error}</div>
)}
```

## AI Service Error Handling

AI calls have additional error context:

```typescript
async function callAI(provider: string, model: string, prompt: string): Promise<string> {
  try {
    // Provider-specific API call
    return response;
  } catch (error) {
    const err = error as Error & { status?: number };
    const message = `${provider} API error (${model}): ${err.message}`;
    if (err.status) {
      console.error(`${message} [HTTP ${err.status}]`);
    } else {
      console.error(message);
    }
    throw new Error(message);
  }
}
```

### Common AI Error Scenarios

| Error | Cause | Handling |
|-------|-------|----------|
| 401 Unauthorized | Invalid or missing API key | "Please check your API key in Settings" |
| 429 Rate Limited | Too many requests | "Rate limited. Please wait a moment and try again" |
| 500 Server Error | Provider outage | "The AI provider is experiencing issues. Try a different model" |
| Network Error | No internet | "Unable to reach the AI service. Check your internet connection" |
| Context Too Long | Prompt exceeds model limit | "The content is too long for this model. Try a shorter selection" |

## Database Error Handling

### Constraint Violations

```typescript
try {
  db.prepare('INSERT INTO items (id, name) VALUES (?, ?)').run(id, name);
} catch (error) {
  const msg = (error as Error).message;
  if (msg.includes('UNIQUE constraint failed')) {
    return { error: 'An item with this name already exists' };
  }
  if (msg.includes('FOREIGN KEY constraint failed')) {
    return { error: 'Referenced record does not exist' };
  }
  throw error; // Re-throw unexpected errors
}
```

### Migration Errors

Migration failures are fatal — the app should not start with a broken schema:

```typescript
try {
  db.exec(migrationSQL);
  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
} catch (error) {
  console.error(`Error applying migration ${file}:`, error);
  throw error; // Let it crash — broken schema is unrecoverable
}
```

## Window Error Handling

### Renderer Crash Recovery

```typescript
mainWindow.webContents.on('render-process-gone', (_event, details) => {
  console.error('Renderer process gone:', details.reason);
  // Reload the window
  mainWindow.reload();
});

mainWindow.webContents.on('unresponsive', () => {
  console.error('Window became unresponsive');
});
```

## Error Boundaries (React)

For unexpected renderer crashes, wrap the app in an error boundary:

```typescript
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-[var(--bg-page)]">
          <div className="text-center">
            <h1 className="text-xl text-[var(--text-heading)]">Something went wrong</h1>
            <p className="text-[var(--text-muted)] mt-2">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

## Non-Critical Error Suppression

Some errors should be logged but never break the user flow:

```typescript
// Gamification errors should not break lesson completion
try {
  awardXp(db, studentId, xpAmount, description, category);
  checkAndAwardBadges(db, studentId);
} catch (_) {
  // Gamification is non-critical — log but don't fail
  console.warn('Gamification error (non-critical):', _);
}
```

Use this pattern for:
- Gamification/XP awards
- Analytics/logging
- Badge checks
- Streak updates
- Any "enhancement" that shouldn't block core functionality
