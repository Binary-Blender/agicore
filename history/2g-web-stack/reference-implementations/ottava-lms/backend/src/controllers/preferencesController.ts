import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const setPreferredGenre = async (req: AuthRequest, res: Response) => {
  try {
    const { genre } = req.body;
    const userId = req.user?.userId;

    if (!genre) {
      return res.status(400).json({ error: 'genre is required' });
    }

    const result = await pool.query(
      `UPDATE users
       SET preferred_genre = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, preferred_genre`,
      [genre, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Preferred genre updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Set preferred genre error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPreferredGenre = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const result = await pool.query(
      'SELECT preferred_genre FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const preferredGenre = result.rows[0].preferred_genre || null;

    res.json({
      preferred_genre: preferredGenre,
      genre: preferredGenre // legacy alias for existing clients
    });
  } catch (error) {
    console.error('Get preferred genre error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const clearPreferredGenre = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const result = await pool.query(
      `UPDATE users
       SET preferred_genre = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Preferred genre cleared successfully' });
  } catch (error) {
    console.error('Clear preferred genre error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
