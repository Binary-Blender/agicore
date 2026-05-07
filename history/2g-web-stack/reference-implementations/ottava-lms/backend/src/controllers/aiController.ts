import type { Express } from 'express';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { AuthRequest } from '../middleware/auth';
import {
  generateSongLyrics,
  generateReminderPhrases,
  generateQuizQuestions,
} from '../services/textGenerationProvider';
import type { RawQuizQuestion } from '../services/openaiService';
import pool from '../config/database';
import { generateTrainingSong } from '../services/songService';

const normalizePolicyText = (input?: string) => (input || '').trim();
const parsePhraseList = (input: unknown) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((value) => (typeof value === 'string' ? value.trim() : `${value}`.trim())).filter(Boolean);
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => (typeof value === 'string' ? value.trim() : `${value}`.trim())).filter(Boolean);
      }
    } catch {
      // fall back to splitting
    }
    return input
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
};

const shuffleArray = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const createLyrics = async (req: AuthRequest & { file?: Express.Multer.File }, res: Response) => {
  try {
    const { emphasis_prompt, policy_summary } = req.body;
    const emphasis = (emphasis_prompt || '').trim();

    if (!emphasis) {
      return res.status(400).json({ error: 'Please describe the key elements to emphasize.' });
    }

    const policyText = normalizePolicyText(policy_summary);

    if (!policyText) {
      return res.status(400).json({ error: 'Paste the policy text so AI can analyze it.' });
    }

    const result = await generateSongLyrics(policyText, emphasis);

    res.json({
      lyrics: result.lyrics,
      usage: result.usage,
      emphasis_prompt: emphasis,
      policy_characters: policyText.length,
    });
  } catch (error: any) {
    console.error('Lyric generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate lyrics' });
  }
};

export const createReminderText = async (
  req: AuthRequest & { file?: Express.Multer.File },
  res: Response
) => {
  try {
    const { song_lyrics, policy_summary } = req.body;
    const lyrics = (song_lyrics || '').trim();

    if (!lyrics) {
      return res.status(400).json({ error: 'Song lyrics are required to generate reminder text.' });
    }

    const policyText = normalizePolicyText(policy_summary);

    if (!policyText) {
      return res.status(400).json({ error: 'Paste the policy text so AI can analyze it.' });
    }

    const result = await generateReminderPhrases(policyText, lyrics);

    res.json({
      reinforcement: result.reinforcement,
      policy_highlights: result.policyHighlights,
      combined: [...result.reinforcement, ...result.policyHighlights],
      usage: result.usage,
    });
  } catch (error: any) {
    console.error('Reminder text generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate reminder text' });
  }
};

const SONG_STYLE_PRESETS: Record<string, string> = {
  safety: 'serious and professional safety training music with confident vocals',
  onboarding: 'welcoming and upbeat new employee orientation music',
  compliance: 'formal yet engaging compliance training soundtrack',
  sales: 'energetic and motivational sales enablement music',
  customer_service: 'friendly and approachable customer interaction training music',
  technical: 'modern, focused electronic music for technical training',
  leadership: 'inspiring and cinematic leadership development soundtrack',
  diversity: 'inclusive and celebratory diversity training music',
  remote_work: 'calm and focused remote work policy training ambience',
  data_security: 'urgent yet composed data protection training music',
};

const detectPresetFromPolicy = (policyText?: string) => {
  const text = (policyText || '').toLowerCase();
  if (text.includes('safety') || text.includes('security')) return 'safety';
  if (text.includes('compliance') || text.includes('regulation')) return 'compliance';
  if (text.includes('customer')) return 'customer_service';
  if (text.includes('diversity') || text.includes('inclusion')) return 'diversity';
  if (text.includes('remote')) return 'remote_work';
  if (text.includes('data') || text.includes('privacy')) return 'data_security';
  if (text.includes('sales')) return 'sales';
  if (text.includes('leadership')) return 'leadership';
  if (text.includes('technical') || text.includes('engineering')) return 'technical';
  return 'onboarding';
};

const resolveStyleDescription = (
  preset: string | undefined,
  customStyle: string | undefined,
  policyText?: string
) => {
  if (customStyle?.trim()) {
    return customStyle.trim();
  }
  const normalizedPreset = preset && SONG_STYLE_PRESETS[preset] ? preset : detectPresetFromPolicy(policyText);
  return SONG_STYLE_PRESETS[normalizedPreset] || SONG_STYLE_PRESETS.onboarding;
};

