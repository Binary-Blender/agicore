import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { generateVisualPrompt } from '../services/textGenerationProvider';
import { clampSnippet } from '../utils/visualHelpers';

export const createVisualPrompt = async (req: AuthRequest, res: Response) => {
  try {
    const {
      training_module_id,
      reminder_phrase,
      policy_override,
      lyrics_override,
      user_modified_prompt,
    } = req.body || {};

    if (!training_module_id) {
      return res.status(400).json({ error: 'training_module_id is required' });
    }
    if (!reminder_phrase || !reminder_phrase.trim()) {
      return res.status(400).json({ error: 'reminder_phrase is required' });
    }

    const moduleResult = await pool.query(
      `SELECT id, policy_summary_text, ai_song_lyrics
         FROM training_modules
        WHERE id = $1`,
      [training_module_id]
    );

    if (moduleResult.rowCount === 0) {
      return res.status(404).json({ error: 'Training module not found' });
    }

    const module = moduleResult.rows[0];
    const policySnippet = clampSnippet(policy_override || module.policy_summary_text, 1500);
    const lyricsSnippet = clampSnippet(lyrics_override || module.ai_song_lyrics, 1200);

    const promptResult = await generateVisualPrompt({
      reminderPhrase: reminder_phrase,
      policySnippet,
      lyricsSnippet,
    });

    const logResult = await pool.query(
      `INSERT INTO prompt_generation_logs (
         training_module_id,
         reminder_phrase,
         policy_snippet,
         lyrics_snippet,
         generated_prompt,
         user_modified_prompt,
         model_used
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        training_module_id,
        reminder_phrase,
        promptResult.policySnippet,
        promptResult.lyricsSnippet,
        promptResult.prompt,
        user_modified_prompt || null,
        process.env.OPENAI_MODEL || 'gpt-4o-mini',
      ]
    );

    return res.json({
      prompt: promptResult.prompt,
      negative_prompt: promptResult.negativePrompt,
      log: logResult.rows[0],
      usage: promptResult.usage,
    });
  } catch (error: any) {
    console.error('Visual prompt generation error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate visual prompt.' });
  }
};
