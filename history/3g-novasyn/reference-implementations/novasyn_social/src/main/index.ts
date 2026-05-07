import { app, ipcMain, BrowserWindow, Notification, dialog } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { initDatabase, getDb } from './database/db';
import { createMainWindow, getMainWindow } from './window';
import { AI_MODELS } from './models';
import { discoverModels, getCachedModels } from './services/modelDiscoveryService';
import { classifyMessage } from './services/classificationService';
import { generateDraft } from './services/draftService';
import {
  recalculateSpc,
  getRedlineTopics as getSpcRedlineTopics,
  saveRedlineTopics as saveSpcRedlineTopics,
} from './services/spcService';
import { startOAuthFlow } from './services/oauthService';
import { getGmailProfile, sendGmailReply } from './services/gmailService';
import { syncService } from './services/syncService';
import {
  getKBEntries,
  getKBEntry,
  createKBEntry,
  updateKBEntry,
  deleteKBEntry,
  searchKBEntriesKeyword,
  searchKBEntries,
  embedAllEntries,
  buildRAGContext,
  ingestAcceptedDraft,
} from './services/knowledgeBaseService';
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

// ============================================================================
// Types (shared with renderer)
// ============================================================================

interface Account {
  id: string;
  platform: string;
  accountName: string;
  accountHandle: string | null;
  isConnected: boolean;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  accountId: string;
  channelType: string;
  externalId: string | null;
  threadId: string | null;
  senderName: string;
  senderHandle: string | null;
  senderAvatarUrl: string | null;
  recipientName: string | null;
  subject: string | null;
  body: string;
  rawMetadata: Record<string, any> | null;
  priorityScore: number;
  isRead: boolean;
  isArchived: boolean;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
  classification?: Classification | null;
  drafts?: Draft[];
}

interface Classification {
  id: string;
  messageId: string;
  opportunityType: string;
  sentiment: string;
  intent: string;
  topicAlignment: number;
  hostilityLevel: number;
  confidence: number;
  explanation: string | null;
  modelUsed: string | null;
  createdAt: string;
}