const categoryConfig = {
  lyric_reinforcement: { difficulty: 'Easy', points: 10, source: 'lyric_reinforcement' },
  policy_addons: { difficulty: 'Medium', points: 20, source: 'policy_addon' },
  policy_only: { difficulty: 'Hard', points: 30, source: 'policy_only' },
  expert: { difficulty: 'Expert', points: 50, source: 'expert' },
};

type NormalizedQuizQuestion = {
  id: string;
  question: string;
  type: string;
  options: string[];
  correct_answer: string;
  points: number;
  difficulty: string;
  source: string;
  reference_phrase?: string | null;
  explanation?: string | null;
};

const normalizeQuizQuestions = (
  items: RawQuizQuestion[],
  category: keyof typeof categoryConfig
): NormalizedQuizQuestion[] => {
  const config = categoryConfig[category];
  return items
    .map<NormalizedQuizQuestion | null>((item) => {
      const incorrect = Array.isArray(item.incorrect_answers)
        ? item.incorrect_answers.map((answer) => `${answer}`.trim()).filter(Boolean)
        : [];
      const correct = item.correct_answer?.trim();
      if (!item.question || !correct || incorrect.length < 3) {
        return null;
      }
      const options = shuffleArray([...incorrect.slice(0, 3), correct]);
      return {
        id: uuidv4(),
        question: item.question.trim(),
        type: 'multiple_choice',
        options,
        correct_answer: correct,
        points: config.points,
        difficulty: config.difficulty,
        source: config.source,
        reference_phrase: item.reference_phrase || null,
        explanation: item.explanation || null,
      };
    })
    .filter((question): question is NormalizedQuizQuestion => Boolean(question));
};

export const createQuizQuestions = async (
  req: AuthRequest & { file?: Express.Multer.File },
  res: Response
) => {
  try {
    const { policy_summary, reinforcement_phrases, policy_highlight_phrases, song_lyrics } = req.body;

    const policyText = normalizePolicyText(policy_summary);
    if (!policyText) {
      return res.status(400).json({ error: 'Paste the policy text so AI can analyze it.' });
    }

    const reinforcementList = parsePhraseList(reinforcement_phrases);
    const highlightList = parsePhraseList(policy_highlight_phrases);

    const quizResult = await generateQuizQuestions(policyText, reinforcementList, highlightList, song_lyrics);

    const combinedQuestions = [
      ...normalizeQuizQuestions(quizResult.lyric_reinforcement, 'lyric_reinforcement'),
      ...normalizeQuizQuestions(quizResult.policy_addons, 'policy_addons'),
      ...normalizeQuizQuestions(quizResult.policy_only, 'policy_only'),
      ...normalizeQuizQuestions(quizResult.expert, 'expert'),
    ];

    if (!combinedQuestions.length) {
      return res.status(500).json({ error: 'Quiz generation returned no usable questions.' });
    }

    res.json({
      questions: combinedQuestions,
      usage: quizResult.usage,
      counts: {
        easy: quizResult.lyric_reinforcement.length,
        medium: quizResult.policy_addons.length,
        hard: quizResult.policy_only.length,
        expert: quizResult.expert.length,
      },
    });
  } catch (error: any) {
    console.error('Quiz question generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz questions' });
  }
};

const normalizeEmphasisPoints = (input: unknown): string[] => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((value) => `${value}`.trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
};

