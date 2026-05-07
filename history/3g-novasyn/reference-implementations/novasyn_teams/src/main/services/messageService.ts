import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/db';
import type { Message, MessageMetadata, MessageType } from '../../shared/types';

// ---------------------------------------------------------------------------
// Row mapping helper
// ---------------------------------------------------------------------------

function mapMessageRow(row: any): Message {
  return {
    id: row.id,
    channelId: row.channel_id,
    senderId: row.sender_id,
    content: row.content,
    messageType: row.message_type as MessageType,
    replyTo: row.reply_to || null,
    vaultItemId: row.vault_item_id || null,
    metadata: JSON.parse(row.metadata || '{}') as MessageMetadata,
    isPinned: row.is_pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Message CRUD
// ---------------------------------------------------------------------------

export function sendMessage(
  channelId: string,
  senderId: string,
  content: string,
  messageType?: MessageType,
  replyTo?: string,
  vaultItemId?: string,
): Message {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO messages (id, channel_id, sender_id, content, message_type, reply_to, vault_item_id, metadata, is_pinned, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    channelId,
    senderId,
    content,
    messageType || 'text',
    replyTo || null,
    vaultItemId || null,
    '{}',
    0,
    now,
    now,
  );

  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  return mapMessageRow(row);
}

export function listMessages(
  channelId: string,
  limit?: number,
  offset?: number,
): Message[] {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT * FROM messages WHERE channel_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(channelId, limit || 50, offset || 0) as any[];
  return rows.map(mapMessageRow);
}

export function getMessage(id: string): Message | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  if (!row) return null;
  return mapMessageRow(row);
}

export function editMessage(id: string, content: string): Message {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Store the old content in edit history (metadata)
  const existing = getMessage(id);
  if (existing) {
    const metadata = existing.metadata;
    if (!metadata.editHistory) {
      metadata.editHistory = [];
    }
    metadata.editHistory.push({ content: existing.content, editedAt: now });

    db.prepare(`
      UPDATE messages SET content = ?, metadata = ?, updated_at = ? WHERE id = ?
    `).run(content, JSON.stringify(metadata), now, id);
  }

  return getMessage(id)!;
}

export function deleteMessage(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
}

export function pinMessage(id: string, isPinned: boolean): Message {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE messages SET is_pinned = ?, updated_at = ? WHERE id = ?'
  ).run(isPinned ? 1 : 0, now, id);
  return getMessage(id)!;
}

export function reactToMessage(id: string, emoji: string, memberId: string): Message {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = getMessage(id);

  if (!existing) {
    throw new Error(`Message not found: ${id}`);
  }

  const metadata = existing.metadata;
  if (!metadata.reactions) {
    metadata.reactions = [];
  }

  // Find existing reaction for this emoji
  const reaction = metadata.reactions.find((r) => r.emoji === emoji);
  if (reaction) {
    // Toggle: if member already reacted, remove; otherwise add
    const memberIdx = reaction.memberIds.indexOf(memberId);
    if (memberIdx >= 0) {
      reaction.memberIds.splice(memberIdx, 1);
      // Remove the reaction entirely if no members left
      if (reaction.memberIds.length === 0) {
        metadata.reactions = metadata.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      reaction.memberIds.push(memberId);
    }
  } else {
    metadata.reactions.push({ emoji, memberIds: [memberId] });
  }

  db.prepare(
    'UPDATE messages SET metadata = ?, updated_at = ? WHERE id = ?'
  ).run(JSON.stringify(metadata), now, id);

  return getMessage(id)!;
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export function listThread(parentMessageId: string): Message[] {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT * FROM messages WHERE reply_to = ? ORDER BY created_at ASC'
  ).all(parentMessageId) as any[];
  return rows.map(mapMessageRow);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function searchMessages(teamId: string, query: string): Message[] {
  const db = getDatabase();
  const likeQuery = `%${query}%`;

  const rows = db.prepare(`
    SELECT m.* FROM messages m
    JOIN channels c ON m.channel_id = c.id
    WHERE c.team_id = ? AND m.content LIKE ?
    ORDER BY m.created_at DESC
    LIMIT 100
  `).all(teamId, likeQuery) as any[];

  return rows.map(mapMessageRow);
}
