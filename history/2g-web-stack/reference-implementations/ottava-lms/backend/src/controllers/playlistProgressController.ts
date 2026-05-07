import { Response } from 'express';
import type { PoolClient } from 'pg';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { deriveCompletionStats } from '../utils/playlistHelpers';
import { firstQueryValue } from '../utils/request';

const validStatuses = new Set(['not_started', 'in_progress', 'completed']);

const ensureOrgContext = (req: AuthRequest, res: Response): string | null => {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    res.status(403).json({ error: 'Organization context is required' });
    return null;
  }
  return organizationId;
};

const parseStatusFilter = (value?: string): string | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return validStatuses.has(normalized) ? normalized : undefined;
};

const formatProgressSummary = (row: any) => {
  if (!row) return { status: 'not_started', current_position: null };
  return {
    status: row.status,
    current_position: row.current_position || null,
    started_at: row.started_at,
    completed_at: row.completed_at,
    last_accessed: row.last_accessed,
  };
};

const fetchProgressSummary = async (playlistId: string, userId: string) => {
  const result = await pool.query(
    `SELECT
       upp.status,
       upp.started_at,
       upp.completed_at,
       upp.last_accessed,
       curr.position AS current_position
     FROM user_playlist_progress upp
     LEFT JOIN playlist_items curr ON curr.id = upp.current_item_id
     WHERE upp.playlist_id = $1 AND upp.user_id = $2`,
    [playlistId, userId]
  );
  return formatProgressSummary(result.rows[0]);
};

const mapModuleCompletion = async (userId: string, moduleIds: string[]) => {
  if (!moduleIds.length) return new Map<string, boolean>();

  const completionResult = await pool.query(
    `SELECT
       tm.id AS module_id,
       bool_or(qa.passed) AS quiz_passed,
       bool_or(pr.status = 'completed') AS video_completed
     FROM training_modules tm
     LEFT JOIN quizzes q ON q.training_module_id = tm.id
     LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.user_id = $1
     LEFT JOIN videos v ON v.training_module_id = tm.id
     LEFT JOIN progress pr ON pr.video_id = v.id AND pr.user_id = $1
     WHERE tm.id = ANY($2::uuid[])
     GROUP BY tm.id`,
    [userId, moduleIds]
  );

  const map = new Map<string, boolean>();
  completionResult.rows.forEach((row) => {
    map.set(row.module_id, Boolean(row.quiz_passed) || Boolean(row.video_completed));
  });
  return map;
};

const isModuleCompleted = async (client: PoolClient, userId: string, moduleId: string) => {
  const result = await client.query(
    `SELECT
       EXISTS (
         SELECT 1
           FROM quiz_attempts qa
           JOIN quizzes q ON q.id = qa.quiz_id
          WHERE qa.user_id = $1
            AND q.training_module_id = $2
            AND qa.passed = true
       ) AS quiz_completed,
       EXISTS (
         SELECT 1
           FROM progress pr
           JOIN videos v ON v.id = pr.video_id
          WHERE pr.user_id = $1
            AND v.training_module_id = $2
            AND pr.status = 'completed'
       ) AS video_completed`,
    [userId, moduleId]
  );

  const row = result.rows[0];
  return Boolean(row?.quiz_completed) || Boolean(row?.video_completed);
};

