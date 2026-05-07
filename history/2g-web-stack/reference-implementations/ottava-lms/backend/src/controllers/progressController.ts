import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const recordWatchSession = async (req: AuthRequest, res: Response) => {
  try {
    const { video_id, watch_percentage, device_type } = req.body;
    const userId = req.user?.userId;

    if (!video_id || watch_percentage === undefined) {
      return res.status(400).json({ error: 'video_id and watch_percentage are required' });
    }

    const sessionId = uuidv4();
    const completed = watch_percentage >= 95;

    // Record watch session
    await pool.query(
      `INSERT INTO watch_sessions (id, user_id, video_id, started_at, completed_at, watch_percentage, device_type)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6)`,
      [sessionId, userId, video_id, completed ? new Date() : null, watch_percentage, device_type || null]
    );

    // Update or create progress record
    const existingProgress = await pool.query(
      'SELECT * FROM progress WHERE user_id = $1 AND video_id = $2',
      [userId, video_id]
    );

    if (existingProgress.rows.length === 0) {
      await pool.query(
        `INSERT INTO progress (user_id, video_id, status, watch_count, quiz_attempts, best_score, last_activity)
         VALUES ($1, $2, $3, 1, 0, 0, NOW())`,
        [userId, video_id, completed ? 'quiz_pending' : 'watching']
      );
    } else {
      const currentStatus = existingProgress.rows[0].status;
      const newStatus = completed && currentStatus === 'watching' ? 'quiz_pending' : currentStatus;
      const watchCount = existingProgress.rows[0].watch_count + 1;

      await pool.query(
        `UPDATE progress
         SET status = $1,
             watch_count = $2,
             last_activity = NOW()
         WHERE user_id = $3 AND video_id = $4`,
        [newStatus, watchCount, userId, video_id]
      );
    }

    res.json({
      message: 'Watch session recorded',
      session_id: sessionId,
      completed,
      quiz_ready: completed
    });
  } catch (error) {
    console.error('Record watch session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const result = await pool.query(
      `SELECT p.*, v.title, v.thumbnail_url, v.duration_seconds
       FROM progress p
       JOIN videos v ON p.video_id = v.id
       WHERE p.user_id = $1
       ORDER BY p.last_activity DESC`,
      [userId]
    );

    res.json({ progress: result.rows });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getVideoProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.userId;

    const result = await pool.query(
      `SELECT * FROM progress WHERE user_id = $1 AND video_id = $2`,
      [userId, videoId]
    );

    if (result.rows.length === 0) {
      return res.json({
        progress: {
          user_id: userId,
          video_id: videoId,
          status: 'not_started',
          watch_count: 0,
          quiz_attempts: 0,
          best_score: 0
        }
      });
    }

    res.json({ progress: result.rows[0] });
  } catch (error) {
    console.error('Get video progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOverallStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Get completion stats
    const statsResult = await pool.query(
      `SELECT
         COUNT(*) as total_videos_assigned,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_videos,
         COUNT(CASE WHEN status = 'watching' OR status = 'quiz_pending' THEN 1 END) as in_progress_videos,
         AVG(CASE WHEN status = 'completed' THEN best_score END) as average_score
       FROM progress
       WHERE user_id = $1`,
      [userId]
    );

    // Get recent activity
    const activityResult = await pool.query(
      `SELECT v.title, p.status, p.last_activity
       FROM progress p
       JOIN videos v ON p.video_id = v.id
       WHERE p.user_id = $1
       ORDER BY p.last_activity DESC
       LIMIT 5`,
      [userId]
    );

    const stats = statsResult.rows[0];
    const completionRate = stats.total_videos_assigned > 0
      ? (stats.completed_videos / stats.total_videos_assigned) * 100
      : 0;

    res.json({
      stats: {
        total_videos_assigned: parseInt(stats.total_videos_assigned),
        completed_videos: parseInt(stats.completed_videos),
        in_progress_videos: parseInt(stats.in_progress_videos),
        completion_rate: Math.round(completionRate),
        average_score: stats.average_score ? Math.round(parseFloat(stats.average_score)) : 0
      },
      recent_activity: activityResult.rows
    });
  } catch (error) {
    console.error('Get overall stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