interface Draft {
  id: string;
  messageId: string;
  responseMode: string;
  draftText: string;
  confidence: number;
  rationale: string | null;
  modelUsed: string | null;
  isAccepted: boolean;
  isSent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackEvent {
  id: string;
  draftId: string;
  finalText: string | null;
  editDistance: number;
  editClassification: string | null;
  userRating: number | null;
  wasAccepted: boolean;
  wasSent: boolean;
  createdAt: string;
}

interface SpcMetric {
  id: string;
  channelType: string;
  responseMode: string;
  acceptanceRate: number;
  lightEditRate: number;
  heavyEditRate: number;
  misclassificationRate: number;
  sampleSize: number;
  controlState: string;
  upperControlLimit: number | null;
  lowerControlLimit: number | null;
  meanValue: number | null;
  createdAt: string;
  updatedAt: string;
}

interface AutomationTierEntry {
  id: string;
  channelType: string;
  responseMode: string;
  currentTier: number;
  reason: string | null;
  updatedAt: string;
}

interface MessageFilters {
  channelType?: string;
  isRead?: boolean;
  isArchived?: boolean;
  isStarred?: boolean;
  accountId?: string;
  search?: string;
  minPriority?: number;
  limit?: number;
  offset?: number;
}

interface CreateMessageInput {
  accountId: string;
  channelType: string;
  externalId?: string;
  threadId?: string;
  senderName: string;
  senderHandle?: string;
  senderAvatarUrl?: string;
  recipientName?: string;
  subject?: string;
  body: string;
  rawMetadata?: Record<string, any>;
  priorityScore?: number;
}

interface CreateAccountInput {
  platform: string;
  accountName: string;
  accountHandle?: string;
}

interface CreateFeedbackInput {
  draftId: string;
  finalText?: string;
  editDistance?: number;
  editClassification?: string;
  userRating?: number;
  wasAccepted: boolean;
  wasSent?: boolean;
}

interface SendDraftInput {
  draftId: string;
  finalText?: string;
}

interface InboxStats {
  totalMessages: number;
  unreadCount: number;
  byChannel: Record<string, number>;
  byPriority: Record<string, number>;
  bySentiment: Record<string, number>;
}

// ============================================================================
// Row Mappers
// ============================================================================

function mapAccount(row: any): Account {
  return {
    id: row.id,
    platform: row.platform,
    accountName: row.account_name,
    accountHandle: row.account_handle ?? null,
    isConnected: !!row.access_token,
    isActive: Boolean(row.is_active),
    lastSyncAt: row.last_sync_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    externalId: row.external_id ?? null,
    threadId: row.thread_id ?? null,
    accountId: row.account_id ?? null,
    channelType: row.channel_type,
    direction: row.direction ?? 'inbound',
    senderName: row.sender_name ?? null,
    senderHandle: row.sender_handle ?? null,
    subject: row.subject ?? null,
    body: row.body,
    priorityScore: row.priority_score ?? 50,
    isRead: Boolean(row.is_read),
    isArchived: Boolean(row.is_archived),
    isStarred: Boolean(row.is_starred),
    ingestionStatus: row.ingestion_status ?? 'processed',
    recipientEmail: row.recipient_email ?? null,
    inReplyTo: row.in_reply_to ?? null,
    rawMetadata: row.raw_metadata ? JSON.parse(row.raw_metadata) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClassification(row: any): Classification {
  return {
    id: row.id,
    messageId: row.message_id,
    opportunityType: row.opportunity_type,
    sentiment: row.sentiment,
    intent: row.intent,
    topicAlignment: row.topic_alignment,
    hostilityLevel: row.hostility_level,
    confidence: row.confidence,
    explanation: row.explanation ?? null,
    modelUsed: row.model_used ?? null,
    createdAt: row.created_at,
  };
}

function mapDraft(row: any): Draft {
  return {
    id: row.id,
    messageId: row.message_id,
    responseMode: row.response_mode,
    draftText: row.draft_text,
    confidence: row.confidence,
    rationale: row.rationale ?? null,
    modelUsed: row.model_used ?? null,
    isAccepted: Boolean(row.is_accepted),
    isSent: Boolean(row.is_sent),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFeedbackEvent(row: any): FeedbackEvent {
  return {
    id: row.id,
    draftId: row.draft_id,
    finalText: row.final_text ?? null,
    editDistance: row.edit_distance ?? 0,
    editClassification: row.edit_classification ?? null,
    userRating: row.user_rating ?? null,
    wasAccepted: Boolean(row.was_accepted),
    wasSent: Boolean(row.was_sent),
    createdAt: row.created_at,
  };
}

function mapSpcMetric(row: any): SpcMetric {
  return {
    id: row.id,
    channelType: row.channel_type,
    responseMode: row.response_mode,
    acceptanceRate: row.acceptance_rate,
    lightEditRate: row.light_edit_rate,
    heavyEditRate: row.heavy_edit_rate,
    misclassificationRate: row.misclassification_rate,
    sampleSize: row.sample_size,
    controlState: row.control_state,
    upperControlLimit: row.upper_control_limit,
    lowerControlLimit: row.lower_control_limit,
    meanValue: row.mean_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAutomationTier(row: any): AutomationTierEntry {
  return {
    id: row.id,
    channelType: row.channel_type,
    responseMode: row.response_mode,
    currentTier: row.current_tier,
    reason: row.reason ?? null,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// API Key Store (shared across NovaSyn apps)
// ============================================================================

function getApiKeysPath(): string {
  const appData = process.env.APPDATA || path.join(app.getPath('home'), 'AppData', 'Roaming');
  return path.join(appData, 'NovaSyn', 'api-keys.json');
}

function getApiKeys(): Record<string, string> {
  const keysPath = getApiKeysPath();
  try {
    if (fs.existsSync(keysPath)) {
      const raw = fs.readFileSync(keysPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[API Keys] Error reading api-keys.json:', err);
  }
  return {};
}

function setApiKey(provider: string, key: string): void {
  const keysPath = getApiKeysPath();
  const dir = path.dirname(keysPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const keys = getApiKeys();
  keys[provider] = key;
  fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2), 'utf-8');
}

// ============================================================================
// Settings Store (SQLite-backed)
// ============================================================================

function getSettings(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

function saveSettings(settings: Record<string, string>): void {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const runAll = db.transaction(() => {
    for (const [key, value] of Object.entries(settings)) {
      upsert.run(key, value);
    }
  });
  runAll();
}

// ============================================================================
// AI Helpers
// ============================================================================

let stopGenerationRequested = false;

function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = AI_MODELS.find(m => m.id === modelId);
  if (!model) return 0;
  return (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput;
}

function getProviderForModel(modelId: string): string {
  const model = AI_MODELS.find(m => m.id === modelId);
  return model?.provider ?? 'anthropic';
}

// ============================================================================
// IPC Handlers
// ============================================================================

function registerIpcHandlers(): void {
  // --------------------------------------------------------------------------
  // Messages
  // --------------------------------------------------------------------------

  ipcMain.handle('GET_MESSAGES', async (_event, filters: MessageFilters = {}) => {
    try {
      const db = getDb();
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters.channelType) {
        conditions.push('channel_type = ?');
        params.push(filters.channelType);
      }
      if (filters.isRead !== undefined) {
        conditions.push('is_read = ?');
        params.push(filters.isRead ? 1 : 0);
      }
      if (filters.isArchived !== undefined) {
        conditions.push('is_archived = ?');
        params.push(filters.isArchived ? 1 : 0);
      }
      if (filters.isStarred !== undefined) {
        conditions.push('is_starred = ?');
        params.push(filters.isStarred ? 1 : 0);
      }
      if (filters.accountId) {
        conditions.push('account_id = ?');
        params.push(filters.accountId);
      }
      if (filters.minPriority !== undefined) {
        conditions.push('priority_score >= ?');
        params.push(filters.minPriority);
      }

      let sql = 'SELECT * FROM messages';
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY priority_score DESC, created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }
      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }

      const rows = db.prepare(sql).all(...params) as any[];
      return rows.map(mapMessage);
    } catch (err: any) {
      console.error('[IPC] GET_MESSAGES error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('GET_MESSAGE', async (_event, id: string) => {
    try {
      const db = getDb();

      const msgRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
      if (!msgRow) return { error: 'Message not found' };

      const message = mapMessage(msgRow);

      const classRow = db.prepare('SELECT * FROM classifications WHERE message_id = ?').get(id) as any;
      message.classification = classRow ? mapClassification(classRow) : null;

      const draftRows = db.prepare('SELECT * FROM drafts WHERE message_id = ? ORDER BY created_at ASC').all(id) as any[];
      message.drafts = draftRows.map(mapDraft);

      return message;
    } catch (err: any) {
      console.error('[IPC] GET_MESSAGE error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('CREATE_MESSAGE', async (_event, input: CreateMessageInput) => {
    try {
      const db = getDb();
      const id = uuidv4();
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO messages (
          id, account_id, channel_type, direction,
          sender_name, sender_handle,
          subject, body, priority_score,
          is_read, is_archived, is_starred, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
      `).run(
        id,
        input.accountId ?? null,
        input.channelType,
        input.direction ?? 'inbound',
        input.senderName ?? null,
        input.senderHandle ?? null,
        input.subject ?? null,
        input.body,
        input.priorityScore ?? 50,
        now,
        now
      );

      const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
      return mapMessage(row);
    } catch (err: any) {
      console.error('[IPC] CREATE_MESSAGE error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('UPDATE_MESSAGE', async (_event, id: string, updates: Partial<Message>) => {
    try {
      const db = getDb();
      const setClauses: string[] = [];
      const params: any[] = [];

      const fieldMap: Record<string, string> = {
        isRead: 'is_read',
        isArchived: 'is_archived',
        isStarred: 'is_starred',
        priorityScore: 'priority_score',
        subject: 'subject',
        body: 'body',
        senderName: 'sender_name',
        senderHandle: 'sender_handle',
        channelType: 'channel_type',
        direction: 'direction',
      };

      for (const [tsKey, dbCol] of Object.entries(fieldMap)) {
        if (tsKey in updates) {
          setClauses.push(`${dbCol} = ?`);
          const val = (updates as any)[tsKey];
          if (typeof val === 'boolean') {
            params.push(val ? 1 : 0);
          } else {
            params.push(val ?? null);
          }
        }
      }

      if (setClauses.length === 0) {
        return { error: 'No valid fields to update' };
      }

      setClauses.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      db.prepare(`UPDATE messages SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

      const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as any;
      if (!row) return { error: 'Message not found' };
      return mapMessage(row);
    } catch (err: any) {
      console.error('[IPC] UPDATE_MESSAGE error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('DELETE_MESSAGE', async (_event, id: string) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM feedback_events WHERE message_id = ?').run(id);
      db.prepare('DELETE FROM drafts WHERE message_id = ?').run(id);
      db.prepare('DELETE FROM classifications WHERE message_id = ?').run(id);
      db.prepare('DELETE FROM messages WHERE id = ?').run(id);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC] DELETE_MESSAGE error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('SEARCH_MESSAGES', async (_event, query: string) => {
    try {
      const db = getDb();
      const pattern = `%${query}%`;
      const rows = db.prepare(`
        SELECT * FROM messages
        WHERE body LIKE ? OR subject LIKE ? OR sender_name LIKE ?
        ORDER BY priority_score DESC, created_at DESC
      `).all(pattern, pattern, pattern) as any[];
      return rows.map(mapMessage);
    } catch (err: any) {
      console.error('[IPC] SEARCH_MESSAGES error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Classifications
  // --------------------------------------------------------------------------

  ipcMain.handle('GET_CLASSIFICATION', async (_event, messageId: string) => {
    try {
      const db = getDb();
      const row = db.prepare('SELECT * FROM classifications WHERE message_id = ?').get(messageId) as any;
      return row ? mapClassification(row) : null;
    } catch (err: any) {
      console.error('[IPC] GET_CLASSIFICATION error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('CLASSIFY_MESSAGE', async (_event, messageId: string, provider?: string, modelId?: string) => {
    try {
      const db = getDb();

      // Look up the message
      const msgRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any;
      if (!msgRow) return { error: 'Message not found' };

      // Resolve provider and model
      const effectiveProvider = provider || 'anthropic';
      const effectiveModel = modelId || AI_MODELS.find(m => m.provider === effectiveProvider)?.id || 'claude-3-5-sonnet-20241022';

      // Get the API key
      const keys = getApiKeys();
      const apiKey = keys[effectiveProvider];
      if (!apiKey) return { error: 'No API key configured for ' + effectiveProvider };

      // Delete any existing classification for this message (re-classify)
      db.prepare('DELETE FROM classifications WHERE message_id = ?').run(messageId);

      // Call the AI classification service
      const result = await classifyMessage({
        body: msgRow.body,
        senderName: msgRow.sender_name,
        senderHandle: msgRow.sender_handle,
        channelType: msgRow.channel_type,
        subject: msgRow.subject,
        apiKey,
        provider: effectiveProvider,
        modelId: effectiveModel,
      });

      // Insert the classification into the database
      const id = uuidv4();
      db.prepare(`
        INSERT INTO classifications (
          id, message_id, opportunity_type, sentiment, intent,
          topic_alignment, hostility_level, confidence,
          explanation, model_used, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        id,
        messageId,
        result.opportunityType,
        result.sentiment,
        result.intent,
        result.topicAlignment,
        result.hostilityLevel,
        result.confidence,
        result.explanation ?? null,
        effectiveModel
      );

      // Log AI usage
      const cost = calculateCost(effectiveModel, result.inputTokens ?? 0, result.outputTokens ?? 0);
      db.prepare(`
        INSERT INTO ai_log (id, model_id, provider, operation, input_tokens, output_tokens, cost, created_at)
        VALUES (?, ?, ?, 'classify', ?, ?, ?, datetime('now'))
      `).run(uuidv4(), effectiveModel, effectiveProvider, result.inputTokens ?? 0, result.outputTokens ?? 0, cost);

      console.log(`[AI] Classified message ${messageId} as ${result.opportunityType} (${result.sentiment}) — cost: $${cost.toFixed(6)}`);

      // Return the mapped classification
      const row = db.prepare('SELECT * FROM classifications WHERE id = ?').get(id) as any;
      return mapClassification(row);
    } catch (err: any) {
      console.error('[IPC] CLASSIFY_MESSAGE error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Drafts
  // --------------------------------------------------------------------------

  ipcMain.handle('GET_DRAFTS', async (_event, messageId: string) => {
    try {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM drafts WHERE message_id = ? ORDER BY created_at ASC').all(messageId) as any[];
      return rows.map(mapDraft);
    } catch (err: any) {
      console.error('[IPC] GET_DRAFTS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('GENERATE_DRAFT', async (_event, messageId: string, responseMode?: string, provider?: string, modelId?: string) => {
    try {
      const db = getDb();

      // Look up the message
      const msgRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any;
      if (!msgRow) return { error: 'Message not found' };

      // Look up existing classification for context
      const classRow = db.prepare('SELECT * FROM classifications WHERE message_id = ?').get(messageId) as any;
      const classification = classRow ? mapClassification(classRow) : null;

      // Resolve provider, model, and response mode
      const effectiveMode = responseMode || 'standard';
      const effectiveProvider = provider || 'anthropic';
      const effectiveModel = modelId || AI_MODELS.find(m => m.provider === effectiveProvider)?.id || 'claude-3-5-sonnet-20241022';

      // Get the API key
      const keys = getApiKeys();
      const apiKey = keys[effectiveProvider];
      if (!apiKey) return { error: 'No API key configured for ' + effectiveProvider };

      // Build RAG context from Knowledge Base
      const openaiKey = keys['openai'] || null;
      let ragContext = '';
      try {
        ragContext = await buildRAGContext(db, msgRow.body, msgRow.channel_type, effectiveMode, openaiKey);
      } catch (ragErr) {
        console.warn('[KB] RAG context build failed, continuing without:', ragErr);
      }

      // Get main window for streaming
      const mainWindow = getMainWindow();
      stopGenerationRequested = false;

      // Call the AI draft service
      const result = await generateDraft({
        ragContext,
        originalMessage: msgRow.body,
        senderName: msgRow.sender_name,
        channelType: msgRow.channel_type,
        subject: msgRow.subject,
        responseMode: effectiveMode,
        classification: classification ? {
          opportunityType: classification.opportunityType,
          sentiment: classification.sentiment,
          intent: classification.intent,
          hostilityLevel: classification.hostilityLevel,
        } : undefined,
        apiKey,
        provider: effectiveProvider,
        model: effectiveModel,
        onChunk: (chunk: string) => {
          if (!stopGenerationRequested) {
            mainWindow?.webContents.send('ai-stream-chunk', chunk);
          }
        },
      });

      // Signal streaming complete
      mainWindow?.webContents.send('ai-stream-done');

      // Insert the draft into the database
      const id = uuidv4();
      db.prepare(`
        INSERT INTO drafts (
          id, message_id, response_mode, draft_text, confidence,
          rationale, model_used, is_accepted, is_sent,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))
      `).run(
        id,
        messageId,
        effectiveMode,
        result.draftText,
        result.confidence ?? 0,
        result.rationale ?? null,
        effectiveModel
      );

      // Log AI usage
      const cost = calculateCost(effectiveModel, result.inputTokens ?? 0, result.outputTokens ?? 0);
      db.prepare(`
        INSERT INTO ai_log (id, model_id, provider, operation, input_tokens, output_tokens, cost, created_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?, datetime('now'))
      `).run(uuidv4(), effectiveModel, effectiveProvider, result.inputTokens ?? 0, result.outputTokens ?? 0, cost);

      console.log(`[AI] Generated ${effectiveMode} draft for message ${messageId} — cost: $${cost.toFixed(6)}`);

      // Return the mapped draft
      const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as any;
      return mapDraft(row);
    } catch (err: any) {
      console.error('[IPC] GENERATE_DRAFT error:', err);
      // Signal stream error so the UI can recover
      const mainWindow = getMainWindow();
      mainWindow?.webContents.send('ai-stream-done');
      return { error: err.message };
    }
  });

  ipcMain.handle('UPDATE_DRAFT', async (_event, id: string, updates: Partial<Draft>) => {
    try {
      const db = getDb();
      const setClauses: string[] = [];
      const params: any[] = [];

      const fieldMap: Record<string, string> = {
        draftText: 'draft_text',
        rationale: 'rationale',
        confidence: 'confidence',
        isAccepted: 'is_accepted',
        isSent: 'is_sent',
      };

      for (const [tsKey, dbCol] of Object.entries(fieldMap)) {
        if (tsKey in updates) {
          setClauses.push(`${dbCol} = ?`);
          const val = (updates as any)[tsKey];
          if (typeof val === 'boolean') {
            params.push(val ? 1 : 0);
          } else {
            params.push(val ?? null);
          }
        }
      }

      if (setClauses.length === 0) {
        return { error: 'No valid fields to update' };
      }

      setClauses.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);

      db.prepare(`UPDATE drafts SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

      const row = db.prepare('SELECT * FROM drafts WHERE id = ?').get(id) as any;
      if (!row) return { error: 'Draft not found' };
      return mapDraft(row);
    } catch (err: any) {
      console.error('[IPC] UPDATE_DRAFT error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Feedback
  // --------------------------------------------------------------------------

  ipcMain.handle('SUBMIT_FEEDBACK', async (_event, input: CreateFeedbackInput) => {
    try {
      const db = getDb();
      const id = uuidv4();

      db.prepare(`
        INSERT INTO feedback_events (
          id, draft_id, final_text, edit_distance,
          edit_classification, user_rating, was_accepted, was_sent,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        id,
        input.draftId,
        input.finalText ?? null,
        input.editDistance ?? 0,
        input.editClassification ?? null,
        input.userRating ?? null,
        input.wasAccepted ? 1 : 0,
        input.wasSent ? 1 : 0
      );

      // Update draft state (was missing — isAccepted/isSent never got set)
      db.prepare(`
        UPDATE drafts SET is_accepted = ?, is_sent = ? WHERE id = ?
      `).run(input.wasAccepted ? 1 : 0, input.wasSent ? 1 : 0, input.draftId);

      // Auto-recalculate SPC after new feedback
      try {
        recalculateSpc(db);
      } catch (spcErr) {
        console.error('[SPC] Recalculation after feedback failed:', spcErr);
      }

      // Auto-ingest accepted drafts into Knowledge Base (learning loop)
      if (input.wasAccepted) {
        try {
          const draftRow = db.prepare('SELECT * FROM drafts WHERE id = ?').get(input.draftId) as any;
          if (draftRow) {
            const msgRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(draftRow.message_id) as any;
            const finalText = input.finalText || draftRow.draft_text;
            ingestAcceptedDraft(
              db,
              input.draftId,
              finalText,
              draftRow.response_mode,
              msgRow?.channel_type || 'manual',
              msgRow?.subject,
              msgRow?.sender_name,
            );
            console.log(`[KB] Auto-ingested accepted draft ${input.draftId} into Knowledge Base`);
          }
        } catch (kbErr) {
          console.error('[KB] Auto-ingest failed:', kbErr);
        }
      }

      const row = db.prepare('SELECT * FROM feedback_events WHERE id = ?').get(id) as any;
      return mapFeedbackEvent(row);
    } catch (err: any) {
      console.error('[IPC] SUBMIT_FEEDBACK error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Send Draft via Gmail
  // --------------------------------------------------------------------------

  ipcMain.handle('SEND_DRAFT', async (_event, input: SendDraftInput) => {
    try {
      const db = getDb();

      // Load draft
      const draftRow = db.prepare('SELECT * FROM drafts WHERE id = ?').get(input.draftId) as any;
      if (!draftRow) return { sent: false, error: 'Draft not found' };

      // Load original message
      const msgRow = db.prepare('SELECT * FROM messages WHERE id = ?').get(draftRow.message_id) as any;
      if (!msgRow) return { sent: false, error: 'Original message not found' };

      // Only support Gmail send for now
      if (msgRow.channel_type !== 'email') {
        return { sent: false, error: `Send not supported for channel: ${msgRow.channel_type}` };
      }

      // Find the Gmail account
      const account = msgRow.account_id
        ? db.prepare('SELECT * FROM accounts WHERE id = ?').get(msgRow.account_id) as any
        : db.prepare("SELECT * FROM accounts WHERE platform = 'gmail' AND is_active = 1 LIMIT 1").get() as any;

      if (!account || !account.access_token) {
        return { sent: false, error: 'No connected Gmail account found' };
      }

      const recipientEmail = msgRow.recipient_email || msgRow.sender_handle;
      if (!recipientEmail) {
        return { sent: false, error: 'No recipient email address' };
      }

      const finalText = input.finalText || draftRow.draft_text;

      // Send via Gmail API
      const result = await sendGmailReply(account.access_token, {
        to: recipientEmail,
        subject: msgRow.subject || '(no subject)',
        body: finalText,
        threadId: msgRow.thread_id?.replace('gmail:', '') || undefined,
        inReplyTo: msgRow.in_reply_to || undefined,
      });

      // Mark draft as sent
      db.prepare('UPDATE drafts SET is_accepted = 1, is_sent = 1 WHERE id = ?').run(input.draftId);

      // Store sent message record locally
      const sentId = uuidv4();
      db.prepare(`
        INSERT INTO messages (
          id, external_id, thread_id, account_id, channel_type, direction,
          sender_name, sender_handle, subject, body,
          recipient_email, priority_score, is_read, is_archived, is_starred,
          ingestion_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'email', 'outbound', ?, ?, ?, ?, ?, 0, 1, 0, 0, 'processed', datetime('now'), datetime('now'))
      `).run(
        sentId,
        `gmail:${result.messageId}`,
        result.threadId ? `gmail:${result.threadId}` : msgRow.thread_id,
        account.id,
        account.account_name,
        account.account_handle,
        msgRow.subject ? `Re: ${msgRow.subject}`.replace(/^Re: Re: /, 'Re: ') : '(no subject)',
        finalText,
        recipientEmail
      );

      // Submit feedback as accepted+sent for SPC
      const feedbackId = uuidv4();
      db.prepare(`
        INSERT INTO feedback_events (
          id, draft_id, final_text, edit_distance,
          was_accepted, was_sent, created_at
        ) VALUES (?, ?, ?, ?, 1, 1, datetime('now'))
      `).run(
        feedbackId,
        input.draftId,
        finalText,
        finalText === draftRow.draft_text ? 0 : 0.1
      );

      // Recalculate SPC
      try { recalculateSpc(db); } catch (e) { /* non-fatal */ }

      // Auto-ingest into KB
      try {
        ingestAcceptedDraft(
          db, input.draftId, finalText, draftRow.response_mode,
          msgRow.channel_type || 'email', msgRow.subject, msgRow.sender_name
        );
      } catch (e) { /* non-fatal */ }

      console.log(`[Gmail] Sent reply to ${recipientEmail}, gmail ID: ${result.messageId}`);
      return { sent: true };
    } catch (err: any) {
      console.error('[IPC] SEND_DRAFT error:', err);
      return { sent: false, error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Automation Tier Lookup (for Tier 1 auto-draft)
  // --------------------------------------------------------------------------

  ipcMain.handle('GET_AUTOMATION_TIER_FOR', async (_event, channelType: string, responseMode: string) => {
    try {
      const db = getDb();
      const row = db.prepare(
        'SELECT * FROM automation_tiers WHERE channel_type = ? AND response_mode = ?'
      ).get(channelType, responseMode) as any;
      if (!row) return null;
      return mapAutomationTier(row);
    } catch (err: any) {
      console.error('[IPC] GET_AUTOMATION_TIER_FOR error:', err);
      return null;
    }
  });

  // --------------------------------------------------------------------------
  // SPC
  // --------------------------------------------------------------------------

  ipcMain.handle('GET_SPC_METRICS', async () => {
    try {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM spc_metrics ORDER BY channel_type ASC, response_mode ASC').all() as any[];
      return rows.map(mapSpcMetric);
    } catch (err: any) {
      console.error('[IPC] GET_SPC_METRICS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('GET_AUTOMATION_TIERS', async () => {
    try {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM automation_tiers ORDER BY channel_type ASC, response_mode ASC').all() as any[];
      return rows.map(mapAutomationTier);
    } catch (err: any) {
      console.error('[IPC] GET_AUTOMATION_TIERS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('CALCULATE_SPC_METRICS', async () => {
    try {
      const db = getDb();
      recalculateSpc(db);
      const rows = db.prepare('SELECT * FROM spc_metrics').all() as any[];
      return { recalculated: rows.length };
    } catch (err: any) {
      console.error('[IPC] CALCULATE_SPC_METRICS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('UPDATE_AUTOMATION_TIER', async (_event, channelType: string, responseMode: string, tier: number, reason?: string) => {
    try {
      const db = getDb();
      const id = uuidv4();
      db.prepare(`
        INSERT INTO automation_tiers (id, channel_type, response_mode, current_tier, reason, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(channel_type, response_mode) DO UPDATE SET
          current_tier = excluded.current_tier,
          reason = excluded.reason,
          updated_at = datetime('now')
      `).run(id, channelType, responseMode, tier, reason ?? `Manual override to Tier ${tier}`);

      const row = db.prepare(
        'SELECT * FROM automation_tiers WHERE channel_type = ? AND response_mode = ?'
      ).get(channelType, responseMode) as any;
      return mapAutomationTier(row);
    } catch (err: any) {
      console.error('[IPC] UPDATE_AUTOMATION_TIER error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('GET_REDLINE_TOPICS', async () => {
    try {
      const db = getDb();
      return getSpcRedlineTopics(db);
    } catch (err: any) {
      console.error('[IPC] GET_REDLINE_TOPICS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('SAVE_REDLINE_TOPICS', async (_event, topics: string[]) => {
    try {
      const db = getDb();
      saveSpcRedlineTopics(db, topics);
      return topics;
    } catch (err: any) {
      console.error('[IPC] SAVE_REDLINE_TOPICS error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Accounts
  // --------------------------------------------------------------------------

  ipcMain.handle('GET_ACCOUNTS', async () => {
    try {
      const db = getDb();
      const rows = db.prepare('SELECT * FROM accounts ORDER BY created_at ASC').all() as any[];
      return rows.map(mapAccount);
    } catch (err: any) {
      console.error('[IPC] GET_ACCOUNTS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('CREATE_ACCOUNT', async (_event, input: CreateAccountInput) => {
    try {
      const db = getDb();
      const id = uuidv4();

      db.prepare(`
        INSERT INTO accounts (
          id, platform, account_name, account_handle, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).run(
        id,
        input.platform,
        input.accountName,
        input.accountHandle ?? null
      );

      const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
      return mapAccount(row);
    } catch (err: any) {
      console.error('[IPC] CREATE_ACCOUNT error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('UPDATE_ACCOUNT', async (_event, id: string, updates: Partial<Account>) => {
    try {
      const db = getDb();
      const setClauses: string[] = [];
      const params: any[] = [];

      const fieldMap: Record<string, string> = {
        platform: 'platform',
        accountName: 'account_name',
        accountHandle: 'account_handle',
        isActive: 'is_active',
      };

      for (const [tsKey, dbCol] of Object.entries(fieldMap)) {
        if (tsKey in updates) {
          setClauses.push(`${dbCol} = ?`);
          const val = (updates as any)[tsKey];
          if (typeof val === 'boolean') {
            params.push(val ? 1 : 0);
          } else {
            params.push(val ?? null);
          }
        }
      }

      if (setClauses.length === 0) {
        return { error: 'No valid fields to update' };
      }

      params.push(id);
      db.prepare(`UPDATE accounts SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

      const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
      if (!row) return { error: 'Account not found' };
      return mapAccount(row);
    } catch (err: any) {
      console.error('[IPC] UPDATE_ACCOUNT error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('DELETE_ACCOUNT', async (_event, id: string) => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC] DELETE_ACCOUNT error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Platform Connect / Disconnect
  // --------------------------------------------------------------------------

  ipcMain.handle('CONNECT_PLATFORM', async (_event, platform: string) => {
    try {
      const db = getDb();
      const settings = getSettings();

      const clientId = settings[`${platform}_client_id`] || '';
      const clientSecret = settings[`${platform}_client_secret`] || '';
      if (!clientId || !clientSecret) {
        return { error: `No OAuth credentials for ${platform}. Configure ${platform}_client_id and ${platform}_client_secret in Settings.` };
      }

      // Start OAuth flow (opens browser window)
      const tokens = await startOAuthFlow(platform, clientId, clientSecret);

      // Get profile info for the account name/handle
      let accountName = platform;
      let accountHandle: string | null = null;

      if (platform === 'gmail' || platform === 'youtube') {
        try {
          const profile = await getGmailProfile(tokens.accessToken);
          accountName = profile.emailAddress;
          accountHandle = profile.emailAddress;
        } catch (err) {
          console.warn('[OAuth] Could not fetch profile:', err);
        }
      }

      // Check if account already exists for this platform/handle
      const existing = db.prepare(
        'SELECT id FROM accounts WHERE platform = ? AND account_handle = ?'
      ).get(platform, accountHandle) as any;

      let accountId: string;

      if (existing) {
        // Update existing account with new tokens
        accountId = existing.id;
        db.prepare(`
          UPDATE accounts SET
            access_token = ?, refresh_token = ?, token_expires_at = ?,
            is_active = 1, account_name = ?
          WHERE id = ?
        `).run(tokens.accessToken, tokens.refreshToken, tokens.expiresAt, accountName, accountId);
      } else {
        // Create new account
        accountId = uuidv4();
        db.prepare(`
          INSERT INTO accounts (
            id, platform, account_name, account_handle,
            access_token, refresh_token, token_expires_at,
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).run(
          accountId, platform, accountName, accountHandle,
          tokens.accessToken, tokens.refreshToken, tokens.expiresAt
        );
      }

      console.log(`[OAuth] Connected ${platform} account: ${accountName}`);

      const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any;
      return mapAccount(row);
    } catch (err: any) {
      console.error('[IPC] CONNECT_PLATFORM error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('DISCONNECT_ACCOUNT', async (_event, id: string) => {
    try {
      const db = getDb();
      db.prepare(`
        UPDATE accounts SET
          access_token = NULL, refresh_token = NULL, token_expires_at = NULL,
          is_active = 0
        WHERE id = ?
      `).run(id);

      const row = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
      if (!row) return { error: 'Account not found' };

      console.log(`[OAuth] Disconnected account ${id}`);
      return mapAccount(row);
    } catch (err: any) {
      console.error('[IPC] DISCONNECT_ACCOUNT error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Sync
  // --------------------------------------------------------------------------

  ipcMain.handle('SYNC_ACCOUNT', async (_event, accountId: string) => {
    try {
      return await syncService.syncAccount(accountId);
    } catch (err: any) {
      console.error('[IPC] SYNC_ACCOUNT error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('SYNC_ALL', async () => {
    try {
      return await syncService.syncAll();
    } catch (err: any) {
      console.error('[IPC] SYNC_ALL error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('GET_SYNC_STATUS', async () => {
    try {
      return syncService.getStatuses();
    } catch (err: any) {
      console.error('[IPC] GET_SYNC_STATUS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('SET_AUTO_SYNC', async (_event, enabled: boolean, intervalMinutes?: number) => {
    try {
      if (enabled) {
        const interval = intervalMinutes ?? 5;
        syncService.startAutoSync(interval);
        saveSettings({ auto_sync_enabled: 'true', sync_interval_minutes: String(interval) });
      } else {
        syncService.stopAutoSync();
        saveSettings({ auto_sync_enabled: 'false' });
      }
      return { enabled };
    } catch (err: any) {
      console.error('[IPC] SET_AUTO_SYNC error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  ipcMain.handle('GET_INBOX_STATS', async () => {
    try {
      const db = getDb();

      const totalRow = db.prepare('SELECT COUNT(*) as count FROM messages').get() as any;
      const totalMessages = totalRow.count;

      const unreadRow = db.prepare('SELECT COUNT(*) as count FROM messages WHERE is_read = 0').get() as any;
      const unreadCount = unreadRow.count;

      const channelRows = db.prepare(
        'SELECT channel_type, COUNT(*) as count FROM messages GROUP BY channel_type'
      ).all() as any[];
      const byChannel: Record<string, number> = {};
      for (const row of channelRows) {
        byChannel[row.channel_type] = row.count;
      }

      const priorityRows = db.prepare(`
        SELECT
          CASE
            WHEN priority_score >= 75 THEN 'high'
            WHEN priority_score >= 40 THEN 'medium'
            ELSE 'low'
          END as priority_level,
          COUNT(*) as count
        FROM messages
        GROUP BY priority_level
      `).all() as any[];
      const byPriority: Record<string, number> = {};
      for (const row of priorityRows) {
        byPriority[row.priority_level] = row.count;
      }

      const sentimentRows = db.prepare(`
        SELECT c.sentiment, COUNT(*) as count
        FROM messages m
        JOIN classifications c ON c.message_id = m.id
        GROUP BY c.sentiment
      `).all() as any[];
      const bySentiment: Record<string, number> = {};
      for (const row of sentimentRows) {
        bySentiment[row.sentiment] = row.count;
      }

      const stats: InboxStats = {
        totalMessages,
        unreadCount,
        byChannel,
        byPriority,
        bySentiment,
      };

      return stats;
    } catch (err: any) {
      console.error('[IPC] GET_INBOX_STATS error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Settings
  // --------------------------------------------------------------------------

  ipcMain.handle('GET_SETTINGS', async () => {
    try {
      return getSettings();
    } catch (err: any) {
      console.error('[IPC] GET_SETTINGS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('SAVE_SETTINGS', async (_event, settings: Record<string, string>) => {
    try {
      saveSettings(settings);
      return getSettings();
    } catch (err: any) {
      console.error('[IPC] SAVE_SETTINGS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('GET_API_KEYS', async () => {
    try {
      return getApiKeys();
    } catch (err: any) {
      console.error('[IPC] GET_API_KEYS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('SET_API_KEY', async (_event, provider: string, key: string) => {
    try {
      setApiKey(provider, key);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC] SET_API_KEY error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('GET_MODELS', async () => {
    try {
      const discovered = getCachedModels();
      if (discovered.length === 0) return AI_MODELS;

      const merged = new Map<string, any>();
      for (const m of discovered) {
        merged.set(m.id, {
          id: m.id,
          name: m.name,
          provider: m.provider,
          contextWindow: m.contextWindow,
          maxOutput: m.maxOutputTokens,
          costPer1kInput: 0,
          costPer1kOutput: 0,
        });
      }
      // Hardcoded models fill gaps and preserve cost data
      for (const m of AI_MODELS) {
        if (!merged.has(m.id)) {
          merged.set(m.id, m);
        } else {
          // Preserve cost data from hardcoded list
          const existing = merged.get(m.id)!;
          existing.costPer1kInput = m.costPer1kInput;
          existing.costPer1kOutput = m.costPer1kOutput;
        }
      }
      return Array.from(merged.values());
    } catch (err: any) {
      console.error('[IPC] GET_MODELS error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('discover-models', async (_event, forceRefresh) => {
    try {
      const apiKeys = getApiKeys();
      return await discoverModels(apiKeys, forceRefresh ?? false);
    } catch (err: any) {
      console.error('[IPC] DISCOVER_MODELS error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Window Controls
  // --------------------------------------------------------------------------

  ipcMain.on('MINIMIZE_WINDOW', () => {
    try {
      const mainWindow = getMainWindow();
      mainWindow?.minimize();
    } catch (err: any) {
      console.error('[IPC] MINIMIZE_WINDOW error:', err);
    }
  });

  ipcMain.on('MAXIMIZE_WINDOW', () => {
    try {
      const mainWindow = getMainWindow();
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
      }
    } catch (err: any) {
      console.error('[IPC] MAXIMIZE_WINDOW error:', err);
    }
  });

  ipcMain.on('CLOSE_WINDOW', () => {
    try {
      const mainWindow = getMainWindow();
      mainWindow?.close();
    } catch (err: any) {
      console.error('[IPC] CLOSE_WINDOW error:', err);
    }
  });

  // --------------------------------------------------------------------------
  // Export
  // --------------------------------------------------------------------------

  ipcMain.handle('EXPORT_MESSAGES_CSV', async () => {
    try {
      const db = getDb();
      const mainWindow = getMainWindow();
      if (!mainWindow) return null;

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Messages',
        defaultPath: `novasyn-messages-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });

      if (result.canceled || !result.filePath) return null;

      const rows = db.prepare(`
        SELECT m.*, c.opportunity_type, c.sentiment, c.intent, c.confidence as class_confidence
        FROM messages m
        LEFT JOIN classifications c ON c.message_id = m.id
        ORDER BY m.created_at DESC
      `).all() as any[];

      const headers = [
        'id', 'channel_type', 'direction', 'sender_name', 'sender_handle',
        'subject', 'body', 'priority_score', 'is_read', 'is_archived', 'is_starred',
        'opportunity_type', 'sentiment', 'intent', 'confidence', 'created_at',
      ];

      const csvRows = rows.map((r: any) =>
        headers.map((h) => {
          const val = r[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      );

      const csv = [headers.join(','), ...csvRows].join('\n');
      fs.writeFileSync(result.filePath, csv, 'utf-8');

      console.log(`[Export] Exported ${rows.length} messages to ${result.filePath}`);
      return { path: result.filePath };
    } catch (err: any) {
      console.error('[IPC] EXPORT_MESSAGES_CSV error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('EXPORT_SPC_JSON', async () => {
    try {
      const db = getDb();
      const mainWindow = getMainWindow();
      if (!mainWindow) return null;

      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export SPC Report',
        defaultPath: `novasyn-spc-report-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (result.canceled || !result.filePath) return null;

      const metrics = db.prepare('SELECT * FROM spc_metrics ORDER BY channel_type, response_mode').all();
      const tiers = db.prepare('SELECT * FROM automation_tiers ORDER BY channel_type, response_mode').all();
      const feedbackCount = (db.prepare('SELECT COUNT(*) as count FROM feedback_events').get() as any).count;

      const report = {
        exportedAt: new Date().toISOString(),
        app: 'NovaSyn Social',
        totalFeedbackEvents: feedbackCount,
        spcMetrics: metrics,
        automationTiers: tiers,
      };

      fs.writeFileSync(result.filePath, JSON.stringify(report, null, 2), 'utf-8');

      console.log(`[Export] Exported SPC report to ${result.filePath}`);
      return { path: result.filePath };
    } catch (err: any) {
      console.error('[IPC] EXPORT_SPC_JSON error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // Knowledge Base
  // --------------------------------------------------------------------------

  ipcMain.handle('GET_KB_ENTRIES', async (_event, filters?: any) => {
    try {
      const db = getDb();
      return getKBEntries(db, filters);
    } catch (err: any) {
      console.error('[IPC] GET_KB_ENTRIES error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('GET_KB_ENTRY', async (_event, id: string) => {
    try {
      const db = getDb();
      return getKBEntry(db, id);
    } catch (err: any) {
      console.error('[IPC] GET_KB_ENTRY error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('CREATE_KB_ENTRY', async (_event, input: any) => {
    try {
      const db = getDb();
      return createKBEntry(db, input);
    } catch (err: any) {
      console.error('[IPC] CREATE_KB_ENTRY error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('UPDATE_KB_ENTRY', async (_event, id: string, updates: any) => {
    try {
      const db = getDb();
      const result = updateKBEntry(db, id, updates);
      if (!result) return { error: 'KB entry not found' };
      return result;
    } catch (err: any) {
      console.error('[IPC] UPDATE_KB_ENTRY error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('DELETE_KB_ENTRY', async (_event, id: string) => {
    try {
      const db = getDb();
      deleteKBEntry(db, id);
      return { success: true };
    } catch (err: any) {
      console.error('[IPC] DELETE_KB_ENTRY error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('SEARCH_KB', async (_event, query: string, channelType?: string, responseMode?: string) => {
    try {
      const db = getDb();
      const keys = getApiKeys();
      const openaiKey = keys['openai'];

      if (openaiKey) {
        try {
          const results = await searchKBEntries(db, query, openaiKey, { channelType, responseMode, topK: 10 });
          return results.map((r) => r.entry);
        } catch {
          // Fall back to keyword search
        }
      }

      return searchKBEntriesKeyword(db, query, { channelType, responseMode, topK: 10 });
    } catch (err: any) {
      console.error('[IPC] SEARCH_KB error:', err);
      return { error: err.message };
    }
  });

  ipcMain.handle('EMBED_KB_ENTRIES', async () => {
    try {
      const db = getDb();
      const keys = getApiKeys();
      const openaiKey = keys['openai'];
      if (!openaiKey) return { error: 'No OpenAI API key configured. Embeddings require an OpenAI key.' };

      const count = await embedAllEntries(db, openaiKey);
      console.log(`[KB] Embedded ${count} entries`);
      return { embedded: count };
    } catch (err: any) {
      console.error('[IPC] EMBED_KB_ENTRIES error:', err);
      return { error: err.message };
    }
  });

  // --------------------------------------------------------------------------
  // AI Control
  // --------------------------------------------------------------------------

  ipcMain.handle('AI_STOP_GENERATION', async () => {
    console.log('[AI] Stop generation requested');
    stopGenerationRequested = true;
    return { success: true };
  });

  // --------------------------------------------------------------------------
  // NS Vault
  // --------------------------------------------------------------------------

  ipcMain.handle('vault-list', (_event: any, options: any) => vaultList(options));
  ipcMain.handle('vault-store', (_event: any, input: any) => vaultStore(input));
  ipcMain.handle('vault-get', (_event: any, id: string) => vaultGet(id));
  ipcMain.handle('vault-delete', (_event: any, id: string) => { vaultDelete(id); });
  ipcMain.handle('vault-search', (_event: any, options: any) => vaultSearch(options));
  ipcMain.handle('vault-get-tags', () => vaultGetTags());
  ipcMain.handle('vault-add-tag', (_event: any, itemId: string, tagName: string, color?: string) => { vaultAddTag(itemId, tagName, color); });
  ipcMain.handle('vault-annotate', (_event: any, itemId: string, content: string) => vaultAnnotate(itemId, content));
  ipcMain.handle('vault-get-annotations', (_event: any, itemId: string) => vaultGetAnnotations(itemId));
  ipcMain.handle('vault-get-provenance', (_event: any, itemId: string) => vaultGetProvenance(itemId));

  // --------------------------------------------------------------------------
  // Macro Registry
  // --------------------------------------------------------------------------
  ipcMain.handle('macro-get-registry', () => getRegistry());
  ipcMain.handle('macro-get-available', () => getAvailableMacros());

  // --------------------------------------------------------------------------
  // Cross-App Queue
  // --------------------------------------------------------------------------
  ipcMain.handle('macro-invoke', (_event: any, targetApp: string, macro: string, input: any, vaultParentId?: string) => {
    return sendMacroRequest(targetApp, macro, input, vaultParentId);
  });

  ipcMain.handle('macro-invoke-status', (_event: any, requestId: string) => {
    return checkMacroResponse(requestId);
  });

  ipcMain.handle('macro-get-pending', () => {
    return getPendingRequests();
  });

  // --------------------------------------------------------------------------
  // Orchestrations
  // --------------------------------------------------------------------------

  ipcMain.handle('orch-list', () => listOrchestrations());
  ipcMain.handle('orch-create', (_event: any, data: any) => createOrchestration(data));
  ipcMain.handle('orch-update', (_event: any, id: string, updates: any) => updateOrchestration(id, updates));
  ipcMain.handle('orch-delete', (_event: any, id: string) => { deleteOrchestration(id); });
  ipcMain.handle('orch-get', (_event: any, id: string) => getOrchestration(id));
  ipcMain.handle('orch-run', (_event: any, orchestrationId: string, manualInput?: string) => runOrchestration(orchestrationId, manualInput));
  ipcMain.handle('orch-resume', (_event: any, runId: string, decision: string) => resumeOrchestration(runId, decision as 'approved' | 'rejected'));
  ipcMain.handle('orch-get-runs', (_event: any, orchestrationId: string) => listRuns(orchestrationId));
  ipcMain.handle('orch-get-run', (_event: any, runId: string) => getRun(runId));

  // --------------------------------------------------------------------------
  // System
  // --------------------------------------------------------------------------

  ipcMain.handle('ping', async () => {
    return 'pong';
  });
}

// ============================================================================
// App Lifecycle
// ============================================================================

app.whenReady().then(() => {
  console.log('[App] NovaSyn Social starting...');
  initDatabase();
  initVault();
  registerMacros();
  startQueueWatcher();

  // Initialize sync service with DB and settings access
  syncService.init({
    db: getDb(),
    getSettings,
    onNewMessages: (count, platform) => {
      const settings = getSettings();
      if (settings.notificationsEnabled === 'true' || settings.notificationsEnabled === undefined) {
        const platformLabels: Record<string, string> = {
          gmail: 'Gmail',
          linkedin: 'LinkedIn',
          youtube: 'YouTube',
          twitter: 'Twitter/X',
        };
        const label = platformLabels[platform] || platform;
        new Notification({
          title: 'NovaSyn Social',
          body: `${count} new message${count > 1 ? 's' : ''} from ${label}`,
        }).show();
      }
    },
  });

  registerIpcHandlers();
  createMainWindow();

  // Background model discovery (non-blocking)
  discoverModels(getApiKeys()).catch(err => console.error('[ModelDiscovery] Background refresh failed:', err));

  // Start auto-sync if previously enabled
  const settings = getSettings();
  if (settings.auto_sync_enabled === 'true') {
    const interval = parseInt(settings.sync_interval_minutes || '5', 10);
    syncService.startAutoSync(interval);
  }

  console.log('[App] NovaSyn Social ready');
});

app.on('before-quit', () => {
  stopQueueWatcher();
  unregisterMacros();
  closeVaultDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