export const getUserPlaylists = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = ensureOrgContext(req, res);
    if (!organizationId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(403).json({ error: 'User context is required' });
    }

    const statusFilter = parseStatusFilter(firstQueryValue(req.query.status));
    const result = await pool.query(
      `SELECT
         p.id,
         p.title,
         p.description,
         p.is_required,
         p.auto_play,
         COUNT(items.id) AS item_count,
         COALESCE(upp.status, 'not_started') AS status,
         upp.started_at,
         upp.completed_at,
         upp.last_accessed,
         curr.position AS current_position
       FROM playlists p
       LEFT JOIN playlist_items items ON items.playlist_id = p.id
       LEFT JOIN user_playlist_progress upp ON upp.playlist_id = p.id AND upp.user_id = $2
       LEFT JOIN playlist_items curr ON curr.id = upp.current_item_id
       WHERE p.organization_id = $1
         AND (p.is_required = true OR upp.id IS NOT NULL)
         AND ($3::text IS NULL OR COALESCE(upp.status, 'not_started') = $3)
       GROUP BY
         p.id,
         p.title,
         p.description,
         p.is_required,
         p.auto_play,
         upp.status,
         upp.started_at,
         upp.completed_at,
         upp.last_accessed,
         curr.position
       ORDER BY p.is_required DESC, COALESCE(upp.last_accessed, p.updated_at) DESC`,
      [organizationId, userId, statusFilter || null]
    );

    const playlists = result.rows.map((row) => {
      const totalItems = Number(row.item_count || 0);
      const stats = deriveCompletionStats(row.current_position || null, totalItems, row.status);
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        is_required: row.is_required,
        auto_play: row.auto_play,
        item_count: totalItems,
        status: row.status,
        started_at: row.started_at,
        completed_at: row.completed_at,
        last_accessed: row.last_accessed,
        current_position: row.current_position || null,
        completed_count: stats.completedCount,
        completion_percentage: stats.completionPercentage,
      };
    });

    res.json({ playlists });
  } catch (error) {
    console.error('Get user playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPlaylistProgress = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = ensureOrgContext(req, res);
    if (!organizationId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(403).json({ error: 'User context is required' });
    }

    const { id } = req.params;
    const playlistResult = await pool.query(
      'SELECT id, title, description, is_required, auto_play FROM playlists WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    if (!playlistResult.rows.length) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const itemsResult = await pool.query(
      `SELECT
         pi.id,
         pi.position,
         pi.require_completion,
         tm.id AS module_id,
         tm.title AS module_title,
         tm.description AS module_description,
         tm.estimated_duration_minutes
       FROM playlist_items pi
       JOIN training_modules tm ON tm.id = pi.training_module_id
       WHERE pi.playlist_id = $1
       ORDER BY pi.position ASC`,
      [id]
    );

    const moduleIds = itemsResult.rows.map((row) => row.module_id);
    const completionMap = await mapModuleCompletion(userId, moduleIds);

    const items = itemsResult.rows.map((row) => ({
      id: row.id,
      position: row.position,
      require_completion: row.require_completion,
      training_module: {
        id: row.module_id,
        title: row.module_title,
        description: row.module_description,
        estimated_duration: row.estimated_duration_minutes,
      },
      completed: completionMap.get(row.module_id) || false,
    }));

    const completedItems = items.filter((item) => item.completed).length;
    const completionPercentage = items.length
      ? Math.round((completedItems / items.length) * 100)
      : 0;
    const progress = await fetchProgressSummary(id, userId);

    res.json({
      playlist: playlistResult.rows[0],
      items,
      progress,
      summary: {
        total_items: items.length,
        completed_items: completedItems,
        completion_percentage: completionPercentage,
      },
    });
  } catch (error) {
    console.error('Get playlist progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const startPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = ensureOrgContext(req, res);
    if (!organizationId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(403).json({ error: 'User context is required' });
    }

    const { id } = req.params;
    const playlistResult = await pool.query(
      'SELECT id FROM playlists WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    if (!playlistResult.rows.length) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const existing = await pool.query(
      'SELECT id FROM user_playlist_progress WHERE playlist_id = $1 AND user_id = $2',
      [id, userId]
    );
    if (existing.rows.length) {
      const progress = await fetchProgressSummary(id, userId);
      return res.json({ progress });
    }

    const firstItemResult = await pool.query(
      'SELECT id FROM playlist_items WHERE playlist_id = $1 ORDER BY position ASC LIMIT 1',
      [id]
    );
    const firstItem = firstItemResult.rows[0] || null;
    const status = firstItem ? 'in_progress' : 'completed';
    const startedAt = firstItem ? new Date() : null;
    const completedAt = firstItem ? null : new Date();

    await pool.query(
      `INSERT INTO user_playlist_progress (
         user_id,
         playlist_id,
         current_item_id,
         status,
         started_at,
         completed_at,
         last_accessed
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, id, firstItem?.id || null, status, startedAt, completedAt]
    );

    const progress = await fetchProgressSummary(id, userId);
    res.status(201).json({ progress });
  } catch (error) {
    console.error('Start playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const advancePlaylist = async (req: AuthRequest, res: Response) => {
  const organizationId = ensureOrgContext(req, res);
  if (!organizationId) return;

  const userId = req.user?.userId;
  if (!userId) {
    res.status(403).json({ error: 'User context is required' });
    return;
  }

  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const playlistResult = await client.query(
      'SELECT id FROM playlists WHERE id = $1 AND organization_id = $2 FOR UPDATE',
      [id, organizationId]
    );
    if (!playlistResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const progressResult = await client.query(
      `SELECT
         upp.id,
         upp.status,
         upp.current_item_id,
         pi.position,
         pi.training_module_id,
         pi.require_completion
       FROM user_playlist_progress upp
       LEFT JOIN playlist_items pi ON pi.id = upp.current_item_id
       WHERE upp.playlist_id = $1
         AND upp.user_id = $2
       FOR UPDATE`,
      [id, userId]
    );

    if (!progressResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Start the playlist before advancing' });
    }

    const progress = progressResult.rows[0];
    if (progress.status === 'completed') {
      await client.query('ROLLBACK');
      const summary = await fetchProgressSummary(id, userId);
      return res.json({ progress: summary, nextModule: null, completed: true });
    }

    if (!progress.current_item_id) {
      await client.query(
        `UPDATE user_playlist_progress
            SET status = 'completed',
                completed_at = NOW(),
                last_accessed = NOW()
          WHERE id = $1`,
        [progress.id]
      );
      await client.query('COMMIT');
      const summary = await fetchProgressSummary(id, userId);
      return res.json({ progress: summary, nextModule: null, completed: true });
    }

    if (progress.require_completion) {
      const completed = await isModuleCompleted(client, userId, progress.training_module_id);
      if (!completed) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Complete the current module before advancing' });
      }
    }

    const nextItemResult = await client.query(
      `SELECT
         pi.id,
         pi.position,
         pi.training_module_id,
         tm.title,
         tm.description
       FROM playlist_items pi
       JOIN training_modules tm ON tm.id = pi.training_module_id
       WHERE pi.playlist_id = $1
         AND pi.position > $2
       ORDER BY pi.position ASC
       LIMIT 1`,
      [id, progress.position || 0]
    );

    if (!nextItemResult.rows.length) {
      await client.query(
        `UPDATE user_playlist_progress
            SET current_item_id = NULL,
                status = 'completed',
                completed_at = NOW(),
                last_accessed = NOW()
          WHERE id = $1`,
        [progress.id]
      );
      await client.query('COMMIT');
      const summary = await fetchProgressSummary(id, userId);
      return res.json({ progress: summary, nextModule: null, completed: true });
    }

    const nextItem = nextItemResult.rows[0];
    await client.query(
      `UPDATE user_playlist_progress
          SET current_item_id = $1,
              status = 'in_progress',
              last_accessed = NOW()
        WHERE id = $2`,
      [nextItem.id, progress.id]
    );
    await client.query('COMMIT');

    const summary = await fetchProgressSummary(id, userId);
    res.json({
      progress: summary,
      nextModule: {
        id: nextItem.training_module_id,
        title: nextItem.title,
        description: nextItem.description,
      },
      completed: false,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Advance playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};
