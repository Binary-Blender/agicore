// NovaSyn Social — Knowledge Base Service
// Manages KB entries: CRUD, embedding generation, semantic search, auto-ingest

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KBEntry {
  id: string;
  entryType: string;
  title: string;
  content: string;
  channelType: string | null;
  responseMode: string | null;
  tags: string[];
  embedding: number[] | null;
  source: string;
  sourceId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKBEntryInput {
  entryType: string;
  title: string;
  content: string;
  channelType?: string;
  responseMode?: string;
  tags?: string[];
  source?: string;
  sourceId?: string;
}

export interface KBSearchResult {
  entry: KBEntry;
  similarity: number;
}

// ─── Row mapper ──────────────────────────────────────────────────────────────

function mapKBEntry(row: any): KBEntry {
  return {
    id: row.id,
    entryType: row.entry_type,
    title: row.title,
    content: row.content,
    channelType: row.channel_type,
    responseMode: row.response_mode,
    tags: row.tags ? JSON.parse(row.tags) : [],
    embedding: row.embedding ? JSON.parse(row.embedding) : null,
    source: row.source,
    sourceId: row.source_id,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export function getKBEntries(
  db: Database.Database,
  filters?: { entryType?: string; channelType?: string; responseMode?: string; isActive?: boolean }
): KBEntry[] {
  let sql = 'SELECT * FROM kb_entries WHERE 1=1';
  const params: any[] = [];

  if (filters?.entryType) {
    sql += ' AND entry_type = ?';
    params.push(filters.entryType);
  }
  if (filters?.channelType) {
    sql += ' AND channel_type = ?';
    params.push(filters.channelType);
  }
  if (filters?.responseMode) {
    sql += ' AND response_mode = ?';
    params.push(filters.responseMode);
  }
  if (filters?.isActive !== undefined) {
    sql += ' AND is_active = ?';
    params.push(filters.isActive ? 1 : 0);
  }

  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(mapKBEntry);
}

export function getKBEntry(db: Database.Database, id: string): KBEntry | null {
  const row = db.prepare('SELECT * FROM kb_entries WHERE id = ?').get(id) as any;
  return row ? mapKBEntry(row) : null;
}

export function createKBEntry(db: Database.Database, input: CreateKBEntryInput): KBEntry {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO kb_entries (id, entry_type, title, content, channel_type, response_mode, tags, source, source_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.entryType,
    input.title,
    input.content,
    input.channelType ?? null,
    input.responseMode ?? null,
    input.tags ? JSON.stringify(input.tags) : null,
    input.source ?? 'manual',
    input.sourceId ?? null,
  );

  return getKBEntry(db, id)!;
}

export function updateKBEntry(
  db: Database.Database,
  id: string,
  updates: Partial<CreateKBEntryInput> & { isActive?: boolean }
): KBEntry | null {
  const existing = getKBEntry(db, id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.entryType !== undefined) { setClauses.push('entry_type = ?'); params.push(updates.entryType); }
  if (updates.title !== undefined) { setClauses.push('title = ?'); params.push(updates.title); }
  if (updates.content !== undefined) {
    setClauses.push('content = ?'); params.push(updates.content);
    // Clear embedding when content changes (needs re-embedding)
    setClauses.push('embedding = NULL');
  }
  if (updates.channelType !== undefined) { setClauses.push('channel_type = ?'); params.push(updates.channelType); }
  if (updates.responseMode !== undefined) { setClauses.push('response_mode = ?'); params.push(updates.responseMode); }
  if (updates.tags !== undefined) { setClauses.push('tags = ?'); params.push(JSON.stringify(updates.tags)); }
  if (updates.isActive !== undefined) { setClauses.push('is_active = ?'); params.push(updates.isActive ? 1 : 0); }

  if (setClauses.length === 0) return existing;

  params.push(id);
  db.prepare(`UPDATE kb_entries SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

  return getKBEntry(db, id);
}

export function deleteKBEntry(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM kb_entries WHERE id = ?').run(id);
}

// ─── Embedding Generation ────────────────────────────────────────────────────

export async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API error: ${response.status} - ${errText}`);
  }

  const data = (await response.json()) as any;
  return data.data[0].embedding;
}

export async function embedKBEntry(
  db: Database.Database,
  id: string,
  apiKey: string
): Promise<KBEntry | null> {
  const entry = getKBEntry(db, id);
  if (!entry) return null;

  const textToEmbed = `${entry.title}\n\n${entry.content}`;
  const embedding = await generateEmbedding(textToEmbed, apiKey);

  db.prepare('UPDATE kb_entries SET embedding = ? WHERE id = ?').run(
    JSON.stringify(embedding),
    id,
  );

  return getKBEntry(db, id);
}

export async function embedAllEntries(db: Database.Database, apiKey: string): Promise<number> {
  const entries = db.prepare(
    'SELECT id, title, content FROM kb_entries WHERE embedding IS NULL AND is_active = 1'
  ).all() as any[];

  let count = 0;
  for (const entry of entries) {
    try {
      const textToEmbed = `${entry.title}\n\n${entry.content}`;
      const embedding = await generateEmbedding(textToEmbed, apiKey);
      db.prepare('UPDATE kb_entries SET embedding = ? WHERE id = ?').run(
        JSON.stringify(embedding),
        entry.id,
      );
      count++;
    } catch (err) {
      console.error(`[KB] Failed to embed entry ${entry.id}:`, err);
    }
  }

  return count;
}

// ─── Semantic Search ─────────────────────────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchKBEntries(
  db: Database.Database,
  query: string,
  apiKey: string,
  options?: {
    channelType?: string;
    responseMode?: string;
    topK?: number;
    minSimilarity?: number;
  }
): Promise<KBSearchResult[]> {
  const topK = options?.topK ?? 5;
  const minSimilarity = options?.minSimilarity ?? 0.3;

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query, apiKey);

  // Get all active entries with embeddings
  let sql = 'SELECT * FROM kb_entries WHERE is_active = 1 AND embedding IS NOT NULL';
  const params: any[] = [];

  if (options?.channelType) {
    sql += ' AND (channel_type = ? OR channel_type IS NULL)';
    params.push(options.channelType);
  }
  if (options?.responseMode) {
    sql += ' AND (response_mode = ? OR response_mode IS NULL)';
    params.push(options.responseMode);
  }

  const rows = db.prepare(sql).all(...params) as any[];

  // Calculate similarities and rank
  const results: KBSearchResult[] = [];
  for (const row of rows) {
    const entry = mapKBEntry(row);
    if (!entry.embedding) continue;
    const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
    if (similarity >= minSimilarity) {
      results.push({ entry, similarity });
    }
  }

  // Sort by similarity descending, take top K
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

// ─── Keyword-based fallback search (no API key needed) ───────────────────────

export function searchKBEntriesKeyword(
  db: Database.Database,
  query: string,
  options?: {
    channelType?: string;
    responseMode?: string;
    topK?: number;
  }
): KBEntry[] {
  const topK = options?.topK ?? 5;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  let sql = 'SELECT * FROM kb_entries WHERE is_active = 1';
  const params: any[] = [];

  if (options?.channelType) {
    sql += ' AND (channel_type = ? OR channel_type IS NULL)';
    params.push(options.channelType);
  }
  if (options?.responseMode) {
    sql += ' AND (response_mode = ? OR response_mode IS NULL)';
    params.push(options.responseMode);
  }

  sql += ' ORDER BY created_at DESC';

  const rows = db.prepare(sql).all(...params) as any[];
  const entries = rows.map(mapKBEntry);

  // Simple relevance scoring: count matching words in title + content + tags
  const scored = entries.map((entry) => {
    const haystack = `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase();
    let score = 0;
    for (const word of words) {
      if (haystack.includes(word)) score++;
    }
    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.entry);
}

// ─── Auto-ingest from accepted drafts ────────────────────────────────────────

export function ingestAcceptedDraft(
  db: Database.Database,
  draftId: string,
  draftText: string,
  responseMode: string,
  channelType: string,
  messageSubject: string | null,
  messageSender: string | null,
): KBEntry {
  const title = messageSubject
    ? `Accepted ${responseMode} reply: ${messageSubject}`
    : `Accepted ${responseMode} reply to ${messageSender || 'unknown'}`;

  return createKBEntry(db, {
    entryType: 'gold_reply',
    title,
    content: draftText,
    channelType,
    responseMode,
    tags: ['auto-ingested', responseMode],
    source: 'accepted_draft',
    sourceId: draftId,
  });
}

// ─── RAG Context Builder ────────────────────────────────────────────────────

export async function buildRAGContext(
  db: Database.Database,
  messageBody: string,
  channelType: string,
  responseMode: string,
  openaiApiKey: string | null,
): Promise<string> {
  let relevantEntries: KBEntry[] = [];

  if (openaiApiKey) {
    // Semantic search
    try {
      const results = await searchKBEntries(db, messageBody, openaiApiKey, {
        channelType,
        responseMode,
        topK: 3,
        minSimilarity: 0.25,
      });
      relevantEntries = results.map((r) => r.entry);
    } catch (err) {
      console.warn('[KB] Semantic search failed, falling back to keyword:', err);
      relevantEntries = searchKBEntriesKeyword(db, messageBody, {
        channelType,
        responseMode,
        topK: 3,
      });
    }
  } else {
    // Keyword fallback
    relevantEntries = searchKBEntriesKeyword(db, messageBody, {
      channelType,
      responseMode,
      topK: 3,
    });
  }

  if (relevantEntries.length === 0) return '';

  // Also grab persona notes (always relevant)
  const personaNotes = db.prepare(
    "SELECT * FROM kb_entries WHERE entry_type = 'persona_note' AND is_active = 1 ORDER BY created_at DESC LIMIT 3"
  ).all() as any[];

  const allEntries = [
    ...personaNotes.map(mapKBEntry),
    ...relevantEntries,
  ];

  // Deduplicate
  const seen = new Set<string>();
  const unique = allEntries.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  if (unique.length === 0) return '';

  const TYPE_LABELS: Record<string, string> = {
    style_example: 'Style Example',
    opinion: 'Opinion/Stance',
    gold_reply: 'Gold Standard Reply',
    persona_note: 'Persona Note',
    topic_brief: 'Topic Brief',
  };

  const sections = unique.map((entry) => {
    const label = TYPE_LABELS[entry.entryType] || entry.entryType;
    return `[${label}] ${entry.title}\n${entry.content}`;
  });

  return `\n\n--- KNOWLEDGE BASE CONTEXT ---\nUse the following reference material to match the user's voice, opinions, and style. These are examples of how the user communicates — adapt your response to be consistent with these:\n\n${sections.join('\n\n')}\n--- END KNOWLEDGE BASE ---`;
}
