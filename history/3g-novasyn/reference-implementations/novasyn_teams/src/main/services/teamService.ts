import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/db';
import type { Team, Channel, Member, ChannelMember } from '../../shared/types';

// ---------------------------------------------------------------------------
// Row mapping helpers
// ---------------------------------------------------------------------------

function mapTeamRow(row: any): Team {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    createdAt: row.created_at,
  };
}

function mapChannelRow(row: any): Channel {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    description: row.description || '',
    isDirect: row.is_direct === 1,
    isAiEnabled: row.is_ai_enabled === 1,
    createdAt: row.created_at,
  };
}

function mapMemberRow(row: any): Member {
  return {
    id: row.id,
    teamId: row.team_id,
    displayName: row.display_name,
    avatarColor: row.avatar_color || '#3b82f6',
    role: row.role as 'owner' | 'admin' | 'member',
    isSelf: row.is_self === 1,
    isOnline: row.is_online === 1,
    lastSeen: row.last_seen || null,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Team CRUD
// ---------------------------------------------------------------------------

export function createTeam(name: string, description?: string): Team {
  const db = getDatabase();
  const teamId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO teams (id, name, description, created_at)
    VALUES (?, ?, ?, ?)
  `).run(teamId, name, description || '', now);

  // Create default #general channel
  const generalId = uuidv4();
  db.prepare(`
    INSERT INTO channels (id, team_id, name, description, is_direct, is_ai_enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(generalId, teamId, 'general', 'General discussion', 0, 1, now);

  // Create self member (the local user)
  const selfId = uuidv4();
  db.prepare(`
    INSERT INTO members (id, team_id, display_name, avatar_color, role, is_self, is_online, last_seen, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(selfId, teamId, 'You', '#3b82f6', 'owner', 1, 1, now, now);

  // Add self to #general
  db.prepare(`
    INSERT INTO channel_members (channel_id, member_id, joined_at)
    VALUES (?, ?, ?)
  `).run(generalId, selfId, now);

  const row = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  return mapTeamRow(row);
}

export function getTeam(id: string): Team | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  if (!row) return null;
  return mapTeamRow(row);
}

export function updateTeam(id: string, updates: Partial<Team>): Team {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getTeam(id)!;
}

export function deleteTeam(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM teams WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Channel CRUD
// ---------------------------------------------------------------------------

export function createChannel(
  teamId: string,
  name: string,
  description?: string,
  isDirect?: boolean,
  isAiEnabled?: boolean,
): Channel {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO channels (id, team_id, name, description, is_direct, is_ai_enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, teamId, name, description || '', isDirect ? 1 : 0, isAiEnabled !== false ? 1 : 0, now);

  // Auto-add all team members to non-DM channels
  if (!isDirect) {
    const members = db.prepare('SELECT id FROM members WHERE team_id = ?').all(teamId) as any[];
    const insertMember = db.prepare(
      'INSERT OR IGNORE INTO channel_members (channel_id, member_id, joined_at) VALUES (?, ?, ?)'
    );
    for (const member of members) {
      insertMember.run(id, member.id, now);
    }
  }

  const row = db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
  return mapChannelRow(row);
}

export function listChannels(teamId: string): Channel[] {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT * FROM channels WHERE team_id = ? ORDER BY is_direct ASC, name ASC'
  ).all(teamId) as any[];
  return rows.map(mapChannelRow);
}

export function getChannel(id: string): Channel | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM channels WHERE id = ?').get(id);
  if (!row) return null;
  return mapChannelRow(row);
}

export function updateChannel(id: string, updates: Partial<Channel>): Channel {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.isAiEnabled !== undefined) {
    fields.push('is_ai_enabled = ?');
    values.push(updates.isAiEnabled ? 1 : 0);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE channels SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getChannel(id)!;
}

export function deleteChannel(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM channels WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Member CRUD
// ---------------------------------------------------------------------------

export function listMembers(teamId: string): Member[] {
  const db = getDatabase();
  const rows = db.prepare(
    'SELECT * FROM members WHERE team_id = ? ORDER BY is_self DESC, display_name ASC'
  ).all(teamId) as any[];
  return rows.map(mapMemberRow);
}

export function addMember(
  teamId: string,
  displayName: string,
  avatarColor?: string,
  role?: 'owner' | 'admin' | 'member',
  isSelf?: boolean,
): Member {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO members (id, team_id, display_name, avatar_color, role, is_self, is_online, last_seen, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, teamId, displayName, avatarColor || '#3b82f6', role || 'member', isSelf ? 1 : 0, 0, null, now);

  // Auto-add new member to all non-DM channels in the team
  const channels = db.prepare(
    'SELECT id FROM channels WHERE team_id = ? AND is_direct = 0'
  ).all(teamId) as any[];
  const insertMember = db.prepare(
    'INSERT OR IGNORE INTO channel_members (channel_id, member_id, joined_at) VALUES (?, ?, ?)'
  );
  for (const channel of channels) {
    insertMember.run(channel.id, id, now);
  }

  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  return mapMemberRow(row);
}

export function updateMember(id: string, updates: Partial<Member>): Member {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.displayName !== undefined) {
    fields.push('display_name = ?');
    values.push(updates.displayName);
  }
  if (updates.avatarColor !== undefined) {
    fields.push('avatar_color = ?');
    values.push(updates.avatarColor);
  }
  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role);
  }
  if (updates.isOnline !== undefined) {
    fields.push('is_online = ?');
    values.push(updates.isOnline ? 1 : 0);
  }
  if (updates.lastSeen !== undefined) {
    fields.push('last_seen = ?');
    values.push(updates.lastSeen);
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE members SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  const row = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  return mapMemberRow(row);
}

export function removeMember(id: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM channel_members WHERE member_id = ?').run(id);
  db.prepare('DELETE FROM members WHERE id = ?').run(id);
}

// ---------------------------------------------------------------------------
// Channel Members
// ---------------------------------------------------------------------------

export function addChannelMember(channelId: string, memberId: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT OR IGNORE INTO channel_members (channel_id, member_id, joined_at) VALUES (?, ?, ?)'
  ).run(channelId, memberId, now);
}

export function removeChannelMember(channelId: string, memberId: string): void {
  const db = getDatabase();
  db.prepare(
    'DELETE FROM channel_members WHERE channel_id = ? AND member_id = ?'
  ).run(channelId, memberId);
}

export function listChannelMembers(channelId: string): Member[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT m.* FROM members m
    JOIN channel_members cm ON m.id = cm.member_id
    WHERE cm.channel_id = ?
    ORDER BY m.is_self DESC, m.display_name ASC
  `).all(channelId) as any[];
  return rows.map(mapMemberRow);
}
