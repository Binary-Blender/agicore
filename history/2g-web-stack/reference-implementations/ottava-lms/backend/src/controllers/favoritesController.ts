import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const addFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const videoId = req.body.videoId || req.body.video_id;
    const userId = req.user?.userId;

    if (!videoId) {
      return res.status(400).json({ error: 'video_id is required' });
    }

    // Check if video exists
    const videoResult = await pool.query(
      'SELECT id FROM videos WHERE id = $1',
      [videoId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const favoriteId = uuidv4();

    // Insert favorite (will fail if already exists due to UNIQUE constraint)
    try {
      const result = await pool.query(
        `INSERT INTO video_favorites (id, user_id, video_id, created_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING *`,
        [favoriteId, userId, videoId]
      );

      res.status(201).json({
        message: 'Video added to favorites',
        favorite: result.rows[0]
      });
    } catch (dbError: any) {
      if (dbError.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Video already in favorites' });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFavorite = async (req: AuthRequest, res: Response) => {
  try {
    const videoId = req.params.videoId || req.params.video_id;
    const userId = req.user?.userId;

    const result = await pool.query(
      'DELETE FROM video_favorites WHERE user_id = $1 AND video_id = $2 RETURNING id',
      [userId, videoId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ message: 'Video removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserFavorites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const result = await pool.query(
      `SELECT vf.id as favorite_id, vf.created_at as favorited_at,
              v.id, v.title, v.description, v.duration_seconds,
              v.thumbnail_url, v.s3_url, v.genre, v.training_module_id,
              v.created_at, v.updated_at
       FROM video_favorites vf
       JOIN videos v ON vf.video_id = v.id
       WHERE vf.user_id = $1
       ORDER BY vf.created_at DESC`,
      [userId]
    );

    res.json({ favorites: result.rows });
  } catch (error) {
    console.error('Get user favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkFavoriteStatus = async (req: AuthRequest, res: Response) => {
  try {
    const videoId = req.params.videoId || req.params.video_id;
    const userId = req.user?.userId;

    const result = await pool.query(
      'SELECT id FROM video_favorites WHERE user_id = $1 AND video_id = $2',
      [userId, videoId]
    );

    res.json({ is_favorite: result.rows.length > 0 });
  } catch (error) {
    console.error('Check favorite status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
