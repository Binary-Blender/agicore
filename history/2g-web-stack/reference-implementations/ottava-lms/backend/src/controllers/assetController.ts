import fs from 'fs/promises';
import path from 'path';
import type { Express } from 'express';
import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { firstQueryValue, positiveIntFromQuery } from '../utils/request';
import { buildFuzzySearchTerm, normalizeSearchTerm } from '../utils/search';
import { getCache, setCache, invalidateCacheByPrefix } from '../services/cacheService';

const resolveAssetRoot = () => {
  const dir = process.env.SONG_LIBRARY_DIR || path.resolve(process.cwd(), 'songs');
  return dir;
};

const buildAssetResponse = (row: any) => ({
  id: row.id,
  asset_type: row.asset_type,
  training_module_id: row.training_module_id,
  training_module_title: row.training_module_title || null,
  title: row.title,
  description: row.description,
  status: row.status,
  public_url: row.public_url,
  metadata: row.metadata || {},
  duration_seconds: row.duration_seconds,
  style: row.style,
  source: row.source,
  created_at: row.created_at,
  approved_at: row.approved_at,
});

export const listApprovedAssets = async (req: AuthRequest, res: Response) => {
  try {
    const typeFilter = firstQueryValue(req.query.type)?.trim();
    const searchTerm = normalizeSearchTerm(firstQueryValue(req.query.search));
    const moduleFilter = firstQueryValue(req.query.training_module_id)?.trim();
    const page = positiveIntFromQuery(req.query.page, 1, 1000);
    const limit = positiveIntFromQuery(req.query.limit, 20, 100);
    const offset = (page - 1) * limit;

    const params: any[] = [];
    const clauses: string[] = ["a.status = 'approved'", 'a.deleted_at IS NULL'];

    if (typeFilter) {
      params.push(typeFilter);
      clauses.push(`a.asset_type = $${params.length}`);
    }

    if (moduleFilter) {
      params.push(moduleFilter);
      clauses.push(`a.training_module_id = $${params.length}`);
    }

    if (searchTerm) {
      params.push(buildFuzzySearchTerm(searchTerm));
      const placeholder = `$${params.length}`;
      clauses.push(
        `(a.title ILIKE ${placeholder} ESCAPE '\\\\' OR a.description ILIKE ${placeholder} ESCAPE '\\\\' OR a.style ILIKE ${placeholder} ESCAPE '\\\\' OR tm.title ILIKE ${placeholder} ESCAPE '\\\\')`
      );
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const join = `FROM ai_assets a LEFT JOIN training_modules tm ON tm.id = a.training_module_id`;
    const cacheKey = [
      'assets',
      'approved',
      typeFilter || 'all',
      moduleFilter || 'all',
      searchTerm || 'none',
      String(page),
      String(limit),
    ].join('|');

    const cached = await getCache<{ assets: any[]; pagination: any }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) ${join} ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const limitPlaceholder = `$${params.length + 1}`;
    const offsetPlaceholder = `$${params.length + 2}`;
    const result = await pool.query(
      `SELECT a.*, tm.title AS training_module_title
         ${join}
         ${where}
         ORDER BY a.created_at DESC
         LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
      [...params, limit, offset]
    );

    const payload = {
      assets: result.rows.map(buildAssetResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };

    await setCache(cacheKey, payload);
    return res.json(payload);
  } catch (error: any) {
    console.error('List assets error:', error);
    return res.status(500).json({ error: 'Failed to load assets' });
  }
};

export const listPendingAssets = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT a.*, tm.title AS training_module_title
         FROM ai_assets a
         LEFT JOIN training_modules tm ON tm.id = a.training_module_id
        WHERE a.status = 'pending' AND a.deleted_at IS NULL
        ORDER BY a.created_at ASC`
    );

    return res.json({ assets: result.rows.map(buildAssetResponse) });
  } catch (error: any) {
    console.error('List pending assets error:', error);
    return res.status(500).json({ error: 'Failed to load pending assets' });
  }
};

