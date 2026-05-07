import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'fs';
import { createMainWindow, closeMainWindow } from './window';
import { getDatabase, closeDatabase, runMigrations } from './database/db';
import { IPC_CHANNELS } from '../shared/types';
import { AVAILABLE_MODELS } from './models';
import { aiService } from './services/aiService';
import { loadApiKeys, saveApiKey } from './config/apiKeyStore';
import { v4 as uuidv4 } from 'uuid';
import {
  initVault, closeVaultDatabase,
  vaultStore, vaultGet, vaultList, vaultDelete, vaultSearch,
  vaultGetTags, vaultAddTag, vaultAnnotate, vaultGetAnnotations, vaultGetProvenance,
} from './vault/vaultService';
import {
  registerMacros, unregisterMacros, getRegistry, getAvailableMacros,
} from './vault/macroRegistry';
import {
  startQueueWatcher, stopQueueWatcher, sendMacroRequest, checkMacroResponse, getPendingRequests,
} from './vault/queueWatcher';
import {
  listOrchestrations, getOrchestration, createOrchestration, updateOrchestration, deleteOrchestration,
  listRuns, getRun, runOrchestration, resumeOrchestration,
} from './vault/orchestrationEngine';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Settings store (simple in-memory with file persistence)
function getSettingsPath(): string {
  return require('path').join(app.getPath('userData'), 'writer-settings.json');
}

function loadSettings() {
  try {
    const data = fs.readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      selectedModel: 'claude-sonnet-4-6',
      tokenBudget: 100000,
      systemPrompt: '',
      autoSaveInterval: 2000,
      theme: 'dark',
    };
  }
}

function saveSettings(updates: object) {
  const current = loadSettings();
  const merged = { ...current, ...updates };
  fs.writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2));
}

// App lifecycle
app.whenReady().then(() => {
  console.log('NovaSyn Writer is ready');

  try {
    getDatabase();
    runMigrations();
    initVault();
    registerMacros();
    startQueueWatcher();
    console.log('Database initialized and migrations complete');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    app.quit();
    return;
  }

  registerIPCHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Close any open sessions as safety net
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const openSessions = db.prepare('SELECT * FROM writer_sessions WHERE ended_at IS NULL').all() as any[];
    for (const session of openSessions) {
      const startTime = new Date(session.started_at).getTime();
      const duration = Math.floor((Date.now() - startTime) / 1000);
      // Get current total word count for project
      const result = db.prepare('SELECT COALESCE(SUM(word_count), 0) as total FROM chapters WHERE project_id = ?').get(session.project_id) as any;
      const endWordCount = result?.total || 0;
      const wordsAdded = Math.max(0, endWordCount - (session.start_word_count || 0));
      db.prepare(
        'UPDATE writer_sessions SET ended_at = ?, duration_seconds = ?, end_word_count = ?, words_added = ? WHERE id = ?'
      ).run(now, duration, endWordCount, wordsAdded, session.id);

      // Update goal streaks
      updateGoalStreaks(db, session.project_id);
    }
  } catch { /* don't block quit */ }
  stopQueueWatcher();
  unregisterMacros();
  closeVaultDatabase();
  closeDatabase();
});

// ─── Row Mappers (snake_case DB columns → camelCase TypeScript) ──────────────

