import { Response } from 'express';
import type { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

const buildLocalPolicyUrl = (moduleId: string) => `/api/training-modules/${moduleId}/policy/download`;

export const getAllTrainingModules = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { category, difficulty_level, is_active } = req.query;

    let query = `
      SELECT
        tm.id,
        tm.organization_id,
        tm.title,
        tm.description,
        tm.category,
        tm.difficulty_level,
        tm.estimated_duration_minutes,
        tm.thumbnail_url,
        tm.policy_document_url,
        tm.policy_document_filename,
        tm.policy_document_mime,
        tm.policy_document_size,
        tm.policy_summary_text,
        tm.emphasis_prompt,
        tm.ai_song_lyrics,
        tm.ai_song_url,
        tm.ai_song_duration_seconds,
        tm.ai_song_style,
        tm.ai_song_generated_at,
        tm.ai_overlay_texts,
        json_agg(
          json_build_object(
            'id', ms.id,
            'song_url', ms.song_url,
            'song_style', ms.song_style,
            'song_duration_seconds', ms.song_duration_seconds,
            'created_at', ms.created_at,
            'status', ms.status,
            'asset_id', ms.asset_id
          ) ORDER BY ms.created_at DESC
        ) FILTER (WHERE ms.id IS NOT NULL) as ai_songs,
        tm.is_active,
        tm.created_at,
        tm.updated_at,
        json_agg(
          json_build_object(
            'id', v.id,
            'genre', v.genre,
            'title', v.title,
            'duration_seconds', v.duration_seconds,
            'thumbnail_url', v.thumbnail_url
          ) ORDER BY v.genre
        ) FILTER (WHERE v.id IS NOT NULL) as videos
      FROM training_modules tm
      LEFT JOIN videos v ON tm.id = v.training_module_id
      LEFT JOIN training_module_songs ms ON tm.id = ms.training_module_id AND ms.deleted_at IS NULL
      WHERE tm.organization_id = $1`;

    const params: any[] = [organizationId];

    if (category) {
      params.push(category);
      query += ` AND tm.category = $${params.length}`;
    }

    if (difficulty_level) {
      params.push(difficulty_level);
      query += ` AND tm.difficulty_level = $${params.length}`;
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND tm.is_active = $${params.length}`;
    }

    query += ` GROUP BY tm.id ORDER BY tm.created_at DESC`;

    const result = await pool.query(query, params);

    const trainingModules = result.rows.map(raw => {
      const { policy_document_blob, ...module } = raw;
      return {
        ...module,
        videos: module.videos || [],
        ai_songs: module.ai_songs || []
      };
    });

    res.json({ training_modules: trainingModules });
  } catch (error) {
    console.error('Get all training modules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTrainingModuleById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const { preferred_genre } = req.query;

    const result = await pool.query(
      `SELECT
        tm.id,
        tm.organization_id,
        tm.title,
        tm.description,
        tm.category,
        tm.difficulty_level,
        tm.estimated_duration_minutes,
        tm.thumbnail_url,
        tm.policy_document_url,
        tm.policy_document_filename,
        tm.policy_document_mime,
        tm.policy_document_size,
        tm.policy_summary_text,
        tm.emphasis_prompt,
        tm.ai_song_lyrics,
        tm.ai_song_url,
        tm.ai_song_duration_seconds,
        tm.ai_song_style,
        tm.ai_song_generated_at,
        tm.ai_overlay_texts,
        json_agg(
          json_build_object(
            'id', ms.id,
            'song_url', ms.song_url,
            'song_style', ms.song_style,
            'song_duration_seconds', ms.song_duration_seconds,
            'created_at', ms.created_at,
            'status', ms.status,
            'asset_id', ms.asset_id
          ) ORDER BY ms.created_at DESC
        ) FILTER (WHERE ms.id IS NOT NULL) as ai_songs,
        tm.is_active,
        tm.created_at,
        tm.updated_at,
        json_agg(
          json_build_object(
            'id', v.id,
            'genre', v.genre,
            'title', v.title,
            'description', v.description,
            'duration_seconds', v.duration_seconds,
            'thumbnail_url', v.thumbnail_url,
            's3_url', v.s3_url
          ) ORDER BY v.genre
        ) FILTER (WHERE v.id IS NOT NULL) as videos
      FROM training_modules tm
      LEFT JOIN videos v ON tm.id = v.training_module_id
      LEFT JOIN training_module_songs ms ON tm.id = ms.training_module_id AND ms.deleted_at IS NULL
      WHERE tm.id = $1 AND tm.organization_id = $2
      GROUP BY tm.id`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training module not found' });
    }

    const { policy_document_blob, ...moduleData } = result.rows[0];
    const resolvedPolicyUrl =
      moduleData.policy_document_url ||
      (policy_document_blob ? buildLocalPolicyUrl(moduleData.id) : null);
    const trainingModule = {
      ...moduleData,
      policy_document_url: resolvedPolicyUrl,
      videos: moduleData.videos || [],
      ai_songs: moduleData.ai_songs || []
    };

    // If preferred_genre is provided and a video exists for that genre, set it as the default
    if (preferred_genre && trainingModule.videos) {
      const preferredVideo = trainingModule.videos.find((v: any) => v.genre === preferred_genre);
      if (preferredVideo) {
        trainingModule.default_video = preferredVideo;
      } else if (trainingModule.videos.length > 0) {
        // Fallback to first available video if preferred genre not found
        trainingModule.default_video = trainingModule.videos[0];
      }
    } else if (trainingModule.videos && trainingModule.videos.length > 0) {
      // No preference, use first available video
      trainingModule.default_video = trainingModule.videos[0];
    }

    res.json({ training_module: trainingModule });
  } catch (error) {
    console.error('Get training module by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTrainingModule = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      category,
      difficulty_level,
      estimated_duration_minutes,
      thumbnail_url,
      policy_document_url,
      policy_summary_text,
      emphasis_prompt,
      ai_song_lyrics,
      ai_song_url,
      ai_song_duration_seconds,
      ai_song_style,
      ai_song_generated_at,
      ai_overlay_texts
    } = req.body;
    const organizationId = req.user?.organizationId;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const overlayPayload = ai_overlay_texts
      ? typeof ai_overlay_texts === 'string'
        ? ai_overlay_texts
        : JSON.stringify(ai_overlay_texts)
      : null;
    const moduleId = uuidv4();
    const result = await pool.query(
      `INSERT INTO training_modules (id, organization_id, title, description, category, difficulty_level, estimated_duration_minutes, thumbnail_url, policy_document_url, policy_summary_text, emphasis_prompt, ai_song_lyrics, ai_song_url, ai_song_duration_seconds, ai_song_style, ai_song_generated_at, ai_overlay_texts, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, NOW(), NOW())
       RETURNING *`,
      [
        moduleId,
        organizationId,
        title,
        description || null,
        category || null,
        difficulty_level || null,
        estimated_duration_minutes || null,
        thumbnail_url || null,
        policy_document_url || null,
        policy_summary_text || null,
        emphasis_prompt || null,
        ai_song_lyrics || null,
        null,
        null,
        null,
        null,
        overlayPayload,
      ]
    );

    res.status(201).json({
      message: 'Training module created successfully',
      training_module: result.rows[0]
    });
  } catch (error) {
    console.error('Create training module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTrainingModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      difficulty_level,
      estimated_duration_minutes,
      thumbnail_url,
      policy_document_url,
      policy_summary_text,
      emphasis_prompt,
      ai_song_lyrics,
      ai_song_url,
      ai_song_duration_seconds,
      ai_song_style,
      ai_song_generated_at,
      ai_overlay_texts,
      is_active
    } = req.body;
    const organizationId = req.user?.organizationId;

    const overlayPayload = ai_overlay_texts
      ? typeof ai_overlay_texts === 'string'
        ? ai_overlay_texts
        : JSON.stringify(ai_overlay_texts)
      : null;

    const result = await pool.query(
      `UPDATE training_modules
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           difficulty_level = COALESCE($4, difficulty_level),
           estimated_duration_minutes = COALESCE($5, estimated_duration_minutes),
           thumbnail_url = COALESCE($6, thumbnail_url),
           policy_document_url = COALESCE($7, policy_document_url),
           policy_summary_text = COALESCE($8, policy_summary_text),
           emphasis_prompt = COALESCE($9, emphasis_prompt),
           ai_song_lyrics = COALESCE($10, ai_song_lyrics),
           ai_song_url = COALESCE($11, ai_song_url),
           ai_song_duration_seconds = COALESCE($12, ai_song_duration_seconds),
           ai_song_style = COALESCE($13, ai_song_style),
           ai_song_generated_at = COALESCE($14, ai_song_generated_at),
           ai_overlay_texts = COALESCE($15::jsonb, ai_overlay_texts),
           is_active = COALESCE($16, is_active),
           updated_at = NOW()
       WHERE id = $17 AND organization_id = $18
       RETURNING *`,
      [
        title,
        description,
        category,
        difficulty_level,
        estimated_duration_minutes,
        thumbnail_url,
        policy_document_url,
        policy_summary_text,
        emphasis_prompt,
        ai_song_lyrics,
        ai_song_url,
        ai_song_duration_seconds,
        ai_song_style,
        ai_song_generated_at,
        overlayPayload,
        is_active,
        id,
        organizationId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training module not found' });
    }

    res.json({
      message: 'Training module updated successfully',
      training_module: result.rows[0]
    });
  } catch (error) {
    console.error('Update training module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTrainingModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const result = await pool.query(
      'DELETE FROM training_modules WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training module not found' });
    }

    res.json({ message: 'Training module deleted successfully' });
  } catch (error) {
    console.error('Delete training module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAvailableGenresForModule = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const result = await pool.query(
      `SELECT DISTINCT v.genre
       FROM videos v
       JOIN training_modules tm ON v.training_module_id = tm.id
       WHERE tm.id = $1 AND tm.organization_id = $2 AND v.genre IS NOT NULL
       ORDER BY v.genre`,
      [id, organizationId]
    );

    res.json({ genres: result.rows.map(row => row.genre) });
  } catch (error) {
    console.error('Get available genres error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadPolicyDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;
    const file = (req as AuthRequest & { file?: Express.Multer.File }).file;

    if (!file) {
      return res.status(400).json({ error: 'Policy PDF is required' });
    }

    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }

    const moduleResult = await pool.query(
      'SELECT policy_document_url FROM training_modules WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Training module not found' });
    }

    const filename = file.originalname || 'policy.pdf';
    const mimeType = file.mimetype || 'application/pdf';
    const fileSize = typeof file.size === 'number' ? file.size : file.buffer.length;

    const downloadUrl = buildLocalPolicyUrl(id);
    await pool.query(
      `UPDATE training_modules
       SET policy_document_blob = $1,
           policy_document_filename = $2,
           policy_document_mime = $3,
           policy_document_size = $4,
           policy_document_url = $5,
           updated_at = NOW()
       WHERE id = $6 AND organization_id = $7`,
      [file.buffer, filename, mimeType, fileSize, downloadUrl, id, organizationId]
    );

    res.json({
      message: 'Policy document uploaded successfully',
      policy_document_url: downloadUrl
    });
  } catch (error: any) {
    console.error('Upload policy document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const clearPolicyDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const moduleResult = await pool.query(
      'SELECT policy_document_url FROM training_modules WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Training module not found' });
    }

    await pool.query(
      `UPDATE training_modules
       SET policy_document_url = NULL,
           policy_document_blob = NULL,
           policy_document_filename = NULL,
           policy_document_mime = NULL,
           policy_document_size = NULL,
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    res.json({ message: 'Policy document removed' });
  } catch (error) {
    console.error('Clear policy document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadPolicyDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const result = await pool.query(
      `SELECT policy_document_blob,
              policy_document_filename,
              policy_document_mime,
              policy_document_size,
              policy_document_url
       FROM training_modules
       WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Training module not found' });
    }

    const module = result.rows[0];
    if (module.policy_document_blob) {
      const mimeType = module.policy_document_mime || 'application/pdf';
      const filename = module.policy_document_filename || 'policy.pdf';
      const length = module.policy_document_size || module.policy_document_blob.length;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', length);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(module.policy_document_blob);
    }

    if (module.policy_document_url) {
      return res.redirect(module.policy_document_url);
    }

    res.status(404).json({ error: 'No policy document available' });
  } catch (error) {
    console.error('Download policy document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