export const uploadAsset = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Asset file is required' });
    }

    const {
      training_module_id,
      asset_type = 'audio',
      title,
      description,
      style,
      duration_seconds,
      auto_approve = 'true'
    } = req.body || {};

    const assetRoot = resolveAssetRoot();
    const folder = training_module_id || 'shared';
    const moduleDir = path.join(assetRoot, folder);
    await fs.mkdir(moduleDir, { recursive: true });

    const safeName = file.originalname?.replace(/[^a-zA-Z0-9._-]/g, '_') || `${asset_type}.bin`;
    const filename = `${Date.now()}_${safeName}`;
    const absolutePath = path.join(moduleDir, filename);
    await fs.writeFile(absolutePath, file.buffer);

    const publicUrl = `/songs/${folder}/${filename}`;
    const status = auto_approve === 'false' ? 'pending' : 'approved';

    const assetResult = await pool.query(
      `INSERT INTO ai_assets (
         training_module_id, asset_type, title, description, status,
         storage_path, public_url, metadata, duration_seconds, style, source, uploaded_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)
       RETURNING *`,
      [
        training_module_id || null,
        asset_type,
        title || file.originalname || 'Uploaded asset',
        description || null,
        status,
        absolutePath,
        publicUrl,
        JSON.stringify({ filename, originalName: file.originalname }),
        duration_seconds ? Number(duration_seconds) : null,
        style || null,
        'manual-upload',
        req.user?.email || null,
      ]
    );

    const assetRow = assetResult.rows[0];

    if (status === 'approved' && training_module_id && asset_type === 'audio') {
      await pool.query(
        `INSERT INTO training_module_songs (
           training_module_id, song_url, song_style, song_duration_seconds, song_file, asset_id, status
         ) VALUES ($1, $2, $3, $4, NULL, $5, 'approved')`,
        [training_module_id, publicUrl, style || null, duration_seconds ? Number(duration_seconds) : null, assetRow.id]
      );

      await pool.query(
        `UPDATE training_modules
            SET ai_song_url = $1,
                ai_song_duration_seconds = $2,
                ai_song_style = $3,
                ai_song_generated_at = NOW()
          WHERE id = $4`,
        [publicUrl, duration_seconds ? Number(duration_seconds) : null, style || null, training_module_id]
      );
    } else if (status === 'pending') {
      await pool.query(
        `INSERT INTO training_module_songs (
           training_module_id, song_url, song_style, song_duration_seconds, song_file, asset_id, status
         ) VALUES ($1, $2, $3, $4, NULL, $5, 'pending')`,
        [training_module_id, publicUrl, style || null, duration_seconds ? Number(duration_seconds) : null, assetRow.id]
      );
      await pool.query(`INSERT INTO qc_tasks (asset_id) VALUES ($1)`, [assetRow.id]);
    }

    const payload = { asset: buildAssetResponse(assetRow) };
    await invalidateCacheByPrefix('assets|');
    return res.status(201).json(payload);
  } catch (error: any) {
    console.error('Upload asset error:', error);
    return res.status(500).json({ error: 'Failed to upload asset' });
  }
};

