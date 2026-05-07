import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { createMainWindow } from './window';
import { getDatabase, closeDatabase, runMigrations } from './database/db';
import { loadApiKeys, saveApiKey } from './config/apiKeyStore';
import { loadSettings, saveSettings } from './config/settingsStore';
import { IPC_CHANNELS, PIPELINE_STEPS } from '../shared/types';
import type { ForgeProject, Feature, FeatureStep, Conversation, Decision, AiRole, CreateDecisionInput, CreateFeatureInput } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { sendChatRequest } from './ai/chatClient';
import { SYSTEM_PROMPTS } from './ai/systemPrompts';
import { scaffoldProject } from './scaffolding/scaffold';
import { generateStepCode } from './pipeline/stepGenerator';
import { closeLogger, refreshLoggerEnabled } from './services/logger';

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

// -- Row mappers --

type ProjectRow = {
  id: string; name: string; description: string; path: string;
  package_name: string; display_name: string; port: number;
  db_name: string; app_id: string; status: string;
  created_at: string; updated_at: string;
};

function mapProjectRow(row: ProjectRow): ForgeProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    path: row.path,
    packageName: row.package_name,
    displayName: row.display_name,
    port: row.port,
    dbName: row.db_name,
    appId: row.app_id,
    status: row.status as 'active' | 'scaffolded' | 'archived',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ConversationRow = {
  id: string; project_id: string; role: string; title: string;
  messages: string; created_at: string; updated_at: string;
};

type DecisionRow = {
  id: string; project_id: string; feature_id: string | null;
  summary: string; reasoning: string; source_role: string;
  tags: string; created_at: string;
};

