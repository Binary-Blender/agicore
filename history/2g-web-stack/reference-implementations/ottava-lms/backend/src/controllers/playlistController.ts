import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { firstQueryValue, positiveIntFromQuery } from '../utils/request';
import { clampInsertPosition, planReorder } from '../utils/playlistHelpers';

const privilegedRoles = new Set(['admin', 'manager']);

const parseBooleanQuery = (value?: string | null): boolean | undefined => {
  if (value === undefined || value === null) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
};

const ensureOrgContext = (req: AuthRequest, res: Response): string | null => {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    res.status(403).json({ error: 'Organization context is required' });
    return null;
  }
  return organizationId;
};

const formatCreator = (row: any) => {
  if (!row.created_by) {
    return null;
  }
  return { id: row.created_by, email: row.creator_email || null };
};

export const listPlaylists = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = ensureOrgContext(req, res);
    if (!organizationId) return;

    const page = positiveIntFromQuery(req.query.page, 1, 1000);
    const limit = positiveIntFromQuery(req.query.limit, 20, 100);
    const offset = (page - 1) * limit;
    const isRequiredFilter = parseBooleanQuery(firstQueryValue(req.query.is_required));
    const isPrivileged = req.user?.role && privilegedRoles.has(req.user.role);

    const params: any[] = [organizationId];
    const whereClauses: string[] = ['p.organization_id = $1'];

    if (typeof isRequiredFilter === 'boolean') {
      params.push(isRequiredFilter);
      whereClauses.push(`p.is_required = $${params.length}`);
    }

    if (!isPrivileged) {
      params.push(req.user?.userId);
      whereClauses.push(
        `(p.is_required = true OR EXISTS (
          SELECT 1 FROM user_playlist_progress upp
          WHERE upp.playlist_id = p.id AND upp.user_id = $${params.length}
        ))`
      );
    }

    const where = `WHERE ${whereClauses.join(' AND ')}`;
    const countResult = await pool.query(`SELECT COUNT(*) FROM playlists p ${where}`, params);
    const total = Number(countResult.rows[0]?.count || 0);

    const dataQuery = `
      SELECT
        p.id,
        p.title,
        p.description,
        p.is_required,
        p.auto_play,
        p.created_at,
        p.updated_at,
        p.created_by,
        u.email AS creator_email,
        COUNT(i.id) AS item_count
      FROM playlists p
      LEFT JOIN users u ON u.id = p.created_by
      LEFT JOIN playlist_items i ON i.playlist_id = p.id
      ${where}
      GROUP BY
        p.id,
        p.title,
        p.description,
        p.is_required,
        p.auto_play,
        p.created_at,
        p.updated_at,
        p.created_by,
        u.id,
        u.email
      ORDER BY p.is_required DESC, p.created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}`;

    const listResult = await pool.query(dataQuery, [...params, limit, offset]);

    res.json({
      playlists: listResult.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        is_required: row.is_required,
        auto_play: row.auto_play,
        item_count: Number(row.item_count || 0),
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: formatCreator(row),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : 0,
      },
    });
  } catch (error) {
    console.error('List playlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPlaylistDetails = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = ensureOrgContext(req, res);
    if (!organizationId) return;

    const { id } = req.params;
    const playlistResult = await pool.query(
      `SELECT
         p.id,
         p.title,
         p.description,
         p.is_required,
         p.auto_play,
         p.created_by,
         u.email AS creator_email,
         p.created_at,
         p.updated_at
       FROM playlists p
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.id = $1 AND p.organization_id = $2`,
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

    let userProgress: any = null;
    if (req.user?.userId) {
      const progressResult = await pool.query(
        `SELECT
           upp.status,
           upp.started_at,
           upp.completed_at,
           upp.last_accessed,
           curr.position AS current_position
         FROM user_playlist_progress upp
         LEFT JOIN playlist_items curr ON curr.id = upp.current_item_id
         WHERE upp.playlist_id = $1 AND upp.user_id = $2`,
        [id, req.user.userId]
      );
      if (progressResult.rows.length) {
        userProgress = {
          status: progressResult.rows[0].status,
          current_position: progressResult.rows[0].current_position || null,
          started_at: progressResult.rows[0].started_at,
          completed_at: progressResult.rows[0].completed_at,
          last_accessed: progressResult.rows[0].last_accessed,
        };
      }
    }

    res.json({
      id: playlistResult.rows[0].id,
      title: playlistResult.rows[0].title,
      description: playlistResult.rows[0].description,
      is_required: playlistResult.rows[0].is_required,
      auto_play: playlistResult.rows[0].auto_play,
      created_at: playlistResult.rows[0].created_at,
      updated_at: playlistResult.rows[0].updated_at,
      created_by: formatCreator(playlistResult.rows[0]),
      items: itemsResult.rows.map((row) => ({
        id: row.id,
        position: row.position,
        require_completion: row.require_completion,
        training_module: {
          id: row.module_id,
          title: row.module_title,
          description: row.module_description,
          estimated_duration: row.estimated_duration_minutes,
        },
      })),
      user_progress: userProgress || undefined,
    });
  } catch (error) {
    console.error('Get playlist details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createPlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = ensureOrgContext(req, res);
    if (!organizationId) return;

    const { title, description, is_required, auto_play } = req.body;
    const creatorId = req.user?.userId || null;
    const trimmedTitle = (title || '').trim();

    const insertResult = await pool.query(
      `INSERT INTO playlists (
         organization_id,
         title,
         description,
         created_by,
         is_required,
         auto_play,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [organizationId, trimmedTitle, description || null, creatorId, is_required ?? false, auto_play ?? true]
    );

    res.status(201).json({
      playlist: {
        id: insertResult.rows[0].id,
        title: insertResult.rows[0].title,
        description: insertResult.rows[0].description,
        is_required: insertResult.rows[0].is_required,
        auto_play: insertResult.rows[0].auto_play,
        created_at: insertResult.rows[0].created_at,
        updated_at: insertResult.rows[0].updated_at,
        created_by: formatCreator(insertResult.rows[0]),
      },
    });
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updatePlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = ensureOrgContext(req, res);
    if (!organizationId) return;

    const { id } = req.params;
    const { title, description, is_required, auto_play } = req.body;

    const updateResult = await pool.query(
      `UPDATE playlists
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             is_required = COALESCE($3, is_required),
             auto_play = COALESCE($4, auto_play),
             updated_at = NOW()
       WHERE id = $5 AND organization_id = $6
       RETURNING *`,
      [title?.trim(), description || null, is_required, auto_play, id, organizationId]
    );

    if (!updateResult.rows.length) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json({
      playlist: {
        id: updateResult.rows[0].id,
        title: updateResult.rows[0].title,
        description: updateResult.rows[0].description,
        is_required: updateResult.rows[0].is_required,
        auto_play: updateResult.rows[0].auto_play,
        updated_at: updateResult.rows[0].updated_at,
      },
    });
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePlaylist = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = ensureOrgContext(req, res);
    if (!organizationId) return;

    const deleteResult = await pool.query(
      'DELETE FROM playlists WHERE id = $1 AND organization_id = $2 RETURNING id',
      [req.params.id, organizationId]
    );
    if (!deleteResult.rows.length) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addItemToPlaylist = async (req: AuthRequest, res: Response) => {
  const organizationId = ensureOrgContext(req, res);
  if (!organizationId) return;

  const { id } = req.params;
  const { training_module_id, position, require_completion } = req.body;
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

    const moduleResult = await client.query(
      `SELECT id, title, description, estimated_duration_minutes
         FROM training_modules
        WHERE id = $1 AND organization_id = $2`,
      [training_module_id, organizationId]
    );
    if (!moduleResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Training module not found in this organization' });
    }

    const duplicateCheck = await client.query(
      'SELECT 1 FROM playlist_items WHERE playlist_id = $1 AND training_module_id = $2',
      [id, training_module_id]
    );
    if (duplicateCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Module already exists in playlist' });
    }

    const countResult = await client.query(
      'SELECT COUNT(*) FROM playlist_items WHERE playlist_id = $1',
      [id]
    );
    const currentCount = Number(countResult.rows[0]?.count || 0);
    const insertPosition = clampInsertPosition(
      position !== undefined ? Number(position) : undefined,
      currentCount
    );

    if (insertPosition <= currentCount) {
      await client.query(
        `UPDATE playlist_items
            SET position = position + 1,
                updated_at = NOW()
          WHERE playlist_id = $1
            AND position >= $2`,
        [id, insertPosition]
      );
    }

    const insertResult = await client.query(
      `INSERT INTO playlist_items (
         playlist_id,
         training_module_id,
         position,
         require_completion,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, position, require_completion`,
      [id, training_module_id, insertPosition, require_completion ?? true]
    );

    await client.query('UPDATE playlists SET updated_at = NOW() WHERE id = $1', [id]);
    await client.query('COMMIT');

    res.status(201).json({
      item: {
        id: insertResult.rows[0].id,
        position: insertResult.rows[0].position,
        require_completion: insertResult.rows[0].require_completion,
        training_module: {
          id: moduleResult.rows[0].id,
          title: moduleResult.rows[0].title,
          description: moduleResult.rows[0].description,
          estimated_duration: moduleResult.rows[0].estimated_duration_minutes,
        },
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add playlist item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const reorderPlaylistItem = async (req: AuthRequest, res: Response) => {
  const organizationId = ensureOrgContext(req, res);
  if (!organizationId) return;

  const targetPosition = Number(req.body?.position);
  if (!Number.isFinite(targetPosition)) {
    return res.status(400).json({ error: 'position must be a valid number' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const playlistResult = await client.query(
      'SELECT id FROM playlists WHERE id = $1 AND organization_id = $2 FOR UPDATE',
      [req.params.id, organizationId]
    );
    if (!playlistResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const itemResult = await client.query(
      `SELECT id, position
         FROM playlist_items
        WHERE id = $1 AND playlist_id = $2
        FOR UPDATE`,
      [req.params.itemId, req.params.id]
    );
    if (!itemResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Playlist item not found' });
    }

    const countResult = await client.query(
      'SELECT COUNT(*) FROM playlist_items WHERE playlist_id = $1',
      [req.params.id]
    );
    const totalItems = Number(countResult.rows[0]?.count || 0);
    const plan = planReorder(Number(itemResult.rows[0].position), targetPosition, totalItems);

    if (plan.direction === 'up') {
      await client.query(
        `UPDATE playlist_items
            SET position = position + 1,
                updated_at = NOW()
          WHERE playlist_id = $1
            AND position BETWEEN $2 AND $3`,
        [req.params.id, plan.rangeStart, plan.rangeEnd]
      );
    } else if (plan.direction === 'down') {
      await client.query(
        `UPDATE playlist_items
            SET position = position - 1,
                updated_at = NOW()
          WHERE playlist_id = $1
            AND position BETWEEN $2 AND $3`,
        [req.params.id, plan.rangeStart, plan.rangeEnd]
      );
    }

    const updateResult = await client.query(
      `UPDATE playlist_items
          SET position = $1,
              updated_at = NOW()
        WHERE id = $2
          AND playlist_id = $3
        RETURNING id, position, require_completion`,
      [plan.target, req.params.itemId, req.params.id]
    );

    await client.query('UPDATE playlists SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');

    res.json({ item: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reorder playlist item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const removePlaylistItem = async (req: AuthRequest, res: Response) => {
  const organizationId = ensureOrgContext(req, res);
  if (!organizationId) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const playlistResult = await client.query(
      'SELECT id FROM playlists WHERE id = $1 AND organization_id = $2 FOR UPDATE',
      [req.params.id, organizationId]
    );
    if (!playlistResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const deleteResult = await client.query(
      `DELETE FROM playlist_items
        WHERE id = $1 AND playlist_id = $2
        RETURNING position`,
      [req.params.itemId, req.params.id]
    );
    if (!deleteResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Playlist item not found' });
    }

    const removedPosition = Number(deleteResult.rows[0].position);
    await client.query(
      `UPDATE playlist_items
          SET position = position - 1,
              updated_at = NOW()
        WHERE playlist_id = $1
          AND position > $2`,
      [req.params.id, removedPosition]
    );

    await client.query('UPDATE playlists SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.status(204).send();
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Remove playlist item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};