export const approveAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const assetResult = await pool.query(
      `UPDATE ai_assets
          SET status = 'approved', approved_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
      [id]
    );

    if (assetResult.rowCount === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const assetRow = assetResult.rows[0];

    await pool.query(`UPDATE qc_tasks SET status = 'completed', completed_at = NOW() WHERE asset_id = $1 AND status = 'pending'`, [id]);
    await pool.query(`UPDATE training_module_songs SET status = 'approved' WHERE asset_id = $1`, [id]);

    if (assetRow.training_module_id) {
      await pool.query(
        `UPDATE training_modules
            SET ai_song_url = $1,
                ai_song_duration_seconds = COALESCE($2, ai_song_duration_seconds),
                ai_song_style = COALESCE($3, ai_song_style),
                ai_song_generated_at = NOW()
          WHERE id = $4`,
        [assetRow.public_url, assetRow.duration_seconds, assetRow.style, assetRow.training_module_id]
      );
    }

    const payload = { asset: buildAssetResponse(assetRow) };
    await invalidateCacheByPrefix('assets|');
    return res.json(payload);
  } catch (error: any) {
    console.error('Approve asset error:', error);
    return res.status(500).json({ error: 'Failed to approve asset' });
  }
};

export const rejectAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE ai_assets
          SET status = 'rejected', rejected_at = NOW(), deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    await pool.query(`UPDATE qc_tasks SET status = 'completed', completed_at = NOW() WHERE asset_id = $1 AND status = 'pending'`, [id]);
    await pool.query(`UPDATE training_module_songs SET status = 'rejected' WHERE asset_id = $1`, [id]);
    await invalidateCacheByPrefix('assets|');
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Reject asset error:', error);
    return res.status(500).json({ error: 'Failed to reject asset' });
  }
};

export const updateAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      training_module_id,
      title,
      description,
      style,
      duration_seconds,
    } = req.body || {};

    const existingResult = await pool.query(
      `SELECT * FROM ai_assets WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    const existing = existingResult.rows[0];

    const assignments: string[] = [];
    const values: any[] = [];
    const pushAssignment = (column: string, value: any) => {
      const placeholder = `$${values.length + 1}`;
      assignments.push(`${column} = ${placeholder}`);
      values.push(value);
    };

    const normalizeText = (value: any) => {
      if (value === undefined) return undefined;
      if (value === null) return null;
      const trimmed = `${value}`.trim();
      return trimmed.length ? trimmed : null;
    };

    if (training_module_id !== undefined) {
      pushAssignment('training_module_id', training_module_id || null);
    }
    if (title !== undefined) {
      pushAssignment('title', normalizeText(title));
    }
    if (description !== undefined) {
      pushAssignment('description', normalizeText(description));
    }
    if (style !== undefined) {
      pushAssignment('style', normalizeText(style));
    }
    if (duration_seconds !== undefined) {
      const durationValue =
        duration_seconds === null || duration_seconds === ''
          ? null
          : Number(duration_seconds) || null;
      pushAssignment('duration_seconds', durationValue);
    }

    if (!assignments.length) {
      return res.json({ asset: buildAssetResponse(existing) });
    }

    const query = `
      UPDATE ai_assets
         SET ${assignments.join(', ')},
             updated_at = NOW()
       WHERE id = $${values.length + 1}
       RETURNING *`;
    values.push(id);

    const updateResult = await pool.query(query, values);
    const updatedAsset = updateResult.rows[0];

    const previousModuleId = existing.training_module_id;
    const nextModuleId = updatedAsset.training_module_id;

    if (previousModuleId && previousModuleId !== nextModuleId) {
      await pool.query(
        `UPDATE training_modules
            SET ai_song_url = NULL,
                ai_song_duration_seconds = NULL,
                ai_song_style = NULL
          WHERE id = $1 AND ai_song_url = $2`,
        [previousModuleId, existing.public_url]
      );
    }

    if (updatedAsset.asset_type === 'audio') {
      if (nextModuleId) {
        const songResult = await pool.query(
          `SELECT id FROM training_module_songs WHERE asset_id = $1 AND deleted_at IS NULL`,
          [id]
        );
        if ((songResult.rowCount ?? 0) > 0) {
          await pool.query(
            `UPDATE training_module_songs
                SET training_module_id = $1,
                    song_style = COALESCE($2, song_style),
                    song_duration_seconds = COALESCE($3, song_duration_seconds)
              WHERE asset_id = $4 AND deleted_at IS NULL`,
            [nextModuleId, updatedAsset.style || null, updatedAsset.duration_seconds || null, id]
          );
        } else {
          await pool.query(
            `INSERT INTO training_module_songs (
               training_module_id, song_url, song_style, song_duration_seconds, song_file, asset_id, status
             ) VALUES ($1, $2, $3, $4, NULL, $5, $6)`,
            [
              nextModuleId,
              updatedAsset.public_url,
              updatedAsset.style || null,
              updatedAsset.duration_seconds || null,
              id,
              updatedAsset.status,
            ]
          );
        }

        if (updatedAsset.status === 'approved') {
          await pool.query(
            `UPDATE training_modules
                SET ai_song_url = $1,
                    ai_song_duration_seconds = COALESCE($2, ai_song_duration_seconds),
                    ai_song_style = COALESCE($3, ai_song_style),
                    ai_song_generated_at = NOW()
              WHERE id = $4`,
            [
              updatedAsset.public_url,
              updatedAsset.duration_seconds,
              updatedAsset.style,
              nextModuleId,
            ]
          );
        }
      } else {
        await pool.query(
          `UPDATE training_module_songs
              SET deleted_at = NOW()
            WHERE asset_id = $1
              AND deleted_at IS NULL`,
          [id]
        );
      }
    }

    const detailResult = await pool.query(
      `SELECT a.*, tm.title AS training_module_title
         FROM ai_assets a
         LEFT JOIN training_modules tm ON tm.id = a.training_module_id
        WHERE a.id = $1`,
      [id]
    );

    const payload = { asset: buildAssetResponse(detailResult.rows[0]) };
    await invalidateCacheByPrefix('assets|');
    return res.json(payload);
  } catch (error: any) {
    console.error('Update asset error:', error);
    return res.status(500).json({ error: 'Failed to update asset' });
  }
};

export const deleteAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const assetResult = await pool.query(
      `SELECT * FROM ai_assets WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (assetResult.rowCount === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    const assetRow = assetResult.rows[0];

    await pool.query(
      `UPDATE ai_assets
          SET deleted_at = NOW(),
              status = 'deleted',
              updated_at = NOW()
        WHERE id = $1`,
      [id]
    );

    await pool.query(
      `UPDATE training_module_songs
          SET deleted_at = NOW()
        WHERE asset_id = $1
          AND deleted_at IS NULL`,
      [id]
    );

    await pool.query(
      `UPDATE qc_tasks
          SET status = 'completed',
              completed_at = NOW()
        WHERE asset_id = $1
          AND status = 'pending'`,
      [id]
    );

    if (assetRow.training_module_id) {
      await pool.query(
        `UPDATE training_modules
            SET ai_song_url = NULL,
                ai_song_duration_seconds = NULL,
                ai_song_style = NULL
          WHERE id = $1 AND ai_song_url = $2`,
        [assetRow.training_module_id, assetRow.public_url]
      );
    }

    if (assetRow.storage_path) {
      try {
        await fs.unlink(assetRow.storage_path);
      } catch {
        // ignore missing files
      }
    }

    await invalidateCacheByPrefix('assets|');
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Delete asset error:', error);
    return res.status(500).json({ error: 'Failed to delete asset' });
  }
};
