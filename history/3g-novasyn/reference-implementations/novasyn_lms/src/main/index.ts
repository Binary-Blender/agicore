import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, runMigrations, closeDatabase } from './database/db';
import { createMainWindow, getMainWindow } from './window';
import { IPC_CHANNELS } from '../shared/types';

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

// ─── Row Mappers ──────────────────────────────────────────────────────────────
// Convert snake_case database rows to camelCase TypeScript objects.

function mapModule(row: any): any {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    difficultyLevel: row.difficulty_level,
    estimatedDurationMinutes: row.estimated_duration_minutes,
    isActive: Boolean(row.is_active),
    policyDocumentPath: row.policy_document_path,
    policyDocumentFilename: row.policy_document_filename,
    policySummaryText: row.policy_summary_text,
    emphasisPrompt: row.emphasis_prompt,
    aiSongLyrics: row.ai_song_lyrics,
    aiOverlayTexts: row.ai_overlay_texts ? JSON.parse(row.ai_overlay_texts) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVideo(row: any): any {
  return {
    id: row.id,
    trainingModuleId: row.training_module_id,
    title: row.title,
    description: row.description,
    filePath: row.file_path,
    youtubeUrl: row.youtube_url,
    durationSeconds: row.duration_seconds,
    genre: row.genre,
    isPrimary: Boolean(row.is_primary),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUser(row: any): any {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    department: row.department,
    role: row.role,
    preferredGenre: row.preferred_genre,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuiz(row: any): any {
  return {
    id: row.id,
    trainingModuleId: row.training_module_id,
    passingScore: row.passing_score,
    questions: row.questions ? JSON.parse(row.questions) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWatchSession(row: any): any {
  return {
    id: row.id,
    userId: row.user_id,
    videoId: row.video_id,
    watchPercentage: row.watch_percentage,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapQuizAttempt(row: any): any {
  return {
    id: row.id,
    userId: row.user_id,
    quizId: row.quiz_id,
    score: row.score,
    passed: Boolean(row.passed),
    attemptNumber: row.attempt_number,
    answers: row.answers ? JSON.parse(row.answers) : {},
    completedAt: row.completed_at,
  };
}

function mapProgress(row: any): any {
  return {
    id: row.id,
    userId: row.user_id,
    trainingModuleId: row.training_module_id,
    status: row.status,
    watchCount: row.watch_count,
    quizAttemptCount: row.quiz_attempt_count,
    bestScore: row.best_score,
    completedAt: row.completed_at,
    lastActivity: row.last_activity,
  };
}

function mapPlaylist(row: any): any {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isRequired: Boolean(row.is_required),
    autoPlay: Boolean(row.auto_play),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlaylistItem(row: any): any {
  return {
    id: row.id,
    playlistId: row.playlist_id,
    trainingModuleId: row.training_module_id,
    position: row.position,
    requireCompletion: Boolean(row.require_completion),
    createdAt: row.created_at,
  };
}

function mapAiAsset(row: any): any {
  return {
    id: row.id,
    trainingModuleId: row.training_module_id,
    assetType: row.asset_type,
    title: row.title,
    description: row.description,
    status: row.status,
    filePath: row.file_path,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    durationSeconds: row.duration_seconds,
    style: row.style,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    deletedAt: row.deleted_at,
  };
}

function mapQcTask(row: any): any {
  return {
    id: row.id,
    assetId: row.asset_id,
    assetType: row.asset_type,
    status: row.status,
    reviewer: row.reviewer,
    notes: row.notes,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

// ─── IPC Handler Registration ─────────────────────────────────────────────────

function registerIPCHandlers() {
  const db = getDatabase();

  // ── Training Modules ──────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_MODULES, () => {
    const rows = db.prepare('SELECT * FROM training_modules ORDER BY created_at DESC').all();
    return rows.map(mapModule);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_MODULE, (_event, data: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO training_modules (
        id, title, description, category, difficulty_level,
        estimated_duration_minutes, is_active, policy_document_path,
        policy_document_filename, policy_summary_text, emphasis_prompt,
        ai_song_lyrics, ai_overlay_texts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.title,
      data.description ?? null,
      data.category ?? null,
      data.difficultyLevel ?? 'beginner',
      data.estimatedDurationMinutes ?? null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      data.policyDocumentPath ?? null,
      data.policyDocumentFilename ?? null,
      data.policySummaryText ?? null,
      data.emphasisPrompt ?? null,
      data.aiSongLyrics ?? null,
      data.aiOverlayTexts ? JSON.stringify(data.aiOverlayTexts) : null,
      now,
      now,
    );
    const row = db.prepare('SELECT * FROM training_modules WHERE id = ?').get(id);
    return mapModule(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_MODULE, (_event, id: string, updates: any) => {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.difficultyLevel !== undefined) { fields.push('difficulty_level = ?'); values.push(updates.difficultyLevel); }
    if (updates.estimatedDurationMinutes !== undefined) { fields.push('estimated_duration_minutes = ?'); values.push(updates.estimatedDurationMinutes); }
    if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }
    if (updates.policyDocumentPath !== undefined) { fields.push('policy_document_path = ?'); values.push(updates.policyDocumentPath); }
    if (updates.policyDocumentFilename !== undefined) { fields.push('policy_document_filename = ?'); values.push(updates.policyDocumentFilename); }
    if (updates.policySummaryText !== undefined) { fields.push('policy_summary_text = ?'); values.push(updates.policySummaryText); }
    if (updates.emphasisPrompt !== undefined) { fields.push('emphasis_prompt = ?'); values.push(updates.emphasisPrompt); }
    if (updates.aiSongLyrics !== undefined) { fields.push('ai_song_lyrics = ?'); values.push(updates.aiSongLyrics); }
    if (updates.aiOverlayTexts !== undefined) { fields.push('ai_overlay_texts = ?'); values.push(JSON.stringify(updates.aiOverlayTexts)); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE training_modules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM training_modules WHERE id = ?').get(id);
    return mapModule(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_MODULE, (_event, id: string) => {
    db.prepare('DELETE FROM training_modules WHERE id = ?').run(id);
  });

  // ── Videos ────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_VIDEOS, (_event, moduleId?: string) => {
    if (moduleId) {
      const rows = db.prepare('SELECT * FROM videos WHERE training_module_id = ? ORDER BY created_at DESC').all(moduleId);
      return rows.map(mapVideo);
    }
    const rows = db.prepare('SELECT * FROM videos ORDER BY created_at DESC').all();
    return rows.map(mapVideo);
  });

  ipcMain.handle(IPC_CHANNELS.ADD_VIDEO, (_event, data: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO videos (
        id, training_module_id, title, description, file_path,
        youtube_url, duration_seconds, genre, is_primary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.trainingModuleId ?? null,
      data.title,
      data.description ?? null,
      data.filePath ?? null,
      data.youtubeUrl ?? null,
      data.durationSeconds ?? null,
      data.genre ?? null,
      data.isPrimary ? 1 : 0,
      now,
      now,
    );
    const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
    return mapVideo(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_VIDEO, (_event, id: string, updates: any) => {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.trainingModuleId !== undefined) { fields.push('training_module_id = ?'); values.push(updates.trainingModuleId); }
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.filePath !== undefined) { fields.push('file_path = ?'); values.push(updates.filePath); }
    if (updates.youtubeUrl !== undefined) { fields.push('youtube_url = ?'); values.push(updates.youtubeUrl); }
    if (updates.durationSeconds !== undefined) { fields.push('duration_seconds = ?'); values.push(updates.durationSeconds); }
    if (updates.genre !== undefined) { fields.push('genre = ?'); values.push(updates.genre); }
    if (updates.isPrimary !== undefined) { fields.push('is_primary = ?'); values.push(updates.isPrimary ? 1 : 0); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE videos SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
    return mapVideo(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_VIDEO, (_event, id: string) => {
    db.prepare('DELETE FROM videos WHERE id = ?').run(id);
  });

  // ── Users ─────────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_USERS, () => {
    const rows = db.prepare('SELECT * FROM users ORDER BY name ASC').all();
    return rows.map(mapUser);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_USER, (_event, data: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, name, email, department, role, preferred_genre, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.email ?? null,
      data.department ?? null,
      data.role ?? 'employee',
      data.preferredGenre ?? null,
      now,
      now,
    );
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return mapUser(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_USER, (_event, id: string, updates: any) => {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
    if (updates.department !== undefined) { fields.push('department = ?'); values.push(updates.department); }
    if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.preferredGenre !== undefined) { fields.push('preferred_genre = ?'); values.push(updates.preferredGenre); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return mapUser(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_USER, (_event, id: string) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  });

  // ── Quizzes ───────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_QUIZ, (_event, moduleId: string) => {
    const row = db.prepare('SELECT * FROM quizzes WHERE training_module_id = ?').get(moduleId);
    return row ? mapQuiz(row) : null;
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_QUIZ, (_event, data: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO quizzes (id, training_module_id, passing_score, questions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.trainingModuleId,
      data.passingScore ?? 80,
      JSON.stringify(data.questions ?? []),
      now,
      now,
    );
    const row = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
    return mapQuiz(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_QUIZ, (_event, id: string, updates: any) => {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.passingScore !== undefined) { fields.push('passing_score = ?'); values.push(updates.passingScore); }
    if (updates.questions !== undefined) { fields.push('questions = ?'); values.push(JSON.stringify(updates.questions)); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE quizzes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
    return mapQuiz(row);
  });

  // ── Watch Sessions ────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.RECORD_WATCH_SESSION, (_event, data: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO watch_sessions (id, user_id, video_id, watch_percentage, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.videoId,
      data.watchPercentage ?? 0,
      now,
      data.watchPercentage >= 100 ? now : null,
    );

    // Update progress record watch count
    const video = db.prepare('SELECT training_module_id FROM videos WHERE id = ?').get(data.videoId) as any;
    if (video?.training_module_id) {
      const existing = db.prepare(
        'SELECT id FROM progress WHERE user_id = ? AND training_module_id = ?',
      ).get(data.userId, video.training_module_id) as any;

      if (existing) {
        db.prepare(`
          UPDATE progress SET watch_count = watch_count + 1, status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END, last_activity = ? WHERE id = ?
        `).run(now, existing.id);
      } else {
        const progressId = uuidv4();
        db.prepare(`
          INSERT INTO progress (id, user_id, training_module_id, status, watch_count, last_activity)
          VALUES (?, ?, ?, 'in_progress', 1, ?)
        `).run(progressId, data.userId, video.training_module_id, now);
      }
    }

    const row = db.prepare('SELECT * FROM watch_sessions WHERE id = ?').get(id);
    return mapWatchSession(row);
  });

  // ── Quiz Attempts ─────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.SUBMIT_QUIZ_ATTEMPT, (_event, data: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Determine attempt number
    const prev = db.prepare(
      'SELECT MAX(attempt_number) as maxAttempt FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?',
    ).get(data.userId, data.quizId) as any;
    const attemptNumber = (prev?.maxAttempt ?? 0) + 1;

    // Check pass/fail
    const quiz = db.prepare('SELECT passing_score, training_module_id FROM quizzes WHERE id = ?').get(data.quizId) as any;
    const passed = data.score >= (quiz?.passing_score ?? 80) ? 1 : 0;

    db.prepare(`
      INSERT INTO quiz_attempts (id, user_id, quiz_id, score, passed, attempt_number, answers, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.userId,
      data.quizId,
      data.score,
      passed,
      attemptNumber,
      JSON.stringify(data.answers ?? {}),
      now,
    );

    // Update progress
    if (quiz?.training_module_id) {
      const existing = db.prepare(
        'SELECT id, best_score FROM progress WHERE user_id = ? AND training_module_id = ?',
      ).get(data.userId, quiz.training_module_id) as any;

      if (existing) {
        const newBest = Math.max(existing.best_score ?? 0, data.score);
        const newStatus = passed ? 'completed' : 'in_progress';
        db.prepare(`
          UPDATE progress
          SET quiz_attempt_count = quiz_attempt_count + 1,
              best_score = ?,
              status = CASE WHEN ? = 1 THEN 'completed' ELSE status END,
              completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN ? ELSE completed_at END,
              last_activity = ?
          WHERE id = ?
        `).run(newBest, passed, passed, now, now, existing.id);
      } else {
        const progressId = uuidv4();
        db.prepare(`
          INSERT INTO progress (id, user_id, training_module_id, status, quiz_attempt_count, best_score, completed_at, last_activity)
          VALUES (?, ?, ?, ?, 1, ?, ?, ?)
        `).run(
          progressId,
          data.userId,
          quiz.training_module_id,
          passed ? 'completed' : 'in_progress',
          data.score,
          passed ? now : null,
          now,
        );
      }
    }

    const row = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(id);
    return mapQuizAttempt(row);
  });

  ipcMain.handle(IPC_CHANNELS.GET_QUIZ_ATTEMPTS, (_event, quizId: string, userId?: string) => {
    if (userId) {
      const rows = db.prepare(
        'SELECT * FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? ORDER BY attempt_number DESC',
      ).all(quizId, userId);
      return rows.map(mapQuizAttempt);
    }
    const rows = db.prepare('SELECT * FROM quiz_attempts WHERE quiz_id = ? ORDER BY completed_at DESC').all(quizId);
    return rows.map(mapQuizAttempt);
  });

  // ── Progress ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_PROGRESS, () => {
    const rows = db.prepare('SELECT * FROM progress ORDER BY last_activity DESC').all();
    return rows.map(mapProgress);
  });

  ipcMain.handle(IPC_CHANNELS.GET_USER_PROGRESS, (_event, userId: string) => {
    const rows = db.prepare('SELECT * FROM progress WHERE user_id = ? ORDER BY last_activity DESC').all(userId);
    return rows.map(mapProgress);
  });

  ipcMain.handle(IPC_CHANNELS.GET_MODULE_PROGRESS, (_event, moduleId: string) => {
    const rows = db.prepare('SELECT * FROM progress WHERE training_module_id = ? ORDER BY last_activity DESC').all(moduleId);
    return rows.map(mapProgress);
  });

  // ── Playlists ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_PLAYLISTS, () => {
    const rows = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all();
    const playlists = rows.map(mapPlaylist);

    // Attach items to each playlist
    for (const playlist of playlists) {
      const items = db.prepare(
        'SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY position ASC',
      ).all(playlist.id);
      playlist.items = items.map(mapPlaylistItem);
    }

    return playlists;
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_PLAYLIST, (_event, data: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO playlists (id, title, description, is_required, auto_play, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.title,
      data.description ?? null,
      data.isRequired ? 1 : 0,
      data.autoPlay !== undefined ? (data.autoPlay ? 1 : 0) : 1,
      now,
      now,
    );
    const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    const playlist = mapPlaylist(row);
    playlist.items = [];
    return playlist;
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PLAYLIST, (_event, id: string, updates: any) => {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.isRequired !== undefined) { fields.push('is_required = ?'); values.push(updates.isRequired ? 1 : 0); }
    if (updates.autoPlay !== undefined) { fields.push('auto_play = ?'); values.push(updates.autoPlay ? 1 : 0); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE playlists SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
    const playlist = mapPlaylist(row);
    const items = db.prepare('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY position ASC').all(id);
    playlist.items = items.map(mapPlaylistItem);
    return playlist;
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PLAYLIST, (_event, id: string) => {
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.ADD_PLAYLIST_ITEM, (_event, playlistId: string, moduleId: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get next position
    const last = db.prepare(
      'SELECT MAX(position) as maxPos FROM playlist_items WHERE playlist_id = ?',
    ).get(playlistId) as any;
    const position = (last?.maxPos ?? 0) + 1;

    db.prepare(`
      INSERT INTO playlist_items (id, playlist_id, training_module_id, position, require_completion, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(id, playlistId, moduleId, position, now);

    // Update playlist updated_at
    db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now, playlistId);

    const row = db.prepare('SELECT * FROM playlist_items WHERE id = ?').get(id);
    return mapPlaylistItem(row);
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_PLAYLIST_ITEM, (_event, itemId: string) => {
    const item = db.prepare('SELECT playlist_id, position FROM playlist_items WHERE id = ?').get(itemId) as any;
    if (!item) return;

    db.prepare('DELETE FROM playlist_items WHERE id = ?').run(itemId);

    // Reorder remaining items to close the gap
    db.prepare(`
      UPDATE playlist_items SET position = position - 1
      WHERE playlist_id = ? AND position > ?
    `).run(item.playlist_id, item.position);

    db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), item.playlist_id);
  });

  ipcMain.handle(IPC_CHANNELS.REORDER_PLAYLIST, (_event, playlistId: string, orderedItemIds: string[]) => {
    const now = new Date().toISOString();
    const updateStmt = db.prepare('UPDATE playlist_items SET position = ? WHERE id = ? AND playlist_id = ?');

    const transaction = db.transaction(() => {
      for (let i = 0; i < orderedItemIds.length; i++) {
        updateStmt.run(i + 1, orderedItemIds[i], playlistId);
      }
      db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now, playlistId);
    });
    transaction();

    const items = db.prepare('SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY position ASC').all(playlistId);
    return items.map(mapPlaylistItem);
  });

  // ── AI Assets ─────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_AI_ASSETS, (_event, moduleId?: string) => {
    if (moduleId) {
      const rows = db.prepare(
        'SELECT * FROM ai_assets WHERE training_module_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      ).all(moduleId);
      return rows.map(mapAiAsset);
    }
    const rows = db.prepare('SELECT * FROM ai_assets WHERE deleted_at IS NULL ORDER BY created_at DESC').all();
    return rows.map(mapAiAsset);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_AI_ASSET, (_event, data: any) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO ai_assets (
        id, training_module_id, asset_type, title, description,
        status, file_path, metadata, duration_seconds, style, source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.trainingModuleId ?? null,
      data.assetType ?? 'audio',
      data.title ?? null,
      data.description ?? null,
      data.status ?? 'pending',
      data.filePath ?? null,
      data.metadata ? JSON.stringify(data.metadata) : '{}',
      data.durationSeconds ?? null,
      data.style ?? null,
      data.source ?? null,
      now,
      now,
    );

    // Auto-create a QC task for the new asset
    const qcId = uuidv4();
    db.prepare(`
      INSERT INTO qc_tasks (id, asset_id, asset_type, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(qcId, id, data.assetType ?? 'audio', now);

    const row = db.prepare('SELECT * FROM ai_assets WHERE id = ?').get(id);
    return mapAiAsset(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_AI_ASSET, (_event, id: string, updates: any) => {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.trainingModuleId !== undefined) { fields.push('training_module_id = ?'); values.push(updates.trainingModuleId); }
    if (updates.assetType !== undefined) { fields.push('asset_type = ?'); values.push(updates.assetType); }
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.filePath !== undefined) { fields.push('file_path = ?'); values.push(updates.filePath); }
    if (updates.metadata !== undefined) { fields.push('metadata = ?'); values.push(JSON.stringify(updates.metadata)); }
    if (updates.durationSeconds !== undefined) { fields.push('duration_seconds = ?'); values.push(updates.durationSeconds); }
    if (updates.style !== undefined) { fields.push('style = ?'); values.push(updates.style); }
    if (updates.source !== undefined) { fields.push('source = ?'); values.push(updates.source); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE ai_assets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM ai_assets WHERE id = ?').get(id);
    return mapAiAsset(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_AI_ASSET, (_event, id: string) => {
    // Soft delete
    const now = new Date().toISOString();
    db.prepare('UPDATE ai_assets SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
  });

  // ── QC Tasks ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_QC_TASKS, (_event, status?: string) => {
    if (status) {
      const rows = db.prepare('SELECT * FROM qc_tasks WHERE status = ? ORDER BY created_at DESC').all(status);
      return rows.map(mapQcTask);
    }
    const rows = db.prepare('SELECT * FROM qc_tasks ORDER BY created_at DESC').all();
    return rows.map(mapQcTask);
  });

  ipcMain.handle(IPC_CHANNELS.APPROVE_QC_TASK, (_event, taskId: string, reviewer: string, notes?: string) => {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE qc_tasks SET status = 'approved', reviewer = ?, notes = ?, completed_at = ? WHERE id = ?
    `).run(reviewer, notes ?? null, now, taskId);

    // Also update the linked asset status
    const task = db.prepare('SELECT asset_id FROM qc_tasks WHERE id = ?').get(taskId) as any;
    if (task) {
      db.prepare('UPDATE ai_assets SET status = ?, approved_at = ?, updated_at = ? WHERE id = ?').run(
        'approved', now, now, task.asset_id,
      );
    }

    const row = db.prepare('SELECT * FROM qc_tasks WHERE id = ?').get(taskId);
    return mapQcTask(row);
  });

  ipcMain.handle(IPC_CHANNELS.REJECT_QC_TASK, (_event, taskId: string, reviewer: string, notes?: string) => {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE qc_tasks SET status = 'rejected', reviewer = ?, notes = ?, completed_at = ? WHERE id = ?
    `).run(reviewer, notes ?? null, now, taskId);

    // Also update the linked asset status
    const task = db.prepare('SELECT asset_id FROM qc_tasks WHERE id = ?').get(taskId) as any;
    if (task) {
      db.prepare('UPDATE ai_assets SET status = ?, updated_at = ? WHERE id = ?').run(
        'rejected', now, task.asset_id,
      );
    }

    const row = db.prepare('SELECT * FROM qc_tasks WHERE id = ?').get(taskId);
    return mapQcTask(row);
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const settings: Record<string, any> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updates: Record<string, any>) => {
    const upsert = db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    const transaction = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        upsert.run(key, serialized);
      }
    });
    transaction();
  });

  // ── File Pickers ──────────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.PICK_VIDEO_FILE, async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Video File',
      filters: [
        { name: 'Videos', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.PICK_DOCUMENT_FILE, async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Document',
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'doc', 'txt', 'md', 'rtf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.PICK_AUDIO_FILE, async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Audio File',
      filters: [
        { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // ── Window Controls ───────────────────────────────────────────────────────

  ipcMain.on(IPC_CHANNELS.MINIMIZE_WINDOW, () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on(IPC_CHANNELS.MAXIMIZE_WINDOW, () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.close();
  });

  // ── Dashboard Stats ───────────────────────────────────────────────────────

  ipcMain.handle(IPC_CHANNELS.GET_DASHBOARD_STATS, () => {
    const moduleCount = (db.prepare('SELECT COUNT(*) as count FROM training_modules WHERE is_active = 1').get() as any).count;
    const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
    const videoCount = (db.prepare('SELECT COUNT(*) as count FROM videos').get() as any).count;
    const playlistCount = (db.prepare('SELECT COUNT(*) as count FROM playlists').get() as any).count;

    const totalProgress = (db.prepare('SELECT COUNT(*) as count FROM progress').get() as any).count;
    const completedProgress = (db.prepare("SELECT COUNT(*) as count FROM progress WHERE status = 'completed'").get() as any).count;
    const completionRate = totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0;

    const pendingQcCount = (db.prepare("SELECT COUNT(*) as count FROM qc_tasks WHERE status = 'pending'").get() as any).count;
    const aiAssetCount = (db.prepare('SELECT COUNT(*) as count FROM ai_assets WHERE deleted_at IS NULL').get() as any).count;

    const avgScore = (db.prepare('SELECT AVG(best_score) as avg FROM progress WHERE best_score > 0').get() as any).avg ?? 0;

    // Recent activity: last 5 progress updates
    const recentActivity = db.prepare(`
      SELECT p.*, u.name as user_name, tm.title as module_title
      FROM progress p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN training_modules tm ON tm.id = p.training_module_id
      ORDER BY p.last_activity DESC
      LIMIT 5
    `).all().map((row: any) => ({
      ...mapProgress(row),
      userName: row.user_name,
      moduleTitle: row.module_title,
    }));

    return {
      moduleCount,
      userCount,
      videoCount,
      playlistCount,
      completionRate,
      pendingQcCount,
      aiAssetCount,
      averageScore: Math.round(avgScore * 10) / 10,
      totalEnrollments: totalProgress,
      completedEnrollments: completedProgress,
      recentActivity,
    };
  });
}

// ─── App Lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  console.log('NovaSyn LMS is ready');

  try {
    getDatabase();
    runMigrations();
    console.log('Database initialized, migrations complete');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    app.quit();
    return;
  }

  registerIPCHandlers();
  const mainWindow = createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  app.quit();
});

app.on('before-quit', () => {
  closeDatabase();
});
