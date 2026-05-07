import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const createQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { video_id, training_module_id, passing_score, questions } = req.body;

    // Must have either video_id OR training_module_id, but not both
    if ((!video_id && !training_module_id) || (video_id && training_module_id)) {
      return res.status(400).json({ error: 'Either video_id or training_module_id is required (not both)' });
    }

    if (!passing_score || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'passing_score and questions are required' });
    }

    // Prevent duplicates per training module or standalone video
    if (training_module_id) {
      const existing = await pool.query(
        'SELECT id FROM quizzes WHERE training_module_id = $1',
        [training_module_id]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'A quiz already exists for this training module' });
      }
    }

    if (video_id) {
      const existing = await pool.query(
        'SELECT id FROM quizzes WHERE video_id = $1',
        [video_id]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'A quiz already exists for this video' });
      }
    }

    const quizId = uuidv4();
    const result = await pool.query(
      `INSERT INTO quizzes (id, video_id, training_module_id, passing_score, questions, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [quizId, video_id || null, training_module_id || null, passing_score, JSON.stringify(questions)]
    );

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz: result.rows[0]
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuizByVideoId = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    // First check if the video belongs to a training module
    const videoResult = await pool.query(
      'SELECT training_module_id FROM videos WHERE id = $1',
      [videoId]
    );

    if (videoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const trainingModuleId = videoResult.rows[0].training_module_id;

    // If video is part of a training module, get quiz by training_module_id
    // Otherwise, get quiz by video_id (legacy standalone videos)
    let result;
    if (trainingModuleId) {
      result = await pool.query(
        'SELECT * FROM quizzes WHERE training_module_id = $1',
        [trainingModuleId]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM quizzes WHERE video_id = $1',
        [videoId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found for this video' });
    }

    res.json({ quiz: result.rows[0] });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuizByTrainingModuleId = async (req: AuthRequest, res: Response) => {
  try {
    const { trainingModuleId } = req.params;

    const result = await pool.query(
      'SELECT * FROM quizzes WHERE training_module_id = $1',
      [trainingModuleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found for this training module' });
    }

    res.json({ quiz: result.rows[0] });
  } catch (error) {
    console.error('Get quiz by training module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitQuizAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { video_id, quiz_id, answers, hints_used = [] } = req.body;
    const userId = req.user?.userId;

    if (!video_id || !quiz_id || !answers) {
      return res.status(400).json({ error: 'video_id, quiz_id, and answers are required' });
    }

    // Get quiz questions
    const quizResult = await pool.query(
      'SELECT questions, passing_score FROM quizzes WHERE id = $1',
      [quiz_id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const { questions, passing_score } = quizResult.rows[0];

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedAnswers: any = {};

    questions.forEach((question: any) => {
      totalPoints += question.points;
      const userAnswer = answers[question.id];
      const correctAnswer = question.correct_answer;

      let isCorrect = false;

      if (question.type === 'sequence_ordering') {
        isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
      } else if (Array.isArray(correctAnswer)) {
        isCorrect = JSON.stringify(userAnswer?.sort()) === JSON.stringify(correctAnswer.sort());
      } else {
        isCorrect = userAnswer === correctAnswer;
      }

      if (isCorrect) {
        earnedPoints += question.points;
      }

      gradedAnswers[question.id] = {
        user_answer: userAnswer,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
        points_earned: isCorrect ? question.points : 0
      };
    });

    const score = (earnedPoints / totalPoints) * 100;
    const passed = score >= passing_score;

    // Get attempt number
    const attemptCountResult = await pool.query(
      'SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id = $1 AND video_id = $2',
      [userId, video_id]
    );
    const attemptNumber = parseInt(attemptCountResult.rows[0].count) + 1;

    // Save attempt
    const attemptId = uuidv4();
    await pool.query(
      `INSERT INTO quiz_attempts (id, user_id, video_id, quiz_id, score, passed, attempt_number, questions, answers, hints_used, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [attemptId, userId, video_id, quiz_id, score, passed, attemptNumber, JSON.stringify(questions), JSON.stringify(gradedAnswers), JSON.stringify(hints_used)]
    );

    // Update progress
    await updateProgress(userId!, video_id, passed, score);

    res.json({
      message: passed ? 'Quiz passed!' : 'Quiz failed. Please watch the video again.',
      attempt_id: attemptId,
      score,
      passed,
      passing_score,
      attempt_number: attemptNumber,
      graded_answers: gradedAnswers
    });
  } catch (error) {
    console.error('Submit quiz attempt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { passing_score, questions } = req.body;

    if (!passing_score || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'passing_score and questions are required' });
    }

    const result = await pool.query(
      `UPDATE quizzes
       SET passing_score = $1, questions = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [passing_score, JSON.stringify(questions), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json({
      message: 'Quiz updated successfully',
      quiz: result.rows[0]
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuizAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.userId;

    const result = await pool.query(
      `SELECT id, score, passed, attempt_number, completed_at
       FROM quiz_attempts
       WHERE user_id = $1 AND video_id = $2
       ORDER BY attempt_number DESC`,
      [userId, videoId]
    );

    res.json({ attempts: result.rows });
  } catch (error) {
    console.error('Get quiz attempts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLatestQuizAttemptByTrainingModule = async (req: AuthRequest, res: Response) => {
  try {
    const { trainingModuleId } = req.params;
    const userId = req.user?.userId;

    const result = await pool.query(
      `SELECT
         qa.id,
         qa.video_id,
         qa.quiz_id,
         qa.score,
         qa.passed,
         qa.attempt_number,
         qa.answers,
         qa.completed_at,
         q.passing_score
       FROM quiz_attempts qa
       JOIN quizzes q ON qa.quiz_id = q.id
       WHERE q.training_module_id = $1
         AND qa.user_id = $2
       ORDER BY qa.completed_at DESC
       LIMIT 1`,
      [trainingModuleId, userId]
    );

    if (result.rows.length === 0) {
      return res.json({ attempt: null });
    }

    const attempt = result.rows[0];

    res.json({
      attempt: {
        attempt_id: attempt.id,
        quiz_id: attempt.quiz_id,
        video_id: attempt.video_id,
        score: Number(attempt.score),
        passed: attempt.passed,
        passing_score: Number(attempt.passing_score),
        attempt_number: attempt.attempt_number,
        graded_answers: attempt.answers,
        completed_at: attempt.completed_at
      }
    });
  } catch (error) {
    console.error('Get latest quiz attempt by training module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProgress = async (userId: string, videoId: string, passed: boolean, score: number) => {
  try {
    // Check if progress exists
    const existingProgress = await pool.query(
      'SELECT * FROM progress WHERE user_id = $1 AND video_id = $2',
      [userId, videoId]
    );

    if (existingProgress.rows.length === 0) {
      // Create new progress
      await pool.query(
        `INSERT INTO progress (user_id, video_id, status, watch_count, quiz_attempts, best_score, completed_at, last_activity)
         VALUES ($1, $2, $3, 0, 1, $4, $5, NOW())`,
        [userId, videoId, passed ? 'completed' : 'failed', score, passed ? new Date() : null]
      );
    } else {
      // Update existing progress
      const currentBestScore = existingProgress.rows[0].best_score;
      const newBestScore = Math.max(currentBestScore, score);
      const quizAttempts = existingProgress.rows[0].quiz_attempts + 1;

      await pool.query(
        `UPDATE progress
         SET status = $1,
             quiz_attempts = $2,
             best_score = $3,
             completed_at = $4,
             last_activity = NOW()
         WHERE user_id = $5 AND video_id = $6`,
        [passed ? 'completed' : 'failed', quizAttempts, newBestScore, passed ? new Date() : existingProgress.rows[0].completed_at, userId, videoId]
      );
    }
  } catch (error) {
    console.error('Update progress error:', error);
    throw error;
  }
};