export const createTrainingSong = async (req: AuthRequest, res: Response) => {
  try {
    const {
      training_module_id,
      lyrics,
      style_preset,
      custom_style,
      duration_ms,
      emphasis_points,
    } = req.body;

    if (!training_module_id) {
      return res.status(400).json({ error: 'training_module_id is required' });
    }

    const moduleResult = await pool.query(
      `SELECT id, title, policy_summary_text, emphasis_prompt, ai_song_lyrics
       FROM training_modules
       WHERE id = $1`,
      [training_module_id]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Training module not found' });
    }

    const module = moduleResult.rows[0];
    const resolvedLyrics = (lyrics || module.ai_song_lyrics || '').trim();
    if (!resolvedLyrics) {
      return res.status(400).json({ error: 'No lyrics available for this module. Generate lyrics first.' });
    }

    const emphasisList = normalizeEmphasisPoints(emphasis_points);
    const derivedStyle = resolveStyleDescription(style_preset, custom_style, module.policy_summary_text);
    const duration = Number(duration_ms) || 180000;

    const generation = await generateTrainingSong({
      moduleId: training_module_id,
      moduleTitle: module.title,
      lyrics: resolvedLyrics,
      style: derivedStyle,
      durationMs: duration,
      emphasisPoints: emphasisList.length ? emphasisList : normalizeEmphasisPoints(module.emphasis_prompt),
    });

    const assetInsert = await pool.query(
      `INSERT INTO ai_assets (
         training_module_id, asset_type, title, description, status,
         storage_path, public_url, metadata, duration_seconds, style, source
       ) VALUES ($1, 'audio', $2, $3, 'pending', $4, $5, $6::jsonb, $7, $8, $9)
       RETURNING *`,
      [
        training_module_id,
        `${module.title} training mix`,
        `Generated via AI Studio (${derivedStyle})`,
        generation.filePath,
        generation.publicPath,
        JSON.stringify({ emphasis_points: emphasisList }),
        generation.durationSeconds,
        derivedStyle,
        'ai-song-generator',
      ]
    );

    const assetRow = assetInsert.rows[0];

    const historyInsert = await pool.query(
      `INSERT INTO training_module_songs (
         training_module_id, song_url, song_style, song_duration_seconds, song_file, asset_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, song_url, song_style, song_duration_seconds, created_at, status, asset_id`,
      [
        training_module_id,
        generation.publicPath,
        derivedStyle,
        generation.durationSeconds,
        generation.buffer,
        assetRow.id,
      ]
    );

    await pool.query(`INSERT INTO qc_tasks (asset_id) VALUES ($1)`, [assetRow.id]);

    res.json({
      pending_asset: {
        id: assetRow.id,
        training_module_id,
        public_url: assetRow.public_url,
        status: assetRow.status,
        asset_type: assetRow.asset_type,
        created_at: assetRow.created_at,
      },
      history_entry: historyInsert.rows[0],
    });
  } catch (error: any) {
    console.error('Song generation error:', error);
    const message =
      error?.response?.data?.error || error?.message || 'Failed to generate training song';
    res.status(500).json({ error: message });
  }
};

export const deleteTrainingSong = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!id) {
      return res.status(400).json({ error: 'Song id is required.' });
    }

    const songResult = await pool.query(
      `SELECT ms.id,
              ms.training_module_id,
              ms.song_url,
              ms.asset_id,
              tm.ai_song_url
         FROM training_module_songs ms
         JOIN training_modules tm ON tm.id = ms.training_module_id
        WHERE ms.id = $1
          AND tm.organization_id = $2
          AND ms.deleted_at IS NULL`,
      [id, organizationId]
    );

    if (songResult.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found.' });
    }

    const songRow = songResult.rows[0];

    await pool.query(`UPDATE training_module_songs SET deleted_at = NOW() WHERE id = $1`, [id]);

    if (songRow.asset_id) {
      await pool.query(
        `UPDATE ai_assets SET deleted_at = NOW(), status = 'deleted', updated_at = NOW()
          WHERE id = $1`,
        [songRow.asset_id]
      );
      await pool.query(`UPDATE qc_tasks SET status = 'completed', completed_at = NOW() WHERE asset_id = $1 AND status = 'pending'`, [songRow.asset_id]);
    } else if (songRow.song_url) {
      const songLibraryRoot = process.env.SONG_LIBRARY_DIR || path.resolve(process.cwd(), 'songs');
      const relative = songRow.song_url.replace('/songs/', '');
      const absolutePath = path.join(songLibraryRoot, relative);
      try {
        await fs.unlink(absolutePath);
      } catch {
        // ignore missing files
      }
    }

    const replacementResult = await pool.query(
      `SELECT song_url, song_style, song_duration_seconds, created_at
         FROM training_module_songs
        WHERE training_module_id = $1
          AND deleted_at IS NULL
          AND status = 'approved'
        ORDER BY created_at DESC
        LIMIT 1`,
      [songRow.training_module_id]
    );

    const replacement = replacementResult.rows[0] || null;

    if (songRow.ai_song_url === songRow.song_url) {
      if (replacement) {
        await pool.query(
          `UPDATE training_modules
              SET ai_song_url = $1,
                  ai_song_duration_seconds = $2,
                  ai_song_style = $3,
                  ai_song_generated_at = $4
            WHERE id = $5`,
          [
            replacement.song_url,
            replacement.song_duration_seconds,
            replacement.song_style,
            replacement.created_at,
            songRow.training_module_id,
          ]
        );
      } else {
        await pool.query(
          `UPDATE training_modules
              SET ai_song_url = NULL,
                  ai_song_duration_seconds = NULL,
                  ai_song_style = NULL,
                  ai_song_generated_at = NULL
            WHERE id = $1`,
          [songRow.training_module_id]
        );
      }
    }

    res.json({ replacement_song: replacement });
  } catch (error: any) {
    console.error('Song deletion error:', error);
    res.status(500).json({ error: error?.message || 'Failed to delete song' });
  }
};
