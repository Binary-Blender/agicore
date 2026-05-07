import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { createMainWindow } from './window';
import { getDatabase, closeDatabase, runMigrations } from './database/db';
import { IPC_CHANNELS } from '../shared/types';
import type { Persona, CreatePersonaInput, SkillDoc, CreateSkillDocInput, Memory, CreateMemoryInput, Conversation, ConversationMessage, SendMessageInput, Meeting, MeetingMessage, MeetingParticipant, CreateMeetingInput, SendMeetingMessageInput, ActionItem, CreateActionItemInput, DecisionRecord, CreateDecisionRecordInput, Relationship, CreateRelationshipInput, SearchResult } from '../shared/types';
import { sendPersonaMessage, extractMemories, analyzeMeeting, suggestRelationships as aiSuggestRelationships } from './services/aiService';
import { AVAILABLE_MODELS } from './models';
import { discoverModels, getCachedModels } from './services/modelDiscoveryService';
import type { DiscoveredModel } from './services/modelDiscoveryService';
import type { AIModel } from '../shared/types';
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

// ─── API Key Store (shared with NovaSyn AI, Studio, Writer) ───────────────────

function getApiKeysPath(): string {
  const appData = process.env.APPDATA || app.getPath('userData');
  return path.join(appData, 'NovaSyn', 'api-keys.json');
}

function loadApiKeys(): Record<string, string> {
  try {
    const data = fs.readFileSync(getApiKeysPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'council-settings.json');
}

function loadSettings() {
  try {
    const data = fs.readFileSync(getSettingsPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return {
      theme: 'dark',
      defaultModel: 'claude-sonnet-4-20250514',
      defaultTemperature: 0.7,
    };
  }
}

function saveSettings(updates: object) {
  const current = loadSettings();
  const merged = { ...current, ...updates };
  fs.writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2));
}

// ─── Row Mappers ──────────────────────────────────────────────────────────────

