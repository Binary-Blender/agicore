// NovaSyn Social — Gmail Integration Service
// Fetches emails via Gmail REST API, parses MIME messages,
// and inserts them into the unified inbox.

import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

// ============================================================================
// Types
// ============================================================================

interface GmailMessageRef {
  id: string;
  threadId: string;
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType: string;
  body: { data?: string; size: number };
  parts?: GmailPart[];
}

interface GmailMessage {
  id: string;
  threadId: string;
  historyId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: GmailHeader[];
    body: { data?: string; size: number };
    parts?: GmailPart[];
    mimeType: string;
  };
  internalDate: string;
}

export interface GmailSyncResult {
  synced: number;
  skipped: number;
  errors: number;
  historyId?: string;
}

// ============================================================================
// Retry with Backoff
// ============================================================================

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.ok) return response;

    const status = response.status;
    // Retry on 429 (rate limit) and 5xx (server error)
    if ((status === 429 || status >= 500) && attempt < maxRetries) {
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : backoffMs;
      console.log(`[Gmail] ${status} on attempt ${attempt + 1}, retrying in ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const errText = await response.text();
    lastError = new Error(`Gmail API (${status}): ${errText}`);
    break;
  }
  throw lastError || new Error('Gmail API request failed');
}

// ============================================================================
// Gmail API
// ============================================================================

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * List message IDs in the inbox since a given date.
 */
export async function listGmailMessages(
  accessToken: string,
  afterDate?: string | null,
  maxResults: number = 50
): Promise<GmailMessageRef[]> {
  let query = 'in:inbox';
  if (afterDate) {
    const epoch = Math.floor(new Date(afterDate).getTime() / 1000);
    query += ` after:${epoch}`;
  }

  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });

  const response = await fetchWithRetry(
    `${GMAIL_BASE}/messages?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await response.json();
  return data.messages ?? [];
}

/**
 * Get full message details by ID.
 */
export async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const response = await fetchWithRetry(
    `${GMAIL_BASE}/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return response.json();
}

/**
 * Get the authenticated user's email address.
 */
export async function getGmailProfile(
  accessToken: string
): Promise<{ emailAddress: string }> {
  const response = await fetch(`${GMAIL_BASE}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error('Failed to get Gmail profile');
  return response.json();
}

// ============================================================================
// Gmail Send
// ============================================================================

function encodeBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Build an RFC 2822 email message for sending via Gmail API.
 */
function buildRawEmail(opts: {
  to: string;
  from?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const lines: string[] = [];
  if (opts.from) lines.push(`From: ${opts.from}`);
  lines.push(`To: ${opts.to}`);
  lines.push(`Subject: ${opts.subject.startsWith('Re:') ? opts.subject : `Re: ${opts.subject}`}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('MIME-Version: 1.0');
  if (opts.inReplyTo) {
    lines.push(`In-Reply-To: ${opts.inReplyTo}`);
    lines.push(`References: ${opts.references || opts.inReplyTo}`);
  }
  lines.push('');
  lines.push(opts.body);
  return lines.join('\r\n');
}

/**
 * Send a reply via Gmail API. Returns the sent message ID.
 */
export async function sendGmailReply(
  accessToken: string,
  opts: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }
): Promise<{ messageId: string; threadId: string }> {
  const rawEmail = buildRawEmail(opts);
  const encodedMessage = encodeBase64Url(rawEmail);

  const payload: Record<string, unknown> = { raw: encodedMessage };
  if (opts.threadId) payload.threadId = opts.threadId;

  const response = await fetch(`${GMAIL_BASE}/messages/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gmail send failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return { messageId: data.id, threadId: data.threadId };
}

// ============================================================================
// Email Parsing
// ============================================================================

function getHeader(headers: GmailHeader[], name: string): string | null {
  const header = headers.find(
    (h) => h.name.toLowerCase() === name.toLowerCase()
  );
  return header?.value ?? null;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

function findPart(parts: GmailPart[], mimeType: string): GmailPart | null {
  for (const part of parts) {
    if (part.mimeType === mimeType) return part;
    if (part.parts) {
      const found = findPart(part.parts, mimeType);
      if (found) return found;
    }
  }
  return null;
}

function extractBody(payload: GmailMessage['payload']): string {
  // Direct body (simple messages)
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    // Prefer text/plain
    const textPart = findPart(payload.parts, 'text/plain');
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }

    // Fallback to text/html with tag stripping
    const htmlPart = findPart(payload.parts, 'text/html');
    if (htmlPart?.body?.data) {
      return stripHtml(decodeBase64Url(htmlPart.body.data));
    }
  }

  return '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseEmailAddress(raw: string): { name: string; email: string } {
  // "John Doe <john@example.com>" → { name: "John Doe", email: "john@example.com" }
  const match = raw.match(/^(?:"?([^"]*?)"?\s)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    return { name: match[1]?.trim() || match[2], email: match[2] };
  }
  return { name: raw, email: raw };
}

// ============================================================================
// Sync
// ============================================================================

/**
 * Sync a Gmail account: list new messages, fetch details, parse, and insert.
 */
export async function syncGmailAccount(
  db: Database.Database,
  accountId: string,
  accessToken: string,
  lastSyncAt?: string | null
): Promise<GmailSyncResult> {
  const result: GmailSyncResult = { synced: 0, skipped: 0, errors: 0 };

  // List messages since last sync
  const refs = await listGmailMessages(accessToken, lastSyncAt, 50);

  for (const ref of refs) {
    try {
      // Skip if we already have this message (idempotency)
      const existing = db
        .prepare('SELECT id FROM messages WHERE external_id = ?')
        .get(`gmail:${ref.id}`) as any;

      if (existing) {
        result.skipped++;
        continue;
      }

      // Fetch full message with retry/backoff
      const full = await getGmailMessage(accessToken, ref.id);
      const headers = full.payload.headers;

      const from = getHeader(headers, 'From') || 'Unknown';
      const subject = getHeader(headers, 'Subject');
      const date = getHeader(headers, 'Date');
      const messageId = getHeader(headers, 'Message-ID');
      const body = extractBody(full.payload);

      if (!body.trim()) {
        result.skipped++;
        continue;
      }

      const sender = parseEmailAddress(from);
      const messageDate = date
        ? new Date(date).toISOString()
        : new Date().toISOString();

      // Store historyId for future incremental sync
      if (full.historyId) {
        result.historyId = full.historyId;
      }

      // Insert into messages table (with recipient_email and in_reply_to for reply threading)
      const id = uuidv4();
      db.prepare(`
        INSERT INTO messages (
          id, external_id, thread_id, account_id, channel_type, direction,
          sender_name, sender_handle, subject, body,
          recipient_email, in_reply_to,
          priority_score, is_read, is_archived, is_starred,
          ingestion_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'email', 'inbound', ?, ?, ?, ?, ?, ?, 50, 0, 0, 0, 'processed', ?, datetime('now'))
      `).run(
        id,
        `gmail:${ref.id}`,
        ref.threadId ? `gmail:${ref.threadId}` : null,
        accountId,
        sender.name,
        sender.email,
        subject,
        body,
        sender.email, // recipient_email = sender's email (who we'd reply to)
        messageId,     // in_reply_to = this message's Message-ID (for threading our reply)
        messageDate
      );

      result.synced++;
    } catch (err) {
      console.error(`[Gmail] Failed to sync message ${ref.id}:`, err);
      result.errors++;
    }
  }

  // Update last_sync_at and sync_cursor (historyId)
  if (result.historyId) {
    db.prepare(
      "UPDATE accounts SET last_sync_at = datetime('now'), sync_cursor = ? WHERE id = ?"
    ).run(result.historyId, accountId);
  } else {
    db.prepare(
      "UPDATE accounts SET last_sync_at = datetime('now') WHERE id = ?"
    ).run(accountId);
  }

  return result;
}


