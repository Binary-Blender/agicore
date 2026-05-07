import { app, ipcMain, dialog, BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { createMainWindow, getMainWindow } from './window';
import { getDatabase, closeDatabase, runMigrations } from './database/db';
import { loadApiKeys, saveApiKey } from './config/apiKeyStore';
import { loadSettings, saveSettings } from './config/settingsStore';
import { chatService, AVAILABLE_MODELS } from './services/ChatService';
import { tokenizerService } from './services/TokenizerService';
import { buildFileTree, readFileContent, writeFileContent, createNewFile, deleteFileOrDir, renameFileOrDir } from './services/FileTreeService';
import { createTerminal, writeToTerminal, resizeTerminal, closeTerminal, listTerminals, closeAllTerminals } from './services/TerminalService';
import { initVault, vaultList, vaultStore, vaultSearch, vaultGetTags } from './vault/vaultService';
import { registerMacros, unregisterMacros, getAvailableMacros } from './vault/macroRegistry';
import { startQueueWatcher, stopQueueWatcher, sendMacroRequest, getPendingRequests } from './vault/queueWatcher';
import { IPC_CHANNELS } from '../shared/types';
import type { ChatMessage, Project, Session } from '../shared/types';

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    shell: row.shell,
    lastOpenedAt: row.last_opened_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row: any): Session {
  return {
    id: row.id,
    projectId: row.project_id || null,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChatMessage(row: any): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    userMessage: row.user_message,
    aiMessage: row.ai_message,
    userTokens: row.user_tokens,
    aiTokens: row.ai_tokens,
    totalTokens: row.total_tokens,
    model: row.model,
    provider: row.provider,
    systemPrompt: row.system_prompt || null,
    contextFiles: JSON.parse(row.context_files || '[]'),
    isExcluded: !!row.is_excluded,
    timestamp: row.timestamp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  const db = getDatabase();
  runMigrations();
  initVault();
  registerMacros();
  startQueueWatcher();

  const mainWindow = createMainWindow();

  // ─── Window controls ────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.MINIMIZE_WINDOW, () => mainWindow.minimize());
  ipcMain.handle(IPC_CHANNELS.MAXIMIZE_WINDOW, () => {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.handle(IPC_CHANNELS.CLOSE_WINDOW, () => mainWindow.close());

  // ─── Settings & API Keys ───────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => loadSettings());
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updates) => {
    saveSettings(updates);
    return true;
  });
  ipcMain.handle(IPC_CHANNELS.GET_API_KEYS, () => loadApiKeys());
  ipcMain.handle(IPC_CHANNELS.SET_API_KEY, (_event, provider: string, key: string) => {
    saveApiKey(provider, key);
    return true;
  });
  ipcMain.handle(IPC_CHANNELS.GET_MODELS, () => AVAILABLE_MODELS);

  // ─── Projects ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, () => {
    try {
      const rows = db.prepare('SELECT * FROM projects ORDER BY last_opened_at DESC').all();
      return rows.map(mapProject);
    } catch (error) {
      console.error('GET_PROJECTS error:', error);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_PROJECT, (_event, name: string, projectPath: string, shell?: string) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO projects (id, name, path, shell, last_opened_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, name, projectPath, shell || 'wsl', now, now, now);
      return mapProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
    } catch (error) {
      console.error('CREATE_PROJECT error:', error);
      return { error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PROJECT, (_event, id: string, updates: Partial<Project>) => {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
      if (updates.path !== undefined) { fields.push('path = ?'); values.push(updates.path); }
      if (updates.shell !== undefined) { fields.push('shell = ?'); values.push(updates.shell); }
      fields.push('updated_at = ?'); values.push(new Date().toISOString());
      values.push(id);
      db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      return mapProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(id));
    } catch (error) {
      console.error('UPDATE_PROJECT error:', error);
      return { error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PROJECT, (_event, id: string) => {
    try {
      db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    } catch (error) {
      console.error('DELETE_PROJECT error:', error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_PROJECT, (_event, id: string) => {
    try {
      const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
      if (!row) return { error: 'Project not found' };
      db.prepare('UPDATE projects SET last_opened_at = ? WHERE id = ?').run(new Date().toISOString(), id);
      return buildFileTree(row.path);
    } catch (error) {
      console.error('OPEN_PROJECT error:', error);
      return { error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_PROJECT_DIR, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Directory',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // ─── Sessions ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_SESSIONS, () => {
    try {
      const rows = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all();
      return rows.map(mapSession);
    } catch (error) {
      console.error('GET_SESSIONS error:', error);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_SESSION, (_event, name: string, projectId?: string) => {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO sessions (id, project_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run(id, projectId || null, name, now, now);
      return mapSession(db.prepare('SELECT * FROM sessions WHERE id = ?').get(id));
    } catch (error) {
      console.error('CREATE_SESSION error:', error);
      return { error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SESSION, (_event, id: string, updates: { name: string }) => {
    try {
      db.prepare('UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?')
        .run(updates.name, new Date().toISOString(), id);
      return mapSession(db.prepare('SELECT * FROM sessions WHERE id = ?').get(id));
    } catch (error) {
      console.error('UPDATE_SESSION error:', error);
      return { error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_SESSION, (_event, id: string) => {
    try {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    } catch (error) {
      console.error('DELETE_SESSION error:', error);
    }
  });

  // ─── Chat ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.SEND_CHAT, async (event, userMessage: string, modelId: string, context: any) => {
    try {
      const apiKeys = loadApiKeys();
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (!model) throw new Error(`Unknown model: ${modelId}`);

      const apiKey = apiKeys[model.provider];
      if (!apiKey) throw new Error(`No API key for provider: ${model.provider}`);

      // Build message history for API
      const historyMessages = (context.chatHistory || []).flatMap((msg: ChatMessage) => [
        { role: 'user' as const, content: msg.userMessage },
        { role: 'assistant' as const, content: msg.aiMessage },
      ]);
      historyMessages.push({ role: 'user' as const, content: userMessage });

      // Build context string from files
      let contextString: string | undefined;
      if (context.contextFiles && context.contextFiles.length > 0) {
        const fileContents = context.contextFiles.map((filePath: string) => {
          try {
            const content = readFileContent(filePath);
            return `=== ${filePath} ===\n${content}`;
          } catch {
            return `=== ${filePath} ===\n[Error reading file]`;
          }
        });
        contextString = fileContents.join('\n\n');
      }

      const settings = loadSettings();

      // Stream response
      const result = await chatService.completeStream(
        historyMessages,
        modelId,
        contextString,
        apiKey,
        settings.systemPrompt || undefined,
        (delta) => {
          event.sender.send('chat-stream-delta', delta);
        },
      );

      // Save to database
      const id = uuidv4();
      const now = new Date().toISOString();
      const userTokens = tokenizerService.estimateTokens(userMessage);
      const aiTokens = result.responseTokens || tokenizerService.estimateTokens(result.content);

      db.prepare(`
        INSERT INTO chat_messages (id, session_id, user_message, ai_message, user_tokens, ai_tokens, total_tokens, model, provider, system_prompt, context_files, timestamp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, context.sessionId, userMessage, result.content,
        userTokens, aiTokens, userTokens + aiTokens,
        result.model, model.provider,
        settings.systemPrompt || null,
        JSON.stringify(context.contextFiles || []),
        now, now, now,
      );

      // Update session timestamp
      db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, context.sessionId);

      return mapChatMessage(db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id));
    } catch (error) {
      console.error('SEND_CHAT error:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.LOAD_CHATS, (_event, options?: { sessionId?: string; limit?: number }) => {
    try {
      if (options?.sessionId) {
        const rows = db.prepare(
          'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?'
        ).all(options.sessionId, options?.limit || 500);
        return rows.map(mapChatMessage);
      }
      const rows = db.prepare(
        'SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT ?'
      ).all(options?.limit || 100);
      return rows.map(mapChatMessage);
    } catch (error) {
      console.error('LOAD_CHATS error:', error);
      return [];
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CHAT_MESSAGE, (_event, id: string) => {
    try {
      db.prepare('DELETE FROM chat_messages WHERE id = ?').run(id);
    } catch (error) {
      console.error('DELETE_CHAT_MESSAGE error:', error);
    }
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH_CHATS, (_event, query: string) => {
    try {
      const q = `%${query}%`;
      const rows = db.prepare(
        'SELECT * FROM chat_messages WHERE user_message LIKE ? OR ai_message LIKE ? ORDER BY timestamp DESC LIMIT 50'
      ).all(q, q);
      return rows.map(mapChatMessage);
    } catch (error) {
      console.error('SEARCH_CHATS error:', error);
      return [];
    }
  });

  // ─── File Tree ─────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_FILE_TREE, (_event, rootPath: string) => {
    try {
      return buildFileTree(rootPath);
    } catch (error) {
      console.error('GET_FILE_TREE error:', error);
      return { error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.READ_FILE, (_event, filePath: string) => {
    try {
      return readFileContent(filePath);
    } catch (error) {
      console.error('READ_FILE error:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.WRITE_FILE, (_event, filePath: string, content: string) => {
    try {
      writeFileContent(filePath, content);
    } catch (error) {
      console.error('WRITE_FILE error:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_FILE, (_event, filePath: string, content?: string) => {
    try {
      createNewFile(filePath, content);
    } catch (error) {
      console.error('CREATE_FILE error:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_FILE, (_event, filePath: string) => {
    try {
      deleteFileOrDir(filePath);
    } catch (error) {
      console.error('DELETE_FILE error:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.RENAME_FILE, (_event, oldPath: string, newPath: string) => {
    try {
      renameFileOrDir(oldPath, newPath);
    } catch (error) {
      console.error('RENAME_FILE error:', error);
      throw error;
    }
  });

  // ─── Terminal ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.TERMINAL_CREATE, (_event, options?: any) => {
    try {
      const terminal = createTerminal(
        options || {},
        (id, data) => {
          mainWindow.webContents.send('terminal-data', id, data);
        },
        (id) => {
          mainWindow.webContents.send('terminal-exit', id);
        },
      );
      return { id: terminal.id, name: terminal.name, shell: terminal.shell, cwd: terminal.cwd, isActive: true };
    } catch (error) {
      console.error('TERMINAL_CREATE error:', error);
      throw error;
    }
  });

  ipcMain.on(IPC_CHANNELS.TERMINAL_WRITE, (_event, id: string, data: string) => {
    writeToTerminal(id, data);
  });

  ipcMain.on(IPC_CHANNELS.TERMINAL_RESIZE, (_event, id: string, cols: number, rows: number) => {
    resizeTerminal(id, cols, rows);
  });

  ipcMain.handle(IPC_CHANNELS.TERMINAL_CLOSE, (_event, id: string) => {
    closeTerminal(id);
  });

  ipcMain.handle(IPC_CHANNELS.TERMINAL_LIST, () => {
    return listTerminals();
  });

  // ─── NS Vault ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.VAULT_LIST, (_event, options?: any) => {
    try { return vaultList(options); } catch (error) { console.error('VAULT_LIST error:', error); return []; }
  });
  ipcMain.handle(IPC_CHANNELS.VAULT_STORE, (_event, input: any) => {
    try { return vaultStore(input); } catch (error) { console.error('VAULT_STORE error:', error); throw error; }
  });
  ipcMain.handle(IPC_CHANNELS.VAULT_SEARCH, (_event, options: any) => {
    try { return vaultSearch(options); } catch (error) { console.error('VAULT_SEARCH error:', error); return []; }
  });
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_TAGS, () => {
    try { return vaultGetTags(); } catch (error) { console.error('VAULT_GET_TAGS error:', error); return []; }
  });

  // ─── Macro Queue ───────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.MACRO_GET_AVAILABLE, () => {
    try { return getAvailableMacros(); } catch (error) { console.error('MACRO_GET_AVAILABLE error:', error); return {}; }
  });
  ipcMain.handle(IPC_CHANNELS.MACRO_INVOKE, async (_event, targetApp: string, macro: string, input: any) => {
    try { return await sendMacroRequest(targetApp, macro, input); } catch (error) { console.error('MACRO_INVOKE error:', error); throw error; }
  });
  ipcMain.handle(IPC_CHANNELS.MACRO_GET_PENDING, () => {
    try { return getPendingRequests(); } catch (error) { return []; }
  });
});

app.on('window-all-closed', () => {
  closeAllTerminals();
  stopQueueWatcher();
  unregisterMacros();
  closeDatabase();
  app.quit();
});