function mapPersona(row: any): Persona {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department || '',
    avatarEmoji: row.avatar_emoji || '👤',
    bio: row.bio || '',
    model: row.model,
    fallbackModel: row.fallback_model || '',
    temperature: row.temperature,
    systemPrompt: row.system_prompt,
    behaviorRules: JSON.parse(row.behavior_rules || '[]'),
    communicationStyle: row.communication_style || '',
    totalConversations: row.total_conversations || 0,
    totalTokensUsed: row.total_tokens_used || 0,
    totalCost: row.total_cost || 0,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSkillDoc(row: any): SkillDoc {
  return {
    id: row.id,
    personaId: row.persona_id,
    title: row.title,
    content: row.content,
    category: row.category || 'domain',
    loadingRule: row.loading_rule || 'available',
    tokenCount: row.token_count || 0,
    relevanceTags: JSON.parse(row.relevance_tags || '[]'),
    source: row.source || 'manual',
    timesReferenced: row.times_referenced || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMemory(row: any): Memory {
  return {
    id: row.id,
    personaId: row.persona_id,
    memoryType: row.memory_type,
    content: row.content,
    sourceMeetingId: row.source_meeting_id || null,
    sourceConversationId: row.source_conversation_id || null,
    importance: row.importance ?? 0.5,
    relevanceTags: JSON.parse(row.relevance_tags || '[]'),
    timesReferenced: row.times_referenced || 0,
    supersededBy: row.superseded_by || null,
    appliesTo: row.applies_to ? JSON.parse(row.applies_to) : null,
    createdAt: row.created_at,
  };
}

function mapConversation(row: any): Conversation {
  return {
    id: row.id,
    personaId: row.persona_id,
    title: row.title || 'Untitled',
    messageCount: row.message_count || 0,
    totalTokens: row.total_tokens || 0,
    totalCost: row.total_cost || 0,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapConversationMessage(row: any): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    content: row.content,
    modelUsed: row.model_used || null,
    tokensIn: row.tokens_in || null,
    tokensOut: row.tokens_out || null,
    cost: row.cost || null,
    responseTimeMs: row.response_time_ms || null,
    skillDocsLoaded: JSON.parse(row.skill_docs_loaded || '[]'),
    memoriesLoaded: JSON.parse(row.memories_loaded || '[]'),
    createdAt: row.created_at,
  };
}

function mapMeeting(row: any, participantIds: string[]): Meeting {
  return {
    id: row.id,
    title: row.title || 'New Meeting',
    meetingType: row.meeting_type || 'brainstorm',
    agenda: row.agenda || '',
    status: row.status || 'active',
    participantIds,
    totalTokens: row.total_tokens || 0,
    totalCost: row.total_cost || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMeetingMessage(row: any): MeetingMessage {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    senderType: row.sender_type,
    senderPersonaId: row.sender_persona_id || null,
    content: row.content,
    modelUsed: row.model_used || null,
    tokensIn: row.tokens_in || null,
    tokensOut: row.tokens_out || null,
    cost: row.cost || null,
    responseTimeMs: row.response_time_ms || null,
    skillDocsLoaded: JSON.parse(row.skill_docs_loaded || '[]'),
    memoriesLoaded: JSON.parse(row.memories_loaded || '[]'),
    createdAt: row.created_at,
  };
}

function mapActionItem(row: any): ActionItem {
  return {
    id: row.id,
    meetingId: row.meeting_id || null,
    assigneePersonaId: row.assignee_persona_id || null,
    assigneeName: row.assignee_name || 'User',
    task: row.task,
    context: row.context || '',
    priority: row.priority || 'medium',
    status: row.status || 'pending',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDecisionRecord(row: any): DecisionRecord {
  return {
    id: row.id,
    meetingId: row.meeting_id || null,
    decision: row.decision,
    reason: row.reason || '',
    decidedBy: row.decided_by || '',
    createdAt: row.created_at,
  };
}

function mapRelationship(row: any): Relationship {
  return {
    id: row.id,
    personaId: row.persona_id,
    relatedPersonaId: row.related_persona_id,
    relationshipType: row.relationship_type,
    description: row.description || '',
    dynamic: row.dynamic || null,
    strength: row.strength ?? 0.5,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Model Discovery Merge ────────────────────────────────────────────────────

function discoveredToAIModel(d: DiscoveredModel): AIModel {
  return {
    id: d.id,
    name: d.name,
    provider: d.provider,
    contextWindow: d.contextWindow,
    requiresKey: true,
  };
}

function mergeModels(discovered: DiscoveredModel[], hardcoded: AIModel[]): AIModel[] {
  const discoveredIds = new Set(discovered.map((d) => d.id));
  const merged: AIModel[] = discovered.map(discoveredToAIModel);

  // Add hardcoded models not present in discovered (e.g. babyai models)
  for (const model of hardcoded) {
    if (!discoveredIds.has(model.id)) {
      merged.push(model);
    }
  }

  return merged;
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  console.log('NovaSyn Council is ready');

  try {
    getDatabase();
    runMigrations();
    initVault();
    registerMacros();
    startQueueWatcher();
    console.log('Database initialized, migrations complete, vault ready');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    app.quit();
    return;
  }

  registerIPCHandlers();
  createMainWindow();

  // Background model discovery (non-blocking)
  discoverModels(loadApiKeys()).catch(err => console.error('[ModelDiscovery]', err));

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
  stopQueueWatcher();
  unregisterMacros();
  closeVaultDatabase();
  closeDatabase();
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function registerIPCHandlers() {
  const db = getDatabase();

  // ── Settings ──

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => {
    return loadSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTINGS, (_event, updates) => {
    saveSettings(updates);
  });

  ipcMain.handle(IPC_CHANNELS.GET_API_KEYS, () => {
    return loadApiKeys();
  });

  ipcMain.handle(IPC_CHANNELS.GET_MODELS, () => {
    // Merge discovered models with hardcoded fallbacks
    const discovered = getCachedModels();
    return mergeModels(discovered, AVAILABLE_MODELS);
  });

  ipcMain.handle(IPC_CHANNELS.DISCOVER_MODELS, async (_event, forceRefresh?: boolean) => {
    const apiKeys = loadApiKeys();
    const discovered = await discoverModels(apiKeys, forceRefresh);
    return mergeModels(discovered, AVAILABLE_MODELS);
  });

  // ── Personas ──

  ipcMain.handle(IPC_CHANNELS.GET_PERSONAS, () => {
    const rows = db.prepare(
      'SELECT * FROM personas WHERE is_active = 1 ORDER BY name'
    ).all();
    return rows.map(mapPersona);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_PERSONA, (_event, input: CreatePersonaInput) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO personas (id, name, role, department, avatar_emoji, bio, model, fallback_model, temperature, system_prompt, behavior_rules, communication_style, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.name,
      input.role,
      input.department || '',
      input.avatarEmoji || '👤',
      input.bio || '',
      input.model,
      input.fallbackModel || '',
      input.temperature ?? 0.7,
      input.systemPrompt,
      JSON.stringify(input.behaviorRules || []),
      input.communicationStyle || '',
      now,
      now,
    );

    const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(id);
    return mapPersona(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_PERSONA, (_event, id: string, updates: Partial<Persona>) => {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name); }
    if (updates.role !== undefined) { setClauses.push('role = ?'); values.push(updates.role); }
    if (updates.department !== undefined) { setClauses.push('department = ?'); values.push(updates.department); }
    if (updates.avatarEmoji !== undefined) { setClauses.push('avatar_emoji = ?'); values.push(updates.avatarEmoji); }
    if (updates.bio !== undefined) { setClauses.push('bio = ?'); values.push(updates.bio); }
    if (updates.model !== undefined) { setClauses.push('model = ?'); values.push(updates.model); }
    if (updates.fallbackModel !== undefined) { setClauses.push('fallback_model = ?'); values.push(updates.fallbackModel); }
    if (updates.temperature !== undefined) { setClauses.push('temperature = ?'); values.push(updates.temperature); }
    if (updates.systemPrompt !== undefined) { setClauses.push('system_prompt = ?'); values.push(updates.systemPrompt); }
    if (updates.behaviorRules !== undefined) { setClauses.push('behavior_rules = ?'); values.push(JSON.stringify(updates.behaviorRules)); }
    if (updates.communicationStyle !== undefined) { setClauses.push('communication_style = ?'); values.push(updates.communicationStyle); }
    if (updates.isActive !== undefined) { setClauses.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

    if (setClauses.length === 0) {
      const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(id);
      return mapPersona(row);
    }

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE personas SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(id);
    return mapPersona(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PERSONA, (_event, id: string) => {
    db.prepare('DELETE FROM personas WHERE id = ?').run(id);
  });

  // ── Skill Docs ──

  ipcMain.handle(IPC_CHANNELS.GET_SKILL_DOCS, (_event, personaId: string | null) => {
    let rows;
    if (personaId) {
      rows = db.prepare(
        'SELECT * FROM persona_skill_docs WHERE persona_id = ? OR persona_id IS NULL ORDER BY category, title'
      ).all(personaId);
    } else {
      rows = db.prepare(
        'SELECT * FROM persona_skill_docs WHERE persona_id IS NULL ORDER BY category, title'
      ).all();
    }
    return rows.map(mapSkillDoc);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_SKILL_DOC, (_event, input: CreateSkillDocInput) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const tokenCount = Math.ceil((input.content || '').length / 4);

    db.prepare(`
      INSERT INTO persona_skill_docs (id, persona_id, title, content, category, loading_rule, token_count, relevance_tags, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.personaId || null,
      input.title,
      input.content || '',
      input.category || 'domain',
      input.loadingRule || 'available',
      tokenCount,
      JSON.stringify(input.relevanceTags || []),
      input.source || 'manual',
      now,
      now,
    );

    const row = db.prepare('SELECT * FROM persona_skill_docs WHERE id = ?').get(id);
    return mapSkillDoc(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_SKILL_DOC, (_event, id: string, updates: Partial<SkillDoc>) => {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.personaId !== undefined) { setClauses.push('persona_id = ?'); values.push(updates.personaId); }
    if (updates.title !== undefined) { setClauses.push('title = ?'); values.push(updates.title); }
    if (updates.content !== undefined) {
      setClauses.push('content = ?'); values.push(updates.content);
      setClauses.push('token_count = ?'); values.push(Math.ceil(updates.content.length / 4));
    }
    if (updates.category !== undefined) { setClauses.push('category = ?'); values.push(updates.category); }
    if (updates.loadingRule !== undefined) { setClauses.push('loading_rule = ?'); values.push(updates.loadingRule); }
    if (updates.relevanceTags !== undefined) { setClauses.push('relevance_tags = ?'); values.push(JSON.stringify(updates.relevanceTags)); }
    if (updates.source !== undefined) { setClauses.push('source = ?'); values.push(updates.source); }
    if (updates.timesReferenced !== undefined) { setClauses.push('times_referenced = ?'); values.push(updates.timesReferenced); }

    if (setClauses.length === 0) {
      const row = db.prepare('SELECT * FROM persona_skill_docs WHERE id = ?').get(id);
      return mapSkillDoc(row);
    }

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE persona_skill_docs SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const row = db.prepare('SELECT * FROM persona_skill_docs WHERE id = ?').get(id);
    return mapSkillDoc(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_SKILL_DOC, (_event, id: string) => {
    db.prepare('DELETE FROM persona_skill_docs WHERE id = ?').run(id);
  });

  // ── Memories ──

  ipcMain.handle(IPC_CHANNELS.GET_MEMORIES, (_event, personaId: string | null) => {
    let rows;
    if (personaId) {
      rows = db.prepare(
        'SELECT * FROM persona_memories WHERE (persona_id = ? OR persona_id IS NULL) AND superseded_by IS NULL ORDER BY importance DESC, created_at DESC'
      ).all(personaId);
    } else {
      rows = db.prepare(
        'SELECT * FROM persona_memories WHERE persona_id IS NULL AND superseded_by IS NULL ORDER BY importance DESC, created_at DESC'
      ).all();
    }
    return rows.map(mapMemory);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_MEMORY, (_event, input: CreateMemoryInput) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO persona_memories (id, persona_id, memory_type, content, source_conversation_id, source_meeting_id, importance, relevance_tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.personaId || null,
      input.memoryType,
      input.content,
      input.sourceConversationId || null,
      input.sourceMeetingId || null,
      input.importance ?? 0.5,
      JSON.stringify(input.relevanceTags || []),
      now,
    );

    const row = db.prepare('SELECT * FROM persona_memories WHERE id = ?').get(id);
    return mapMemory(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_MEMORY, (_event, id: string, updates: Partial<Memory>) => {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.personaId !== undefined) { setClauses.push('persona_id = ?'); values.push(updates.personaId); }
    if (updates.memoryType !== undefined) { setClauses.push('memory_type = ?'); values.push(updates.memoryType); }
    if (updates.content !== undefined) { setClauses.push('content = ?'); values.push(updates.content); }
    if (updates.importance !== undefined) { setClauses.push('importance = ?'); values.push(updates.importance); }
    if (updates.relevanceTags !== undefined) { setClauses.push('relevance_tags = ?'); values.push(JSON.stringify(updates.relevanceTags)); }
    if (updates.supersededBy !== undefined) { setClauses.push('superseded_by = ?'); values.push(updates.supersededBy); }
    if (updates.timesReferenced !== undefined) { setClauses.push('times_referenced = ?'); values.push(updates.timesReferenced); }

    if (setClauses.length === 0) {
      const row = db.prepare('SELECT * FROM persona_memories WHERE id = ?').get(id);
      return mapMemory(row);
    }

    values.push(id);
    db.prepare(`UPDATE persona_memories SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const row = db.prepare('SELECT * FROM persona_memories WHERE id = ?').get(id);
    return mapMemory(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_MEMORY, (_event, id: string) => {
    db.prepare('DELETE FROM persona_memories WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH_MEMORIES, (_event, personaId: string | null, query: string) => {
    const searchPattern = `%${query}%`;
    let rows;
    if (personaId) {
      rows = db.prepare(
        'SELECT * FROM persona_memories WHERE (persona_id = ? OR persona_id IS NULL) AND superseded_by IS NULL AND content LIKE ? ORDER BY importance DESC'
      ).all(personaId, searchPattern);
    } else {
      rows = db.prepare(
        'SELECT * FROM persona_memories WHERE persona_id IS NULL AND superseded_by IS NULL AND content LIKE ? ORDER BY importance DESC'
      ).all(searchPattern);
    }
    return rows.map(mapMemory);
  });

  ipcMain.handle(IPC_CHANNELS.EXTRACT_MEMORIES, async (_event, conversationId: string, personaId: string) => {
    // Build transcript from conversation messages
    const msgRows = db.prepare(
      'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId);

    if (msgRows.length === 0) return [];

    // Get persona to determine which model to use for extraction
    const personaRow = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId);
    if (!personaRow) throw new Error('Persona not found');
    const persona = mapPersona(personaRow);

    // Build transcript text
    const transcript = msgRows.map((row: any) => {
      const sender = row.sender_type === 'human' ? 'User' : persona.name;
      return `${sender}: ${row.content}`;
    }).join('\n\n');

    // Call AI to extract memories
    const apiKeys = loadApiKeys();
    return await extractMemories(transcript, persona.model, apiKeys);
  });

  ipcMain.handle(IPC_CHANNELS.SUPERSEDE_MEMORY, (_event, oldId: string, newId: string) => {
    db.prepare('UPDATE persona_memories SET superseded_by = ? WHERE id = ?').run(newId, oldId);
  });

  // ── Conversations ──

  ipcMain.handle(IPC_CHANNELS.GET_CONVERSATIONS, (_event, personaId: string) => {
    const rows = db.prepare(
      'SELECT * FROM persona_conversations WHERE persona_id = ? ORDER BY updated_at DESC'
    ).all(personaId);
    return rows.map(mapConversation);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_CONVERSATION, (_event, personaId: string, title?: string) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO persona_conversations (id, persona_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, personaId, title || 'New Conversation', now, now);

    const row = db.prepare('SELECT * FROM persona_conversations WHERE id = ?').get(id);
    return mapConversation(row);
  });

  ipcMain.handle(IPC_CHANNELS.RENAME_CONVERSATION, (_event, id: string, title: string) => {
    db.prepare('UPDATE persona_conversations SET title = ?, updated_at = ? WHERE id = ?').run(title, new Date().toISOString(), id);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_CONVERSATION, (_event, id: string) => {
    db.prepare('DELETE FROM persona_conversations WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.GET_CONVERSATION_MESSAGES, (_event, conversationId: string) => {
    const rows = db.prepare(
      'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId);
    return rows.map(mapConversationMessage);
  });

  ipcMain.handle(IPC_CHANNELS.SEND_PERSONA_MESSAGE, async (event, input: SendMessageInput) => {
    const { conversationId, personaId, content } = input;
    const now = new Date().toISOString();

    // 1. Save user message
    const userMsgId = uuidv4();
    db.prepare(`
      INSERT INTO conversation_messages (id, conversation_id, sender_type, content, created_at)
      VALUES (?, ?, 'human', ?, ?)
    `).run(userMsgId, conversationId, content, now);

    // 2. Load persona
    const personaRow = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId);
    if (!personaRow) throw new Error('Persona not found');
    const persona = mapPersona(personaRow);

    // 3. Load skill docs (always + available)
    const skillDocRows = db.prepare(
      'SELECT * FROM persona_skill_docs WHERE (persona_id = ? OR persona_id IS NULL) AND loading_rule IN (?, ?)'
    ).all(personaId, 'always', 'available');
    const skillDocs = skillDocRows.map(mapSkillDoc);

    // 4. Load memories (top 20 by importance, not superseded)
    const memoryRows = db.prepare(
      'SELECT * FROM persona_memories WHERE (persona_id = ? OR persona_id IS NULL) AND superseded_by IS NULL ORDER BY importance DESC LIMIT 20'
    ).all(personaId);
    const memories = memoryRows.map(mapMemory);

    // 5. Build conversation history
    const historyRows = db.prepare(
      'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId);
    const chatMessages = historyRows.map((row: any) => ({
      role: row.sender_type === 'human' ? 'user' as const : 'assistant' as const,
      content: row.content,
    }));

    // 6. Call AI with streaming
    const apiKeys = loadApiKeys();
    const onChunk = (text: string) => {
      try { event.sender.send(IPC_CHANNELS.STREAM_CHUNK, text); } catch {}
    };
    const aiResponse = await sendPersonaMessage(persona, chatMessages, skillDocs, memories, apiKeys, onChunk);

    // 7. Save AI message
    const aiMsgId = uuidv4();
    const aiNow = new Date().toISOString();
    db.prepare(`
      INSERT INTO conversation_messages (id, conversation_id, sender_type, content, model_used, tokens_in, tokens_out, cost, response_time_ms, skill_docs_loaded, memories_loaded, created_at)
      VALUES (?, ?, 'persona', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      aiMsgId,
      conversationId,
      aiResponse.content,
      aiResponse.modelUsed,
      aiResponse.tokensIn,
      aiResponse.tokensOut,
      aiResponse.cost,
      aiResponse.responseTimeMs,
      JSON.stringify(skillDocs.map(d => d.id)),
      JSON.stringify(memories.map(m => m.id)),
      aiNow,
    );

    // 8. Update conversation stats
    const msgCount = db.prepare(
      'SELECT COUNT(*) as count FROM conversation_messages WHERE conversation_id = ?'
    ).get(conversationId) as any;
    const totalTokens = db.prepare(
      'SELECT COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0) as total FROM conversation_messages WHERE conversation_id = ?'
    ).get(conversationId) as any;
    const totalCost = db.prepare(
      'SELECT COALESCE(SUM(COALESCE(cost, 0)), 0) as total FROM conversation_messages WHERE conversation_id = ?'
    ).get(conversationId) as any;

    db.prepare(`
      UPDATE persona_conversations SET message_count = ?, total_tokens = ?, total_cost = ?, updated_at = ? WHERE id = ?
    `).run(msgCount.count, totalTokens.total, totalCost.total, aiNow, conversationId);

    // 9. Update persona stats
    db.prepare(`
      UPDATE personas SET
        total_conversations = (SELECT COUNT(*) FROM persona_conversations WHERE persona_id = ?),
        total_tokens_used = total_tokens_used + ? + ?,
        total_cost = total_cost + ?,
        updated_at = ?
      WHERE id = ?
    `).run(personaId, aiResponse.tokensIn, aiResponse.tokensOut, aiResponse.cost, aiNow, personaId);

    // Return both messages
    const userMsg = db.prepare('SELECT * FROM conversation_messages WHERE id = ?').get(userMsgId);
    const aiMsg = db.prepare('SELECT * FROM conversation_messages WHERE id = ?').get(aiMsgId);

    return {
      userMessage: mapConversationMessage(userMsg),
      aiMessage: mapConversationMessage(aiMsg),
    };
  });

  // ── Regenerate Response ──

  ipcMain.handle(IPC_CHANNELS.REGENERATE_RESPONSE, async (event, conversationId: string, personaId: string) => {
    // 1. Find and delete the last AI message
    const lastAiMsg = db.prepare(
      "SELECT id FROM conversation_messages WHERE conversation_id = ? AND sender_type = 'persona' ORDER BY created_at DESC LIMIT 1"
    ).get(conversationId) as any;

    if (lastAiMsg) {
      db.prepare('DELETE FROM conversation_messages WHERE id = ?').run(lastAiMsg.id);
    }

    // 2. Load persona
    const personaRow = db.prepare('SELECT * FROM personas WHERE id = ?').get(personaId);
    if (!personaRow) throw new Error('Persona not found');
    const persona = mapPersona(personaRow);

    // 3. Load context
    const skillDocRows = db.prepare(
      'SELECT * FROM persona_skill_docs WHERE (persona_id = ? OR persona_id IS NULL) AND loading_rule IN (?, ?)'
    ).all(personaId, 'always', 'available');
    const skillDocs = skillDocRows.map(mapSkillDoc);

    const memoryRows = db.prepare(
      'SELECT * FROM persona_memories WHERE (persona_id = ? OR persona_id IS NULL) AND superseded_by IS NULL ORDER BY importance DESC LIMIT 20'
    ).all(personaId);
    const memories = memoryRows.map(mapMemory);

    // 4. Rebuild conversation history (last message should now be the user's)
    const historyRows = db.prepare(
      'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId);
    const chatMessages = historyRows.map((row: any) => ({
      role: row.sender_type === 'human' ? 'user' as const : 'assistant' as const,
      content: row.content,
    }));

    // 5. Call AI with streaming
    const apiKeys = loadApiKeys();
    const onChunk = (text: string) => {
      try { event.sender.send(IPC_CHANNELS.STREAM_CHUNK, text); } catch {}
    };
    const aiResponse = await sendPersonaMessage(persona, chatMessages, skillDocs, memories, apiKeys, onChunk);

    // 6. Save new AI message
    const aiMsgId = uuidv4();
    const aiNow = new Date().toISOString();
    db.prepare(`
      INSERT INTO conversation_messages (id, conversation_id, sender_type, content, model_used, tokens_in, tokens_out, cost, response_time_ms, skill_docs_loaded, memories_loaded, created_at)
      VALUES (?, ?, 'persona', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      aiMsgId,
      conversationId,
      aiResponse.content,
      aiResponse.modelUsed,
      aiResponse.tokensIn,
      aiResponse.tokensOut,
      aiResponse.cost,
      aiResponse.responseTimeMs,
      JSON.stringify(skillDocs.map(d => d.id)),
      JSON.stringify(memories.map(m => m.id)),
      aiNow,
    );

    // 7. Update conversation stats
    const msgCount = db.prepare(
      'SELECT COUNT(*) as count FROM conversation_messages WHERE conversation_id = ?'
    ).get(conversationId) as any;
    const totalTokens = db.prepare(
      'SELECT COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0) as total FROM conversation_messages WHERE conversation_id = ?'
    ).get(conversationId) as any;
    const totalCost = db.prepare(
      'SELECT COALESCE(SUM(COALESCE(cost, 0)), 0) as total FROM conversation_messages WHERE conversation_id = ?'
    ).get(conversationId) as any;

    db.prepare(`
      UPDATE persona_conversations SET message_count = ?, total_tokens = ?, total_cost = ?, updated_at = ? WHERE id = ?
    `).run(msgCount.count, totalTokens.total, totalCost.total, aiNow, conversationId);

    // 8. Update persona stats
    db.prepare(`
      UPDATE personas SET
        total_tokens_used = total_tokens_used + ? + ?,
        total_cost = total_cost + ?,
        updated_at = ?
      WHERE id = ?
    `).run(aiResponse.tokensIn, aiResponse.tokensOut, aiResponse.cost, aiNow, personaId);

    const aiMsg = db.prepare('SELECT * FROM conversation_messages WHERE id = ?').get(aiMsgId);
    return { aiMessage: mapConversationMessage(aiMsg) };
  });

  // ── Export Conversation ──

  ipcMain.handle(IPC_CHANNELS.EXPORT_CONVERSATION, async (_event, conversationId: string) => {
    // Build conversation data
    const convRow = db.prepare('SELECT * FROM persona_conversations WHERE id = ?').get(conversationId) as any;
    if (!convRow) throw new Error('Conversation not found');
    const conv = mapConversation(convRow);

    const personaRow = db.prepare('SELECT * FROM personas WHERE id = ?').get(conv.personaId) as any;
    const personaName = personaRow ? mapPersona(personaRow).name : 'Unknown';

    const msgRows = db.prepare(
      'SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId);

    // Build markdown
    const lines: string[] = [
      `# ${conv.title}`,
      '',
      `**Persona:** ${personaName}`,
      `**Messages:** ${conv.messageCount} | **Tokens:** ${conv.totalTokens.toLocaleString()} | **Cost:** $${conv.totalCost.toFixed(4)}`,
      `**Created:** ${new Date(conv.createdAt).toLocaleString()}`,
      '',
      '---',
      '',
    ];

    for (const row of msgRows) {
      const msg = mapConversationMessage(row);
      const sender = msg.senderType === 'human' ? '**You**' : `**${personaName}**`;
      const meta: string[] = [];
      if (msg.modelUsed) meta.push(msg.modelUsed);
      if (msg.responseTimeMs) meta.push(`${(msg.responseTimeMs / 1000).toFixed(1)}s`);
      if (msg.tokensIn != null && msg.tokensOut != null) meta.push(`${msg.tokensIn + msg.tokensOut} tokens`);
      if (msg.cost != null && msg.cost > 0) meta.push(`$${msg.cost.toFixed(4)}`);

      lines.push(`### ${sender}`);
      if (meta.length > 0) lines.push(`*${meta.join(' | ')}*`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    }

    const markdown = lines.join('\n');

    // Show save dialog
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return null;

    const safeTitle = conv.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'conversation';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Conversation',
      defaultPath: `${safeTitle}.md`,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    });

    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, markdown, 'utf-8');
    return result.filePath;
  });

  // ── Meetings ──

  ipcMain.handle(IPC_CHANNELS.GET_MEETINGS, () => {
    const rows = db.prepare('SELECT * FROM meetings ORDER BY updated_at DESC').all();
    return rows.map((row: any) => {
      const partRows = db.prepare('SELECT persona_id FROM meeting_participants WHERE meeting_id = ? ORDER BY join_order').all(row.id);
      const participantIds = partRows.map((p: any) => p.persona_id);
      return mapMeeting(row, participantIds);
    });
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_MEETING, (_event, input: CreateMeetingInput) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO meetings (id, title, meeting_type, agenda, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run(id, input.title, input.meetingType, input.agenda || '', now, now);

    // Add participants
    for (let i = 0; i < input.participantIds.length; i++) {
      const partId = uuidv4();
      db.prepare(`
        INSERT INTO meeting_participants (id, meeting_id, persona_id, join_order)
        VALUES (?, ?, ?, ?)
      `).run(partId, id, input.participantIds[i], i);
    }

    const row = db.prepare('SELECT * FROM meetings WHERE id = ?').get(id);
    return mapMeeting(row, input.participantIds);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_MEETING, (_event, id: string) => {
    db.prepare('DELETE FROM meetings WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.END_MEETING, (_event, id: string) => {
    db.prepare("UPDATE meetings SET status = 'completed', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
  });

  ipcMain.handle(IPC_CHANNELS.GET_MEETING_MESSAGES, (_event, meetingId: string) => {
    const rows = db.prepare(
      'SELECT * FROM meeting_messages WHERE meeting_id = ? ORDER BY created_at ASC'
    ).all(meetingId);
    return rows.map(mapMeetingMessage);
  });

  ipcMain.handle(IPC_CHANNELS.SEND_MEETING_MESSAGE, async (event, input: SendMeetingMessageInput) => {
    const { meetingId, content } = input;
    const now = new Date().toISOString();

    // 1. Save user message
    const userMsgId = uuidv4();
    db.prepare(`
      INSERT INTO meeting_messages (id, meeting_id, sender_type, content, created_at)
      VALUES (?, ?, 'human', ?, ?)
    `).run(userMsgId, meetingId, content, now);

    // 2. Get participants in join order
    const partRows = db.prepare(
      'SELECT * FROM meeting_participants WHERE meeting_id = ? ORDER BY join_order'
    ).all(meetingId);

    // 3. Get meeting info
    const meetingRow = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId) as any;

    // 4. Get API keys
    const apiKeys = loadApiKeys();

    // 5. For each participant, generate response
    const personaMessages: MeetingMessage[] = [];

    for (const part of partRows) {
      const partData = part as any;
      // Load persona
      const personaRow = db.prepare('SELECT * FROM personas WHERE id = ?').get(partData.persona_id);
      if (!personaRow) continue;
      const persona = mapPersona(personaRow);

      // Load skill docs for this persona
      const skillDocRows = db.prepare(
        'SELECT * FROM persona_skill_docs WHERE (persona_id = ? OR persona_id IS NULL) AND loading_rule IN (?, ?)'
      ).all(persona.id, 'always', 'available');
      const skillDocs = skillDocRows.map(mapSkillDoc);

      // Load memories for this persona
      const memoryRows = db.prepare(
        'SELECT * FROM persona_memories WHERE (persona_id = ? OR persona_id IS NULL) AND superseded_by IS NULL ORDER BY importance DESC LIMIT 20'
      ).all(persona.id);
      const memories = memoryRows.map(mapMemory);

      // Load relationships for this persona with other participants
      const otherParticipantIds = (partRows as any[])
        .map(p => p.persona_id)
        .filter((pid: string) => pid !== persona.id);
      const relationshipLines: string[] = [];
      for (const otherId of otherParticipantIds) {
        const relRow = db.prepare(
          'SELECT * FROM persona_relationships WHERE (persona_id = ? AND related_persona_id = ?) OR (persona_id = ? AND related_persona_id = ?)'
        ).get(persona.id, otherId, otherId, persona.id) as any;
        if (relRow) {
          const otherRow = db.prepare('SELECT name FROM personas WHERE id = ?').get(otherId) as any;
          const otherName = otherRow?.name || 'Unknown';
          const rel = mapRelationship(relRow);
          relationshipLines.push(`- ${otherName}: ${rel.relationshipType} — ${rel.description}${rel.dynamic ? ` (${rel.dynamic})` : ''}`);
        }
      }

      // Build conversation history from ALL meeting messages so far (including other personas from this round)
      const allMsgRows = db.prepare(
        'SELECT * FROM meeting_messages WHERE meeting_id = ? ORDER BY created_at ASC'
      ).all(meetingId);

      // Build chat messages with persona name prefixes for context
      const chatMessages = allMsgRows.map((row: any) => {
        if (row.sender_type === 'human') {
          return { role: 'user' as const, content: row.content };
        }
        // For other personas' messages, prefix with their name
        const senderRow = row.sender_persona_id
          ? db.prepare('SELECT name FROM personas WHERE id = ?').get(row.sender_persona_id) as any
          : null;
        const senderName = senderRow?.name || 'Unknown';
        if (row.sender_persona_id === persona.id) {
          // This persona's own prior messages — treat as assistant
          return { role: 'assistant' as const, content: row.content };
        }
        // Other persona messages — include as user messages with attribution
        return { role: 'user' as const, content: `[${senderName}]: ${row.content}` };
      });

      // Build meeting-aware system prompt
      const allParticipantNames = (partRows as any[]).map(p => {
        const pRow = db.prepare('SELECT name, role FROM personas WHERE id = ?').get(p.persona_id) as any;
        return pRow ? `${pRow.name} (${pRow.role})` : 'Unknown';
      });

      // Meeting-type-specific instructions
      const meetingTypeInstructions: Record<string, string> = {
        brainstorm: `This is a brainstorm session. Be creative and generative. Build on others' ideas with "yes, and..." thinking. Propose bold possibilities. Don't criticize or filter ideas yet — quantity over quality. Riff off what others have said and take ideas in unexpected directions.`,
        review: `This is a review session. Provide structured, constructive feedback. Format your response with clear sections: **Strengths** (what works well), **Concerns** (potential issues or risks), and **Suggestions** (specific improvements). Be thorough but respectful. Reference specific details in what's being reviewed.`,
        standup: `This is a standup meeting. Keep your response brief and structured. Use this format: **Status**: (one-line current state), **Blockers**: (any obstacles, or "None"), **Next Steps**: (what you'd focus on next). Be concise — aim for 3-5 sentences total.`,
        decision: `This is a decision meeting. Take a clear position on the topic being discussed. State your stance explicitly, then provide your reasoning with specific arguments. Acknowledge counterpoints but advocate for your perspective. Be direct about trade-offs. End with your recommendation.`,
        pipeline: `This is a pipeline session. Your job is to take the work from the previous participant and build on it, extend it, refine it, or transform it. Don't start from scratch — continue where the last person left off. Add your unique expertise to evolve the output. If you're the first responder, create the initial version for others to build on.`,
      };
      const typeInstruction = meetingTypeInstructions[meetingRow.meeting_type] || '';

      const meetingContext = [
        `\n\n--- MEETING CONTEXT ---`,
        `Meeting Type: ${meetingRow.meeting_type}`,
        `Meeting Title: ${meetingRow.title}`,
        meetingRow.agenda ? `Agenda: ${meetingRow.agenda}` : null,
        `Participants: ${allParticipantNames.join(', ')}, and the user (human)`,
        `You are responding as ${persona.name} (${persona.role}) in a team meeting.`,
        typeInstruction,
        `Address the user and other team members naturally. Do not prefix your response with your name.`,
        relationshipLines.length > 0 ? `\n--- YOUR RELATIONSHIPS ---\nYour working relationships with other participants (let these subtly influence your tone and interactions, but don't explicitly mention them):\n${relationshipLines.join('\n')}` : null,
      ].filter(Boolean).join('\n');

      // Call AI using the existing sendPersonaMessage from aiService
      // But we need to inject the meeting context into the system prompt
      // We'll modify the persona temporarily
      const meetingPersona = { ...persona, systemPrompt: persona.systemPrompt + meetingContext };

      try {
        // Signal which persona is about to stream
        try { event.sender.send(IPC_CHANNELS.STREAM_PERSONA_START, persona.id); } catch {}
        const onChunk = (text: string) => {
          try { event.sender.send(IPC_CHANNELS.STREAM_CHUNK, text); } catch {}
        };
        const aiResponse = await sendPersonaMessage(meetingPersona, chatMessages, skillDocs, memories, apiKeys, onChunk);

        // Save persona response
        const aiMsgId = uuidv4();
        const aiNow = new Date().toISOString();
        db.prepare(`
          INSERT INTO meeting_messages (id, meeting_id, sender_type, sender_persona_id, content, model_used, tokens_in, tokens_out, cost, response_time_ms, skill_docs_loaded, memories_loaded, created_at)
          VALUES (?, ?, 'persona', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          aiMsgId,
          meetingId,
          persona.id,
          aiResponse.content,
          aiResponse.modelUsed,
          aiResponse.tokensIn,
          aiResponse.tokensOut,
          aiResponse.cost,
          aiResponse.responseTimeMs,
          JSON.stringify(skillDocs.map(d => d.id)),
          JSON.stringify(memories.map(m => m.id)),
          aiNow,
        );

        const savedMsg = db.prepare('SELECT * FROM meeting_messages WHERE id = ?').get(aiMsgId);
        personaMessages.push(mapMeetingMessage(savedMsg));

        // Update persona stats
        db.prepare(`
          UPDATE personas SET
            total_tokens_used = total_tokens_used + ? + ?,
            total_cost = total_cost + ?,
            updated_at = ?
          WHERE id = ?
        `).run(aiResponse.tokensIn, aiResponse.tokensOut, aiResponse.cost, aiNow, persona.id);
      } catch (err: any) {
        // If one persona fails, log error and save it as an error message
        console.error(`Meeting: ${persona.name} failed to respond:`, err.message);
        const errMsgId = uuidv4();
        db.prepare(`
          INSERT INTO meeting_messages (id, meeting_id, sender_type, sender_persona_id, content, created_at)
          VALUES (?, ?, 'persona', ?, ?, ?)
        `).run(errMsgId, meetingId, persona.id, `[Error: ${err.message}]`, new Date().toISOString());

        const savedMsg = db.prepare('SELECT * FROM meeting_messages WHERE id = ?').get(errMsgId);
        personaMessages.push(mapMeetingMessage(savedMsg));
      }
    }

    // 6. Update meeting stats
    const totalTokens = db.prepare(
      'SELECT COALESCE(SUM(COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)), 0) as total FROM meeting_messages WHERE meeting_id = ?'
    ).get(meetingId) as any;
    const totalCost = db.prepare(
      'SELECT COALESCE(SUM(COALESCE(cost, 0)), 0) as total FROM meeting_messages WHERE meeting_id = ?'
    ).get(meetingId) as any;

    db.prepare(`
      UPDATE meetings SET total_tokens = ?, total_cost = ?, updated_at = ? WHERE id = ?
    `).run(totalTokens.total, totalCost.total, new Date().toISOString(), meetingId);

    // Return user message + all persona messages
    const userMsg = db.prepare('SELECT * FROM meeting_messages WHERE id = ?').get(userMsgId);
    return {
      userMessage: mapMeetingMessage(userMsg),
      personaMessages,
    };
  });

  ipcMain.handle(IPC_CHANNELS.ANALYZE_MEETING, async (_event, meetingId: string) => {
    // Build transcript from meeting messages
    const msgRows = db.prepare(
      'SELECT * FROM meeting_messages WHERE meeting_id = ? ORDER BY created_at ASC'
    ).all(meetingId);

    if (msgRows.length === 0) throw new Error('No messages in this meeting');

    // Build transcript with speaker attribution
    const transcript = msgRows.map((row: any) => {
      if (row.sender_type === 'human') {
        return `User: ${row.content}`;
      }
      const personaRow = row.sender_persona_id
        ? db.prepare('SELECT name, role FROM personas WHERE id = ?').get(row.sender_persona_id) as any
        : null;
      const name = personaRow ? `${personaRow.name} (${personaRow.role})` : 'Unknown';
      return `${name}: ${row.content}`;
    }).join('\n\n');

    // Use the default model from settings for analysis
    const settings = loadSettings();
    const modelId = settings.defaultModel || 'claude-sonnet-4-20250514';
    const apiKeys = loadApiKeys();

    return await analyzeMeeting(transcript, modelId, apiKeys);
  });

  // ── Meeting Vote ──

  ipcMain.handle(IPC_CHANNELS.CALL_MEETING_VOTE, async (_event, meetingId: string, question: string) => {
    // Get meeting transcript for context
    const msgRows = db.prepare(
      'SELECT * FROM meeting_messages WHERE meeting_id = ? ORDER BY created_at ASC'
    ).all(meetingId);

    const transcript = (msgRows as any[]).map(row => {
      if (row.sender_type === 'human') return `User: ${row.content}`;
      const senderRow = row.sender_persona_id
        ? db.prepare('SELECT name, role FROM personas WHERE id = ?').get(row.sender_persona_id) as any
        : null;
      const senderName = senderRow ? `${senderRow.name} (${senderRow.role})` : 'Unknown';
      return `${senderName}: ${row.content}`;
    }).join('\n\n');

    // Get participants
    const partRows = db.prepare(
      'SELECT * FROM meeting_participants WHERE meeting_id = ? ORDER BY join_order'
    ).all(meetingId);

    const apiKeys = loadApiKeys();
    const settings = loadSettings();

    const votes: any[] = [];

    for (const part of partRows as any[]) {
      const personaRow = db.prepare('SELECT * FROM personas WHERE id = ?').get(part.persona_id) as any;
      if (!personaRow) continue;
      const persona = mapPersona(personaRow);

      const votePrompt = `You are ${persona.name} (${persona.role}).

Based on the meeting discussion below, cast your vote on this question:

"${question}"

Meeting transcript:
${transcript}

You MUST respond with ONLY a JSON object in this exact format:
{"position": "approve" | "oppose" | "abstain", "reasoning": "Your reasoning in 1-3 sentences"}

Vote based on your role, expertise, and perspective. Be decisive.`;

      const modelId = persona.model || settings.defaultModel || 'claude-sonnet-4-20250514';
      const model = AVAILABLE_MODELS.find(m => m.id === modelId);
      if (!model) continue;

      try {
        let content = '';

        if (model.provider === 'anthropic') {
          const client = new (await import('@anthropic-ai/sdk')).default({ apiKey: apiKeys.anthropic });
          const response = await client.messages.create({
            model: model.id,
            max_tokens: 300,
            temperature: 0.3,
            messages: [{ role: 'user', content: votePrompt }],
          });
          content = (response.content[0] as any).text || '';
        } else {
          const providerConfig: Record<string, { url: string; keyName: string }> = {
            openai: { url: 'https://api.openai.com/v1/chat/completions', keyName: 'openai' },
            google: { url: `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKeys.google}`, keyName: 'google' },
            xai: { url: 'https://api.x.ai/v1/chat/completions', keyName: 'xai' },
          };
          const config = providerConfig[model.provider];
          if (!config) continue;

          if (model.provider === 'google') {
            const resp = await fetch(config.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: votePrompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
              }),
            });
            const data = await resp.json() as any;
            content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          } else {
            const resp = await fetch(config.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKeys[config.keyName]}`,
              },
              body: JSON.stringify({
                model: model.id,
                max_tokens: 300,
                temperature: 0.3,
                messages: [{ role: 'user', content: votePrompt }],
              }),
            });
            const data = await resp.json() as any;
            content = data.choices?.[0]?.message?.content || '';
          }
        }

        // Parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const validPositions = ['approve', 'oppose', 'abstain'];
          votes.push({
            personaId: persona.id,
            personaName: persona.name,
            avatarEmoji: persona.avatarEmoji,
            position: validPositions.includes(parsed.position) ? parsed.position : 'abstain',
            reasoning: parsed.reasoning || 'No reasoning provided.',
          });
        }
      } catch (err: any) {
        console.error(`Vote: ${persona.name} failed:`, err.message);
        votes.push({
          personaId: persona.id,
          personaName: persona.name,
          avatarEmoji: persona.avatarEmoji,
          position: 'abstain',
          reasoning: `[Error: ${err.message}]`,
        });
      }
    }

    // Build summary
    const approves = votes.filter(v => v.position === 'approve').length;
    const opposes = votes.filter(v => v.position === 'oppose').length;
    const abstains = votes.filter(v => v.position === 'abstain').length;
    const total = votes.length;
    const summary = approves > opposes
      ? `Motion passes ${approves}-${opposes}${abstains > 0 ? ` (${abstains} abstain)` : ''} out of ${total} votes.`
      : approves < opposes
        ? `Motion fails ${opposes}-${approves}${abstains > 0 ? ` (${abstains} abstain)` : ''} out of ${total} votes.`
        : `Vote is tied ${approves}-${opposes}${abstains > 0 ? ` (${abstains} abstain)` : ''} out of ${total} votes.`;

    return { question, votes, summary };
  });

  // ── Export Meeting ──

  ipcMain.handle(IPC_CHANNELS.EXPORT_MEETING, async (_event, meetingId: string) => {
    const meetingRow = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId) as any;
    if (!meetingRow) throw new Error('Meeting not found');

    // Get participants
    const partRows = db.prepare(
      'SELECT persona_id FROM meeting_participants WHERE meeting_id = ? ORDER BY join_order'
    ).all(meetingId);
    const participantIds = partRows.map((p: any) => p.persona_id);
    const meeting = mapMeeting(meetingRow, participantIds);

    // Get participant names
    const participantNames = participantIds.map(pid => {
      const pRow = db.prepare('SELECT name, role FROM personas WHERE id = ?').get(pid) as any;
      return pRow ? `${pRow.name} (${pRow.role})` : 'Unknown';
    });

    // Get messages
    const msgRows = db.prepare(
      'SELECT * FROM meeting_messages WHERE meeting_id = ? ORDER BY created_at ASC'
    ).all(meetingId);

    // Get action items and decisions
    const actionItemRows = db.prepare('SELECT * FROM action_items WHERE meeting_id = ?').all(meetingId);
    const decisionRows = db.prepare('SELECT * FROM decision_records WHERE meeting_id = ?').all(meetingId);
    const items = actionItemRows.map(mapActionItem);
    const decisions = decisionRows.map(mapDecisionRecord);

    // Build markdown
    const lines: string[] = [
      `# Meeting: ${meeting.title}`,
      '',
      `**Type:** ${meeting.meetingType} | **Status:** ${meeting.status}`,
      `**Participants:** ${participantNames.join(', ')}`,
      `**Tokens:** ${meeting.totalTokens.toLocaleString()} | **Cost:** $${meeting.totalCost.toFixed(4)}`,
      `**Date:** ${new Date(meeting.createdAt).toLocaleString()}`,
    ];

    if (meeting.agenda) {
      lines.push('', `**Agenda:** ${meeting.agenda}`);
    }

    lines.push('', '---', '', '## Transcript', '');

    for (const row of msgRows) {
      const msg = mapMeetingMessage(row);
      let sender = '**You**';
      if (msg.senderType === 'persona' && msg.senderPersonaId) {
        const pRow = db.prepare('SELECT name FROM personas WHERE id = ?').get(msg.senderPersonaId) as any;
        sender = `**${pRow?.name || 'Unknown'}**`;
      }
      const meta: string[] = [];
      if (msg.modelUsed) meta.push(msg.modelUsed);
      if (msg.responseTimeMs) meta.push(`${(msg.responseTimeMs / 1000).toFixed(1)}s`);
      if (msg.tokensIn != null && msg.tokensOut != null) meta.push(`${msg.tokensIn + msg.tokensOut} tokens`);
      if (msg.cost != null && msg.cost > 0) meta.push(`$${msg.cost.toFixed(4)}`);

      lines.push(`### ${sender}`);
      if (meta.length > 0) lines.push(`*${meta.join(' | ')}*`);
      lines.push('', msg.content, '');
    }

    // Action items section
    if (items.length > 0) {
      lines.push('---', '', '## Action Items', '');
      for (const item of items) {
        const statusIcon = item.status === 'completed' ? '[x]' : '[ ]';
        lines.push(`- ${statusIcon} **[${item.priority}]** ${item.task} — *${item.assigneeName}* (${item.status})`);
      }
      lines.push('');
    }

    // Decisions section
    if (decisions.length > 0) {
      lines.push('---', '', '## Decisions', '');
      for (const dr of decisions) {
        lines.push(`- **${dr.decision}**`);
        if (dr.reason) lines.push(`  - Reason: ${dr.reason}`);
        if (dr.decidedBy) lines.push(`  - Decided by: ${dr.decidedBy}`);
      }
      lines.push('');
    }

    const markdown = lines.join('\n');

    // Show save dialog
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return null;

    const safeTitle = meeting.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'meeting';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Meeting',
      defaultPath: `${safeTitle}.md`,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    });

    if (result.canceled || !result.filePath) return null;
    fs.writeFileSync(result.filePath, markdown, 'utf-8');
    return result.filePath;
  });

  // ── Action Items ──

  ipcMain.handle(IPC_CHANNELS.GET_ACTION_ITEMS, (_event, meetingId?: string) => {
    let rows;
    if (meetingId) {
      rows = db.prepare('SELECT * FROM action_items WHERE meeting_id = ? ORDER BY priority, created_at DESC').all(meetingId);
    } else {
      rows = db.prepare('SELECT * FROM action_items ORDER BY CASE priority WHEN \'high\' THEN 0 WHEN \'medium\' THEN 1 WHEN \'low\' THEN 2 END, created_at DESC').all();
    }
    return rows.map(mapActionItem);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_ACTION_ITEM, (_event, input: CreateActionItemInput) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO action_items (id, meeting_id, assignee_persona_id, assignee_name, task, context, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      id,
      input.meetingId || null,
      input.assigneePersonaId || null,
      input.assigneeName,
      input.task,
      input.context || '',
      input.priority || 'medium',
      now,
      now,
    );

    const row = db.prepare('SELECT * FROM action_items WHERE id = ?').get(id);
    return mapActionItem(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_ACTION_ITEM, (_event, id: string, updates: Partial<ActionItem>) => {
    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.assigneePersonaId !== undefined) { setClauses.push('assignee_persona_id = ?'); values.push(updates.assigneePersonaId); }
    if (updates.assigneeName !== undefined) { setClauses.push('assignee_name = ?'); values.push(updates.assigneeName); }
    if (updates.task !== undefined) { setClauses.push('task = ?'); values.push(updates.task); }
    if (updates.context !== undefined) { setClauses.push('context = ?'); values.push(updates.context); }
    if (updates.priority !== undefined) { setClauses.push('priority = ?'); values.push(updates.priority); }
    if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status); }

    if (setClauses.length === 0) {
      const row = db.prepare('SELECT * FROM action_items WHERE id = ?').get(id);
      return mapActionItem(row);
    }

    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE action_items SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const row = db.prepare('SELECT * FROM action_items WHERE id = ?').get(id);
    return mapActionItem(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_ACTION_ITEM, (_event, id: string) => {
    db.prepare('DELETE FROM action_items WHERE id = ?').run(id);
  });

  // ── Decision Records ──

  ipcMain.handle(IPC_CHANNELS.GET_DECISION_RECORDS, (_event, meetingId?: string) => {
    let rows;
    if (meetingId) {
      rows = db.prepare('SELECT * FROM decision_records WHERE meeting_id = ? ORDER BY created_at DESC').all(meetingId);
    } else {
      rows = db.prepare('SELECT * FROM decision_records ORDER BY created_at DESC').all();
    }
    return rows.map(mapDecisionRecord);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_DECISION_RECORD, (_event, input: CreateDecisionRecordInput) => {
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO decision_records (id, meeting_id, decision, reason, decided_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.meetingId || null,
      input.decision,
      input.reason || '',
      input.decidedBy || '',
      now,
    );

    const row = db.prepare('SELECT * FROM decision_records WHERE id = ?').get(id);
    return mapDecisionRecord(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_DECISION_RECORD, (_event, id: string) => {
    db.prepare('DELETE FROM decision_records WHERE id = ?').run(id);
  });

  // ── Global Search ──

  ipcMain.handle(IPC_CHANNELS.GLOBAL_SEARCH, (_event, query: string): SearchResult[] => {
    if (!query || query.trim().length < 2) return [];

    const q = `%${query.trim()}%`;
    const results: SearchResult[] = [];

    // Search personas
    const personaRows = db.prepare(
      'SELECT * FROM personas WHERE is_active = 1 AND (name LIKE ? OR role LIKE ? OR department LIKE ? OR bio LIKE ?) LIMIT 5'
    ).all(q, q, q, q);
    for (const row of personaRows) {
      const p = mapPersona(row);
      results.push({
        type: 'persona',
        id: p.id,
        title: p.name,
        subtitle: p.role,
        snippet: p.bio || p.department || '',
        parentId: null,
        emoji: p.avatarEmoji,
        timestamp: p.createdAt,
      });
    }

    // Search conversations (by title)
    const convRows = db.prepare(
      'SELECT c.*, p.name as persona_name, p.avatar_emoji FROM persona_conversations c JOIN personas p ON c.persona_id = p.id WHERE c.title LIKE ? ORDER BY c.updated_at DESC LIMIT 5'
    ).all(q);
    for (const row of convRows as any[]) {
      const c = mapConversation(row);
      results.push({
        type: 'conversation',
        id: c.id,
        title: c.title || 'Untitled',
        subtitle: `${row.persona_name} · ${c.messageCount} messages`,
        snippet: '',
        parentId: c.personaId,
        emoji: row.avatar_emoji || '💬',
        timestamp: c.updatedAt,
      });
    }

    // Search conversation messages (by content)
    const msgRows = db.prepare(
      `SELECT cm.*, pc.persona_id, p.name as persona_name, p.avatar_emoji, pc.title as conv_title
       FROM conversation_messages cm
       JOIN persona_conversations pc ON cm.conversation_id = pc.id
       JOIN personas p ON pc.persona_id = p.id
       WHERE cm.content LIKE ?
       ORDER BY cm.created_at DESC LIMIT 5`
    ).all(q);
    for (const row of msgRows as any[]) {
      const content = row.content as string;
      // Extract a snippet around the match
      const lowerContent = content.toLowerCase();
      const lowerQuery = query.trim().toLowerCase();
      const matchIdx = lowerContent.indexOf(lowerQuery);
      const start = Math.max(0, matchIdx - 40);
      const end = Math.min(content.length, matchIdx + lowerQuery.length + 60);
      const snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');

      results.push({
        type: 'conversation',
        id: row.conversation_id,
        title: row.conv_title || 'Untitled',
        subtitle: `${row.persona_name} · ${row.sender_type === 'human' ? 'You' : row.persona_name}`,
        snippet,
        parentId: row.persona_id,
        emoji: row.avatar_emoji || '💬',
        timestamp: row.created_at,
      });
    }

    // Search meetings (by title, agenda)
    const meetingRows = db.prepare(
      'SELECT * FROM meetings WHERE title LIKE ? OR agenda LIKE ? ORDER BY created_at DESC LIMIT 5'
    ).all(q, q);
    for (const row of meetingRows as any[]) {
      const partIds = JSON.parse(row.participant_ids || '[]');
      const m = mapMeeting(row, partIds);
      results.push({
        type: 'meeting',
        id: m.id,
        title: m.title,
        subtitle: `${m.meetingType} · ${m.status}`,
        snippet: m.agenda || '',
        parentId: null,
        emoji: '👥',
        timestamp: m.createdAt,
      });
    }

    // Search meeting messages
    const meetMsgRows = db.prepare(
      `SELECT mm.*, m.title as meeting_title, p.name as persona_name
       FROM meeting_messages mm
       JOIN meetings m ON mm.meeting_id = m.id
       LEFT JOIN personas p ON mm.sender_persona_id = p.id
       WHERE mm.content LIKE ?
       ORDER BY mm.created_at DESC LIMIT 5`
    ).all(q);
    for (const row of meetMsgRows as any[]) {
      const content = row.content as string;
      const lowerContent = content.toLowerCase();
      const lowerQuery = query.trim().toLowerCase();
      const matchIdx = lowerContent.indexOf(lowerQuery);
      const start = Math.max(0, matchIdx - 40);
      const end = Math.min(content.length, matchIdx + lowerQuery.length + 60);
      const snippet = (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');

      results.push({
        type: 'meeting',
        id: row.meeting_id,
        title: row.meeting_title,
        subtitle: row.sender_type === 'human' ? 'You' : (row.persona_name || 'Unknown'),
        snippet,
        parentId: null,
        emoji: '👥',
        timestamp: row.created_at,
      });
    }

    // Search memories
    const memRows = db.prepare(
      `SELECT m.*, p.name as persona_name, p.avatar_emoji
       FROM persona_memories m
       LEFT JOIN personas p ON m.persona_id = p.id
       WHERE m.content LIKE ? AND m.superseded_by IS NULL
       ORDER BY m.importance DESC LIMIT 5`
    ).all(q);
    for (const row of memRows as any[]) {
      const mem = mapMemory(row);
      results.push({
        type: 'memory',
        id: mem.id,
        title: mem.memoryType.charAt(0).toUpperCase() + mem.memoryType.slice(1),
        subtitle: row.persona_name || 'Shared',
        snippet: mem.content.length > 120 ? mem.content.slice(0, 120) + '...' : mem.content,
        parentId: mem.personaId,
        emoji: row.avatar_emoji || '🧠',
        timestamp: mem.createdAt,
      });
    }

    // Search skill docs
    const docRows = db.prepare(
      `SELECT sd.*, p.name as persona_name, p.avatar_emoji
       FROM persona_skill_docs sd
       LEFT JOIN personas p ON sd.persona_id = p.id
       WHERE sd.title LIKE ? OR sd.content LIKE ?
       ORDER BY sd.updated_at DESC LIMIT 5`
    ).all(q, q);
    for (const row of docRows as any[]) {
      const doc = mapSkillDoc(row);
      results.push({
        type: 'skilldoc',
        id: doc.id,
        title: doc.title,
        subtitle: row.persona_name || 'Global',
        snippet: doc.content.length > 120 ? doc.content.slice(0, 120) + '...' : doc.content,
        parentId: doc.personaId,
        emoji: row.avatar_emoji || '📄',
        timestamp: doc.updatedAt,
      });
    }

    // Search action items
    const aiRows = db.prepare(
      `SELECT ai.*, m.title as meeting_title
       FROM action_items ai
       LEFT JOIN meetings m ON ai.meeting_id = m.id
       WHERE ai.task LIKE ? OR ai.context LIKE ?
       ORDER BY ai.updated_at DESC LIMIT 5`
    ).all(q, q);
    for (const row of aiRows as any[]) {
      const item = mapActionItem(row);
      results.push({
        type: 'action_item',
        id: item.id,
        title: item.task.length > 80 ? item.task.slice(0, 80) + '...' : item.task,
        subtitle: `${item.assigneeName} · ${item.status}`,
        snippet: row.meeting_title ? `From: ${row.meeting_title}` : '',
        parentId: item.meetingId,
        emoji: item.status === 'completed' ? '✅' : '📋',
        timestamp: item.updatedAt,
      });
    }

    // Deduplicate by type+id (messages can match multiple times)
    const seen = new Set<string>();
    return results.filter(r => {
      const key = `${r.type}:${r.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  // ── Cost Analytics ──

  ipcMain.handle(IPC_CHANNELS.GET_COST_ANALYTICS, () => {
    // Overall totals
    const totalRow = db.prepare(`
      SELECT
        COALESCE(SUM(total_tokens_used), 0) as total_tokens,
        COALESCE(SUM(total_cost), 0) as total_cost
      FROM personas
    `).get() as any;

    const convCount = (db.prepare('SELECT COUNT(*) as c FROM persona_conversations').get() as any).c;
    const meetCount = (db.prepare('SELECT COUNT(*) as c FROM meetings').get() as any).c;

    const convMsgCount = (db.prepare('SELECT COUNT(*) as c FROM conversation_messages WHERE sender_type = ?').get('persona') as any).c;
    const meetMsgCount = (db.prepare('SELECT COUNT(*) as c FROM meeting_messages WHERE sender_type = ?').get('persona') as any).c;

    // Per-persona breakdown
    const personaRows = db.prepare(`
      SELECT p.id, p.name, p.avatar_emoji, p.total_tokens_used, p.total_cost,
        (SELECT COUNT(*) FROM persona_conversations pc WHERE pc.persona_id = p.id) as conv_count,
        (SELECT COUNT(DISTINCT mp.meeting_id) FROM meeting_participants mp WHERE mp.persona_id = p.id) as meet_count
      FROM personas p
      ORDER BY p.total_cost DESC
    `).all() as any[];

    const perPersona = personaRows.map(row => ({
      personaId: row.id,
      name: row.name,
      avatarEmoji: row.avatar_emoji,
      totalTokens: row.total_tokens_used,
      totalCost: row.total_cost,
      conversationCount: row.conv_count,
      meetingCount: row.meet_count,
    }));

    // Per-model breakdown (from both conversation and meeting messages)
    const modelMap = new Map<string, { totalTokensIn: number; totalTokensOut: number; totalCost: number; messageCount: number }>();

    const convModelRows = db.prepare(`
      SELECT model_used, SUM(tokens_in) as tin, SUM(tokens_out) as tout, SUM(cost) as tc, COUNT(*) as mc
      FROM conversation_messages
      WHERE model_used IS NOT NULL AND sender_type = 'persona'
      GROUP BY model_used
    `).all() as any[];

    for (const row of convModelRows) {
      modelMap.set(row.model_used, {
        totalTokensIn: row.tin || 0,
        totalTokensOut: row.tout || 0,
        totalCost: row.tc || 0,
        messageCount: row.mc || 0,
      });
    }

    const meetModelRows = db.prepare(`
      SELECT model_used, SUM(tokens_in) as tin, SUM(tokens_out) as tout, SUM(cost) as tc, COUNT(*) as mc
      FROM meeting_messages
      WHERE model_used IS NOT NULL AND sender_type = 'persona'
      GROUP BY model_used
    `).all() as any[];

    for (const row of meetModelRows) {
      const existing = modelMap.get(row.model_used);
      if (existing) {
        existing.totalTokensIn += row.tin || 0;
        existing.totalTokensOut += row.tout || 0;
        existing.totalCost += row.tc || 0;
        existing.messageCount += row.mc || 0;
      } else {
        modelMap.set(row.model_used, {
          totalTokensIn: row.tin || 0,
          totalTokensOut: row.tout || 0,
          totalCost: row.tc || 0,
          messageCount: row.mc || 0,
        });
      }
    }

    const perModel = Array.from(modelMap.entries())
      .map(([modelId, data]) => ({ modelId, ...data }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // Top consumers: most expensive conversations + meetings
    const topConvs = db.prepare(`
      SELECT pc.id, pc.title, pc.total_tokens, pc.total_cost, p.name as persona_name, p.avatar_emoji
      FROM persona_conversations pc
      JOIN personas p ON pc.persona_id = p.id
      WHERE pc.total_cost > 0
      ORDER BY pc.total_cost DESC LIMIT 5
    `).all() as any[];

    const topMeets = db.prepare(`
      SELECT m.id, m.title, m.total_tokens, m.total_cost
      FROM meetings m
      WHERE m.total_cost > 0
      ORDER BY m.total_cost DESC LIMIT 5
    `).all() as any[];

    const topConsumers = [
      ...topConvs.map(row => ({
        type: 'conversation' as const,
        id: row.id,
        title: row.title,
        totalTokens: row.total_tokens,
        totalCost: row.total_cost,
        personaName: row.persona_name,
        emoji: row.avatar_emoji || '💬',
      })),
      ...topMeets.map(row => ({
        type: 'meeting' as const,
        id: row.id,
        title: row.title,
        totalTokens: row.total_tokens,
        totalCost: row.total_cost,
        personaName: null,
        emoji: '👥',
      })),
    ].sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);

    return {
      totalTokens: totalRow.total_tokens,
      totalCost: totalRow.total_cost,
      totalConversations: convCount,
      totalMeetings: meetCount,
      totalMessages: convMsgCount + meetMsgCount,
      perPersona,
      perModel,
      topConsumers,
    };
  });

  // ── Relationships ──

  ipcMain.handle(IPC_CHANNELS.GET_RELATIONSHIPS, (_event, personaId: string) => {
    const rows = db.prepare(
      'SELECT * FROM persona_relationships WHERE persona_id = ? OR related_persona_id = ? ORDER BY updated_at DESC'
    ).all(personaId, personaId);
    return rows.map(mapRelationship);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_RELATIONSHIP, (_event, input: CreateRelationshipInput) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO persona_relationships (id, persona_id, related_persona_id, relationship_type, description, dynamic, strength, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.personaId, input.relatedPersonaId, input.relationshipType, input.description, input.dynamic || null, input.strength ?? 0.5, now, now);

    const row = db.prepare('SELECT * FROM persona_relationships WHERE id = ?').get(id);
    return mapRelationship(row);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_RELATIONSHIP, (_event, id: string, updates: Partial<Relationship>) => {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.relationshipType !== undefined) { fields.push('relationship_type = ?'); values.push(updates.relationshipType); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.dynamic !== undefined) { fields.push('dynamic = ?'); values.push(updates.dynamic); }
    if (updates.strength !== undefined) { fields.push('strength = ?'); values.push(updates.strength); }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE persona_relationships SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const row = db.prepare('SELECT * FROM persona_relationships WHERE id = ?').get(id);
    return mapRelationship(row);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_RELATIONSHIP, (_event, id: string) => {
    db.prepare('DELETE FROM persona_relationships WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC_CHANNELS.SUGGEST_RELATIONSHIPS, async (_event, meetingId: string) => {
    // Get meeting transcript
    const msgRows = db.prepare(
      'SELECT * FROM meeting_messages WHERE meeting_id = ? ORDER BY created_at ASC'
    ).all(meetingId);

    if (msgRows.length === 0) return [];

    // Build transcript with persona names
    const transcript = (msgRows as any[]).map(row => {
      if (row.sender_type === 'human') return `[User]: ${row.content}`;
      const senderRow = row.sender_persona_id
        ? db.prepare('SELECT name, role FROM personas WHERE id = ?').get(row.sender_persona_id) as any
        : null;
      const senderName = senderRow ? `${senderRow.name} (${senderRow.role})` : 'Unknown';
      return `[${senderName}]: ${row.content}`;
    }).join('\n\n');

    // Get participant info
    const partRows = db.prepare(
      'SELECT * FROM meeting_participants WHERE meeting_id = ? ORDER BY join_order'
    ).all(meetingId);
    const participants = (partRows as any[]).map(p => {
      const pRow = db.prepare('SELECT id, name, role FROM personas WHERE id = ?').get(p.persona_id) as any;
      return pRow ? { id: pRow.id as string, name: pRow.name as string, role: pRow.role as string } : null;
    }).filter((p): p is { id: string; name: string; role: string } => p !== null);

    // Get existing relationships for context
    const existingRels = db.prepare('SELECT * FROM persona_relationships').all().map(mapRelationship);

    const apiKeys = loadApiKeys();
    const settings = loadSettings();
    const modelId = settings.defaultModel || 'claude-sonnet-4-20250514';

    return aiSuggestRelationships(transcript, participants, existingRels, modelId, apiKeys);
  });

  // ── NS Vault ──

  ipcMain.handle(IPC_CHANNELS.VAULT_LIST, (_event, options) => {
    return vaultList(options);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_STORE, (_event, input) => {
    return vaultStore(input);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_GET, (_event, id: string) => {
    return vaultGet(id);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_DELETE, (_event, id: string) => {
    vaultDelete(id);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_SEARCH, (_event, options) => {
    return vaultSearch(options);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_GET_TAGS, () => {
    return vaultGetTags();
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_ADD_TAG, (_event, itemId: string, tagName: string, color?: string) => {
    vaultAddTag(itemId, tagName, color);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_ANNOTATE, (_event, itemId: string, content: string) => {
    return vaultAnnotate(itemId, content);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_GET_ANNOTATIONS, (_event, itemId: string) => {
    return vaultGetAnnotations(itemId);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_GET_PROVENANCE, (_event, itemId: string) => {
    return vaultGetProvenance(itemId);
  });

  // ── Macro Registry ──

  ipcMain.handle(IPC_CHANNELS.MACRO_GET_REGISTRY, () => getRegistry());
  ipcMain.handle(IPC_CHANNELS.MACRO_GET_AVAILABLE, () => getAvailableMacros());

  // ── Cross-App Queue ──

  ipcMain.handle(IPC_CHANNELS.MACRO_INVOKE, (_event, targetApp: string, macro: string, input: any, vaultParentId?: string) => {
    return sendMacroRequest(targetApp, macro, input, vaultParentId);
  });

  ipcMain.handle(IPC_CHANNELS.MACRO_INVOKE_STATUS, (_event, requestId: string) => {
    return checkMacroResponse(requestId);
  });

  ipcMain.handle(IPC_CHANNELS.MACRO_GET_PENDING, () => {
    return getPendingRequests();
  });

  // ── Orchestrations ──

  ipcMain.handle(IPC_CHANNELS.ORCH_LIST, () => listOrchestrations());
  ipcMain.handle(IPC_CHANNELS.ORCH_CREATE, (_event, data) => createOrchestration(data));
  ipcMain.handle(IPC_CHANNELS.ORCH_UPDATE, (_event, id: string, updates) => updateOrchestration(id, updates));
  ipcMain.handle(IPC_CHANNELS.ORCH_DELETE, (_event, id: string) => { deleteOrchestration(id); });
  ipcMain.handle(IPC_CHANNELS.ORCH_GET, (_event, id: string) => getOrchestration(id));
  ipcMain.handle(IPC_CHANNELS.ORCH_RUN, (_event, orchestrationId: string, manualInput?: string) => runOrchestration(orchestrationId, manualInput));
  ipcMain.handle(IPC_CHANNELS.ORCH_RESUME, (_event, runId: string, decision: string) => resumeOrchestration(runId, decision as 'approved' | 'rejected'));
  ipcMain.handle(IPC_CHANNELS.ORCH_GET_RUNS, (_event, orchestrationId: string) => listRuns(orchestrationId));
  ipcMain.handle(IPC_CHANNELS.ORCH_GET_RUN, (_event, runId: string) => getRun(runId));

  // ── Window Controls ──

  ipcMain.on(IPC_CHANNELS.MINIMIZE_WINDOW, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.MAXIMIZE_WINDOW, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}