function mapProject(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChapter(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    sortOrder: row.sort_order,
    content: row.content,
    wordCount: row.word_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSection(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    chapterId: row.chapter_id,
    title: row.title,
    sortOrder: row.sort_order,
    content: row.content,
    wordCount: row.word_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEncyclopediaEntry(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    category: row.category,
    content: row.content,
    tokens: row.tokens,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOutline(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    chapterId: row.chapter_id,
    beats: row.beats,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVersion(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    chapterId: row.chapter_id,
    content: row.content,
    wordCount: row.word_count,
    snapshotName: row.snapshot_name,
    source: row.source,
    createdAt: row.created_at,
  };
}

function mapAiOperation(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    chapterId: row.chapter_id,
    operationType: row.operation_type,
    model: row.model,
    prompt: row.prompt,
    contextTokens: row.context_tokens,
    response: row.response,
    responseTokens: row.response_tokens,
    accepted: row.accepted,
    rating: row.rating ?? null,
    createdAt: row.created_at,
  };
}

function mapSession(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSeconds: row.duration_seconds,
    wordsAdded: row.words_added,
    aiWordsAccepted: row.ai_words_accepted,
    aiOpsCount: row.ai_ops_count,
    startWordCount: row.start_word_count,
    endWordCount: row.end_word_count,
  };
}

function mapGoal(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    goalType: row.goal_type,
    targetWords: row.target_words,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastMetDate: row.last_met_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDiscoverySession(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    chapterId: row.chapter_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    suggestionsGenerated: row.suggestions_generated,
    suggestionsAccepted: row.suggestions_accepted,
    followThread: row.follow_thread,
    createdAt: row.created_at,
  };
}

function mapDiscoverySuggestion(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    sessionId: row.session_id,
    suggestionText: row.suggestion_text,
    suggestionType: row.suggestion_type,
    accepted: row.accepted,
    createdAt: row.created_at,
  };
}

function mapPlant(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    setupChapterId: row.setup_chapter_id,
    setupContent: row.setup_content,
    payoffChapterId: row.payoff_chapter_id,
    payoffContent: row.payoff_content,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapThread(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    question: row.question,
    raisedChapterId: row.raised_chapter_id,
    targetChapterId: row.target_chapter_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCharacterKnowledge(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    characterId: row.character_id,
    chapterId: row.chapter_id,
    knows: row.knows,
    doesNotKnow: row.does_not_know,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapKbEntry(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    category: row.category,
    content: row.content,
    tokens: row.tokens,
    isGlobal: row.is_global === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBrainDump(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    content: row.content,
    extracted: row.extracted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAnalysis(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    analysisType: row.analysis_type,
    chapterId: row.chapter_id,
    results: JSON.parse(row.results || '{}'),
    createdAt: row.created_at,
  };
}

function mapPipeline(row: any): any {
  if (!row) return row;
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    steps: JSON.parse(row.steps || '[]'),
    isPreset: row.is_preset === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Goal Streak Helper ──────────────────────────────────────────────────────

function updateGoalStreaks(db: any, projectId: string) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const goals = db.prepare('SELECT * FROM writer_goals WHERE project_id = ?').all(projectId) as any[];

  for (const goal of goals) {
    if (goal.goal_type !== 'daily') continue;

    // Sum words added today for this project
    const todayStart = today + 'T00:00:00.000Z';
    const todayEnd = today + 'T23:59:59.999Z';
    const result = db.prepare(
      'SELECT COALESCE(SUM(words_added), 0) as total FROM writer_sessions WHERE project_id = ? AND started_at >= ? AND started_at <= ?'
    ).get(projectId, todayStart, todayEnd) as any;
    const todayWords = result?.total || 0;

    if (todayWords >= goal.target_words) {
      // Goal met today
      if (goal.last_met_date === today) continue; // Already updated today

      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let newStreak = 1;
      if (goal.last_met_date === yesterday) {
        newStreak = (goal.current_streak || 0) + 1;
      }
      const longestStreak = Math.max(newStreak, goal.longest_streak || 0);
      db.prepare(
        'UPDATE writer_goals SET current_streak = ?, longest_streak = ?, last_met_date = ?, updated_at = ? WHERE id = ?'
      ).run(newStreak, longestStreak, today, new Date().toISOString(), goal.id);
    }
  }
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function registerIPCHandlers() {
  const db = getDatabase();

  // ── Settings ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => loadSettings());

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updates: object) => {
    saveSettings(updates);
  });

  // ── Models & API Keys ──────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_MODELS, () => AVAILABLE_MODELS);

  ipcMain.handle(IPC_CHANNELS.GET_API_KEYS, () => loadApiKeys());

  ipcMain.handle(
    IPC_CHANNELS.SET_API_KEY,
    (_event, provider: string, key: string) => {
      saveApiKey(provider, key);
    },
  );

  // ── Projects ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, () => {
    return db
      .prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC')
      .all('default')
      .map(mapProject);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_PROJECT, (_event, name: string, description?: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO projects (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, 'default', name, description || null, now, now);

    // Create a first chapter automatically
    const chapterId = uuidv4();
    db.prepare(
      'INSERT INTO chapters (id, project_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(chapterId, id, 'Chapter 1', 0, now, now);

    return mapProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PROJECT, (_event, id: string, updates: any) => {
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
    if (fields.length === 0) return mapProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return mapProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PROJECT, (_event, id: string) => {
    db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(id, 'default');
  });

  // ── Chapters ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_CHAPTERS, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC')
      .all(projectId)
      .map(mapChapter);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_CHAPTER, (_event, projectId: string, title: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    // Get next sort order
    const last = db.prepare(
      'SELECT MAX(sort_order) as max_order FROM chapters WHERE project_id = ?',
    ).get(projectId) as { max_order: number | null };
    const sortOrder = (last?.max_order ?? -1) + 1;
    db.prepare(
      'INSERT INTO chapters (id, project_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, projectId, title, sortOrder, now, now);
    return mapChapter(db.prepare('SELECT * FROM chapters WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_CHAPTER, (_event, id: string, updates: any) => {
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.title !== undefined) { fields.push('title = ?'); params.push(updates.title); }
    if (updates.content !== undefined) { fields.push('content = ?'); params.push(updates.content); }
    if (updates.wordCount !== undefined) { fields.push('word_count = ?'); params.push(updates.wordCount); }
    if (fields.length === 0) return mapChapter(db.prepare('SELECT * FROM chapters WHERE id = ?').get(id));

    // Auto-snapshot: create version if content changed and last auto-snapshot was >5 min ago
    if (updates.content !== undefined) {
      try {
        const lastAutoSnapshot = db.prepare(
          "SELECT created_at FROM writer_versions WHERE chapter_id = ? AND source = 'auto' ORDER BY created_at DESC LIMIT 1",
        ).get(id) as { created_at: string } | undefined;

        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        if (!lastAutoSnapshot || lastAutoSnapshot.created_at < fiveMinAgo) {
          // Snapshot the CURRENT content (before this update)
          const current = db.prepare('SELECT content, word_count FROM chapters WHERE id = ?').get(id) as any;
          if (current?.content) {
            const snapId = uuidv4();
            db.prepare(
              'INSERT INTO writer_versions (id, chapter_id, content, word_count, source, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            ).run(snapId, id, current.content, current.word_count || 0, 'auto', new Date().toISOString());
          }
        }
      } catch { /* don't fail the save if snapshot fails */ }
    }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    db.prepare(`UPDATE chapters SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return mapChapter(db.prepare('SELECT * FROM chapters WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CHAPTER, (_event, id: string) => {
    db.prepare('DELETE FROM chapters WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.REORDER_CHAPTERS, (_event, chapterIds: string[]) => {
    const stmt = db.prepare('UPDATE chapters SET sort_order = ? WHERE id = ?');
    const transaction = db.transaction(() => {
      chapterIds.forEach((id, index) => stmt.run(index, id));
    });
    transaction();
  });

  // ── Sections ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_SECTIONS, (_event, chapterId: string) => {
    return db
      .prepare('SELECT * FROM sections WHERE chapter_id = ? ORDER BY sort_order ASC')
      .all(chapterId)
      .map(mapSection);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_SECTION, (_event, chapterId: string, title: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const last = db.prepare(
      'SELECT MAX(sort_order) as max_order FROM sections WHERE chapter_id = ?',
    ).get(chapterId) as { max_order: number | null };
    const sortOrder = (last?.max_order ?? -1) + 1;
    db.prepare(
      'INSERT INTO sections (id, chapter_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(id, chapterId, title, sortOrder, now, now);
    return mapSection(db.prepare('SELECT * FROM sections WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SECTION, (_event, id: string, updates: any) => {
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.title !== undefined) { fields.push('title = ?'); params.push(updates.title); }
    if (updates.content !== undefined) { fields.push('content = ?'); params.push(updates.content); }
    if (updates.wordCount !== undefined) { fields.push('word_count = ?'); params.push(updates.wordCount); }
    if (fields.length === 0) return mapSection(db.prepare('SELECT * FROM sections WHERE id = ?').get(id));
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    db.prepare(`UPDATE sections SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return mapSection(db.prepare('SELECT * FROM sections WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_SECTION, (_event, id: string) => {
    db.prepare('DELETE FROM sections WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.REORDER_SECTIONS, (_event, sectionIds: string[]) => {
    const stmt = db.prepare('UPDATE sections SET sort_order = ? WHERE id = ?');
    const transaction = db.transaction(() => {
      sectionIds.forEach((id, index) => stmt.run(index, id));
    });
    transaction();
  });

  // ── Encyclopedia ───────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_ENCYCLOPEDIA, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM encyclopedia_entries WHERE project_id = ? ORDER BY name ASC')
      .all(projectId)
      .map(mapEncyclopediaEntry);
  });

  ipcMain.handle(
    IPC_CHANNELS.CREATE_ENCYCLOPEDIA_ENTRY,
    (_event, projectId: string, entry: { name: string; category: string; content: string }) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      const tokens = Math.ceil(entry.content.length / 4);
      db.prepare(
        'INSERT INTO encyclopedia_entries (id, project_id, name, category, content, tokens, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, projectId, entry.name, entry.category, entry.content, tokens, now, now);
      return mapEncyclopediaEntry(db.prepare('SELECT * FROM encyclopedia_entries WHERE id = ?').get(id));
    },
  );

  ipcMain.handle(IPC_CHANNELS.UPDATE_ENCYCLOPEDIA_ENTRY, (_event, id: string, updates: any) => {
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
    if (updates.category !== undefined) { fields.push('category = ?'); params.push(updates.category); }
    if (updates.content !== undefined) {
      fields.push('content = ?');
      params.push(updates.content);
      fields.push('tokens = ?');
      params.push(Math.ceil(updates.content.length / 4));
    }
    if (fields.length === 0) return mapEncyclopediaEntry(db.prepare('SELECT * FROM encyclopedia_entries WHERE id = ?').get(id));
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    db.prepare(`UPDATE encyclopedia_entries SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return mapEncyclopediaEntry(db.prepare('SELECT * FROM encyclopedia_entries WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_ENCYCLOPEDIA_ENTRY, (_event, id: string) => {
    db.prepare('DELETE FROM encyclopedia_entries WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH_ENCYCLOPEDIA, (_event, projectId: string, query: string) => {
    return db
      .prepare(
        "SELECT * FROM encyclopedia_entries WHERE project_id = ? AND (name LIKE ? OR content LIKE ?) ORDER BY name ASC",
      )
      .all(projectId, `%${query}%`, `%${query}%`)
      .map(mapEncyclopediaEntry);
  });

  // ── Encyclopedia AI ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.ENCYCLOPEDIA_GENERATE_PROFILE, async (_event, entryId: string) => {
    const entry = db.prepare('SELECT * FROM encyclopedia_entries WHERE id = ?').get(entryId) as any;
    if (!entry) throw new Error('Entry not found');

    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    let profilePrompt: string;
    if (entry.category === 'Character') {
      profilePrompt = `Generate a detailed structured character profile based on these notes. Format the output with clear sections:

## Physical Description
## Personality & Psychology
## Voice & Speech Patterns
## Character Arc
## Key Relationships
## Strengths & Weaknesses
## Notable Details

Notes:
${entry.content}`;
    } else if (entry.category === 'Location') {
      profilePrompt = `Generate a detailed structured location profile based on these notes. Format the output with clear sections:

## Physical Description & Layout
## Atmosphere & Mood
## History & Significance
## Key Features
## Associated Characters
## Sensory Details (sight, sound, smell, texture)

Notes:
${entry.content}`;
    } else {
      profilePrompt = `Generate a detailed, structured profile for this ${entry.category} entry based on the notes below. Use appropriate section headers.

Notes:
${entry.content}`;
    }

    const result = await aiService.streamCompletion(
      profilePrompt, modelId, undefined, apiKey, undefined,
      () => {},
    );
    return result.content;
  });

  ipcMain.handle(IPC_CHANNELS.ENCYCLOPEDIA_EXTRACT_ENTRIES, async (_event, projectId: string) => {
    // Gather all chapter content
    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order')
      .all(projectId) as any[];
    const chapterTexts = chapters.map((ch: any) => {
      try {
        const doc = JSON.parse(ch.content);
        return extractText(doc);
      } catch { return ''; }
    }).filter(Boolean);

    if (chapterTexts.length === 0) return [];

    // Get existing entries to avoid duplicates
    const existing = db.prepare('SELECT name FROM encyclopedia_entries WHERE project_id = ?')
      .all(projectId) as any[];
    const existingNames = existing.map((e: any) => e.name.toLowerCase());

    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    const prompt = `Scan this manuscript text and identify characters, locations, items, and lore that should be tracked in an encyclopedia. For each, provide a name, category, and brief description based on what's mentioned.

Already tracked (skip these): ${existingNames.join(', ') || 'none'}

Respond ONLY with JSON array:
[{"name": "Name", "category": "Character|Location|Item|Lore", "content": "Description from manuscript..."}]

If nothing new found, respond with: []

Manuscript:
${chapterTexts.join('\n\n---\n\n').slice(0, 15000)}`;

    try {
      const result = await aiService.streamCompletion(
        prompt, modelId, undefined, apiKey, undefined,
        () => {},
      );
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return [];
    } catch {
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.ENCYCLOPEDIA_CHECK_CONSISTENCY, async (_event, projectId: string) => {
    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order')
      .all(projectId) as any[];
    const entries = db.prepare('SELECT * FROM encyclopedia_entries WHERE project_id = ?')
      .all(projectId)
      .map(mapEncyclopediaEntry);

    if (entries.length === 0 || chapters.length === 0) return [];

    const chapterTexts = chapters.map((ch: any) => {
      try {
        const doc = JSON.parse(ch.content);
        return `[${ch.title}]\n${extractText(doc)}`;
      } catch { return ''; }
    }).filter(Boolean);

    const entrySummaries = entries.map((e: any) =>
      `[${e.category}: ${e.name}]\n${e.content}`
    ).join('\n\n---\n\n');

    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    const prompt = `Compare these encyclopedia entries against the manuscript and identify any inconsistencies (contradictions, changed details, discrepancies between what's written and what's tracked).

Respond ONLY with JSON array:
[{"entry": "Entry name", "issue": "Description of inconsistency", "suggestion": "How to fix it"}]

If no inconsistencies found, respond with: []

Encyclopedia:
${entrySummaries}

Manuscript:
${chapterTexts.join('\n\n---\n\n').slice(0, 15000)}`;

    try {
      const result = await aiService.streamCompletion(
        prompt, modelId, undefined, apiKey, undefined,
        () => {},
      );
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return [];
    } catch {
      return [];
    }
  });

  // ── Outlines ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_OUTLINE, (_event, chapterId: string) => {
    const row = db.prepare('SELECT * FROM outlines WHERE chapter_id = ?').get(chapterId);
    return row ? mapOutline(row) : null;
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_OUTLINE, (_event, chapterId: string, beats: string[]) => {
    const existing = db.prepare('SELECT id FROM outlines WHERE chapter_id = ?').get(chapterId) as { id: string } | undefined;
    const now = new Date().toISOString();
    const beatsJson = JSON.stringify(beats);

    if (existing) {
      db.prepare('UPDATE outlines SET beats = ?, updated_at = ? WHERE id = ?').run(beatsJson, now, existing.id);
      return mapOutline(db.prepare('SELECT * FROM outlines WHERE id = ?').get(existing.id));
    } else {
      const id = uuidv4();
      db.prepare(
        'INSERT INTO outlines (id, chapter_id, beats, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ).run(id, chapterId, beatsJson, now, now);
      return mapOutline(db.prepare('SELECT * FROM outlines WHERE id = ?').get(id));
    }
  });

  // ── Versions ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_VERSIONS, (_event, chapterId: string) => {
    return db
      .prepare('SELECT * FROM writer_versions WHERE chapter_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(chapterId)
      .map(mapVersion);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_VERSION, (_event, chapterId: string, snapshotName?: string, source?: string) => {
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId) as any;
    if (!chapter) throw new Error('Chapter not found');

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO writer_versions (id, chapter_id, content, word_count, snapshot_name, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(id, chapterId, chapter.content, chapter.word_count || 0, snapshotName || null, source || 'manual', now);
    return mapVersion(db.prepare('SELECT * FROM writer_versions WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.RESTORE_VERSION, (_event, versionId: string) => {
    const version = db.prepare('SELECT * FROM writer_versions WHERE id = ?').get(versionId) as any;
    if (!version) throw new Error('Version not found');

    // Create a pre-restore snapshot first
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(version.chapter_id) as any;
    if (chapter) {
      const snapshotId = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO writer_versions (id, chapter_id, content, word_count, snapshot_name, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(snapshotId, version.chapter_id, chapter.content, chapter.word_count || 0, 'Before restore', 'auto', now);
    }

    // Restore chapter content from version
    const now = new Date().toISOString();
    db.prepare('UPDATE chapters SET content = ?, word_count = ?, updated_at = ? WHERE id = ?')
      .run(version.content, version.word_count, now, version.chapter_id);

    return mapChapter(db.prepare('SELECT * FROM chapters WHERE id = ?').get(version.chapter_id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_VERSION, (_event, versionId: string) => {
    db.prepare('DELETE FROM writer_versions WHERE id = ?').run(versionId);
  });

  // ── AI Operations ───────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_AI_OPERATIONS, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_ai_operations WHERE project_id = ? ORDER BY created_at DESC LIMIT 100')
      .all(projectId)
      .map(mapAiOperation);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_AI_OPERATION, (_event, id: string, updates: { accepted?: number; rating?: number }) => {
    if (updates.accepted !== undefined) {
      db.prepare('UPDATE writer_ai_operations SET accepted = ? WHERE id = ?').run(updates.accepted, id);
    }
    if (updates.rating !== undefined) {
      db.prepare('UPDATE writer_ai_operations SET rating = ? WHERE id = ?').run(updates.rating, id);
    }
  });

  // ── AI ─────────────────────────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.SEND_PROMPT,
    async (
      _event,
      prompt: string,
      modelId: string,
      context: {
        chapterContent?: string;
        encyclopediaEntries?: string[];
        systemPrompt?: string;
        projectId?: string;
        chapterId?: string;
        operationType?: string;
      },
    ) => {
      const apiKeys = loadApiKeys();
      const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

      const apiKey = apiKeys[modelConfig.provider];
      if (!apiKey) {
        throw new Error(
          `No API key configured for ${modelConfig.provider}. Please add it in Settings.`,
        );
      }

      // Assemble context
      let contextString = '';
      if (context.chapterContent) {
        contextString += `=== CURRENT CHAPTER ===\n\n${context.chapterContent}\n\n`;
      }
      if (context.encyclopediaEntries && context.encyclopediaEntries.length > 0) {
        contextString += `=== ENCYCLOPEDIA ===\n\n${context.encyclopediaEntries.join('\n\n---\n\n')}\n\n`;
      }

      const result = await aiService.streamCompletion(
        prompt,
        modelId,
        contextString || undefined,
        apiKey,
        context.systemPrompt,
        (delta) => _event.sender.send('ai-stream-delta', delta),
      );

      // Auto-log AI operation
      let operationId: string | undefined;
      if (context.projectId) {
        operationId = uuidv4();
        const now = new Date().toISOString();
        db.prepare(
          'INSERT INTO writer_ai_operations (id, project_id, chapter_id, operation_type, model, prompt, context_tokens, response, response_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(
          operationId,
          context.projectId,
          context.chapterId || null,
          context.operationType || 'custom',
          result.model,
          prompt,
          result.promptTokens,
          result.content,
          result.responseTokens,
          now,
        );
      }

      return {
        content: result.content,
        model: result.model,
        totalTokens: result.totalTokens,
        operationId,
      };
    },
  );

  ipcMain.handle(IPC_CHANNELS.CANCEL_STREAM, () => {
    aiService.cancelStream();
  });

  // ── Model Comparison ────────────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.COMPARE_MODELS,
    async (
      _event,
      prompt: string,
      modelIds: string[],
      context: {
        chapterContent?: string;
        encyclopediaEntries?: string[];
        systemPrompt?: string;
        projectId?: string;
        chapterId?: string;
        operationType?: string;
      },
    ) => {
      const apiKeys = loadApiKeys();

      // Assemble context (same as SEND_PROMPT)
      let contextString = '';
      if (context.chapterContent) {
        contextString += `=== CURRENT CHAPTER ===\n\n${context.chapterContent}\n\n`;
      }
      if (context.encyclopediaEntries && context.encyclopediaEntries.length > 0) {
        contextString += `=== ENCYCLOPEDIA ===\n\n${context.encyclopediaEntries.join('\n\n---\n\n')}\n\n`;
      }

      // Send to all models in parallel
      const results = await Promise.allSettled(
        modelIds.map(async (modelId) => {
          const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
          if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
          const apiKey = apiKeys[modelConfig.provider];
          if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

          const result = await aiService.streamCompletion(
            prompt,
            modelId,
            contextString || undefined,
            apiKey,
            context.systemPrompt,
            () => {}, // no streaming for comparison — collect full result
          );

          // Log AI operation
          let operationId: string | undefined;
          if (context.projectId) {
            operationId = uuidv4();
            const now = new Date().toISOString();
            db.prepare(
              'INSERT INTO writer_ai_operations (id, project_id, chapter_id, operation_type, model, prompt, context_tokens, response, response_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ).run(
              operationId,
              context.projectId,
              context.chapterId || null,
              context.operationType || 'compare',
              result.model,
              prompt,
              result.promptTokens,
              result.content,
              result.responseTokens,
              now,
            );
          }

          return {
            modelId,
            modelName: modelConfig.name,
            content: result.content,
            totalTokens: result.totalTokens,
            operationId,
          };
        }),
      );

      return results.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelIds[i]);
        return {
          modelId: modelIds[i],
          modelName: modelConfig?.name || modelIds[i],
          content: '',
          totalTokens: 0,
          error: r.reason?.message || 'Unknown error',
        };
      });
    },
  );

  // ── Export ─────────────────────────────────────────────────────────────────

  ipcMain.handle(
    IPC_CHANNELS.EXPORT_PROJECT,
    async (
      _event,
      projectId: string,
      options: { format: 'markdown' | 'text' | 'docx' | 'epub' | 'html' | 'audiobook' | 'pdf' | 'kindle'; scope: 'all' | 'chapter'; chapterId?: string; manuscriptFormat?: boolean; includeTitlePage?: boolean; includeToc?: boolean; authorName?: string; pdfQuality?: 'screen' | 'print'; includeFrontMatter?: boolean },
    ) => {
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
      if (!project) throw new Error('Project not found');

      let chapters: any[];
      if (options.scope === 'chapter' && options.chapterId) {
        const ch = db.prepare('SELECT * FROM chapters WHERE id = ?').get(options.chapterId);
        chapters = ch ? [ch] : [];
      } else {
        chapters = db
          .prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC')
          .all(projectId) as any[];
      }

      // DOCX export
      if (options.format === 'docx') {
        const docx = require('docx');
        const { Document, Paragraph, TextRun, HeadingLevel, PageBreak, AlignmentType, TableOfContents, Packer } = docx;

        const manuscriptFormat = options.manuscriptFormat !== false; // default true
        const font = manuscriptFormat ? 'Times New Roman' : 'Calibri';
        const size = manuscriptFormat ? 24 : 22; // half-points (12pt / 11pt)
        const lineSpacing = manuscriptFormat ? 480 : 276; // twips (double / 1.15)

        const docSections: any[] = [];

        // Title page
        if (options.includeTitlePage) {
          const titleChildren = [
            new Paragraph({ spacing: { before: 4000 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              children: [new TextRun({ text: project.name, bold: true, size: 48, font })],
            }),
          ];
          if (project.description) {
            titleChildren.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [new TextRun({ text: project.description, size, font, italics: true })],
            }));
          }
          titleChildren.push(
            new Paragraph({ spacing: { before: 1000 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: new Date().toLocaleDateString(), size, font })],
            }),
          );
          docSections.push({
            properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
            children: titleChildren,
          });
        }

        // TOC
        if (options.includeToc) {
          docSections.push({
            properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
            children: [
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: 'Table of Contents', bold: true, size: 32, font })],
              }),
              new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-2' }),
            ],
          });
        }

        // Chapters
        for (let i = 0; i < chapters.length; i++) {
          const chapter = chapters[i];
          const children: any[] = [];

          // Chapter title
          children.push(new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: manuscriptFormat ? 2400 : 400, after: 400 },
            children: [new TextRun({ text: chapter.title, bold: true, size: 32, font })],
          }));

          // Chapter content
          try {
            const doc = JSON.parse(chapter.content);
            const text = extractText(doc);
            const paragraphs = text.split('\n').filter((p: string) => p.trim());
            for (const para of paragraphs) {
              children.push(new Paragraph({
                spacing: { line: lineSpacing },
                indent: manuscriptFormat ? { firstLine: 720 } : undefined,
                children: [new TextRun({ text: para.trim(), size, font })],
              }));
            }
          } catch {
            children.push(new Paragraph({
              children: [new TextRun({ text: '(empty)', size, font, italics: true })],
            }));
          }

          docSections.push({
            properties: {
              page: {
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                pageNumbers: { start: undefined },
              },
            },
            children,
          });
        }

        const doc = new Document({
          sections: docSections,
          styles: {
            default: {
              document: {
                run: { font, size },
                paragraph: { spacing: { line: lineSpacing } },
              },
            },
          },
        });

        const buffer = await Packer.toBuffer(doc);

        const { filePath, canceled } = await dialog.showSaveDialog({
          title: 'Export Project',
          defaultPath: `${project.name}.docx`,
          filters: [{ name: 'Word Document', extensions: ['docx'] }],
        });

        if (canceled || !filePath) return { success: false };
        fs.writeFileSync(filePath, buffer);
        return { success: true, filePath };
      }

      // EPUB export
      if (options.format === 'epub') {
        const path = require('path');
        const os = require('os');

        // Build EPUB as a ZIP file with proper structure
        const JSZip = require('jszip');
        const zip = new JSZip();

        // mimetype (must be first, uncompressed)
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

        // META-INF/container.xml
        zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

        const authorName = options.authorName || 'Unknown Author';
        const bookId = `novasyn-${projectId}`;

        // Build chapter XHTML files
        const chapterFiles: { id: string; filename: string; title: string }[] = [];
        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          let text = '';
          try {
            const doc = JSON.parse(ch.content);
            text = extractText(doc);
          } catch { text = ''; }

          const paragraphs = text.split('\n').filter((p: string) => p.trim())
            .map((p: string) => `    <p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
            .join('\n');

          const filename = `chapter_${i + 1}.xhtml`;
          chapterFiles.push({ id: `chapter${i + 1}`, filename, title: ch.title });

          zip.file(`OEBPS/${filename}`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>
${paragraphs}
</body>
</html>`);
        }

        // Title page
        if (options.includeTitlePage) {
          const titleXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="UTF-8"/><title>Title Page</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <div class="title-page">
    <h1 class="book-title">${project.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>
    ${project.description ? `<p class="book-desc">${project.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : ''}
    <p class="book-author">${authorName.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>
  </div>
</body>
</html>`;
          zip.file('OEBPS/title.xhtml', titleXhtml);
        }

        // TOC (nav.xhtml — EPUB 3)
        const tocItems = chapterFiles.map(ch => `      <li><a href="${ch.filename}">${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</a></li>`).join('\n');
        zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head><meta charset="UTF-8"/><title>Table of Contents</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
${tocItems}
    </ol>
  </nav>
</body>
</html>`);

        // Stylesheet
        zip.file('OEBPS/style.css', `body { font-family: Georgia, serif; line-height: 1.6; margin: 1em; color: #333; }
h1 { font-size: 1.8em; margin-bottom: 0.5em; page-break-before: always; }
h1:first-child { page-break-before: avoid; }
p { margin: 0.5em 0; text-indent: 1.5em; }
p:first-of-type { text-indent: 0; }
.title-page { text-align: center; margin-top: 30%; }
.book-title { font-size: 2.5em; margin-bottom: 0.5em; }
.book-desc { font-style: italic; margin-bottom: 1em; color: #666; }
.book-author { font-size: 1.2em; margin-top: 2em; }
`);

        // Cover image (if set in settings)
        const epubSettings = loadSettings();
        let hasCoverImage = false;
        let coverMediaType = 'image/png';
        let coverFilename = 'cover.png';
        if (epubSettings.coverImagePath && fs.existsSync(epubSettings.coverImagePath)) {
          const coverData = fs.readFileSync(epubSettings.coverImagePath);
          const ext = epubSettings.coverImagePath.split('.').pop()?.toLowerCase() || 'png';
          coverMediaType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
          coverFilename = `cover.${ext}`;
          zip.file(`OEBPS/${coverFilename}`, coverData);
          zip.file('OEBPS/cover.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="UTF-8"/><title>Cover</title></head>
<body style="margin:0;padding:0;text-align:center;">
  <img src="${coverFilename}" alt="Cover" style="max-width:100%;max-height:100%;"/>
</body>
</html>`);
          hasCoverImage = true;
        }

        // content.opf
        const manifestItems: string[] = [
          '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
          '    <item id="style" href="style.css" media-type="text/css"/>',
        ];
        const spineItems: string[] = [];

        if (hasCoverImage) {
          manifestItems.push(`    <item id="cover-image" href="${coverFilename}" media-type="${coverMediaType}" properties="cover-image"/>`);
          manifestItems.push('    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>');
          spineItems.push('    <itemref idref="cover"/>');
        }

        if (options.includeTitlePage) {
          manifestItems.push('    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>');
          spineItems.push('    <itemref idref="title"/>');
        }

        for (const ch of chapterFiles) {
          manifestItems.push(`    <item id="${ch.id}" href="${ch.filename}" media-type="application/xhtml+xml"/>`);
          spineItems.push(`    <itemref idref="${ch.id}"/>`);
        }

        zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${project.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</dc:title>
    <dc:creator>${authorName.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>${hasCoverImage ? '\n    <meta name="cover" content="cover-image"/>' : ''}
  </metadata>
  <manifest>
${manifestItems.join('\n')}
  </manifest>
  <spine>
${spineItems.join('\n')}
  </spine>
</package>`);

        const epubBuffer = await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });

        const { filePath, canceled } = await dialog.showSaveDialog({
          title: 'Export as EPUB',
          defaultPath: `${project.name}.epub`,
          filters: [{ name: 'EPUB', extensions: ['epub'] }],
        });

        if (canceled || !filePath) return { success: false };
        fs.writeFileSync(filePath, epubBuffer);
        return { success: true, filePath };
      }

      // HTML export
      if (options.format === 'html') {
        const authorName = options.authorName || '';

        let tocHtml = '';
        let chaptersHtml = '';

        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          let text = '';
          try {
            const doc = JSON.parse(ch.content);
            text = extractText(doc);
          } catch { text = ''; }

          const paragraphs = text.split('\n').filter((p: string) => p.trim())
            .map((p: string) => `      <p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
            .join('\n');

          const chapterId = `chapter-${i + 1}`;
          tocHtml += `      <li><a href="#${chapterId}">${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</a></li>\n`;
          chaptersHtml += `    <section id="${chapterId}" class="chapter">\n      <h2>${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h2>\n${paragraphs}\n    </section>\n\n`;
        }

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
  <style>
    :root { --bg: #fafaf9; --text: #1c1917; --heading: #0c0a09; --muted: #78716c; --accent: #7c3aed; --border: #e7e5e4; }
    @media (prefers-color-scheme: dark) { :root { --bg: #1c1917; --text: #e7e5e4; --heading: #fafaf9; --muted: #a8a29e; --accent: #a78bfa; --border: #44403c; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.8; color: var(--text); background: var(--bg); max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
    h1 { font-size: 2.2rem; color: var(--heading); margin-bottom: 0.3rem; }
    .subtitle { color: var(--muted); font-style: italic; margin-bottom: 1rem; }
    .author { color: var(--muted); margin-bottom: 2rem; }
    nav { margin-bottom: 3rem; padding: 1.5rem; border: 1px solid var(--border); border-radius: 8px; }
    nav h3 { font-size: 1rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
    nav ol { padding-left: 1.5rem; }
    nav li { margin-bottom: 0.4rem; }
    nav a { color: var(--accent); text-decoration: none; }
    nav a:hover { text-decoration: underline; }
    .chapter { margin-bottom: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); }
    .chapter:first-of-type { border-top: none; }
    .chapter h2 { font-size: 1.6rem; color: var(--heading); margin-bottom: 1rem; }
    .chapter p { margin-bottom: 0.8rem; text-indent: 1.5em; }
    .chapter p:first-of-type { text-indent: 0; }
    footer { margin-top: 4rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.85rem; text-align: center; }
  </style>
</head>
<body>
  <header>
    <h1>${project.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>
${project.description ? `    <p class="subtitle">${project.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : ''}
${authorName ? `    <p class="author">by ${authorName.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : ''}
  </header>

${options.includeToc !== false ? `  <nav>\n    <h3>Contents</h3>\n    <ol>\n${tocHtml}    </ol>\n  </nav>\n` : ''}
  <main>
${chaptersHtml}  </main>

  <footer>
    <p>Exported from NovaSyn Writer</p>
  </footer>
</body>
</html>`;

        const { filePath, canceled } = await dialog.showSaveDialog({
          title: 'Export as HTML',
          defaultPath: `${project.name}.html`,
          filters: [{ name: 'HTML', extensions: ['html'] }],
        });

        if (canceled || !filePath) return { success: false };
        fs.writeFileSync(filePath, htmlContent, 'utf-8');
        return { success: true, filePath };
      }

      // PDF export (using Electron's printToPDF via hidden BrowserWindow)
      if (options.format === 'pdf') {
        const authorName = options.authorName || '';
        const isPrintReady = options.pdfQuality === 'print';
        const writerSettings = loadSettings();
        const fm = writerSettings.frontMatter;
        const includeFrontMatter = options.includeFrontMatter !== false && fm;
        const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Build print-friendly HTML
        let frontMatterHtml = '';
        let tocHtml = '';
        let chaptersHtml = '';

        // Front matter pages
        if (includeFrontMatter && fm) {
          // Title page
          if (fm.titlePage) {
            frontMatterHtml += `  <div class="front-matter-page" style="text-align:center;padding-top:3in;">
    <h1>${escHtml(project.name)}</h1>
${project.description ? `    <p class="subtitle">${escHtml(project.description)}</p>` : ''}
${authorName ? `    <p class="author">by ${escHtml(authorName)}</p>` : ''}
  </div>\n`;
          }

          // Copyright page
          if (fm.copyrightPage) {
            const copyrightText = fm.copyrightText || `Copyright © ${new Date().getFullYear()} ${authorName || 'Author'}\nAll rights reserved.\n\nNo part of this publication may be reproduced, distributed, or transmitted without prior written permission.`;
            frontMatterHtml += `  <div class="front-matter-page" style="padding-top:60%;font-size:9pt;color:#666;line-height:1.6;">
${copyrightText.split('\n').map((line: string) => `    <p>${escHtml(line)}</p>`).join('\n')}
  </div>\n`;
          }

          // Dedication page
          if (fm.dedicationPage && fm.dedicationText) {
            frontMatterHtml += `  <div class="front-matter-page" style="text-align:center;padding-top:40%;">
    <p style="font-style:italic;font-size:14pt;">${escHtml(fm.dedicationText)}</p>
  </div>\n`;
          }

          // Epigraph page
          if (fm.epigraphPage && fm.epigraphText) {
            frontMatterHtml += `  <div class="front-matter-page" style="text-align:center;padding-top:35%;">
    <blockquote style="font-style:italic;font-size:12pt;max-width:400px;margin:0 auto;line-height:1.8;">
      <p>${escHtml(fm.epigraphText)}</p>
${fm.epigraphAttribution ? `      <cite style="display:block;margin-top:0.5em;font-size:10pt;color:#666;">${escHtml(fm.epigraphAttribution)}</cite>` : ''}
    </blockquote>
  </div>\n`;
          }
        } else if (options.includeTitlePage) {
          // Legacy title page if no front matter config
          frontMatterHtml += `  <div class="front-matter-page" style="text-align:center;padding-top:3in;">
    <h1>${escHtml(project.name)}</h1>
${project.description ? `    <p class="subtitle">${escHtml(project.description)}</p>` : ''}
${authorName ? `    <p class="author">by ${escHtml(authorName)}</p>` : ''}
    <p style="margin-top:1in;color:#999;">${new Date().toLocaleDateString()}</p>
  </div>\n`;
        }

        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          let text = '';
          try {
            const doc = JSON.parse(ch.content);
            text = extractText(doc);
          } catch { text = ''; }

          const paragraphs = text.split('\n').filter((p: string) => p.trim())
            .map((p: string) => `      <p>${escHtml(p)}</p>`)
            .join('\n');

          tocHtml += `      <li><a href="#ch-${i}">${escHtml(ch.title)}</a></li>\n`;
          chaptersHtml += `    <div class="chapter" id="ch-${i}">\n      <h2>${escHtml(ch.title)}</h2>\n${paragraphs}\n    </div>\n\n`;
        }

        const pdfHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: ${isPrintReady ? '11pt' : '12pt'}; line-height: 1.8; color: #1c1917; }
    h1 { font-size: 24pt; text-align: center; margin-bottom: 0.3rem; }
    .subtitle { text-align: center; font-style: italic; color: #666; margin-bottom: 0.5rem; }
    .author { text-align: center; color: #666; margin-bottom: 2rem; }
    .front-matter-page { page-break-after: always; min-height: 100vh; }
    .toc { margin-bottom: 2rem; }
    .toc h3 { font-size: 14pt; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .toc ol { padding-left: 1.5rem; list-style: none; counter-reset: toc-counter; }
    .toc li { margin-bottom: 0.3rem; counter-increment: toc-counter; }
    .toc li::before { content: counter(toc-counter) ". "; color: #999; }
    .toc a { text-decoration: none; color: #1c1917; border-bottom: 1px dotted #999; }
    .toc a:hover { text-decoration: underline; color: #2563eb; }
    .chapter { page-break-before: always; margin-bottom: 2rem; }
    .chapter:first-of-type { page-break-before: ${frontMatterHtml || options.includeToc ? 'always' : 'avoid'}; }
    .chapter h2 { font-size: 18pt; margin-bottom: 1rem; margin-top: ${isPrintReady ? '3em' : '2rem'}; text-align: center; bookmark-level: 1; }
    .chapter p { margin-bottom: 0.6rem; text-indent: 1.5em; }
    .chapter p:first-of-type { text-indent: 0; }
    .full-page-image { page-break-before: always; page-break-after: always; text-align: center; display: flex; align-items: center; justify-content: center; min-height: 90vh; }
    .full-page-image img { max-width: 100%; max-height: 90vh; object-fit: contain; }
    a { color: #2563eb; text-decoration: underline; }
    footer { margin-top: 2rem; text-align: center; color: #999; font-size: 9pt; }
    @media print {
      .chapter { page-break-before: always; }
      .front-matter-page { page-break-after: always; }
    }
  </style>
</head>
<body>
${frontMatterHtml}
${options.includeToc ? `  <div class="toc" style="page-break-after:always;">
    <h3>Contents</h3>
    <ol>\n${tocHtml}    </ol>
  </div>` : ''}
${chaptersHtml}
  <footer>
    <p>Exported from NovaSyn Writer</p>
  </footer>
</body>
</html>`;

        // Create a hidden BrowserWindow to render and print to PDF
        const pdfWindow = new BrowserWindow({
          show: false,
          width: isPrintReady ? 864 : 816,  // 8.5"–9" at 96dpi
          height: isPrintReady ? 1152 : 1056, // 11"–12" at 96dpi
          webPreferences: { offscreen: true },
        });

        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(pdfHtml)}`);

        // Delay to ensure CSS is applied
        await new Promise(resolve => setTimeout(resolve, 500));

        const pageSetup = writerSettings.pageSetup;
        const pdfBuffer = await pdfWindow.webContents.printToPDF({
          printBackground: true,
          margins: {
            top: pageSetup?.marginTop ?? 0.75,
            bottom: pageSetup?.marginBottom ?? 0.75,
            left: pageSetup?.marginLeft ?? 1,
            right: pageSetup?.marginRight ?? 1,
          },
          pageSize: isPrintReady ? { width: 152400, height: 228600 } : 'Letter', // 6x9 microns for print-ready
        });

        pdfWindow.close();

        const suffix = isPrintReady ? ' (Print-Ready)' : '';
        const { filePath, canceled } = await dialog.showSaveDialog({
          title: `Export as PDF${suffix}`,
          defaultPath: `${project.name}${suffix}.pdf`,
          filters: [{ name: 'PDF', extensions: ['pdf'] }],
        });

        if (canceled || !filePath) return { success: false };
        fs.writeFileSync(filePath, pdfBuffer);
        return { success: true, filePath };
      }

      // Audiobook Script export
      // Kindle-optimized EPUB (KF8-compatible)
      if (options.format === 'kindle') {
        const path = require('path');
        const JSZip = require('jszip');
        const zip = new JSZip();

        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

        const authorName = options.authorName || 'Unknown Author';
        const bookId = `novasyn-kindle-${projectId}`;

        // Kindle-optimized CSS — heavier indentation, Bookerly-like fonts, KF8 page-break hints
        zip.file('OEBPS/style.css', `@charset "UTF-8";
body { font-family: Georgia, Bookerly, serif; line-height: 1.5; margin: 0; padding: 0; color: #000; }
h1 { font-size: 1.6em; margin: 1em 0 0.5em; text-align: center; page-break-before: always; }
h1:first-child { page-break-before: avoid; }
h2 { font-size: 1.3em; margin: 0.8em 0 0.4em; }
h3 { font-size: 1.1em; margin: 0.6em 0 0.3em; }
p { margin: 0; text-indent: 1.5em; orphans: 2; widows: 2; }
p.first, p:first-of-type { text-indent: 0; }
p.scene-break { text-indent: 0; text-align: center; margin: 1em 0; }
blockquote { margin: 1em 2em; font-style: italic; }
.title-page { text-align: center; margin-top: 30%; page-break-after: always; }
.book-title { font-size: 2em; margin-bottom: 0.5em; }
.book-author { font-size: 1.2em; margin-top: 2em; }
.toc-page { page-break-after: always; }
.toc-page ol { list-style-type: none; padding: 0; }
.toc-page li { margin: 0.5em 0; }
.toc-page a { text-decoration: none; color: #000; }
`);

        const chapterFiles: { id: string; filename: string; title: string }[] = [];
        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          let text = '';
          try {
            const doc = JSON.parse(ch.content);
            text = extractText(doc);
          } catch { text = ''; }

          const paragraphs = text.split('\n').filter((p: string) => p.trim())
            .map((p: string, idx: number) => `    <p${idx === 0 ? ' class="first"' : ''}>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
            .join('\n');

          const filename = `chapter_${i + 1}.xhtml`;
          chapterFiles.push({ id: `chapter${i + 1}`, filename, title: ch.title });

          zip.file(`OEBPS/${filename}`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>
${paragraphs}
</body>
</html>`);
        }

        // Title page
        if (options.includeTitlePage) {
          zip.file('OEBPS/title.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="UTF-8"/><title>Title Page</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <div class="title-page">
    <h1 class="book-title">${project.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>
    ${project.description ? `<p>${project.description.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : ''}
    <p class="book-author">${authorName.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>
  </div>
</body>
</html>`);
        }

        // TOC
        const tocItems = chapterFiles.map(ch => `      <li><a href="${ch.filename}">${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</a></li>`).join('\n');
        zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head><meta charset="UTF-8"/><title>Table of Contents</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <div class="toc-page">
    <nav epub:type="toc" id="toc">
      <h1>Table of Contents</h1>
      <ol>
${tocItems}
      </ol>
    </nav>
  </div>
</body>
</html>`);

        // NCX for Kindle backward compat
        const ncxPoints = chapterFiles.map((ch, i) => `  <navPoint id="navpoint-${i + 1}" playOrder="${i + 1}">
    <navLabel><text>${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></navLabel>
    <content src="${ch.filename}"/>
  </navPoint>`).join('\n');
        zip.file('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${project.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></docTitle>
  <navMap>
${ncxPoints}
  </navMap>
</ncx>`);

        // Cover image for Kindle (if set in settings)
        const kindleSettings = loadSettings();
        let kindleHasCover = false;
        let kindleCoverMediaType = 'image/png';
        let kindleCoverFilename = 'cover.png';
        if (kindleSettings.coverImagePath && fs.existsSync(kindleSettings.coverImagePath)) {
          const coverData = fs.readFileSync(kindleSettings.coverImagePath);
          const ext = kindleSettings.coverImagePath.split('.').pop()?.toLowerCase() || 'png';
          kindleCoverMediaType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
          kindleCoverFilename = `cover.${ext}`;
          zip.file(`OEBPS/${kindleCoverFilename}`, coverData);
          zip.file('OEBPS/cover.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="UTF-8"/><title>Cover</title></head>
<body style="margin:0;padding:0;text-align:center;">
  <img src="${kindleCoverFilename}" alt="Cover" style="max-width:100%;max-height:100%;"/>
</body>
</html>`);
          kindleHasCover = true;
        }

        // content.opf with Kindle-specific metadata
        const manifestItems: string[] = [
          '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
          '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
          '    <item id="style" href="style.css" media-type="text/css"/>',
        ];
        const spineItems: string[] = [];

        if (kindleHasCover) {
          manifestItems.push(`    <item id="cover-image" href="${kindleCoverFilename}" media-type="${kindleCoverMediaType}" properties="cover-image"/>`);
          manifestItems.push('    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>');
          spineItems.push('    <itemref idref="cover"/>');
        }

        if (options.includeTitlePage) {
          manifestItems.push('    <item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>');
          spineItems.push('    <itemref idref="title"/>');
        }

        for (const ch of chapterFiles) {
          manifestItems.push(`    <item id="${ch.id}" href="${ch.filename}" media-type="application/xhtml+xml"/>`);
          spineItems.push(`    <itemref idref="${ch.id}"/>`);
        }

        zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="bookid">${bookId}</dc:identifier>
    <dc:title>${project.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</dc:title>
    <dc:creator opf:role="aut">${authorName.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</dc:creator>
    <dc:language>en</dc:language>
    <dc:publisher>NovaSyn Writer</dc:publisher>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
    <meta name="cover" content="${kindleHasCover ? 'cover-image' : ''}"/>
  </metadata>
  <manifest>
${manifestItems.join('\n')}
  </manifest>
  <spine toc="ncx">
${spineItems.join('\n')}
  </spine>
  <guide>
    ${options.includeTitlePage ? '<reference type="title-page" title="Title Page" href="title.xhtml"/>' : ''}
    <reference type="toc" title="Table of Contents" href="nav.xhtml"/>
  </guide>
</package>`);

        const epubBuffer = await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' });

        const { filePath, canceled } = await dialog.showSaveDialog({
          title: 'Export as Kindle EPUB',
          defaultPath: `${project.name} (Kindle).epub`,
          filters: [{ name: 'EPUB (Kindle)', extensions: ['epub'] }],
        });

        if (canceled || !filePath) return { success: false };
        fs.writeFileSync(filePath, epubBuffer);
        return { success: true, filePath };
      }

      if (options.format === 'audiobook') {
        const lines: string[] = [];
        lines.push(`[TITLE: ${project.name}]`);
        if (options.authorName) lines.push(`[AUTHOR: ${options.authorName}]`);
        lines.push(`[GENERATED: ${new Date().toLocaleDateString()}]`);
        lines.push('', '---', '');

        for (let i = 0; i < chapters.length; i++) {
          const chapter = chapters[i];
          lines.push(`[CHAPTER ${i + 1}: ${chapter.title}]`, '');

          try {
            const doc = JSON.parse(chapter.content);
            const text = extractText(doc);
            // Clean text for TTS: normalize whitespace, expand common abbreviations
            const cleaned = text
              .replace(/\s+/g, ' ')
              .replace(/(\.\.\.|…)/g, ', , ,')  // pauses for ellipsis
              .replace(/—/g, ' — ')  // space around em-dashes
              .replace(/\s*\n\s*/g, '\n\n');    // normalize paragraph breaks

            // Split into paragraphs
            const paragraphs = cleaned.split(/\n+/).filter((p: string) => p.trim());
            for (const para of paragraphs) {
              lines.push(para.trim(), '');
            }
          } catch {
            lines.push('[EMPTY CHAPTER]', '');
          }

          if (i < chapters.length - 1) {
            lines.push('[PAUSE: 3 seconds]', '');
            lines.push('---', '');
          }
        }

        lines.push('', '[END OF BOOK]');

        const { filePath, canceled } = await dialog.showSaveDialog({
          title: 'Export Audiobook Script',
          defaultPath: `${project.name} - Audiobook Script.txt`,
          filters: [{ name: 'Text', extensions: ['txt'] }],
        });

        if (canceled || !filePath) return { success: false };
        fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
        return { success: true, filePath };
      }

      // Markdown / Plain Text export
      const lines: string[] = [];
      if (options.format === 'markdown') {
        lines.push(`# ${project.name}`, '');
        if (project.description) lines.push(project.description, '');
        lines.push('---', '');
      }

      for (const chapter of chapters) {
        if (options.format === 'markdown') {
          lines.push(`## ${chapter.title}`, '');
        } else {
          lines.push(chapter.title.toUpperCase(), '');
        }

        try {
          const doc = JSON.parse(chapter.content);
          const text = extractText(doc);
          lines.push(text, '');
        } catch {
          lines.push('(empty)', '');
        }

        if (options.format === 'markdown') lines.push('---', '');
      }

      const ext = options.format === 'markdown' ? 'md' : 'txt';
      const { filePath, canceled } = await dialog.showSaveDialog({
        title: 'Export Project',
        defaultPath: `${project.name}.${ext}`,
        filters: [
          { name: options.format === 'markdown' ? 'Markdown' : 'Text', extensions: [ext] },
        ],
      });

      if (canceled || !filePath) return { success: false };

      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      return { success: true, filePath };
    },
  );

  // ── Sessions ────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.START_SESSION, (_event, projectId: string, startWordCount: number) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO writer_sessions (id, project_id, started_at, start_word_count, end_word_count) VALUES (?, ?, ?, ?, ?)'
    ).run(id, projectId, now, startWordCount, startWordCount);
    return mapSession(db.prepare('SELECT * FROM writer_sessions WHERE id = ?').get(id));
  });

  ipcMain.handle(
    IPC_CHANNELS.END_SESSION,
    (_event, sessionId: string, endWordCount: number, wordsAdded: number, aiWordsAccepted: number, aiOpsCount: number) => {
      const session = db.prepare('SELECT * FROM writer_sessions WHERE id = ?').get(sessionId) as any;
      if (!session) return null;
      const now = new Date().toISOString();
      const startTime = new Date(session.started_at).getTime();
      const duration = Math.floor((Date.now() - startTime) / 1000);
      db.prepare(
        'UPDATE writer_sessions SET ended_at = ?, duration_seconds = ?, end_word_count = ?, words_added = ?, ai_words_accepted = ?, ai_ops_count = ? WHERE id = ?'
      ).run(now, duration, endWordCount, wordsAdded, aiWordsAccepted, aiOpsCount, sessionId);

      // Update goal streaks
      updateGoalStreaks(db, session.project_id);

      return mapSession(db.prepare('SELECT * FROM writer_sessions WHERE id = ?').get(sessionId));
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_SESSION,
    (_event, sessionId: string, durationSeconds: number, endWordCount: number, wordsAdded: number, aiWordsAccepted: number, aiOpsCount: number) => {
      db.prepare(
        'UPDATE writer_sessions SET duration_seconds = ?, end_word_count = ?, words_added = ?, ai_words_accepted = ?, ai_ops_count = ? WHERE id = ?'
      ).run(durationSeconds, endWordCount, wordsAdded, aiWordsAccepted, aiOpsCount, sessionId);
    }
  );

  ipcMain.handle(IPC_CHANNELS.GET_SESSIONS, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_sessions WHERE project_id = ? ORDER BY started_at DESC LIMIT 20')
      .all(projectId)
      .map(mapSession);
  });

  ipcMain.handle(IPC_CHANNELS.GET_SESSION_STATS, (_event, projectId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = today + 'T00:00:00.000Z';
    const todayEnd = today + 'T23:59:59.999Z';

    // Words today
    const todayResult = db.prepare(
      'SELECT COALESCE(SUM(words_added), 0) as total FROM writer_sessions WHERE project_id = ? AND started_at >= ? AND started_at <= ?'
    ).get(projectId, todayStart, todayEnd) as any;

    // Words this week (last 7 days)
    const weekStart = new Date(Date.now() - 7 * 86400000).toISOString();
    const weekResult = db.prepare(
      'SELECT COALESCE(SUM(words_added), 0) as total FROM writer_sessions WHERE project_id = ? AND started_at >= ?'
    ).get(projectId, weekStart) as any;

    // Average session minutes & total sessions
    const avgResult = db.prepare(
      'SELECT COUNT(*) as total, COALESCE(AVG(duration_seconds), 0) as avg_dur FROM writer_sessions WHERE project_id = ? AND ended_at IS NOT NULL'
    ).get(projectId) as any;

    // Most productive hour
    const hourResult = db.prepare(
      "SELECT CAST(strftime('%H', started_at) AS INTEGER) as hour, SUM(words_added) as total FROM writer_sessions WHERE project_id = ? AND ended_at IS NOT NULL GROUP BY hour ORDER BY total DESC LIMIT 1"
    ).get(projectId) as any;

    return {
      todayWords: todayResult?.total || 0,
      weekWords: weekResult?.total || 0,
      avgSessionMinutes: Math.round((avgResult?.avg_dur || 0) / 60),
      totalSessions: avgResult?.total || 0,
      mostProductiveHour: hourResult?.hour ?? null,
    };
  });

  // ── Goals ──────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_GOALS, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_goals WHERE project_id = ? ORDER BY created_at ASC')
      .all(projectId)
      .map(mapGoal);
  });

  ipcMain.handle(IPC_CHANNELS.SET_GOAL, (_event, projectId: string, goalType: string, targetWords: number) => {
    const now = new Date().toISOString();
    // Upsert: one goal per type per project
    const existing = db.prepare('SELECT id FROM writer_goals WHERE project_id = ? AND goal_type = ?').get(projectId, goalType) as any;
    if (existing) {
      db.prepare('UPDATE writer_goals SET target_words = ?, updated_at = ? WHERE id = ?').run(targetWords, now, existing.id);
      return mapGoal(db.prepare('SELECT * FROM writer_goals WHERE id = ?').get(existing.id));
    } else {
      const id = uuidv4();
      db.prepare(
        'INSERT INTO writer_goals (id, project_id, goal_type, target_words, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, projectId, goalType, targetWords, now, now);
      return mapGoal(db.prepare('SELECT * FROM writer_goals WHERE id = ?').get(id));
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_GOAL, (_event, goalId: string) => {
    db.prepare('DELETE FROM writer_goals WHERE id = ?').run(goalId);
  });

  // ── Discovery Mode ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.START_DISCOVERY, (_event, projectId: string, chapterId?: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO writer_discovery_sessions (id, project_id, chapter_id, started_at, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, projectId, chapterId || null, now, now);
    return mapDiscoverySession(db.prepare('SELECT * FROM writer_discovery_sessions WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.END_DISCOVERY, (_event, sessionId: string) => {
    const now = new Date().toISOString();
    // Compute final stats
    const genCount = db.prepare(
      'SELECT COUNT(*) as c FROM writer_discovery_suggestions WHERE session_id = ?'
    ).get(sessionId) as any;
    const accCount = db.prepare(
      'SELECT COUNT(*) as c FROM writer_discovery_suggestions WHERE session_id = ? AND accepted = 1'
    ).get(sessionId) as any;
    db.prepare(
      'UPDATE writer_discovery_sessions SET ended_at = ?, suggestions_generated = ?, suggestions_accepted = ? WHERE id = ?'
    ).run(now, genCount?.c || 0, accCount?.c || 0, sessionId);
    return mapDiscoverySession(db.prepare('SELECT * FROM writer_discovery_sessions WHERE id = ?').get(sessionId));
  });

  ipcMain.handle(IPC_CHANNELS.GET_DISCOVERY_SESSIONS, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_discovery_sessions WHERE project_id = ? ORDER BY started_at DESC LIMIT 20')
      .all(projectId)
      .map(mapDiscoverySession);
  });

  ipcMain.handle(
    IPC_CHANNELS.GENERATE_SUGGESTIONS,
    async (_event, sessionId: string, chapterContent: string, encyclopediaContext: string, followThread?: string, temperature?: number) => {
      const session = db.prepare('SELECT * FROM writer_discovery_sessions WHERE id = ?').get(sessionId) as any;
      if (!session) throw new Error('Discovery session not found');

      const settings = loadSettings();
      const modelId = settings.selectedModel;
      const apiKeys = loadApiKeys();
      const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
      const apiKey = apiKeys[modelConfig.provider];
      if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

      const prompt = `You are a creative writing partner in Discovery Mode. Based on the current story context, generate exactly 3 "what if" suggestions — surprising, creative possibilities for what could happen next.

Each suggestion should:
- Start with "What if..."
- Be 2-3 sentences
- Be specific and actionable (not vague)
- Push the story in an unexpected direction

${followThread ? `The writer wants suggestions along this direction: "${followThread}"` : ''}

Current chapter content:
${chapterContent}

${encyclopediaContext ? `Encyclopedia context:\n${encyclopediaContext}` : ''}

Respond with exactly 3 suggestions, separated by "---":`;

      let fullContent = '';
      const result = await aiService.streamCompletion(
        prompt,
        modelId,
        undefined,
        apiKey,
        undefined,
        (delta) => { fullContent += delta; },
        temperature,
      );

      // Parse the 3 suggestions from the response
      const rawSuggestions = result.content.split('---').map((s) => s.trim()).filter(Boolean);
      const suggestions: any[] = [];
      for (const text of rawSuggestions.slice(0, 3)) {
        const sugId = uuidv4();
        const now = new Date().toISOString();
        db.prepare(
          'INSERT INTO writer_discovery_suggestions (id, session_id, suggestion_text, suggestion_type, created_at) VALUES (?, ?, ?, ?, ?)'
        ).run(sugId, sessionId, text, 'what_if', now);
        suggestions.push(mapDiscoverySuggestion(db.prepare('SELECT * FROM writer_discovery_suggestions WHERE id = ?').get(sugId)));
      }

      // Update generated count
      const genCount = db.prepare(
        'SELECT COUNT(*) as c FROM writer_discovery_suggestions WHERE session_id = ?'
      ).get(sessionId) as any;
      db.prepare('UPDATE writer_discovery_sessions SET suggestions_generated = ? WHERE id = ?').run(genCount?.c || 0, sessionId);

      return suggestions;
    }
  );

  ipcMain.handle(IPC_CHANNELS.ACCEPT_SUGGESTION, (_event, suggestionId: string) => {
    db.prepare('UPDATE writer_discovery_suggestions SET accepted = 1 WHERE id = ?').run(suggestionId);
    // Increment session accepted count
    const suggestion = db.prepare('SELECT session_id FROM writer_discovery_suggestions WHERE id = ?').get(suggestionId) as any;
    if (suggestion) {
      const accCount = db.prepare(
        'SELECT COUNT(*) as c FROM writer_discovery_suggestions WHERE session_id = ? AND accepted = 1'
      ).get(suggestion.session_id) as any;
      db.prepare('UPDATE writer_discovery_sessions SET suggestions_accepted = ? WHERE id = ?').run(accCount?.c || 0, suggestion.session_id);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SET_FOLLOW_THREAD, (_event, sessionId: string, followThread: string) => {
    db.prepare('UPDATE writer_discovery_sessions SET follow_thread = ? WHERE id = ?').run(followThread, sessionId);
  });

  ipcMain.handle(IPC_CHANNELS.CONVERT_DISCOVERY, (_event, sessionId: string) => {
    const accepted = db.prepare(
      'SELECT suggestion_text FROM writer_discovery_suggestions WHERE session_id = ? AND accepted = 1 ORDER BY created_at ASC'
    ).all(sessionId) as any[];
    return { suggestions: accepted.map((r: any) => r.suggestion_text) };
  });

  // ── Continuity — Plants ──────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_PLANTS, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_continuity_plants WHERE project_id = ? ORDER BY created_at')
      .all(projectId)
      .map(mapPlant);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_PLANT, (_event, projectId: string, plant: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO writer_continuity_plants (id, project_id, name, setup_chapter_id, setup_content, payoff_chapter_id, payoff_content, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, plant.name, plant.setupChapterId || null, plant.setupContent || '', plant.payoffChapterId || null, plant.payoffContent || null, plant.status || 'planned', plant.notes || '', now, now);
    return mapPlant(db.prepare('SELECT * FROM writer_continuity_plants WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PLANT, (_event, id: string, updates: any) => {
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
    if (updates.setupChapterId !== undefined) { fields.push('setup_chapter_id = ?'); params.push(updates.setupChapterId); }
    if (updates.setupContent !== undefined) { fields.push('setup_content = ?'); params.push(updates.setupContent); }
    if (updates.payoffChapterId !== undefined) { fields.push('payoff_chapter_id = ?'); params.push(updates.payoffChapterId); }
    if (updates.payoffContent !== undefined) { fields.push('payoff_content = ?'); params.push(updates.payoffContent); }
    if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
    if (updates.notes !== undefined) { fields.push('notes = ?'); params.push(updates.notes); }
    if (fields.length === 0) return mapPlant(db.prepare('SELECT * FROM writer_continuity_plants WHERE id = ?').get(id));
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    db.prepare(`UPDATE writer_continuity_plants SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return mapPlant(db.prepare('SELECT * FROM writer_continuity_plants WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PLANT, (_event, id: string) => {
    db.prepare('DELETE FROM writer_continuity_plants WHERE id = ?').run(id);
  });

  // ── Continuity — Threads ────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_THREADS, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_continuity_threads WHERE project_id = ? ORDER BY created_at')
      .all(projectId)
      .map(mapThread);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_THREAD, (_event, projectId: string, thread: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO writer_continuity_threads (id, project_id, question, raised_chapter_id, target_chapter_id, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, thread.question, thread.raisedChapterId || null, thread.targetChapterId || null, thread.status || 'open', thread.notes || '', now, now);
    return mapThread(db.prepare('SELECT * FROM writer_continuity_threads WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_THREAD, (_event, id: string, updates: any) => {
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.question !== undefined) { fields.push('question = ?'); params.push(updates.question); }
    if (updates.raisedChapterId !== undefined) { fields.push('raised_chapter_id = ?'); params.push(updates.raisedChapterId); }
    if (updates.targetChapterId !== undefined) { fields.push('target_chapter_id = ?'); params.push(updates.targetChapterId); }
    if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
    if (updates.notes !== undefined) { fields.push('notes = ?'); params.push(updates.notes); }
    if (fields.length === 0) return mapThread(db.prepare('SELECT * FROM writer_continuity_threads WHERE id = ?').get(id));
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    db.prepare(`UPDATE writer_continuity_threads SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return mapThread(db.prepare('SELECT * FROM writer_continuity_threads WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_THREAD, (_event, id: string) => {
    db.prepare('DELETE FROM writer_continuity_threads WHERE id = ?').run(id);
  });

  // ── Continuity — Character Knowledge ────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_CHARACTER_KNOWLEDGE, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_character_knowledge WHERE project_id = ? ORDER BY created_at')
      .all(projectId)
      .map(mapCharacterKnowledge);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_CHARACTER_KNOWLEDGE, (_event, projectId: string, entry: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO writer_character_knowledge (id, project_id, character_id, chapter_id, knows, does_not_know, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, entry.characterId, entry.chapterId, entry.knows || '', entry.doesNotKnow || '', now, now);
    return mapCharacterKnowledge(db.prepare('SELECT * FROM writer_character_knowledge WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_CHARACTER_KNOWLEDGE, (_event, id: string, updates: any) => {
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.knows !== undefined) { fields.push('knows = ?'); params.push(updates.knows); }
    if (updates.doesNotKnow !== undefined) { fields.push('does_not_know = ?'); params.push(updates.doesNotKnow); }
    if (fields.length === 0) return mapCharacterKnowledge(db.prepare('SELECT * FROM writer_character_knowledge WHERE id = ?').get(id));
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    db.prepare(`UPDATE writer_character_knowledge SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return mapCharacterKnowledge(db.prepare('SELECT * FROM writer_character_knowledge WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CHARACTER_KNOWLEDGE, (_event, id: string) => {
    db.prepare('DELETE FROM writer_character_knowledge WHERE id = ?').run(id);
  });

  // ── Continuity — AI Scans ──────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SCAN_FOR_PLANTS, async (_event, projectId: string) => {
    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    // Gather all chapter content
    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC').all(projectId) as any[];
    const manuscriptParts: string[] = [];
    for (const ch of chapters) {
      let text = '';
      try {
        const doc = JSON.parse(ch.content);
        text = extractText(doc);
      } catch { /* empty chapter */ }
      manuscriptParts.push(`=== ${ch.title} (ID: ${ch.id}) ===\n${text}`);
    }
    const manuscript = manuscriptParts.join('\n\n');

    const prompt = `Analyze this manuscript and identify foreshadowing/setup moments that could be tracked as "plants" (setup/payoff pairs). For each, provide: name, the chapter title where it's set up, a brief quote of the setup content, and whether it appears to have been resolved (paid off) later.

Respond ONLY with a JSON array in this exact format:
[
  {
    "name": "Short descriptive name",
    "setupChapter": "Chapter title where setup occurs",
    "setupContent": "Brief quote or description of the setup",
    "resolved": false
  }
]

If no plants are found, respond with an empty array: []

Manuscript:
${manuscript}`;

    try {
      const result = await aiService.streamCompletion(
        prompt, modelId, undefined, apiKey, undefined,
        () => {}, // no streaming needed
      );
      // Extract JSON from response
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      return [{ error: error instanceof Error ? error.message : String(error) }];
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCAN_FOR_THREADS, async (_event, projectId: string) => {
    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC').all(projectId) as any[];
    const manuscriptParts: string[] = [];
    for (const ch of chapters) {
      let text = '';
      try {
        const doc = JSON.parse(ch.content);
        text = extractText(doc);
      } catch { /* empty chapter */ }
      manuscriptParts.push(`=== ${ch.title} (ID: ${ch.id}) ===\n${text}`);
    }
    const manuscript = manuscriptParts.join('\n\n');

    const prompt = `Analyze this manuscript and identify unresolved plot questions and open threads — things raised in the story that haven't been answered or resolved yet.

Respond ONLY with a JSON array in this exact format:
[
  {
    "question": "The unresolved question or thread",
    "raisedChapter": "Chapter title where this question was raised",
    "status": "open"
  }
]

If no threads are found, respond with an empty array: []

Manuscript:
${manuscript}`;

    try {
      const result = await aiService.streamCompletion(
        prompt, modelId, undefined, apiKey, undefined,
        () => {},
      );
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      return [{ error: error instanceof Error ? error.message : String(error) }];
    }
  });

  ipcMain.handle(IPC_CHANNELS.VERIFY_KNOWLEDGE, async (_event, projectId: string, characterId: string) => {
    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    // Get character info
    const character = db.prepare('SELECT * FROM encyclopedia_entries WHERE id = ?').get(characterId) as any;
    if (!character) throw new Error('Character not found');

    // Get knowledge entries for this character
    const knowledgeEntries = db.prepare(
      'SELECT wck.*, c.title as chapter_title FROM writer_character_knowledge wck JOIN chapters c ON wck.chapter_id = c.id WHERE wck.character_id = ? ORDER BY c.sort_order ASC'
    ).all(characterId) as any[];

    // Get all chapter content
    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC').all(projectId) as any[];
    const manuscriptParts: string[] = [];
    for (const ch of chapters) {
      let text = '';
      try {
        const doc = JSON.parse(ch.content);
        text = extractText(doc);
      } catch { /* empty chapter */ }
      manuscriptParts.push(`=== ${ch.title} ===\n${text}`);
    }
    const manuscript = manuscriptParts.join('\n\n');

    // Build knowledge summary
    const knowledgeSummary = knowledgeEntries.map((k: any) =>
      `Chapter "${k.chapter_title}":\n  Knows: ${k.knows || '(nothing specified)'}\n  Does not know: ${k.does_not_know || '(nothing specified)'}`
    ).join('\n\n');

    const prompt = `Verify the consistency of character knowledge for "${character.name}" in this manuscript.

Character Knowledge States:
${knowledgeSummary || '(No knowledge entries recorded yet)'}

Manuscript:
${manuscript}

Check whether ${character.name}'s actions and dialogue in each chapter are consistent with what they know and don't know at that point. Flag any violations where the character acts on information they shouldn't have yet, or ignores information they should know.

Respond ONLY with a JSON array in this exact format:
[
  {
    "chapter": "Chapter title",
    "issue": "Description of the inconsistency",
    "severity": "warning" or "error"
  }
]

If no issues are found, respond with an empty array: []`;

    try {
      const result = await aiService.streamCompletion(
        prompt, modelId, undefined, apiKey, undefined,
        () => {},
      );
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      return [{ error: error instanceof Error ? error.message : String(error) }];
    }
  });

  // ── Knowledge Base ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_KB_ENTRIES, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_kb WHERE project_id = ? OR is_global = 1 ORDER BY category, title')
      .all(projectId)
      .map(mapKbEntry);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_KB_ENTRY, (_event, entry: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const tokens = Math.ceil((entry.content || '').length / 4);
    const projectId = entry.isGlobal ? null : (entry.projectId || null);
    db.prepare(
      'INSERT INTO writer_kb (id, project_id, title, category, content, tokens, is_global, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, entry.title, entry.category || 'Ideas', entry.content || '', tokens, entry.isGlobal ? 1 : 0, now, now);
    return mapKbEntry(db.prepare('SELECT * FROM writer_kb WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_KB_ENTRY, (_event, id: string, updates: any) => {
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.title !== undefined) { fields.push('title = ?'); params.push(updates.title); }
    if (updates.category !== undefined) { fields.push('category = ?'); params.push(updates.category); }
    if (updates.content !== undefined) {
      fields.push('content = ?'); params.push(updates.content);
      fields.push('tokens = ?'); params.push(Math.ceil(updates.content.length / 4));
    }
    if (updates.isGlobal !== undefined) {
      fields.push('is_global = ?'); params.push(updates.isGlobal ? 1 : 0);
      if (updates.isGlobal) {
        fields.push('project_id = ?'); params.push(null);
      }
    }
    if (fields.length === 0) return mapKbEntry(db.prepare('SELECT * FROM writer_kb WHERE id = ?').get(id));
    fields.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    db.prepare(`UPDATE writer_kb SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return mapKbEntry(db.prepare('SELECT * FROM writer_kb WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_KB_ENTRY, (_event, id: string) => {
    db.prepare('DELETE FROM writer_kb WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH_KB, (_event, projectId: string, query: string) => {
    const pattern = `%${query}%`;
    return db
      .prepare('SELECT * FROM writer_kb WHERE (project_id = ? OR is_global = 1) AND (title LIKE ? OR content LIKE ?) ORDER BY category, title')
      .all(projectId, pattern, pattern)
      .map(mapKbEntry);
  });

  ipcMain.handle(IPC_CHANNELS.KB_ANALYZE_VOICE, async (_event, entryId: string) => {
    const entry = db.prepare('SELECT * FROM writer_kb WHERE id = ?').get(entryId) as any;
    if (!entry) throw new Error('KB entry not found');

    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    const prompt = `Analyze this writing sample and produce a detailed voice profile: tone, sentence structure, vocabulary level, pacing, POV tendencies, strengths, and distinctive patterns.

Writing sample:
${entry.content}`;

    const result = await aiService.streamCompletion(
      prompt, modelId, undefined, apiKey, undefined,
      () => {},
    );
    return result.content;
  });

  ipcMain.handle(IPC_CHANNELS.KB_FIND_CONNECTIONS, async (_event, projectId: string) => {
    const entries = db
      .prepare('SELECT * FROM writer_kb WHERE project_id = ? OR is_global = 1 ORDER BY category, title')
      .all(projectId)
      .map(mapKbEntry);

    if (entries.length < 2) return [];

    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    const entrySummaries = entries.map((e: any) =>
      `[${e.category}: ${e.title}]\n${e.content}`
    ).join('\n\n---\n\n');

    const prompt = `Analyze these knowledge base entries and identify connections, themes, and potential synergies between them.

Respond ONLY with a JSON array in this exact format:
[
  {
    "title": "Short connection name",
    "entries": ["Entry title 1", "Entry title 2"],
    "description": "How these entries connect and could synergize"
  }
]

If no connections found, respond with an empty array: []

Knowledge Base Entries:
${entrySummaries}`;

    try {
      const result = await aiService.streamCompletion(
        prompt, modelId, undefined, apiKey, undefined,
        () => {},
      );
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return [];
    } catch (error) {
      return [{ error: error instanceof Error ? error.message : String(error) }];
    }
  });

  ipcMain.handle(IPC_CHANNELS.KB_SUGGEST_GAPS, async (_event, projectId: string) => {
    const kbEntries = db
      .prepare('SELECT * FROM writer_kb WHERE project_id = ? OR is_global = 1 ORDER BY category, title')
      .all(projectId)
      .map(mapKbEntry);

    const encyclopediaEntries = db
      .prepare('SELECT * FROM encyclopedia_entries WHERE project_id = ? ORDER BY category, name')
      .all(projectId)
      .map(mapEncyclopediaEntry);

    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    const kbSummaries = kbEntries.map((e: any) =>
      `[KB - ${e.category}: ${e.title}]\n${e.content}`
    ).join('\n\n---\n\n');

    const encSummaries = encyclopediaEntries.map((e: any) =>
      `[Encyclopedia - ${e.category}: ${e.name}]\n${e.content}`
    ).join('\n\n---\n\n');

    const prompt = `Given these knowledge base and encyclopedia entries, identify what's missing — gaps in world-building, underdeveloped ideas, research needs.

Respond ONLY with a JSON array in this exact format:
[
  {
    "title": "Short gap name",
    "category": "Suggested category (Ideas/Stories/Frameworks/Voice Profile/Research)",
    "description": "What's missing and why it matters"
  }
]

If no gaps found, respond with an empty array: []

${kbSummaries ? `Knowledge Base Entries:\n${kbSummaries}\n\n` : ''}${encSummaries ? `Encyclopedia Entries:\n${encSummaries}` : ''}`;

    try {
      const result = await aiService.streamCompletion(
        prompt, modelId, undefined, apiKey, undefined,
        () => {},
      );
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return [];
    } catch (error) {
      return [{ error: error instanceof Error ? error.message : String(error) }];
    }
  });

  // ── Pipelines ────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_PIPELINES, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_pipelines WHERE project_id = ? OR is_preset = 1 ORDER BY is_preset DESC, name ASC')
      .all(projectId)
      .map(mapPipeline);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_PIPELINE, (_event, projectId: string, pipeline: { name: string; description: string; steps: any[] }) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO writer_pipelines (id, project_id, name, description, steps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(id, projectId, pipeline.name, pipeline.description, JSON.stringify(pipeline.steps), now, now);
    return mapPipeline(
      db.prepare('SELECT * FROM writer_pipelines WHERE id = ?').get(id),
    );
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PIPELINE, (_event, id: string, updates: { name?: string; description?: string; steps?: any[] }) => {
    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const values: any[] = [now];
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.steps !== undefined) { fields.push('steps = ?'); values.push(JSON.stringify(updates.steps)); }
    values.push(id);
    db.prepare(`UPDATE writer_pipelines SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return mapPipeline(
      db.prepare('SELECT * FROM writer_pipelines WHERE id = ?').get(id),
    );
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PIPELINE, (_event, id: string) => {
    db.prepare('DELETE FROM writer_pipelines WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.RUN_PIPELINE, async (_event, pipelineId: string, inputText: string) => {
    const pipeline = db.prepare('SELECT * FROM writer_pipelines WHERE id = ?').get(pipelineId) as any;
    if (!pipeline) throw new Error('Pipeline not found');

    const steps = JSON.parse(pipeline.steps || '[]');
    if (steps.length === 0) throw new Error('Pipeline has no steps');

    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    const results: any[] = [];
    let currentText = inputText;

    for (const step of steps) {
      // Replace {{input}} with current text
      const prompt = step.prompt.replace(/\{\{input\}\}/g, currentText);
      try {
        const result = await aiService.streamCompletion(
          prompt, modelId, undefined, apiKey, undefined,
          () => {},
        );
        results.push({
          stepLabel: step.label,
          content: result.content,
          tokens: result.totalTokens,
        });
        currentText = result.content; // feed output to next step
      } catch (error) {
        results.push({
          stepLabel: step.label,
          content: '',
          tokens: 0,
          error: error instanceof Error ? error.message : String(error),
        });
        break; // stop pipeline on error
      }
    }

    return results;
  });

  // ── Brain Dumps ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_BRAIN_DUMPS, (_event, projectId: string) => {
    return db
      .prepare('SELECT * FROM writer_brain_dumps WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId)
      .map(mapBrainDump);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_BRAIN_DUMP, (_event, projectId: string, content: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      'INSERT INTO writer_brain_dumps (id, project_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, projectId, content, now, now);
    return mapBrainDump(
      db.prepare('SELECT * FROM writer_brain_dumps WHERE id = ?').get(id),
    );
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_BRAIN_DUMP, (_event, id: string, content: string) => {
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE writer_brain_dumps SET content = ?, updated_at = ? WHERE id = ?',
    ).run(content, now, id);
    return mapBrainDump(
      db.prepare('SELECT * FROM writer_brain_dumps WHERE id = ?').get(id),
    );
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_BRAIN_DUMP, (_event, id: string) => {
    db.prepare('DELETE FROM writer_brain_dumps WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.EXTRACT_BRAIN_DUMP, async (_event, id: string) => {
    const dump = db.prepare('SELECT * FROM writer_brain_dumps WHERE id = ?').get(id) as any;
    if (!dump) throw new Error('Brain dump not found');

    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    const prompt = `Analyze this brain dump and extract structured content from it. The brain dump is raw, unformatted writing — stream of consciousness notes, ideas, and thoughts.

Extract the following categories:
1. **Ideas**: Creative ideas or concepts worth developing
2. **Encyclopedia Entries**: Characters, locations, items, or lore that should be tracked
3. **Outline Beats**: Story beats or plot points that could go in a chapter outline
4. **Questions**: Open questions or things to research/decide

Respond ONLY with JSON in this exact format:
{
  "ideas": ["idea 1", "idea 2"],
  "encyclopediaEntries": [
    {"name": "Character Name", "category": "Character", "content": "Description..."},
    {"name": "Location Name", "category": "Location", "content": "Description..."}
  ],
  "outlineBeats": ["beat 1", "beat 2"],
  "questions": ["question 1", "question 2"]
}

Brain dump content:
${dump.content}`;

    try {
      const result = await aiService.streamCompletion(
        prompt, modelId, undefined, apiKey, undefined,
        () => {},
      );
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Mark as extracted
        db.prepare('UPDATE writer_brain_dumps SET extracted = 1, updated_at = ? WHERE id = ?')
          .run(new Date().toISOString(), id);
        return {
          ideas: parsed.ideas || [],
          encyclopediaEntries: parsed.encyclopediaEntries || [],
          outlineBeats: parsed.outlineBeats || [],
          questions: parsed.questions || [],
        };
      }
      return { ideas: [], encyclopediaEntries: [], outlineBeats: [], questions: [] };
    } catch (error) {
      throw new Error(`Extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // ── Analysis ──────────────────────────────────────────────────────────────

  // Helper: get all chapter text for a project or single chapter
  function getChapterTexts(projectId: string, chapterId?: string): { title: string; text: string }[] {
    const rows = chapterId
      ? [db.prepare('SELECT * FROM chapters WHERE id = ?').get(chapterId)].filter(Boolean) as any[]
      : db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC').all(projectId) as any[];
    return rows.map((ch: any) => {
      try {
        const doc = JSON.parse(ch.content);
        return { title: ch.title, text: extractText(doc) };
      } catch {
        return { title: ch.title, text: '' };
      }
    });
  }

  // Helper: compute readability metrics locally (no AI)
  function computeReadability(text: string) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    const avgWordLength = words.length > 0 ? words.reduce((s, w) => s + w.length, 0) / words.length : 0;
    const avgSyllablesPerWord = words.length > 0 ? totalSyllables / words.length : 0;

    // Flesch-Kincaid Grade Level
    const fk = sentences.length > 0
      ? 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59
      : 0;

    // Dialogue percentage (lines containing quotes)
    const dialogueLines = text.split('\n').filter(l => /["'\u201C\u201D\u2018\u2019]/.test(l));
    const totalLines = text.split('\n').filter(l => l.trim().length > 0);
    const dialoguePercentage = totalLines.length > 0
      ? Math.round((dialogueLines.length / totalLines.length) * 100)
      : 0;

    // Sentence lengths for variation analysis
    const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).filter(w => w.length > 0).length);

    // Overused words (excluding common stop words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'were', 'are', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'he', 'she', 'they', 'we', 'you', 'me', 'him', 'her', 'us', 'them', 'my', 'his', 'her', 'our', 'their', 'your', 'not', 'no', 'as', 'if', 'so', 'than', 'then', 'up', 'out', 'about', 'just', 'into', 'through', 'after', 'before', 'between', 'each', 'all', 'both', 'more', 'other', 'some', 'such', 'only', 'over', 'also', 'back', 'there', 'when', 'what', 'which', 'who', 'how']);
    const wordCounts: Record<string, number> = {};
    for (const w of words) {
      const lower = w.toLowerCase().replace(/[^a-z']/g, '');
      if (lower.length > 2 && !stopWords.has(lower)) {
        wordCounts[lower] = (wordCounts[lower] || 0) + 1;
      }
    }
    const expectedFreq = Math.max(1, words.length / 1000);
    const overusedWords = Object.entries(wordCounts)
      .filter(([, count]) => count >= expectedFreq * 3 && count >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    return {
      fleschKincaid: Math.round(fk * 10) / 10,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      paragraphCount: paragraphs.length,
      dialoguePercentage,
      overusedWords,
      sentenceLengths,
    };
  }

  function countSyllables(word: string): number {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 2) return 1;
    let count = 0;
    const vowels = 'aeiouy';
    let prevVowel = false;
    for (const ch of w) {
      const isVowel = vowels.includes(ch);
      if (isVowel && !prevVowel) count++;
      prevVowel = isVowel;
    }
    if (w.endsWith('e') && count > 1) count--;
    return Math.max(1, count);
  }

  ipcMain.handle(IPC_CHANNELS.GET_READABILITY, (_event, projectId: string, chapterId?: string) => {
    const chapterTexts = getChapterTexts(projectId, chapterId);
    const allText = chapterTexts.map(c => c.text).join('\n\n');
    return computeReadability(allText);
  });

  ipcMain.handle(IPC_CHANNELS.GET_OVERUSED_WORDS, (_event, projectId: string, chapterId?: string) => {
    const chapterTexts = getChapterTexts(projectId, chapterId);
    const allText = chapterTexts.map(c => c.text).join('\n\n');
    const result = computeReadability(allText);
    return result.overusedWords;
  });

  ipcMain.handle(IPC_CHANNELS.GET_ANALYSES, (_event, projectId: string) => {
    return db.prepare('SELECT * FROM writer_analyses WHERE project_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(projectId)
      .map(mapAnalysis);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_ANALYSIS, (_event, id: string) => {
    db.prepare('DELETE FROM writer_analyses WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.RUN_ANALYSIS, async (_event, projectId: string, type: string, chapterId?: string) => {
    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const model = AVAILABLE_MODELS.find((m: any) => m.id === modelId);
    if (!model) throw new Error('Model not found');
    const keys = loadApiKeys();
    const apiKey = keys[model.provider];
    if (!apiKey) throw new Error(`No API key for ${model.provider}`);

    const chapterTexts = getChapterTexts(projectId, chapterId);
    const manuscript = chapterTexts.map(c => `[${c.title}]\n${c.text}`).join('\n\n---\n\n');

    let prompt = '';
    if (type === 'pacing') {
      prompt = `Analyze the pacing of this manuscript. For each chapter, classify the content into these categories: action, dialogue, reflection, description. Return a JSON object with this exact structure:
{
  "chapters": [
    {
      "title": "Chapter Title",
      "segments": [
        { "type": "action", "percentage": 25 },
        { "type": "dialogue", "percentage": 30 },
        { "type": "reflection", "percentage": 20 },
        { "type": "description", "percentage": 25 }
      ]
    }
  ],
  "overall": "Brief 2-3 sentence assessment of pacing strengths and areas for improvement."
}

Manuscript:
${manuscript}`;
    } else if (type === 'voice_audit') {
      const entries = db.prepare("SELECT * FROM encyclopedia_entries WHERE project_id = ? AND category = 'Character'").all(projectId) as any[];
      const characterNames = entries.map((e: any) => e.name);
      prompt = `Analyze the dialogue in this manuscript. Compare how each character speaks. Identify characters who sound too similar — same vocabulary, sentence patterns, expressions. Characters to check: ${characterNames.join(', ') || '(identify from dialogue attribution)'}

Return a JSON array:
[
  {
    "character1": "Name1",
    "character2": "Name2",
    "similarity": 85,
    "examples": ["Both say 'I suppose' frequently", "Similar sentence length"],
    "suggestion": "Differentiate Name2 by using shorter, more direct sentences"
  }
]

If all characters have distinct voices, return an empty array [].

Manuscript:
${manuscript}`;
    } else if (type === 'consistency') {
      const entries = db.prepare('SELECT * FROM encyclopedia_entries WHERE project_id = ?').all(projectId) as any[];
      const encyclopediaText = entries.map((e: any) => `[${e.category}: ${e.name}]\n${e.content}`).join('\n---\n');
      prompt = `Compare the encyclopedia entries against the manuscript text. Find any contradictions — character descriptions that don't match, location details that changed, timeline conflicts, factual inconsistencies.

Return a JSON array:
[
  {
    "entry": "Character/Location name",
    "chapter": "Chapter where inconsistency found",
    "issue": "Description of the contradiction",
    "quote": "Relevant quote from the manuscript",
    "suggestion": "How to fix it"
  }
]

If no inconsistencies found, return an empty array [].

Encyclopedia:
${encyclopediaText}

Manuscript:
${manuscript}`;
    } else {
      throw new Error(`Unknown analysis type: ${type}`);
    }

    try {
      const result = await aiService.streamCompletion(
        prompt, modelId, undefined, apiKey, undefined,
        () => {},
      );
      const jsonMatch = result.content.match(/[\[{][\s\S]*[\]}]/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO writer_analyses (id, project_id, analysis_type, chapter_id, results, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, projectId, type, chapterId || null, JSON.stringify(parsed), now);

      return mapAnalysis(db.prepare('SELECT * FROM writer_analyses WHERE id = ?').get(id));
    } catch (error) {
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // ── Character Relationships ─────────────────────────────────────────────────

  function mapRelationship(row: any) {
    return {
      id: row.id,
      projectId: row.project_id,
      characterAId: row.character_a_id,
      characterBId: row.character_b_id,
      relationshipType: row.relationship_type,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  ipcMain.handle(IPC_CHANNELS.GET_RELATIONSHIPS, (_event, projectId: string) => {
    const rows = db.prepare('SELECT * FROM writer_character_relationships WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
    return rows.map(mapRelationship);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_RELATIONSHIP, (_event, projectId: string, rel: { characterAId: string; characterBId: string; relationshipType: string; description: string }) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO writer_character_relationships (id, project_id, character_a_id, character_b_id, relationship_type, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, projectId, rel.characterAId, rel.characterBId, rel.relationshipType, rel.description, now, now
    );
    return mapRelationship(db.prepare('SELECT * FROM writer_character_relationships WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_RELATIONSHIP, (_event, id: string, updates: { relationshipType?: string; description?: string }) => {
    const now = new Date().toISOString();
    if (updates.relationshipType !== undefined) {
      db.prepare('UPDATE writer_character_relationships SET relationship_type = ?, updated_at = ? WHERE id = ?').run(updates.relationshipType, now, id);
    }
    if (updates.description !== undefined) {
      db.prepare('UPDATE writer_character_relationships SET description = ?, updated_at = ? WHERE id = ?').run(updates.description, now, id);
    }
    return mapRelationship(db.prepare('SELECT * FROM writer_character_relationships WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_RELATIONSHIP, (_event, id: string) => {
    db.prepare('DELETE FROM writer_character_relationships WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.SCAN_RELATIONSHIPS, async (_event, projectId: string) => {
    const settings = loadSettings();
    const apiKeys = loadApiKeys();
    const model = AVAILABLE_MODELS.find(m => m.id === settings.selectedModel) || AVAILABLE_MODELS[0];
    const apiKey = apiKeys[model.provider];
    if (!apiKey) throw new Error(`No API key for ${model.provider}`);

    // Get all chapter texts
    const chapterRows = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC').all(projectId) as any[];
    let manuscriptText = '';
    for (const ch of chapterRows) {
      try {
        const doc = JSON.parse(ch.content);
        manuscriptText += `\n--- ${ch.title} ---\n${extractText(doc)}\n`;
      } catch {}
    }

    // Get encyclopedia characters
    const entries = db.prepare("SELECT * FROM encyclopedia_entries WHERE project_id = ? AND category = 'Character'").all(projectId) as any[];
    const characterNames = entries.map((e: any) => e.name).join(', ');

    // Get existing relationships to avoid duplicates
    const existingRels = db.prepare('SELECT * FROM writer_character_relationships WHERE project_id = ?').all(projectId) as any[];
    const existingPairs = existingRels.map((r: any) => `${r.character_a_id}:${r.character_b_id}`);

    const prompt = `Analyze this manuscript and identify character relationships.

Known characters: ${characterNames}

Manuscript text:
${manuscriptText.substring(0, 30000)}

For each pair of characters who interact or have a relationship, provide:
- characterAName (exact match from known characters list)
- characterBName (exact match from known characters list)
- relationshipType (one of: family, romantic, friend, rival, mentor, ally, enemy, colleague, acquaintance)
- description (1-2 sentence description of the relationship)

Return ONLY a JSON array: [{"characterAName":"...","characterBName":"...","relationshipType":"...","description":"..."}]`;

    let response = '';
    await aiService.streamCompletion(model.id, model.provider, apiKey, prompt, settings.systemPrompt || '', (text: string) => { response += text; });

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {}
    return [];
  });

  // ── Submission Package ─────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GENERATE_SUBMISSION_PACKAGE, async (_event, projectId: string) => {
    const settings = loadSettings();
    const apiKeys = loadApiKeys();
    const model = AVAILABLE_MODELS.find(m => m.id === settings.selectedModel) || AVAILABLE_MODELS[0];
    const apiKey = apiKeys[model.provider];
    if (!apiKey) throw new Error(`No API key for ${model.provider}`);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
    if (!project) throw new Error('Project not found');

    // Gather manuscript text
    const chapterRows = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC').all(projectId) as any[];
    let manuscriptText = '';
    let totalWords = 0;
    for (const ch of chapterRows) {
      try {
        const doc = JSON.parse(ch.content);
        const text = extractText(doc);
        manuscriptText += `\n--- ${ch.title} ---\n${text}\n`;
        totalWords += text.split(/\s+/).filter((w: string) => w).length;
      } catch {}
    }

    // Gather encyclopedia entries for context
    const entries = db.prepare('SELECT * FROM encyclopedia_entries WHERE project_id = ?').all(projectId) as any[];
    const encyclopediaContext = entries.map((e: any) => `[${e.category}: ${e.name}] ${e.content}`).join('\n\n');

    const prompt = `You are a publishing industry expert. Analyze this manuscript and generate a complete submission package.

PROJECT: "${project.name}"
${project.description ? `DESCRIPTION: ${project.description}` : ''}
WORD COUNT: ~${totalWords.toLocaleString()}
CHAPTERS: ${chapterRows.length}

ENCYCLOPEDIA/WORLD-BUILDING:
${encyclopediaContext.substring(0, 5000)}

MANUSCRIPT (first ~25,000 chars):
${manuscriptText.substring(0, 25000)}

Generate ALL of the following as a JSON object:

1. "logline" — One compelling sentence that captures the core of the story (under 50 words)

2. "synopsis" — A 1-page synopsis (~500 words) covering:
   - Main character(s) and their motivation
   - Central conflict
   - Key turning points
   - Resolution/ending (don't hold back — agents want to know the ending)

3. "queryLetter" — A professional query letter (~300 words) with:
   - Hook opening paragraph
   - Book pitch paragraph (genre, comp titles style, word count)
   - Brief author bio paragraph (placeholder: [Author Name])
   - Professional closing

4. "authorBio" — A 100-word author bio template with [placeholders] for personal details

Return ONLY valid JSON: {"logline":"...","synopsis":"...","queryLetter":"...","authorBio":"..."}`;

    let response = '';
    await aiService.streamCompletion(model.id, model.provider, apiKey, prompt, settings.systemPrompt || '', (text: string) => { response += text; });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          logline: parsed.logline || '',
          synopsis: parsed.synopsis || '',
          queryLetter: parsed.queryLetter || '',
          authorBio: parsed.authorBio || '',
        };
      }
    } catch {}

    return { logline: '', synopsis: response, queryLetter: '', authorBio: '' };
  });

  // ── Dashboard ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_WRITING_STATS, (_event, projectId: string) => {
    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC').all(projectId) as any[];
    const totalWords = chapters.reduce((sum: number, ch: any) => sum + (ch.word_count || 0), 0);
    const totalChapters = chapters.length;
    const avgWordsPerChapter = totalChapters > 0 ? Math.round(totalWords / totalChapters) : 0;

    let longestChapter = { title: 'N/A', words: 0 };
    let shortestChapter = { title: 'N/A', words: totalWords };
    for (const ch of chapters) {
      const wc = ch.word_count || 0;
      if (wc > longestChapter.words) longestChapter = { title: ch.title, words: wc };
      if (wc < shortestChapter.words || shortestChapter.title === 'N/A') shortestChapter = { title: ch.title, words: wc };
    }
    if (totalChapters === 0) shortestChapter = { title: 'N/A', words: 0 };

    const totalEncyclopediaEntries = (db.prepare('SELECT COUNT(*) as cnt FROM encyclopedia WHERE project_id = ?').get(projectId) as any)?.cnt || 0;

    const aiStats = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN accepted = 1 THEN 1 ELSE 0 END) as accepted FROM writer_ai_operations WHERE project_id = ?').get(projectId) as any;
    const totalAiOperations = aiStats?.total || 0;
    const aiAcceptRate = totalAiOperations > 0 ? Math.round(((aiStats?.accepted || 0) / totalAiOperations) * 100) : 0;

    const sessionRows = db.prepare('SELECT * FROM writer_sessions WHERE project_id = ? AND ended_at IS NOT NULL ORDER BY started_at ASC').all(projectId) as any[];
    const totalSessions = sessionRows.length;
    const totalWritingMinutes = Math.round(sessionRows.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0) / 60);
    const avgSessionMinutes = totalSessions > 0 ? Math.round(totalWritingMinutes / totalSessions) : 0;

    // Words per day (last 30 days)
    const wordsPerDay: { date: string; words: number }[] = [];
    for (const s of sessionRows) {
      const date = s.started_at.split('T')[0];
      const existing = wordsPerDay.find((d) => d.date === date);
      if (existing) {
        existing.words += s.words_added || 0;
      } else {
        wordsPerDay.push({ date, words: s.words_added || 0 });
      }
    }
    // Keep last 30 entries
    const recentDays = wordsPerDay.slice(-30);

    // Words by chapter
    const wordsByChapter = chapters.map((ch: any) => ({ title: ch.title, words: ch.word_count || 0 }));

    return {
      totalWords,
      totalChapters,
      avgWordsPerChapter,
      longestChapter,
      shortestChapter,
      totalEncyclopediaEntries,
      totalAiOperations,
      aiAcceptRate,
      totalSessions,
      totalWritingMinutes,
      avgSessionMinutes,
      wordsPerDay: recentDays,
      wordsByChapter,
    };
  });

  // ── Import ────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.IMPORT_FILES, async (_event, projectId: string) => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Files as Chapters',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'md', 'markdown', 'text'] },
      ],
    });

    if (canceled || !filePaths || filePaths.length === 0) return { imported: 0, chapters: [] };

    // Get current max sort_order
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as mx FROM chapters WHERE project_id = ?').get(projectId) as any)?.mx || 0;

    const importedChapters: string[] = [];
    const insertChapter = db.prepare(
      'INSERT INTO chapters (id, project_id, title, sort_order, content, word_count) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const path = require('path');
      const fileName = path.basename(filePath, path.extname(filePath));
      const rawText = fs.readFileSync(filePath, 'utf-8');

      // Convert plain text to TipTap JSON
      const paragraphs = rawText.split(/\n\n+/).filter((p: string) => p.trim());
      const tiptapDoc = {
        type: 'doc',
        content: paragraphs.map((p: string) => ({
          type: 'paragraph',
          content: [{ type: 'text', text: p.replace(/\n/g, ' ').trim() }],
        })),
      };

      const content = JSON.stringify(tiptapDoc);
      const wordCount = rawText.split(/\s+/).filter((w: string) => w.length > 0).length;
      const id = uuidv4();

      insertChapter.run(id, projectId, fileName, maxOrder + i + 1, content, wordCount);
      importedChapters.push(fileName);
    }

    return { imported: importedChapters.length, chapters: importedChapters };
  });

  // ── Cover Designer ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.EXPORT_COVER, async (_event, dataUrl: string, projectName: string) => {
    // dataUrl is a base64-encoded PNG from canvas.toDataURL()
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Cover Image',
      defaultPath: `${projectName} - Cover.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });

    if (canceled || !filePath) return { success: false };
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  });

  // ── Chapter Notes ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_CHAPTER_NOTES, (_event, chapterId: string) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM writer_chapter_notes WHERE chapter_id = ?').get(chapterId) as any;
    if (!row) return null;
    return {
      id: row.id,
      chapterId: row.chapter_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_CHAPTER_NOTE, (_event, chapterId: string, content: string) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = db.prepare('SELECT * FROM writer_chapter_notes WHERE chapter_id = ?').get(chapterId) as any;
    if (existing) {
      db.prepare('UPDATE writer_chapter_notes SET content = ?, updated_at = ? WHERE chapter_id = ?').run(content, now, chapterId);
      return { id: existing.id, chapterId, content, createdAt: existing.created_at, updatedAt: now };
    } else {
      const id = uuidv4();
      db.prepare('INSERT INTO writer_chapter_notes (id, chapter_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, chapterId, content, now, now);
      return { id, chapterId, content, createdAt: now, updatedAt: now };
    }
  });

  // ── Publishing Preset Validation ──────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.VALIDATE_PUBLISHING_PRESET, (_event, projectId: string, presetId: string) => {
    const db = getDatabase();
    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order').all(projectId) as any[];
    const totalWords = chapters.reduce((sum: number, ch: any) => sum + (ch.word_count || 0), 0);
    const chapterCount = chapters.length;

    const presets: Record<string, any> = {
      kdp: { name: 'Kindle Direct Publishing', platform: 'Amazon KDP', format: 'epub', requirements: { minWords: 2500, requiresToc: true, requiresTitlePage: true } },
      ingram: { name: 'IngramSpark', platform: 'IngramSpark', format: 'epub', requirements: { minWords: 5000, requiresToc: true, requiresTitlePage: true, requiresIsbn: true } },
      d2d: { name: 'Draft2Digital', platform: 'Draft2Digital', format: 'epub', requirements: { minWords: 2500, requiresToc: true } },
      smashwords: { name: 'Smashwords', platform: 'Smashwords', format: 'epub', requirements: { minWords: 5000, requiresToc: true, requiresTitlePage: true, maxWords: 500000 } },
      blog: { name: 'Blog Post', platform: 'Blog', format: 'html', requirements: { minWords: 300, maxWords: 10000 } },
    };

    const preset = presets[presetId];
    if (!preset) return { preset: presetId, passed: false, checks: [{ label: 'Preset', passed: false, detail: 'Unknown preset' }] };

    const checks: { label: string; passed: boolean; detail: string }[] = [];
    const req = preset.requirements;

    // Word count minimum
    if (req.minWords) {
      const passed = totalWords >= req.minWords;
      checks.push({ label: 'Minimum word count', passed, detail: passed ? `${totalWords} words (min ${req.minWords})` : `Only ${totalWords} words — need at least ${req.minWords}` });
    }

    // Word count maximum
    if (req.maxWords) {
      const passed = totalWords <= req.maxWords;
      checks.push({ label: 'Maximum word count', passed, detail: passed ? `${totalWords} words (max ${req.maxWords})` : `${totalWords} words exceeds max of ${req.maxWords}` });
    }

    // Chapter count
    const hasChapters = chapterCount > 0;
    checks.push({ label: 'Has chapters', passed: hasChapters, detail: hasChapters ? `${chapterCount} chapters` : 'No chapters found' });

    // TOC requirement
    if (req.requiresToc) {
      const passed = chapterCount >= 2;
      checks.push({ label: 'Table of contents', passed, detail: passed ? `${chapterCount} chapters for TOC` : 'Need at least 2 chapters for TOC' });
    }

    // Title page requirement
    if (req.requiresTitlePage) {
      checks.push({ label: 'Title page', passed: true, detail: 'Will be auto-generated on export' });
    }

    // ISBN requirement
    if (req.requiresIsbn) {
      checks.push({ label: 'ISBN required', passed: false, detail: 'ISBN required — add via publisher portal' });
    }

    // Empty chapters check
    const emptyChapters = chapters.filter((ch: any) => (ch.word_count || 0) === 0);
    const noEmpty = emptyChapters.length === 0;
    checks.push({ label: 'No empty chapters', passed: noEmpty, detail: noEmpty ? 'All chapters have content' : `${emptyChapters.length} empty chapter(s) found` });

    const allPassed = checks.every(c => c.passed);
    return { preset: preset.name, passed: allPassed, checks };
  });

  // ── Tracked Changes ────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_TRACKED_CHANGES, (_event, chapterId: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM writer_tracked_changes WHERE chapter_id = ? ORDER BY created_at DESC').all(chapterId) as any[];
    return rows.map((r: any) => ({
      id: r.id, chapterId: r.chapter_id, changeType: r.change_type,
      fromPos: r.from_pos, toPos: r.to_pos, oldText: r.old_text, newText: r.new_text,
      author: r.author, createdAt: r.created_at,
    }));
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_TRACKED_CHANGE, (_event, change: any) => {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO writer_tracked_changes (id, chapter_id, change_type, from_pos, to_pos, old_text, new_text, author, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, change.chapterId, change.changeType, change.fromPos, change.toPos, change.oldText, change.newText, change.author, now
    );
    const row = db.prepare('SELECT * FROM writer_tracked_changes WHERE id = ?').get(id) as any;
    return { id: row.id, chapterId: row.chapter_id, changeType: row.change_type, fromPos: row.from_pos, toPos: row.to_pos, oldText: row.old_text, newText: row.new_text, author: row.author, createdAt: row.created_at };
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_TRACKED_CHANGE, (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM writer_tracked_changes WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.CLEAR_TRACKED_CHANGES, (_event, chapterId: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM writer_tracked_changes WHERE chapter_id = ?').run(chapterId);
  });

  // ── Writing Sprints ───────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.START_SPRINT, (_event, projectId: string, durationSeconds: number, targetWords: number) => {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO writer_sprints (id, project_id, duration_seconds, target_words, words_written, started_at) VALUES (?, ?, ?, ?, 0, ?)').run(id, projectId, durationSeconds, targetWords, now);
    const row = db.prepare('SELECT * FROM writer_sprints WHERE id = ?').get(id) as any;
    return { id: row.id, projectId: row.project_id, durationSeconds: row.duration_seconds, targetWords: row.target_words, wordsWritten: row.words_written, startedAt: row.started_at, endedAt: row.ended_at };
  });

  ipcMain.handle(IPC_CHANNELS.END_SPRINT, (_event, sprintId: string, wordsWritten: number) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.prepare('UPDATE writer_sprints SET ended_at = ?, words_written = ? WHERE id = ?').run(now, wordsWritten, sprintId);
    const row = db.prepare('SELECT * FROM writer_sprints WHERE id = ?').get(sprintId) as any;
    return { id: row.id, projectId: row.project_id, durationSeconds: row.duration_seconds, targetWords: row.target_words, wordsWritten: row.words_written, startedAt: row.started_at, endedAt: row.ended_at };
  });

  ipcMain.handle(IPC_CHANNELS.GET_SPRINTS, (_event, projectId: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM writer_sprints WHERE project_id = ? ORDER BY started_at DESC LIMIT 50').all(projectId) as any[];
    return rows.map((r: any) => ({ id: r.id, projectId: r.project_id, durationSeconds: r.duration_seconds, targetWords: r.target_words, wordsWritten: r.words_written, startedAt: r.started_at, endedAt: r.ended_at }));
  });

  // ── Custom Templates ──────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_CUSTOM_TEMPLATES, () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM writer_custom_templates ORDER BY created_at DESC').all() as any[];
    return rows.map((r: any) => ({ id: r.id, name: r.name, description: r.description, content: r.content, createdAt: r.created_at }));
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_CUSTOM_TEMPLATE, (_event, template: { name: string; description: string; content: string }) => {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO writer_custom_templates (id, name, description, content, created_at) VALUES (?, ?, ?, ?, ?)').run(id, template.name, template.description, template.content, now);
    return { id, name: template.name, description: template.description, content: template.content, createdAt: now };
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CUSTOM_TEMPLATE, (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM writer_custom_templates WHERE id = ?').run(id);
  });

  // ── Inline Comments ────────────────────────────────────────────────────────

  function mapComment(row: any) {
    if (!row) return row;
    return {
      id: row.id,
      chapterId: row.chapter_id,
      fromPos: row.from_pos,
      toPos: row.to_pos,
      text: row.text,
      author: row.author,
      resolved: row.resolved === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  ipcMain.handle(IPC_CHANNELS.GET_COMMENTS, (_event, chapterId: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM writer_comments WHERE chapter_id = ? ORDER BY from_pos').all(chapterId) as any[];
    return rows.map(mapComment);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_COMMENT, (_event, comment: { chapterId: string; fromPos: number; toPos: number; text: string; author: string }) => {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO writer_comments (id, chapter_id, from_pos, to_pos, text, author, resolved, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)').run(id, comment.chapterId, comment.fromPos, comment.toPos, comment.text, comment.author, now, now);
    return mapComment(db.prepare('SELECT * FROM writer_comments WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_COMMENT, (_event, id: string, updates: { text?: string; resolved?: boolean; fromPos?: number; toPos?: number }) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    const sets: string[] = ['updated_at = ?'];
    const vals: any[] = [now];
    if (updates.text !== undefined) { sets.push('text = ?'); vals.push(updates.text); }
    if (updates.resolved !== undefined) { sets.push('resolved = ?'); vals.push(updates.resolved ? 1 : 0); }
    if (updates.fromPos !== undefined) { sets.push('from_pos = ?'); vals.push(updates.fromPos); }
    if (updates.toPos !== undefined) { sets.push('to_pos = ?'); vals.push(updates.toPos); }
    vals.push(id);
    db.prepare(`UPDATE writer_comments SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    return mapComment(db.prepare('SELECT * FROM writer_comments WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_COMMENT, (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM writer_comments WHERE id = ?').run(id);
  });

  // ── AI Font Pairings ──────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SUGGEST_FONT_PAIRINGS, async (_event, genre: string, mood: string) => {
    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    const prompt = `You are a professional typographer. Suggest 3 font pairings for a ${genre} writing project with a ${mood} mood.

For each pairing, suggest a body font, heading font, and code/monospace font from this list of web-safe and common fonts:
Body/Heading options: Georgia, "Times New Roman", Palatino, Garamond, Baskerville, "Libre Baskerville", Merriweather, Lora, -apple-system/BlinkMacSystemFont/"Segoe UI" (system sans), "Courier New"
Code options: "Fira Code", Consolas, "Courier New", Monaco

Respond ONLY with a JSON array in this exact format:
[
  {
    "bodyFont": "Georgia, serif",
    "headingFont": "Palatino, serif",
    "codeFont": "'Fira Code', Consolas, monospace",
    "rationale": "Why this pairing works for the genre/mood"
  }
]`;

    const result = await aiService.streamCompletion(
      prompt, modelId, undefined, apiKey, undefined,
      () => {},
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      return [];
    }
  });

  // ── Cover Image Selection ──────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SELECT_COVER_IMAGE, async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Select Cover Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths || filePaths.length === 0) return null;
    const imgPath = filePaths[0];
    const imgData = fs.readFileSync(imgPath);
    const ext = imgPath.split('.').pop()?.toLowerCase() || 'png';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
    const dataUrl = `data:${mime};base64,${imgData.toString('base64')}`;
    return { filePath: imgPath, dataUrl };
  });

  // ── Review Copy Export ────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.EXPORT_REVIEW_COPY, async (_event, projectId: string, options: { authorName?: string; includeComments?: boolean; includeQuestions?: boolean }) => {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
    if (!project) throw new Error('Project not found');

    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC').all(projectId) as any[];
    const authorName = options.authorName || 'Author';
    const includeComments = options.includeComments !== false;
    const includeQuestions = options.includeQuestions !== false;

    let chaptersHtml = '';
    let commentIndex = 0;

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      let text = '';
      try {
        const doc = JSON.parse(ch.content);
        text = extractText(doc);
      } catch { text = ''; }

      const paragraphs = text.split('\n').filter((p: string) => p.trim())
        .map((p: string) => `      <p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
        .join('\n');

      // Get comments for this chapter
      let commentsHtml = '';
      if (includeComments) {
        const comments = db.prepare('SELECT * FROM writer_comments WHERE chapter_id = ? AND resolved = 0 ORDER BY from_pos').all(ch.id) as any[];
        if (comments.length > 0) {
          commentsHtml = `\n      <div class="comments-section">\n        <h4>Comments & Notes</h4>\n`;
          for (const c of comments) {
            commentIndex++;
            commentsHtml += `        <div class="comment"><span class="comment-num">[${commentIndex}]</span> <span class="comment-author">${(c.author || 'Editor').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>: ${(c.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>\n`;
          }
          commentsHtml += '      </div>';
        }
      }

      chaptersHtml += `    <section class="chapter">
      <h2>Chapter ${i + 1}: ${ch.title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h2>
${paragraphs}${commentsHtml}
    </section>\n\n`;
    }

    const feedbackForm = includeQuestions ? `
    <section class="feedback-form">
      <h2>Reader Feedback</h2>
      <p>Thank you for reading this manuscript. Your feedback is invaluable. Please consider the following questions:</p>
      <ol>
        <li>What was your overall impression of the story?</li>
        <li>Were there any parts where your attention wandered or you felt confused?</li>
        <li>Which characters felt the most real to you? Which felt flat?</li>
        <li>Was the pacing appropriate? Too fast, too slow, or uneven?</li>
        <li>Did the ending feel satisfying and earned?</li>
        <li>Were there any plot holes or inconsistencies you noticed?</li>
        <li>What was your favorite scene or passage?</li>
        <li>Any other comments, suggestions, or concerns?</li>
      </ol>
      <div class="notes-area">
        <p><strong>Additional Notes:</strong></p>
        <div class="notes-lines"></div>
      </div>
    </section>` : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${project.name} — Review Copy</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 2rem; }
    h1 { text-align: center; font-size: 2em; margin-bottom: 0.5em; }
    .subtitle { text-align: center; color: #666; margin-bottom: 2em; font-style: italic; }
    .review-notice { background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 1em; margin-bottom: 2em; font-size: 0.9em; }
    .chapter { margin-bottom: 3em; page-break-before: always; }
    .chapter:first-of-type { page-break-before: avoid; }
    h2 { font-size: 1.4em; border-bottom: 1px solid #ccc; padding-bottom: 0.3em; margin-bottom: 1em; }
    p { margin: 0.5em 0; text-indent: 1.5em; }
    p:first-of-type { text-indent: 0; }
    .comments-section { background: #f0f7ff; border-left: 3px solid #4c6ef5; padding: 1em; margin-top: 2em; border-radius: 0 4px 4px 0; }
    .comments-section h4 { margin: 0 0 0.5em; color: #4c6ef5; font-size: 0.9em; }
    .comment { font-size: 0.85em; margin: 0.3em 0; color: #555; }
    .comment-num { color: #4c6ef5; font-weight: bold; }
    .comment-author { font-weight: 600; }
    .feedback-form { page-break-before: always; margin-top: 3em; }
    .feedback-form ol { line-height: 2.2; }
    .notes-area { margin-top: 2em; }
    .notes-lines { border-top: 1px solid #ccc; height: 200px; background: repeating-linear-gradient(transparent, transparent 29px, #eee 30px); }
    @media print { .review-notice { background: #fff; border-color: #999; } }
  </style>
</head>
<body>
  <h1>${project.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</h1>
  <p class="subtitle">by ${authorName.replace(/&/g, '&amp;').replace(/</g, '&lt;')} — REVIEW COPY</p>
  <div class="review-notice">
    <strong>CONFIDENTIAL REVIEW COPY</strong> — This manuscript is shared for feedback purposes only. Please do not distribute, copy, or quote without permission. Generated ${new Date().toLocaleDateString()}.
  </div>
${chaptersHtml}${feedbackForm}
</body>
</html>`;

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Review Copy',
      defaultPath: `${project.name} - Review Copy.html`,
      filters: [{ name: 'HTML', extensions: ['html'] }],
    });

    if (canceled || !filePath) return { success: false };
    fs.writeFileSync(filePath, html, 'utf-8');
    return { success: true, filePath };
  });

  // ── Feedback Dashboard (Revision Plans) ────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GENERATE_REVISION_PLAN, async (_event, projectId: string) => {
    const settings = loadSettings();
    const modelId = settings.selectedModel;
    const apiKeys = loadApiKeys();
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);
    const apiKey = apiKeys[modelConfig.provider];
    if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

    // Gather all open comments across all chapters
    const chapters = db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order ASC').all(projectId) as any[];
    const allComments: any[] = [];
    for (const ch of chapters) {
      const comments = db.prepare('SELECT * FROM writer_comments WHERE chapter_id = ? AND resolved = 0 ORDER BY from_pos').all(ch.id) as any[];
      for (const c of comments) {
        allComments.push({ ...mapComment(c), chapterTitle: ch.title });
      }
    }

    if (allComments.length === 0) {
      throw new Error('No open comments found. Add comments to your chapters first.');
    }

    const commentList = allComments.map((c: any, i: number) =>
      `[${i + 1}] Chapter: "${c.chapterTitle}" | Comment: "${c.text}" (by ${c.author})`
    ).join('\n');

    const prompt = `You are an editorial revision planner. Analyze these open comments/feedback on a manuscript and create a prioritized revision plan.

Comments:
${commentList}

Create a structured revision plan. For each task, categorize it as one of: Plot, Character, Pacing, Style, Continuity, or Other. Assign priority: high, medium, or low.

Respond ONLY with JSON in this exact format:
{
  "summary": "Brief overall assessment of the revision needs",
  "tasks": [
    {
      "category": "Plot",
      "priority": "high",
      "description": "Clear, actionable revision task",
      "relatedCommentIndices": [1, 3],
      "chapterTitle": "Chapter name"
    }
  ]
}`;

    const result = await aiService.streamCompletion(
      prompt, modelId, undefined, apiKey, undefined,
      (delta) => _event.sender.send('ai-stream-delta', delta),
    );

    let parsed: any;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
    } catch {
      parsed = { summary: result.content, tasks: [] };
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const tasks = (parsed.tasks || []).map((t: any, idx: number) => ({
      id: `task-${idx}`,
      category: t.category || 'Other',
      priority: t.priority || 'medium',
      description: t.description || '',
      relatedComments: (t.relatedCommentIndices || []).map((i: number) => allComments[i - 1]?.id).filter(Boolean),
      chapterTitle: t.chapterTitle || '',
      completed: false,
    }));

    db.prepare('INSERT INTO writer_revision_plans (id, project_id, tasks, summary, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, projectId, JSON.stringify(tasks), parsed.summary || '', now);

    return { id, projectId, tasks, summary: parsed.summary || '', createdAt: now };
  });

  ipcMain.handle(IPC_CHANNELS.GET_REVISION_PLANS, (_event, projectId: string) => {
    const rows = db.prepare('SELECT * FROM writer_revision_plans WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as any[];
    return rows.map((r: any) => ({
      id: r.id,
      projectId: r.project_id,
      tasks: JSON.parse(r.tasks || '[]'),
      summary: r.summary,
      createdAt: r.created_at,
    }));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_REVISION_PLAN, (_event, id: string) => {
    db.prepare('DELETE FROM writer_revision_plans WHERE id = ?').run(id);
  });

  // ── Master Page Presets ──────────────────────────────────────────────────

  const mapMasterPage = (row: any): any => ({
    id: row.id,
    name: row.name,
    description: row.description,
    pageSize: row.page_size,
    marginTop: row.margin_top,
    marginBottom: row.margin_bottom,
    marginLeft: row.margin_left,
    marginRight: row.margin_right,
    headerText: row.header_text,
    footerText: row.footer_text,
    showPageNumbers: !!row.show_page_numbers,
    pageNumberPosition: row.page_number_position,
    columns: row.columns,
    createdAt: row.created_at,
  });

  ipcMain.handle(IPC_CHANNELS.GET_MASTER_PAGES, async () => {
    return (db.prepare('SELECT * FROM writer_master_pages ORDER BY name').all() as any[]).map(mapMasterPage);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_MASTER_PAGE, async (_event, preset: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO writer_master_pages (id, name, description, page_size, margin_top, margin_bottom, margin_left, margin_right, header_text, footer_text, show_page_numbers, page_number_position, columns, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, preset.name, preset.description || '', preset.pageSize, preset.marginTop, preset.marginBottom,
      preset.marginLeft, preset.marginRight, preset.headerText || '', preset.footerText || '',
      preset.showPageNumbers ? 1 : 0, preset.pageNumberPosition || 'bottom-center', preset.columns || 1, now,
    );
    return mapMasterPage(db.prepare('SELECT * FROM writer_master_pages WHERE id = ?').get(id));
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_MASTER_PAGE, async (_event, id: string) => {
    db.prepare('DELETE FROM writer_master_pages WHERE id = ?').run(id);
  });

  // ── Import DOCX Tracked Changes ────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.IMPORT_DOCX_CHANGES, async (_event, chapterId: string) => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Import Tracked Changes from DOCX',
      filters: [{ name: 'Word Documents', extensions: ['docx'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths || filePaths.length === 0) return { imported: 0 };

    const JSZip = require('jszip');
    const fileBuffer = fs.readFileSync(filePaths[0]);
    const zip = await JSZip.loadAsync(fileBuffer);

    const docXml = await zip.file('word/document.xml')?.async('string');
    if (!docXml) return { imported: 0 };

    // Parse w:ins (insertions) and w:del (deletions) from the XML
    const changes: { changeType: string; text: string; author: string; date: string }[] = [];

    // Match insertions: <w:ins w:author="..." w:date="...">...<w:t>text</w:t>...</w:ins>
    const insRegex = /<w:ins\s[^>]*?w:author="([^"]*)"[^>]*?w:date="([^"]*)"[^>]*?>([\s\S]*?)<\/w:ins>/g;
    let match;
    while ((match = insRegex.exec(docXml)) !== null) {
      const author = match[1];
      const date = match[2];
      const inner = match[3];
      const textMatches = inner.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      const text = textMatches ? textMatches.map((t: string) => t.replace(/<[^>]+>/g, '')).join('') : '';
      if (text.trim()) {
        changes.push({ changeType: 'insertion', text, author, date });
      }
    }

    // Match deletions: <w:del w:author="..." w:date="...">...<w:delText>text</w:delText>...</w:del>
    const delRegex = /<w:del\s[^>]*?w:author="([^"]*)"[^>]*?w:date="([^"]*)"[^>]*?>([\s\S]*?)<\/w:del>/g;
    while ((match = delRegex.exec(docXml)) !== null) {
      const author = match[1];
      const date = match[2];
      const inner = match[3];
      const textMatches = inner.match(/<w:delText[^>]*>([^<]*)<\/w:delText>/g);
      const text = textMatches ? textMatches.map((t: string) => t.replace(/<[^>]+>/g, '')).join('') : '';
      if (text.trim()) {
        changes.push({ changeType: 'deletion', text, author, date });
      }
    }

    // Insert as tracked changes
    let imported = 0;
    for (const change of changes) {
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO writer_tracked_changes (id, chapter_id, change_type, from_pos, to_pos, old_text, new_text, author, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        id, chapterId, change.changeType, 0, 0,
        change.changeType === 'deletion' ? change.text : '',
        change.changeType === 'insertion' ? change.text : '',
        change.author || 'DOCX Import', now,
      );
      imported++;
    }

    return { imported };
  });

  // ── Auto-Updater ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, async () => {
    const currentVersion = app.getVersion();

    try {
      const https = require('https');
      const manifestUrl = 'https://raw.githubusercontent.com/novasyn/writer-releases/main/latest.json';

      const fetchJson = (url: string): Promise<any> => new Promise((resolve, reject) => {
        https.get(url, (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => { data += chunk; });
          res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch { reject(new Error('Invalid JSON')); }
          });
        }).on('error', reject);
      });

      const manifest = await fetchJson(manifestUrl);
      const latestVersion = manifest.version || currentVersion;

      // Simple semver comparison
      const parseVer = (v: string) => v.replace(/^v/, '').split('.').map(Number);
      const current = parseVer(currentVersion);
      const latest = parseVer(latestVersion);
      let updateAvailable = false;
      for (let i = 0; i < 3; i++) {
        if ((latest[i] || 0) > (current[i] || 0)) { updateAvailable = true; break; }
        if ((latest[i] || 0) < (current[i] || 0)) break;
      }

      return {
        updateAvailable,
        currentVersion,
        latestVersion,
        downloadUrl: manifest.downloadUrl || '',
        releaseNotes: manifest.releaseNotes || '',
      };
    } catch {
      // If check fails (no internet, repo doesn't exist yet), just return current version
      return {
        updateAvailable: false,
        currentVersion,
      };
    }
  });

  // ── Insert Image (Full Page) ──────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.INSERT_IMAGE, async () => {
    const { dialog } = require('electron');
    const { filePath, canceled } = await dialog.showOpenDialog({
      title: 'Insert Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }],
      properties: ['openFile'],
    });

    if (canceled || !filePath || filePath.length === 0) return null;

    const imgPath = filePath[0];
    const ext = imgPath.split('.').pop()?.toLowerCase() || 'png';
    const mimeMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml' };
    const mime = mimeMap[ext] || 'image/png';
    const buffer = fs.readFileSync(imgPath);
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

    // Get dimensions (basic heuristic for common formats)
    let width = 800, height = 600;
    if (ext === 'png' && buffer.length > 24) {
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    } else if ((ext === 'jpg' || ext === 'jpeg') && buffer.length > 4) {
      // Quick JPEG dimension scan (search for SOF0 marker)
      for (let i = 2; i < buffer.length - 9; i++) {
        if (buffer[i] === 0xFF && (buffer[i + 1] === 0xC0 || buffer[i + 1] === 0xC2)) {
          height = buffer.readUInt16BE(i + 5);
          width = buffer.readUInt16BE(i + 7);
          break;
        }
      }
    }

    const fileName = imgPath.split(/[\\/]/).pop() || 'image';
    return { dataUrl, fileName, width, height };
  });

  // ── Import PDF Annotations ────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.IMPORT_PDF_ANNOTATIONS, async (_event, chapterId: string) => {
    const { dialog } = require('electron');
    const { filePath, canceled } = await dialog.showOpenDialog({
      title: 'Import PDF Annotations',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      properties: ['openFile'],
    });

    if (canceled || !filePath || filePath.length === 0) return { imported: 0 };

    const pdfPath = filePath[0];
    const buffer = fs.readFileSync(pdfPath);
    const content = buffer.toString('latin1');

    // Parse PDF annotations — look for /Annot objects with /Contents or /Subtype /Text, /Highlight, /Underline, /StrikeOut
    const annotations: { type: string; text: string; author: string; date: string }[] = [];
    const annotRegex = /<<[^>]*?\/Subtype\s*\/(Text|Highlight|Underline|StrikeOut|FreeText)[^>]*?>>/gs;
    let match;
    while ((match = annotRegex.exec(content)) !== null) {
      const block = match[0];
      const subtypeMatch = block.match(/\/Subtype\s*\/(\w+)/);
      const contentsMatch = block.match(/\/Contents\s*\(([^)]*)\)/);
      const authorMatch = block.match(/\/T\s*\(([^)]*)\)/);
      const dateMatch = block.match(/\/M\s*\(D:(\d{14})/);

      if (contentsMatch) {
        const type = subtypeMatch?.[1] || 'Text';
        const text = contentsMatch[1].replace(/\\n/g, '\n').replace(/\\\\/g, '\\').replace(/\\(.)/g, '$1');
        const author = authorMatch?.[1] || 'PDF Reviewer';
        let dateStr = new Date().toISOString();
        if (dateMatch) {
          const d = dateMatch[1];
          dateStr = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T${d.slice(8,10)}:${d.slice(10,12)}:${d.slice(12,14)}Z`;
        }
        annotations.push({ type, text, author, date: dateStr });
      }
    }

    // Insert annotations as tracked changes (insertions for notes/comments)
    const db = getDatabase();
    const { v4: uuid } = require('uuid');
    let imported = 0;

    for (const ann of annotations) {
      const id = uuid();
      const changeType = ann.type === 'StrikeOut' ? 'deletion' : 'insertion';
      db.prepare(`INSERT INTO writer_tracked_changes (id, chapter_id, change_type, from_pos, to_pos, old_text, new_text, author, created_at) VALUES (?, ?, ?, 0, 0, '', ?, ?, ?)`).run(
        id, chapterId, changeType, `[PDF ${ann.type}] ${ann.text}`, ann.author, ann.date
      );
      imported++;
    }

    return { imported };
  });

  // ── Cover Designer: Full Wrap Export ───────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.EXPORT_COVER_FULL_WRAP, async (_event, dataUrl: string, projectName: string) => {
    const { dialog } = require('electron');
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Full Wrap Cover',
      defaultPath: `${projectName} - Full Wrap Cover.png`,
      filters: [
        { name: 'PNG', extensions: ['png'] },
        { name: 'JPEG', extensions: ['jpg'] },
      ],
    });

    if (canceled || !filePath) return { success: false };

    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    return { success: true, filePath };
  });

  // ── Project Backup & Restore ──────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.BACKUP_PROJECT, async (_event, projectId: string) => {
    const db = getDatabase();
    const project = mapProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
    if (!project) return { success: false };

    const chapters = (db.prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY sort_order').all(projectId) as any[]).map(mapChapter);
    const encyclopedia = (db.prepare('SELECT * FROM encyclopedia WHERE project_id = ?').all(projectId) as any[]).map(mapEncyclopediaEntry);
    const outlines: any[] = [];
    for (const ch of chapters) {
      const outline = db.prepare('SELECT * FROM outlines WHERE chapter_id = ?').get(ch.id) as any;
      if (outline) outlines.push(mapOutline(outline));
    }
    const notes: any[] = [];
    for (const ch of chapters) {
      const note = db.prepare('SELECT * FROM writer_chapter_notes WHERE chapter_id = ?').get(ch.id) as any;
      if (note) notes.push({ id: note.id, chapterId: note.chapter_id, content: note.content, createdAt: note.created_at, updatedAt: note.updated_at });
    }
    const comments: any[] = [];
    for (const ch of chapters) {
      const rows = db.prepare('SELECT * FROM writer_comments WHERE chapter_id = ?').all(ch.id) as any[];
      comments.push(...rows.map(mapComment));
    }

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      project,
      chapters,
      encyclopediaEntries: encyclopedia,
      outlines,
      notes,
      comments,
    };

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Project Backup',
      defaultPath: `${project.name} - Backup.json`,
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    });

    if (canceled || !filePath) return { success: false };
    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
    return { success: true, filePath };
  });

  ipcMain.handle(IPC_CHANNELS.RESTORE_PROJECT, async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: 'Restore Project Backup',
      filters: [{ name: 'JSON Backup', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (canceled || !filePaths.length) return { success: false };

    try {
      const raw = fs.readFileSync(filePaths[0], 'utf-8');
      const backup = JSON.parse(raw);
      if (!backup.version || !backup.project || !backup.chapters) {
        return { success: false };
      }

      const db = getDatabase();
      const newProjectId = uuidv4();
      const now = new Date().toISOString();

      // Create project
      db.prepare('INSERT INTO projects (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        newProjectId, backup.project.userId || 'local', backup.project.name + ' (Restored)', backup.project.description || '', now, now
      );

      // Map old chapter IDs to new ones
      const chapterIdMap: Record<string, string> = {};
      for (const ch of backup.chapters) {
        const newChId = uuidv4();
        chapterIdMap[ch.id] = newChId;
        db.prepare('INSERT INTO chapters (id, project_id, title, sort_order, content, word_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
          newChId, newProjectId, ch.title, ch.sortOrder, ch.content, ch.wordCount || 0, now, now
        );
      }

      // Encyclopedia
      if (backup.encyclopediaEntries) {
        for (const e of backup.encyclopediaEntries) {
          db.prepare('INSERT INTO encyclopedia (id, project_id, name, category, content, tokens, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
            uuidv4(), newProjectId, e.name, e.category, e.content, e.tokens || 0, now, now
          );
        }
      }

      // Outlines
      if (backup.outlines) {
        for (const o of backup.outlines) {
          const newChId = chapterIdMap[o.chapterId];
          if (newChId) {
            db.prepare('INSERT INTO outlines (id, chapter_id, beats, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
              uuidv4(), newChId, o.beats, now, now
            );
          }
        }
      }

      // Notes
      if (backup.notes) {
        for (const n of backup.notes) {
          const newChId = chapterIdMap[n.chapterId];
          if (newChId) {
            db.prepare('INSERT INTO writer_chapter_notes (id, chapter_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(
              uuidv4(), newChId, n.content, now, now
            );
          }
        }
      }

      // Comments
      if (backup.comments) {
        for (const c of backup.comments) {
          const newChId = chapterIdMap[c.chapterId];
          if (newChId) {
            db.prepare('INSERT INTO writer_comments (id, chapter_id, from_pos, to_pos, text, author, resolved, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
              uuidv4(), newChId, c.fromPos, c.toPos, c.text, c.author || 'Author', c.resolved ? 1 : 0, now, now
            );
          }
        }
      }

      return { success: true, projectId: newProjectId, projectName: backup.project.name + ' (Restored)' };
    } catch (err) {
      console.error('Restore failed:', err);
      return { success: false };
    }
  });

  // ── Cover Designer: Upload Layer Image ───────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.UPLOAD_COVER_IMAGE, async () => {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Cover Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    const ext = require('path').extname(filePath).toLowerCase().replace('.', '');
    const mimeMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
    const mime = mimeMap[ext] || 'image/png';
    const buffer = fs.readFileSync(filePath);
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
    const fileName = require('path').basename(filePath);
    // Get dimensions
    let width = 200, height = 200;
    if (ext === 'png' && buffer.length > 24) {
      width = buffer.readUInt32BE(16);
      height = buffer.readUInt32BE(20);
    } else if ((ext === 'jpg' || ext === 'jpeg') && buffer.length > 2) {
      let offset = 2;
      while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          height = buffer.readUInt16BE(offset + 5);
          width = buffer.readUInt16BE(offset + 7);
          break;
        }
        const segLen = buffer.readUInt16BE(offset + 2);
        offset += 2 + segLen;
      }
    }
    return { dataUrl, fileName, width, height };
  });

  // ── Plugin System ──────────────────────────────────────────────────────

  const BUILT_IN_PLUGINS = [
    {
      id: 'word-frequency',
      name: 'Word Frequency',
      description: 'Analyze word frequency distribution in your text',
      version: '1.0.0',
      builtIn: true,
    },
    {
      id: 'reading-time',
      name: 'Reading Time',
      description: 'Estimate reading time with detailed breakdown',
      version: '1.0.0',
      builtIn: true,
    },
    {
      id: 'lorem-ipsum',
      name: 'Lorem Ipsum',
      description: 'Generate placeholder text for layouts and testing',
      version: '1.0.0',
      builtIn: true,
    },
    {
      id: 'text-statistics',
      name: 'Text Statistics',
      description: 'Detailed text statistics: sentence count, avg length, vocabulary richness',
      version: '1.0.0',
      builtIn: true,
    },
  ];

  function getPluginSettingsPath(): string {
    return require('path').join(app.getPath('userData'), 'writer-plugins.json');
  }

  function loadPluginSettings(): Record<string, boolean> {
    try {
      const data = fs.readFileSync(getPluginSettingsPath(), 'utf-8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  function savePluginSettings(settings: Record<string, boolean>) {
    fs.writeFileSync(getPluginSettingsPath(), JSON.stringify(settings, null, 2));
  }

  ipcMain.handle(IPC_CHANNELS.GET_PLUGINS, async () => {
    const pluginEnabled = loadPluginSettings();
    return BUILT_IN_PLUGINS.map(p => ({
      ...p,
      enabled: pluginEnabled[p.id] !== false, // enabled by default
    }));
  });

  ipcMain.handle(IPC_CHANNELS.TOGGLE_PLUGIN, async (_event, pluginId: string, enabled: boolean) => {
    const settings = loadPluginSettings();
    settings[pluginId] = enabled;
    savePluginSettings(settings);
  });

  ipcMain.handle(IPC_CHANNELS.RUN_PLUGIN, async (_event, pluginId: string, context: { text?: string; chapterContent?: string; projectId?: string }) => {
    const text = context.text || context.chapterContent || '';

    if (pluginId === 'word-frequency') {
      const words = text.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter(w => w.length > 2);
      const freq: Record<string, number> = {};
      for (const w of words) freq[w] = (freq[w] || 0) + 1;
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 50);
      const lines = sorted.map(([word, count], i) => `${i + 1}. **${word}** — ${count} occurrences`);
      return { pluginId, title: 'Word Frequency Analysis', content: `Total unique words: ${Object.keys(freq).length}\nTotal words: ${words.length}\n\n${lines.join('\n')}`, type: 'text' };
    }

    if (pluginId === 'reading-time') {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const wordCount = words.length;
      const silentReading = Math.ceil(wordCount / 250);
      const aloudReading = Math.ceil(wordCount / 150);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
      const dialogueLines = (text.match(/[""][^""]*[""]|["'][^"']*["']/g) || []).length;
      return {
        pluginId, title: 'Reading Time Estimate',
        content: `**Words:** ${wordCount.toLocaleString()}\n**Silent reading:** ~${silentReading} min (250 wpm)\n**Read aloud:** ~${aloudReading} min (150 wpm)\n**Sentences:** ${sentences}\n**Paragraphs:** ${paragraphs}\n**Dialogue lines:** ${dialogueLines}`,
        type: 'text',
      };
    }

    if (pluginId === 'lorem-ipsum') {
      const loremParagraphs = [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.',
        'Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula ut dictum pharetra, nisi nunc fringilla magna, in commodo elit erat nec turpis.',
        'Praesent dapibus, neque id cursus faucibus, tortor neque egestas augue, eu vulputate magna eros eu erat. Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus.',
      ];
      return { pluginId, title: 'Lorem Ipsum', content: loremParagraphs.join('\n\n'), type: 'text' };
    }

    if (pluginId === 'text-statistics') {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const chars = text.length;
      const charsNoSpaces = text.replace(/\s/g, '').length;
      const avgWordLen = words.length ? (words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(1) : '0';
      const avgSentLen = sentences.length ? (words.length / sentences.length).toFixed(1) : '0';
      const uniqueWords = new Set(words.map(w => w.toLowerCase().replace(/[^a-z'-]/g, '')));
      const vocabRichness = words.length ? ((uniqueWords.size / words.length) * 100).toFixed(1) : '0';
      const longWords = words.filter(w => w.length > 6).length;
      const shortSentences = sentences.filter(s => s.split(/\s+/).length < 8).length;
      const longSentences = sentences.filter(s => s.split(/\s+/).length > 25).length;
      return {
        pluginId, title: 'Text Statistics',
        content: `**Characters:** ${chars.toLocaleString()} (${charsNoSpaces.toLocaleString()} without spaces)\n**Words:** ${words.length.toLocaleString()}\n**Sentences:** ${sentences.length}\n**Avg word length:** ${avgWordLen} chars\n**Avg sentence length:** ${avgSentLen} words\n**Unique words:** ${uniqueWords.size.toLocaleString()}\n**Vocabulary richness:** ${vocabRichness}%\n**Long words (>6 chars):** ${longWords}\n**Short sentences (<8 words):** ${shortSentences}\n**Long sentences (>25 words):** ${longSentences}`,
        type: 'text',
      };
    }

    return { pluginId, title: 'Unknown Plugin', content: 'Plugin not found', type: 'text' };
  });

  // ── NovaSyn Ecosystem Exchange ─────────────────────────────────────────

  function getExchangeDir(): string {
    const dir = require('path').join(app.getPath('appData'), 'NovaSyn', 'exchange');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  ipcMain.handle(IPC_CHANNELS.SEND_TO_EXCHANGE, async (_event, packet: any) => {
    const id = uuidv4();
    const fullPacket = {
      ...packet,
      id,
      sourceApp: 'NovaSyn Writer',
      createdAt: new Date().toISOString(),
    };
    const dir = getExchangeDir();
    const filePath = require('path').join(dir, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(fullPacket, null, 2));
    return { success: true, packetId: id };
  });

  ipcMain.handle(IPC_CHANNELS.RECEIVE_FROM_EXCHANGE, async () => {
    const dir = getExchangeDir();
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'));
    const packets: any[] = [];
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(require('path').join(dir, file), 'utf-8'));
        // Show packets from other apps or targeted at Writer
        if (data.sourceApp !== 'NovaSyn Writer' || data.targetApp === 'NovaSyn Writer') {
          packets.push(data);
        }
      } catch { /* skip invalid files */ }
    }
    return packets.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  ipcMain.handle(IPC_CHANNELS.LIST_EXCHANGE_PACKETS, async () => {
    const dir = getExchangeDir();
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'));
    const packets: any[] = [];
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(require('path').join(dir, file), 'utf-8'));
        packets.push(data);
      } catch { /* skip */ }
    }
    return packets.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_EXCHANGE_PACKET, async (_event, packetId: string) => {
    const dir = getExchangeDir();
    const filePath = require('path').join(dir, `${packetId}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  // ── Writing Guide ──────────────────────────────────────────────────────

  function mapGuideMessage(row: any) {
    return {
      id: row.id,
      projectId: row.project_id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      createdAt: row.created_at,
    };
  }

  ipcMain.handle(IPC_CHANNELS.GET_GUIDE_MESSAGES, async (_event, projectId: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM writer_guide_messages WHERE project_id = ? ORDER BY created_at ASC').all(projectId) as any[];
    return rows.map(mapGuideMessage);
  });

  ipcMain.handle(IPC_CHANNELS.CLEAR_GUIDE_MESSAGES, async (_event, projectId: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM writer_guide_messages WHERE project_id = ?').run(projectId);
  });

  ipcMain.handle(IPC_CHANNELS.SEND_GUIDE_MESSAGE, async (_event, projectId: string, userMessage: string) => {
    const db = getDatabase();
    const now = new Date().toISOString();

    // Save user message
    const userMsgId = uuidv4();
    db.prepare('INSERT INTO writer_guide_messages (id, project_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)').run(userMsgId, projectId, 'user', userMessage, now);

    // Gather project context
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
    const chapters = db.prepare('SELECT id, title, word_count, sort_order FROM chapters WHERE project_id = ? ORDER BY sort_order').all(projectId) as any[];
    const encyclopedia = db.prepare('SELECT name, category FROM encyclopedia WHERE project_id = ?').all(projectId) as any[];
    const totalWords = chapters.reduce((s: number, c: any) => s + (c.word_count || 0), 0);

    // Check what features have been used
    const hasOutlines = chapters.some((ch: any) => {
      const outline = db.prepare('SELECT id FROM outlines WHERE chapter_id = ?').get(ch.id);
      return !!outline;
    });
    const commentCount = chapters.reduce((s: number, ch: any) => {
      const count = (db.prepare('SELECT COUNT(*) as count FROM writer_comments WHERE chapter_id = ?').get(ch.id) as any)?.count || 0;
      return s + count;
    }, 0);
    const hasTrackedChanges = chapters.some((ch: any) => {
      const count = (db.prepare('SELECT COUNT(*) as count FROM writer_tracked_changes WHERE chapter_id = ?').get(ch.id) as any)?.count || 0;
      return count > 0;
    });
    const kbCount = (db.prepare('SELECT COUNT(*) as count FROM writer_kb WHERE project_id = ? OR is_global = 1').get(projectId) as any)?.count || 0;
    const plantCount = (db.prepare('SELECT COUNT(*) as count FROM writer_continuity_plants WHERE project_id = ?').get(projectId) as any)?.count || 0;
    const threadCount = (db.prepare('SELECT COUNT(*) as count FROM writer_continuity_threads WHERE project_id = ?').get(projectId) as any)?.count || 0;
    const analysisCount = (db.prepare('SELECT COUNT(*) as count FROM writer_analyses WHERE project_id = ?').get(projectId) as any)?.count || 0;

    // Build conversation history (last 20 messages for context)
    const history = db.prepare('SELECT role, content FROM writer_guide_messages WHERE project_id = ? ORDER BY created_at DESC LIMIT 20').all(projectId) as any[];
    history.reverse();

    // Build the comprehensive system prompt
    const systemPrompt = `You are the NovaSyn Writing Guide — a warm, knowledgeable AI writing coach built into NovaSyn Writer. You help users at every stage of the writing process, from initial idea to published book. You know both the craft of writing AND every feature of this app.

## Your Personality
- Encouraging but honest. Celebrate progress, but give real feedback when asked.
- Speak like a mentor, not a manual. Use "you" and "your", be conversational.
- Match the user's energy — brief answers for quick questions, detailed lessons when they want to learn.
- When suggesting app features, explain the *why* not just the *what*.

## The User's Current Project
- Project: "${project?.name || 'Untitled'}"
- Chapters: ${chapters.length} (${chapters.map((c: any) => `"${c.title}" ${c.word_count || 0}w`).join(', ') || 'none yet'})
- Total words: ${totalWords.toLocaleString()}
- Encyclopedia entries: ${encyclopedia.length} (${encyclopedia.map((e: any) => `${e.name} [${e.category}]`).join(', ') || 'none yet'})
- Outlines: ${hasOutlines ? 'yes' : 'no outlines yet'}
- Knowledge Base entries: ${kbCount}
- Continuity tracking: ${plantCount} plants, ${threadCount} threads
- Inline comments: ${commentCount}
- Tracked changes: ${hasTrackedChanges ? 'yes' : 'no'}
- Analyses run: ${analysisCount}

## App Features You Can Recommend
When relevant, suggest these features and explain how to access them:

### Getting Started
- **Brain Dump** (sidebar → Dump): Zero-friction capture mode. Type freely, then AI extracts ideas, encyclopedia entries, outline beats, and questions.
- **Encyclopedia** (sidebar → + New under Encyclopedia): Store character profiles, locations, items, lore. AI can generate full profiles and extract entries from manuscripts.
- **Outline Editor** (sidebar → Outline): Beat-by-beat chapter planning. Add/edit/reorder beats.
- **Chapter Templates** (sidebar → T button): Pre-built structures: Scene, Flashback, Action, Dialogue Heavy, Opening Chapter.

### Writing
- **AI Panel** (sidebar → AI button or Ctrl+Shift+A): 11 AI tools — Continue Writing, Expand, Rewrite, Brainstorm, Dialogue Polish, Show Don't Tell, Compress, Tone Shift, Voice Match, Summarize, Scene from Beat.
- **Discovery Mode** (toolbar → Discovery): AI generates "what if" suggestions when you pause typing. Adjustable creativity/temperature. Follow Thread for guided exploration.
- **Writing Sprints** (sidebar → Sprint): Timed writing sessions with word targets.
- **Typewriter Mode** (toolbar → TW): Keeps cursor centered. Focus Mode dims non-active paragraphs.
- **Ambient Sounds** (sidebar → Sounds): Rain, coffee shop, forest, fireplace, ocean, night — with per-sound volume mixing.

### Organization & Research
- **Knowledge Base** (sidebar → Knowledge): Store ideas, stories, frameworks, voice profiles, research. Entries can be global or project-specific. AI finds connections and gaps.
- **Continuity Tracking** (sidebar → Continuity): Track foreshadowing (plants), unresolved questions (threads), and character knowledge states. AI scans for issues.
- **Character Relationships** (sidebar → Relations): Visual relationship map with AI scan for character connections.
- **Model Comparison** (sidebar → Compare): Send the same prompt to 2-3 AI models and compare results side by side.
- **Pipelines** (sidebar → Pipelines): Chain multiple AI operations together (e.g., Expand → Polish → Tighten).
- **Analysis** (sidebar → Analyze): Readability metrics, pacing heat map, character voice audit, consistency check.

### Revision & Collaboration
- **Inline Comments** (in editor): Add, resolve, filter, and navigate comments anchored to text.
- **Tracked Changes** (sidebar → Changes): Track insertions/deletions. Import changes from DOCX files or PDF annotations.
- **Feedback Dashboard** (sidebar → Feedback): AI generates a prioritized revision plan from your open comments.
- **Version History** (sidebar → History): Auto-snapshots and manual checkpoints. Side-by-side diff comparison.
- **Find & Replace** (Ctrl+F): Search with case-sensitive toggle, navigate matches, replace one or all.

### Publishing & Export
- **Export** (sidebar → Export): 8 formats — Markdown, Plain Text, DOCX, EPUB, Kindle, HTML, PDF, Audiobook Script.
- **PDF Export**: Screen or Print-Ready (6x9 trade), front matter integration, interactive TOC with links.
- **Page Setup** (sidebar → Page): Page size, margins, headers/footers, bleed margins.
- **Cover Designer** (sidebar → Cover): Canvas-based with layers (background, image, text). 8 genre templates. Front/back/spine full-wrap export.
- **Publishing Presets** (sidebar → Publish): One-click validation for KDP, IngramSpark, Draft2Digital, Smashwords, Blog.
- **Submission Package** (sidebar → Submit): AI-generated synopsis, query letter, author bio, logline.

### Typography & Layout
- **Font Controls** (Settings): Body font, heading font, code font. Font size and line height sliders.
- **Named Styles** (toolbar dropdown): 8 presets — Manuscript, Literary, Dialogue, Journal, Letter, Minimal, Vintage.
- **Drop Caps** (toolbar → DC): Classic, Raised, Hanging styles.
- **Multi-Column** (toolbar → Col): 1, 2, or 3 column layouts.
- **Writing Modes** (toolbar): Screenplay, Poetry, Article — each with specialized formatting.
- **Preview** (toolbar → Preview): Live WYSIWYG preview with zoom, heading navigation, spread view.

### Backup & Ecosystem
- **Backup/Restore** (sidebar): Full project backup as JSON. Restore with ID remapping.
- **NovaSyn Exchange** (sidebar → Exchange): Send chapters, selections, or encyclopedia to other NovaSyn apps.
- **Plugins** (sidebar → Plugins): Word Frequency, Reading Time, Lorem Ipsum, Text Statistics.

## Writing Craft Knowledge
You can teach:
- **Story Structure**: Three-act structure, Hero's Journey, Save the Cat, Fichtean Curve, In Medias Res
- **Character Development**: Wants vs needs, character arcs (positive/negative/flat), backstory iceberg, distinctive voice
- **Dialogue**: Subtext, beats, avoiding "said" alternatives, dialect vs readable dialogue, revealing character through speech
- **Show Don't Tell**: Sensory detail, body language, environmental storytelling, emotional beats
- **Pacing**: Scene vs sequel, tension and release, chapter hooks and cliffhangers, controlling tempo through sentence length
- **Point of View**: First/second/third (limited/omniscient), deep POV, head-hopping pitfalls
- **World-Building**: Iceberg theory, sensory world-building, rules of magic systems, cultural depth
- **Revision**: Self-editing techniques, beta reader feedback, structural revision vs line editing
- **Publishing**: Traditional vs self-publishing, querying agents, platform building, marketing basics

## How to Respond
1. If the user has no chapters or content yet, be proactive — suggest starting with Brain Dump or an outline.
2. If they ask about a feature, explain it and offer to help them use it.
3. If they ask a craft question, teach clearly with examples.
4. If they seem stuck, diagnose why and suggest concrete next steps.
5. If they share writing, give specific, actionable feedback — not generic praise.
6. Keep responses focused. Don't list every feature — only mention what's relevant.
7. Use markdown for formatting (headers, bold, lists) to make responses scannable.`;

    // Build messages array for AI
    const messages = history.map((m: any) => ({
      role: m.role,
      content: m.content,
    }));

    // Call AI
    const settings = loadSettings();
    const modelId = settings.selectedModel || 'claude-sonnet-4-6';
    const model = AVAILABLE_MODELS.find((m: any) => m.id === modelId) || AVAILABLE_MODELS[0];
    const keys = loadApiKeys();

    let responseText = '';
    try {
      responseText = await aiService.sendChatWithHistory(
        model,
        keys,
        systemPrompt,
        messages,
      );
    } catch (err: any) {
      responseText = `I'm sorry, I couldn't generate a response. Please check your API key settings. Error: ${err.message || 'Unknown error'}`;
    }

    // Save assistant response
    const assistantMsgId = uuidv4();
    const assistantNow = new Date().toISOString();
    db.prepare('INSERT INTO writer_guide_messages (id, project_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)').run(assistantMsgId, projectId, 'assistant', responseText, assistantNow);

    return mapGuideMessage({
      id: assistantMsgId,
      project_id: projectId,
      role: 'assistant',
      content: responseText,
      created_at: assistantNow,
    });
  });

  // ── Global Search ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GLOBAL_SEARCH, async (_event, projectId: string, query: string) => {
    const db = getDatabase();
    const results: any[] = [];
    const like = `%${query}%`;

    // Search chapters (title + content text)
    const chapters = db.prepare(
      `SELECT id, title, content FROM chapters WHERE project_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY sort_order`
    ).all(projectId, like, like) as any[];
    for (const ch of chapters) {
      let snippet = '';
      if (ch.content) {
        try {
          const doc = JSON.parse(ch.content);
          const text = extractText(doc);
          const idx = text.toLowerCase().indexOf(query.toLowerCase());
          if (idx >= 0) {
            const start = Math.max(0, idx - 40);
            const end = Math.min(text.length, idx + query.length + 60);
            snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
          }
        } catch { /* skip */ }
      }
      if (!snippet && ch.title.toLowerCase().includes(query.toLowerCase())) {
        snippet = `Chapter: ${ch.title}`;
      }
      if (snippet) {
        results.push({ type: 'chapter', id: ch.id, title: ch.title, snippet, chapterId: ch.id });
      }
    }

    // Search encyclopedia
    const entries = db.prepare(
      `SELECT id, name, content FROM writer_encyclopedia WHERE project_id = ? AND (name LIKE ? OR content LIKE ?)`
    ).all(projectId, like, like) as any[];
    for (const e of entries) {
      const idx = e.content.toLowerCase().indexOf(query.toLowerCase());
      let snippet = '';
      if (idx >= 0) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(e.content.length, idx + query.length + 60);
        snippet = (start > 0 ? '...' : '') + e.content.slice(start, end) + (end < e.content.length ? '...' : '');
      } else {
        snippet = e.content.slice(0, 100);
      }
      results.push({ type: 'encyclopedia', id: e.id, title: e.name, snippet });
    }

    // Search KB
    const kbEntries = db.prepare(
      `SELECT id, title, content FROM writer_kb WHERE (project_id = ? OR is_global = 1) AND (title LIKE ? OR content LIKE ?)`
    ).all(projectId, like, like) as any[];
    for (const k of kbEntries) {
      const idx = k.content.toLowerCase().indexOf(query.toLowerCase());
      let snippet = '';
      if (idx >= 0) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(k.content.length, idx + query.length + 60);
        snippet = (start > 0 ? '...' : '') + k.content.slice(start, end) + (end < k.content.length ? '...' : '');
      } else {
        snippet = k.content.slice(0, 100);
      }
      results.push({ type: 'kb', id: k.id, title: k.title, snippet });
    }

    // Search chapter notes
    const notes = db.prepare(
      `SELECT n.id, n.chapter_id, n.content, c.title as chapter_title FROM writer_chapter_notes n JOIN chapters c ON c.id = n.chapter_id WHERE c.project_id = ? AND n.content LIKE ?`
    ).all(projectId, like) as any[];
    for (const n of notes) {
      const idx = n.content.toLowerCase().indexOf(query.toLowerCase());
      let snippet = '';
      if (idx >= 0) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(n.content.length, idx + query.length + 60);
        snippet = (start > 0 ? '...' : '') + n.content.slice(start, end) + (end < n.content.length ? '...' : '');
      }
      if (snippet) {
        results.push({ type: 'note', id: n.id, title: `Note: ${n.chapter_title}`, snippet, chapterId: n.chapter_id });
      }
    }

    // Search timeline events
    const events = db.prepare(
      `SELECT id, title, description FROM writer_timeline_events WHERE project_id = ? AND (title LIKE ? OR description LIKE ?)`
    ).all(projectId, like, like) as any[];
    for (const ev of events) {
      const snippet = ev.description ? ev.description.slice(0, 100) : ev.title;
      results.push({ type: 'timeline', id: ev.id, title: ev.title, snippet });
    }

    return results;
  });

  // Helper: extract plain text from TipTap JSON
  function extractText(node: any): string {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (node.content && Array.isArray(node.content)) {
      return node.content.map((child: any) => extractText(child)).join(' ');
    }
    return '';
  }

  // ── Timeline ──────────────────────────────────────────────────────────────

  function mapTimelineEvent(row: any) {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      chapterId: row.chapter_id,
      characterIds: JSON.parse(row.character_ids || '[]'),
      eventDate: row.event_date,
      sortOrder: row.sort_order,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  ipcMain.handle(IPC_CHANNELS.GET_TIMELINE_EVENTS, async (_event, projectId: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM writer_timeline_events WHERE project_id = ? ORDER BY sort_order, created_at').all(projectId) as any[];
    return rows.map(mapTimelineEvent);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_TIMELINE_EVENT, async (_event, projectId: string, data: any) => {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM writer_timeline_events WHERE project_id = ?').get(projectId) as any)?.m ?? -1;
    db.prepare(
      'INSERT INTO writer_timeline_events (id, project_id, title, description, chapter_id, character_ids, event_date, sort_order, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, projectId, data.title, data.description || '', data.chapterId || null, JSON.stringify(data.characterIds || []), data.eventDate || '', maxOrder + 1, data.color || '#6366f1', now, now);
    const row = db.prepare('SELECT * FROM writer_timeline_events WHERE id = ?').get(id);
    return mapTimelineEvent(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_TIMELINE_EVENT, async (_event, id: string, updates: any) => {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.chapterId !== undefined) { fields.push('chapter_id = ?'); values.push(updates.chapterId); }
    if (updates.characterIds !== undefined) { fields.push('character_ids = ?'); values.push(JSON.stringify(updates.characterIds)); }
    if (updates.eventDate !== undefined) { fields.push('event_date = ?'); values.push(updates.eventDate); }
    if (updates.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(updates.sortOrder); }
    if (updates.color !== undefined) { fields.push('color = ?'); values.push(updates.color); }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    db.prepare(`UPDATE writer_timeline_events SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM writer_timeline_events WHERE id = ?').get(id);
    return mapTimelineEvent(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_TIMELINE_EVENT, async (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM writer_timeline_events WHERE id = ?').run(id);
  });

  // ── Chapter Targets ───────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_CHAPTER_TARGETS, async (_event, projectId: string) => {
    const db = getDatabase();
    const rows = db.prepare(
      `SELECT t.* FROM writer_chapter_targets t JOIN chapters c ON c.id = t.chapter_id WHERE c.project_id = ?`
    ).all(projectId) as any[];
    return rows.map((r: any) => ({
      id: r.id,
      chapterId: r.chapter_id,
      targetWords: r.target_words,
      createdAt: r.created_at,
    }));
  });

  ipcMain.handle(IPC_CHANNELS.SET_CHAPTER_TARGET, async (_event, chapterId: string, targetWords: number) => {
    const db = getDatabase();
    const existing = db.prepare('SELECT * FROM writer_chapter_targets WHERE chapter_id = ?').get(chapterId) as any;
    if (existing) {
      db.prepare('UPDATE writer_chapter_targets SET target_words = ? WHERE chapter_id = ?').run(targetWords, chapterId);
      const row = db.prepare('SELECT * FROM writer_chapter_targets WHERE chapter_id = ?').get(chapterId) as any;
      return { id: row.id, chapterId: row.chapter_id, targetWords: row.target_words, createdAt: row.created_at };
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO writer_chapter_targets (id, chapter_id, target_words, created_at) VALUES (?, ?, ?, ?)').run(id, chapterId, targetWords, now);
    return { id, chapterId, targetWords, createdAt: now };
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CHAPTER_TARGET, async (_event, chapterId: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM writer_chapter_targets WHERE chapter_id = ?').run(chapterId);
  });

  // ── NS Vault ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.VAULT_LIST, (_event, options) => vaultList(options));
  ipcMain.handle(IPC_CHANNELS.VAULT_STORE, (_event, input) => vaultStore(input));
  ipcMain.handle(IPC_CHANNELS.VAULT_GET, (_event, id: string) => vaultGet(id));
  ipcMain.handle(IPC_CHANNELS.VAULT_DELETE, (_event, id: string) => { vaultDelete(id); });
  ipcMain.handle(IPC_CHANNELS.VAULT_SEARCH, (_event, options) => vaultSearch(options));
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_TAGS, () => vaultGetTags());
  ipcMain.handle(IPC_CHANNELS.VAULT_ADD_TAG, (_event, itemId: string, tagName: string, color?: string) => { vaultAddTag(itemId, tagName, color); });
  ipcMain.handle(IPC_CHANNELS.VAULT_ANNOTATE, (_event, itemId: string, content: string) => vaultAnnotate(itemId, content));
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_ANNOTATIONS, (_event, itemId: string) => vaultGetAnnotations(itemId));
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_PROVENANCE, (_event, itemId: string) => vaultGetProvenance(itemId));

  // ── Macro Registry ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.MACRO_GET_REGISTRY, () => getRegistry());
  ipcMain.handle(IPC_CHANNELS.MACRO_GET_AVAILABLE, () => getAvailableMacros());

  // ── Cross-App Queue ───────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.MACRO_INVOKE, (_event, targetApp: string, macro: string, input: any, vaultParentId?: string) => {
    return sendMacroRequest(targetApp, macro, input, vaultParentId);
  });

  ipcMain.handle(IPC_CHANNELS.MACRO_INVOKE_STATUS, (_event, requestId: string) => {
    return checkMacroResponse(requestId);
  });

  ipcMain.handle(IPC_CHANNELS.MACRO_GET_PENDING, () => {
    return getPendingRequests();
  });

  // ── Orchestrations ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.ORCH_LIST, () => listOrchestrations());
  ipcMain.handle(IPC_CHANNELS.ORCH_CREATE, (_event, data) => createOrchestration(data));
  ipcMain.handle(IPC_CHANNELS.ORCH_UPDATE, (_event, id: string, updates) => updateOrchestration(id, updates));
  ipcMain.handle(IPC_CHANNELS.ORCH_DELETE, (_event, id: string) => { deleteOrchestration(id); });
  ipcMain.handle(IPC_CHANNELS.ORCH_GET, (_event, id: string) => getOrchestration(id));
  ipcMain.handle(IPC_CHANNELS.ORCH_RUN, (_event, orchestrationId: string, manualInput?: string) => runOrchestration(orchestrationId, manualInput));
  ipcMain.handle(IPC_CHANNELS.ORCH_RESUME, (_event, runId: string, decision: string) => resumeOrchestration(runId, decision as 'approved' | 'rejected'));
  ipcMain.handle(IPC_CHANNELS.ORCH_GET_RUNS, (_event, orchestrationId: string) => listRuns(orchestrationId));
  ipcMain.handle(IPC_CHANNELS.ORCH_GET_RUN, (_event, runId: string) => getRun(runId));

  // ── Window Controls ────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.MINIMIZE_WINDOW, () => {
    BrowserWindow.getAllWindows()[0]?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.MAXIMIZE_WINDOW, () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });

  ipcMain.handle(IPC_CHANNELS.CLOSE_WINDOW, () => {
    closeMainWindow();
  });

  console.log('IPC handlers registered');
}

// Helper: Extract plain text from TipTap JSON document
function extractText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.content && Array.isArray(node.content)) {
    return node.content
      .map((child: any) => extractText(child))
      .join(node.type === 'paragraph' || node.type === 'heading' ? '\n' : '');
  }
  return '';
}
