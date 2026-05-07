import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getYouTubeEmbedUrl, getYouTubeThumbnail, isValidYouTubeUrl } from '../utils/youtube';
import { firstQueryValue, positiveIntFromQuery } from '../utils/request';
import { buildFuzzySearchTerm, normalizeSearchTerm } from '../utils/search';
import { getCache, setCache, invalidateCacheByPrefix } from '../services/cacheService';

export const getAllVideos = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(403).json({ error: 'Missing organization context' });
    }

    const genreFilter = firstQueryValue(req.query.genre)?.trim();
    const moduleFilter = firstQueryValue(req.query.training_module_id)?.trim();
    const searchTerm = normalizeSearchTerm(firstQueryValue(req.query.search));
    const page = positiveIntFromQuery(req.query.page, 1, 1000);
    const limit = positiveIntFromQuery(req.query.limit, 20, 100);
    const offset = (page - 1) * limit;
    const cacheKeyParts = [
      'videos',
      organizationId,
      String(page),
      String(limit),
      genreFilter || 'all',
      moduleFilter || 'all',
      searchTerm || 'none',
    ];
    const cacheKey = cacheKeyParts.join('|');

    const cached = await getCache<{ videos: any[]; pagination: any }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const clauses: string[] = ['v.organization_id = $1'];
    const params: any[] = [organizationId];

    if (genreFilter) {
      params.push(genreFilter);
      clauses.push(`v.genre ILIKE $${params.length}`);
    }

    if (moduleFilter) {
      params.push(moduleFilter);
      clauses.push(`v.training_module_id = $${params.length}`);
    }

    if (searchTerm) {
      params.push(buildFuzzySearchTerm(searchTerm));
      const placeholder = `$${params.length}`;
      clauses.push(
        `(v.title ILIKE ${placeholder} ESCAPE '\\\\' OR v.description ILIKE ${placeholder} ESCAPE '\\\\' OR v.lyrics ILIKE ${placeholder} ESCAPE '\\\\' OR v.transcript ILIKE ${placeholder} ESCAPE '\\\\')`
      );
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const filters = [...params];

    const countResult = await pool.query(`SELECT COUNT(*) FROM videos v ${whereClause}`, filters);
    const total = Number(countResult.rows[0]?.count || 0);

    const limitPlaceholder = `$${filters.length + 1}`;
    const offsetPlaceholder = `$${filters.length + 2}`;
    const dataQuery = `
      SELECT v.id,
             v.title,
             v.description,
             v.duration_seconds,
             v.thumbnail_url,
             v.s3_url,
             v.genre,
             v.training_module_id,
             v.created_at,
             v.updated_at
        FROM videos v
        ${whereClause}
        ORDER BY v.created_at DESC
        LIMIT ${limitPlaceholder}
        OFFSET ${offsetPlaceholder}`;

    const dataParams = [...filters, limit, offset];
    const result = await pool.query(dataQuery, dataParams);

    const payload = {
      videos: result.rows,
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
    res.json(payload);
  } catch (error) {
    console.error('Get all videos error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getVideoById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const result = await pool.query(
      `SELECT v.*, q.id as quiz_id, q.passing_score, q.questions
       FROM videos v
       LEFT JOIN quizzes q ON v.id = q.video_id
       WHERE v.id = $1 AND v.organization_id = $2`,
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video: result.rows[0] });
  } catch (error) {
    console.error('Get video by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createVideo = async (req: AuthRequest, res: Response) => {
  try {
    let { title, description, duration_seconds, transcript, lyrics, s3_url, thumbnail_url, genre, training_module_id } = req.body;
    const organizationId = req.user?.organizationId;

    if (!title || duration_seconds === undefined || duration_seconds === null || !s3_url) {
      return res.status(400).json({ error: 'Title, duration_seconds, and s3_url (or youtube_url) are required' });
    }

    // Auto-convert YouTube URLs to embed format and generate thumbnail
    if (isValidYouTubeUrl(s3_url)) {
      const embedUrl = getYouTubeEmbedUrl(s3_url);
      if (embedUrl) {
        s3_url = embedUrl;
      }

      // Auto-generate thumbnail if not provided
      if (!thumbnail_url) {
        thumbnail_url = getYouTubeThumbnail(s3_url, 'hq');
      }
    }

    const videoId = uuidv4();
    const result = await pool.query(
      `INSERT INTO videos (id, title, description, duration_seconds, transcript, lyrics, s3_url, thumbnail_url, genre, training_module_id, organization_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [videoId, title, description || null, duration_seconds, transcript || null, lyrics || null, s3_url, thumbnail_url || null, genre || null, training_module_id || null, organizationId]
    );

    const payload = {
      message: 'Video created successfully',
      video: result.rows[0]
    };

    if (organizationId) {
      await invalidateCacheByPrefix(`videos|${organizationId}`);
    }

    res.status(201).json(payload);
  } catch (error) {
    console.error('Create video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, duration_seconds, transcript, lyrics, s3_url, thumbnail_url, genre, training_module_id } = req.body;
    const organizationId = req.user?.organizationId;

    const result = await pool.query(
      `UPDATE videos
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           duration_seconds = COALESCE($3, duration_seconds),
           transcript = COALESCE($4, transcript),
           lyrics = COALESCE($5, lyrics),
           s3_url = COALESCE($6, s3_url),
           thumbnail_url = COALESCE($7, thumbnail_url),
           genre = COALESCE($8, genre),
           training_module_id = COALESCE($9, training_module_id),
           updated_at = NOW()
       WHERE id = $10 AND organization_id = $11
       RETURNING *`,
      [title, description, duration_seconds, transcript, lyrics, s3_url, thumbnail_url, genre, training_module_id, id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const payload = {
      message: 'Video updated successfully',
      video: result.rows[0]
    };

    if (organizationId) {
      await invalidateCacheByPrefix(`videos|${organizationId}`);
    }

    res.json(payload);
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    const result = await pool.query(
      'DELETE FROM videos WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (organizationId) {
      await invalidateCacheByPrefix(`videos|${organizationId}`);
    }

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