function mapConversationRow(row: ConversationRow): Conversation {
  return {
    id: row.id,
    projectId: row.project_id,
    role: row.role as AiRole,
    title: row.title,
    messages: JSON.parse(row.messages),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDecisionRow(row: DecisionRow): Decision {
  return {
    id: row.id,
    projectId: row.project_id,
    featureId: row.feature_id,
    summary: row.summary,
    reasoning: row.reasoning,
    sourceRole: row.source_role,
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
  };
}

type FeatureRow = {
  id: string; project_id: string; name: string; description: string;
  entity_name: string; table_name: string; current_step: number;
  status: string; created_at: string; updated_at: string;
};

type FeatureStepRow = {
  id: string; feature_id: string; step_number: number; step_name: string;
  generated_code: string; is_applied: number; applied_at: string | null;
  created_at: string; updated_at: string;
};

function mapFeatureRow(row: FeatureRow): Feature {
  return {
    id: row.id, projectId: row.project_id, name: row.name,
    description: row.description, entityName: row.entity_name,
    tableName: row.table_name, currentStep: row.current_step,
    status: row.status as Feature['status'],
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapFeatureStepRow(row: FeatureStepRow): FeatureStep {
  return {
    id: row.id, featureId: row.feature_id, stepNumber: row.step_number,
    stepName: row.step_name, generatedCode: row.generated_code,
    isApplied: !!row.is_applied,
    appliedAt: row.applied_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

// -- Models --

const AVAILABLE_MODELS = [
  { id: 'babyai-auto', name: 'BabyAI Auto', provider: 'babyai', contextWindow: 128000, requiresKey: true },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', contextWindow: 200000, requiresKey: true },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'anthropic', contextWindow: 200000, requiresKey: true },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', contextWindow: 1047576, requiresKey: true },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', contextWindow: 1047576, requiresKey: true },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', contextWindow: 1048576, requiresKey: true },
  { id: 'grok-3', name: 'Grok 3', provider: 'xai', contextWindow: 131072, requiresKey: true },
];

// -- IPC Registration --

function registerIPCHandlers() {
  // Projects
  ipcMain.handle(IPC_CHANNELS.GET_PROJECTS, async () => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM projects WHERE status = ? ORDER BY updated_at DESC').all('active') as ProjectRow[];
    return rows.map(mapProjectRow);
  });

  ipcMain.handle(IPC_CHANNELS.GET_PROJECT, async (_event, id: string) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
    return row ? mapProjectRow(row) : null;
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_PROJECT, async (_event, input) => {
    const db = getDatabase();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO projects (id, name, description, path, package_name, display_name, port, db_name, app_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.name, input.description || '', input.path, input.packageName, input.displayName, input.port, input.dbName, input.appId);
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow;
    return mapProjectRow(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PROJECT, async (_event, id: string, updates: Partial<ForgeProject>) => {
    const db = getDatabase();
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
    if (updates.path !== undefined) { fields.push('path = ?'); params.push(updates.path); }
    if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
    if (updates.port !== undefined) { fields.push('port = ?'); params.push(updates.port); }
    if (fields.length > 0) {
      params.push(id);
      db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow;
    return mapProjectRow(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PROJECT, async (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_PROJECT_DIR, async (_event, projectPath: string) => {
    await shell.openPath(projectPath);
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_PROJECT_DIR, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Project Directory',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Settings
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => loadSettings());
  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, async (_event, updates) => { saveSettings(updates); refreshLoggerEnabled(); });

  // API Keys
  ipcMain.handle(IPC_CHANNELS.GET_API_KEYS, async () => loadApiKeys());
  ipcMain.handle(IPC_CHANNELS.SET_API_KEY, async (_event, provider: string, key: string) => saveApiKey(provider, key));

  // Models
  ipcMain.handle(IPC_CHANNELS.GET_MODELS, async () => AVAILABLE_MODELS);

  // Conversations
  ipcMain.handle(IPC_CHANNELS.GET_CONVERSATIONS, async (_event, projectId: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM conversations WHERE project_id = ? ORDER BY updated_at DESC').all(projectId) as ConversationRow[];
    return rows.map(mapConversationRow);
  });

  ipcMain.handle(IPC_CHANNELS.GET_CONVERSATION, async (_event, id: string) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as ConversationRow | undefined;
    return row ? mapConversationRow(row) : null;
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_CONVERSATION, async (_event, projectId: string, role: AiRole, title?: string) => {
    const db = getDatabase();
    const id = uuidv4();
    const conversationTitle = title || `New ${role.charAt(0).toUpperCase() + role.slice(1)} Conversation`;
    db.prepare(`
      INSERT INTO conversations (id, project_id, role, title, messages)
      VALUES (?, ?, ?, ?, '[]')
    `).run(id, projectId, role, conversationTitle);
    const row = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as ConversationRow;
    return mapConversationRow(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CONVERSATION, async (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  });

  // AI Chat
  ipcMain.handle(IPC_CHANNELS.SEND_CHAT, async (_event, conversationId: string, message: string, model: string) => {
    const db = getDatabase();

    // 1. Get conversation
    const convRow = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId) as ConversationRow | undefined;
    if (!convRow) throw new Error(`Conversation not found: ${conversationId}`);

    // 2. Parse existing messages
    const existingMessages = JSON.parse(convRow.messages) as { role: string; content: string; timestamp: string }[];

    // 3. Build system prompt
    const systemPrompt = SYSTEM_PROMPTS[convRow.role];
    if (!systemPrompt) throw new Error(`Unknown role: ${convRow.role}`);

    // 4. Add new user message
    const userTimestamp = new Date().toISOString();
    existingMessages.push({ role: 'user', content: message, timestamp: userTimestamp });

    // 5. Load API keys and settings
    const apiKeys = loadApiKeys();
    const settings = loadSettings();

    // 6. Build messages array for API call
    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...existingMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // 7. Call AI
    const response = await sendChatRequest({
      model,
      messages: chatMessages,
      apiKeys,
      babyaiUrl: settings.babyaiUrl,
      hfToken: settings.hfToken,
    });

    // 8. Add assistant response
    const assistantTimestamp = new Date().toISOString();
    existingMessages.push({ role: 'assistant', content: response, timestamp: assistantTimestamp });

    // 9. Update conversation in DB
    db.prepare('UPDATE conversations SET messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(existingMessages), conversationId);

    // 10. Log to ai_log
    const provider = model.startsWith('babyai-') ? 'babyai'
      : model.startsWith('claude-') ? 'anthropic'
      : model.startsWith('gpt-') ? 'openai'
      : model.startsWith('gemini-') ? 'google'
      : model.startsWith('grok-') ? 'xai'
      : 'unknown';

    db.prepare(`
      INSERT INTO ai_log (id, project_id, model_id, provider, operation)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), convRow.project_id, model, provider, 'chat');

    return { role: 'assistant' as const, content: response, timestamp: assistantTimestamp };
  });

  // Decisions
  ipcMain.handle(IPC_CHANNELS.GET_DECISIONS, async (_event, projectId: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM decisions WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as DecisionRow[];
    return rows.map(mapDecisionRow);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_DECISION, async (_event, input: CreateDecisionInput) => {
    const db = getDatabase();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO decisions (id, project_id, feature_id, summary, reasoning, source_role, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.projectId,
      input.featureId || null,
      input.summary,
      input.reasoning || '',
      input.sourceRole,
      JSON.stringify(input.tags || []),
    );
    const row = db.prepare('SELECT * FROM decisions WHERE id = ?').get(id) as DecisionRow;
    return mapDecisionRow(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_DECISION, async (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM decisions WHERE id = ?').run(id);
  });

  // Scaffolding
  ipcMain.handle(IPC_CHANNELS.SCAFFOLD_PROJECT, async (_event, projectId: string) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectRow | undefined;
    if (!row) return { success: false, filesCreated: 0, error: 'Project not found' };
    const project = mapProjectRow(row);
    return scaffoldProject(project);
  });

  // Features & Pipeline
  ipcMain.handle(IPC_CHANNELS.GET_FEATURES, async (_event, projectId: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM features WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as FeatureRow[];
    return rows.map(mapFeatureRow);
  });

  ipcMain.handle(IPC_CHANNELS.GET_FEATURE, async (_event, id: string) => {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM features WHERE id = ?').get(id) as FeatureRow | undefined;
    return row ? mapFeatureRow(row) : null;
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_FEATURE, async (_event, input: CreateFeatureInput) => {
    const db = getDatabase();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO features (id, project_id, name, description, entity_name, table_name, current_step, status)
      VALUES (?, ?, ?, ?, ?, ?, 0, 'in_progress')
    `).run(id, input.projectId, input.name, input.description || '', input.entityName, input.tableName);
    const row = db.prepare('SELECT * FROM features WHERE id = ?').get(id) as FeatureRow;
    return mapFeatureRow(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_FEATURE, async (_event, id: string, updates: Partial<Feature>) => {
    const db = getDatabase();
    const fields: string[] = [];
    const params: any[] = [];
    if (updates.name !== undefined) { fields.push('name = ?'); params.push(updates.name); }
    if (updates.description !== undefined) { fields.push('description = ?'); params.push(updates.description); }
    if (updates.status !== undefined) { fields.push('status = ?'); params.push(updates.status); }
    if (updates.currentStep !== undefined) { fields.push('current_step = ?'); params.push(updates.currentStep); }
    if (fields.length > 0) {
      params.push(id);
      db.prepare(`UPDATE features SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...params);
    }
    const row = db.prepare('SELECT * FROM features WHERE id = ?').get(id) as FeatureRow;
    return mapFeatureRow(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_FEATURE, async (_event, id: string) => {
    const db = getDatabase();
    db.prepare('DELETE FROM feature_steps WHERE feature_id = ?').run(id);
    db.prepare('DELETE FROM features WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.GET_FEATURE_STEPS, async (_event, featureId: string) => {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM feature_steps WHERE feature_id = ? ORDER BY step_number ASC').all(featureId) as FeatureStepRow[];
    return rows.map(mapFeatureStepRow);
  });

  ipcMain.handle(IPC_CHANNELS.GENERATE_STEP, async (_event, featureId: string, stepNumber: number) => {
    const db = getDatabase();

    // 1. Load the feature
    const featureRow = db.prepare('SELECT * FROM features WHERE id = ?').get(featureId) as FeatureRow | undefined;
    if (!featureRow) throw new Error(`Feature not found: ${featureId}`);
    const feature = mapFeatureRow(featureRow);

    // 2. Load the project
    const projectRow = db.prepare('SELECT * FROM projects WHERE id = ?').get(feature.projectId) as ProjectRow | undefined;
    if (!projectRow) throw new Error(`Project not found: ${feature.projectId}`);
    const project = mapProjectRow(projectRow);

    // 3. Load existing steps for context
    const stepRows = db.prepare('SELECT * FROM feature_steps WHERE feature_id = ? AND step_number < ? ORDER BY step_number ASC')
      .all(featureId, stepNumber) as FeatureStepRow[];
    const previousSteps = stepRows.map(mapFeatureStepRow);

    // 4. Generate code via AI
    const generatedCode = await generateStepCode({ project, feature, previousSteps, stepNumber });

    // 5. Upsert the feature_step row
    const stepDef = PIPELINE_STEPS.find(s => s.number === stepNumber);
    const stepName = stepDef ? stepDef.label : `Step ${stepNumber}`;

    const existingStep = db.prepare('SELECT * FROM feature_steps WHERE feature_id = ? AND step_number = ?')
      .get(featureId, stepNumber) as FeatureStepRow | undefined;

    let stepId: string;
    if (existingStep) {
      stepId = existingStep.id;
      db.prepare(`
        UPDATE feature_steps SET generated_code = ?, is_applied = 0, applied_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(generatedCode, stepId);
    } else {
      stepId = uuidv4();
      db.prepare(`
        INSERT INTO feature_steps (id, feature_id, step_number, step_name, generated_code, is_applied)
        VALUES (?, ?, ?, ?, ?, 0)
      `).run(stepId, featureId, stepNumber, stepName, generatedCode);
    }

    // 6. Update feature.current_step
    db.prepare('UPDATE features SET current_step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(stepNumber, featureId);

    // 7. Return the step
    const resultRow = db.prepare('SELECT * FROM feature_steps WHERE id = ?').get(stepId) as FeatureStepRow;
    return mapFeatureStepRow(resultRow);
  });

  ipcMain.handle(IPC_CHANNELS.APPLY_STEP, async (_event, stepId: string) => {
    const db = getDatabase();
    db.prepare('UPDATE feature_steps SET is_applied = 1, applied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(stepId);
    const row = db.prepare('SELECT * FROM feature_steps WHERE id = ?').get(stepId) as FeatureStepRow | undefined;
    if (!row) throw new Error(`Feature step not found: ${stepId}`);
    return mapFeatureStepRow(row);
  });

  // Window controls
  ipcMain.handle(IPC_CHANNELS.MINIMIZE_WINDOW, () => { BrowserWindow.getFocusedWindow()?.minimize(); });
  ipcMain.handle(IPC_CHANNELS.MAXIMIZE_WINDOW, () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
  });
  ipcMain.handle(IPC_CHANNELS.CLOSE_WINDOW, () => { BrowserWindow.getFocusedWindow()?.close(); });
}

// -- App lifecycle --

app.whenReady().then(() => {
  getDatabase();
  runMigrations();
  registerIPCHandlers();
  createMainWindow();
  console.log('[Forge] App ready');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  closeLogger();
  closeDatabase();
});
