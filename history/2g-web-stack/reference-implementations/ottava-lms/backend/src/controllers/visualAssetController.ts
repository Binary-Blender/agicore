import { Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { generateVisualPrompt } from '../services/textGenerationProvider';
import { generateImageFromPrompt } from '../services/imageService';
import { submitVideoJob, getVideoJobStatus, downloadVideo } from '../services/akoolService';
import { buildVisualPublicUrl, resolveVisualLibraryDir } from '../utils/visualLibrary';
import { parseSizeDimensions, clampSnippet } from '../utils/visualHelpers';
import { persistVideoFile } from '../utils/videoStorage';

const VISUAL_DIR = resolveVisualLibraryDir();
const VALID_DURATIONS = new Set([5, 10]);
const VALID_RESOLUTIONS = new Set(['720p', '1080p', '4k']);

const mapVisualAssetRow = (row: any) => ({
  id: row.id,
  training_module_id: row.training_module_id,
  training_module_title: row.training_module_title || null,
  asset_type: row.asset_type,
  public_url: row.public_url,
  prompt: row.prompt,
  negative_prompt: row.negative_prompt,
  source_reminder_phrase: row.source_reminder_phrase,
  status: row.status,
  provider: row.provider,
  provider_metadata: row.provider_metadata || {},
  quality_metrics: row.quality_metrics || {},
  duration_seconds: row.duration_seconds,
  width: row.width,
  height: row.height,
  created_at: row.created_at,
  approved_at: row.approved_at,
  qc_status: row.qc_status,
});

export const listVisualAssets = async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'approved', asset_type, training_module_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const clauses = ['va.deleted_at IS NULL'];
    const params: any[] = [];

    if (status && status !== 'all') {
      clauses.push(`va.status = $${params.length + 1}`);
      params.push(status);
    }
    if (asset_type) {
      clauses.push(`va.asset_type = $${params.length + 1}`);
      params.push(asset_type);
    }
    if (training_module_id) {
      clauses.push(`va.training_module_id = $${params.length + 1}`);
      params.push(training_module_id);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM visual_assets va ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT va.*, tm.title AS training_module_title,
              (
                SELECT status
                  FROM visual_asset_qc_tasks
                 WHERE visual_asset_id = va.id
                 ORDER BY created_at DESC
                 LIMIT 1
              ) AS qc_status
         FROM visual_assets va
         LEFT JOIN training_modules tm ON tm.id = va.training_module_id
        ${where}
        ORDER BY va.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      assets: result.rows.map(mapVisualAssetRow),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    console.error('List visual assets error:', error);
    return res.status(500).json({ error: 'Failed to load visual assets.' });
  }
};

export const listPendingVisualAssets = async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT va.*, tm.title AS training_module_title,
              (
                SELECT status
                  FROM visual_asset_qc_tasks
                 WHERE visual_asset_id = va.id
                 ORDER BY created_at DESC
                 LIMIT 1
              ) AS qc_status
         FROM visual_assets va
         LEFT JOIN training_modules tm ON tm.id = va.training_module_id
        WHERE va.status = 'pending' AND va.deleted_at IS NULL
        ORDER BY va.created_at ASC`
    );

    return res.json({
      assets: result.rows.map(mapVisualAssetRow),
    });
  } catch (error: any) {
    console.error('List pending visual assets error:', error);
    return res.status(500).json({ error: 'Failed to load pending visual assets.' });
  }
};

export const generateImageAsset = async (req: AuthRequest, res: Response) => {
  try {
    const {
      training_module_id,
      reminder_phrase,
      prompt: promptOverride,
      negative_prompt,
      size,
      quality,
      style,
    } = req.body || {};

    if (!training_module_id) {
      return res.status(400).json({ error: 'training_module_id is required' });
    }
    if (!reminder_phrase || !reminder_phrase.trim()) {
      return res.status(400).json({ error: 'reminder_phrase is required' });
    }

    const moduleResult = await pool.query(
      `SELECT id, title, policy_summary_text, ai_song_lyrics
         FROM training_modules
        WHERE id = $1`,
      [training_module_id]
    );
    if (moduleResult.rowCount === 0) {
      return res.status(404).json({ error: 'Training module not found' });
    }
    const module = moduleResult.rows[0];

    let promptText = promptOverride ? `${promptOverride}`.trim() : '';
    let storedPromptLogId: string | null = null;
    let generatedNegativePrompt = negative_prompt ? `${negative_prompt}`.trim() : '';

    if (!promptText) {
      const promptResult = await generateVisualPrompt({
        reminderPhrase: reminder_phrase,
        policySnippet: clampSnippet(module.policy_summary_text, 1500),
        lyricsSnippet: clampSnippet(module.ai_song_lyrics, 1200),
      });
      promptText = promptResult.prompt;
      generatedNegativePrompt = generatedNegativePrompt || promptResult.negativePrompt;

      const logInsert = await pool.query(
        `INSERT INTO prompt_generation_logs (
           training_module_id,
           reminder_phrase,
           policy_snippet,
           lyrics_snippet,
           generated_prompt,
           model_used
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          training_module_id,
          reminder_phrase,
          promptResult.policySnippet,
          promptResult.lyricsSnippet,
          promptResult.prompt,
          process.env.OPENAI_MODEL || 'gpt-4o-mini',
        ]
      );
      storedPromptLogId = logInsert.rows[0]?.id || null;
    }

    const startTime = Date.now();
    const imageResult = await generateImageFromPrompt({
      prompt: promptText,
      negativePrompt: generatedNegativePrompt,
      size,
      quality,
      style,
      user: req.user?.email || 'system',
    });
    const generationMs = Date.now() - startTime;

    const folder = training_module_id || 'shared';
    const safeFolder = folder || 'shared';
    const moduleDir = path.join(VISUAL_DIR, safeFolder);
    await fs.mkdir(moduleDir, { recursive: true });
    const filename = `${Date.now()}_${uuidv4()}.png`;
    const targetPath = path.join(moduleDir, filename);
    await fs.writeFile(targetPath, imageResult.buffer);

    const publicUrl = buildVisualPublicUrl(safeFolder, filename);

    const dimensions = parseSizeDimensions(size);

    const assetInsert = await pool.query(
      `INSERT INTO visual_assets (
         training_module_id,
         asset_type,
         public_url,
         storage_path,
         file_size_bytes,
         mime_type,
         prompt,
         negative_prompt,
         original_prompt,
         provider,
         provider_metadata,
         quality_metrics,
         source_reminder_phrase,
         status,
         width,
         height,
         created_by
       ) VALUES (
         $1, 'image', $2, $3, $4, $5, $6, $7, $8,
         $9, $10::jsonb, $11::jsonb, $12, 'pending', $13, $14, $15
       )
       RETURNING *`,
      [
        training_module_id,
        publicUrl,
        targetPath,
        imageResult.buffer.length,
        imageResult.mimeType,
        promptText,
        generatedNegativePrompt || null,
        promptOverride || promptText,
        'openai_images',
        JSON.stringify(imageResult.providerMetadata),
        JSON.stringify({
          generation_time_ms: generationMs,
          model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
        }),
        reminder_phrase,
        dimensions.width,
        dimensions.height,
        req.user?.email || null,
      ]
    );

    const assetRow = assetInsert.rows[0];
    await pool.query(`INSERT INTO visual_asset_qc_tasks (visual_asset_id) VALUES ($1)`, [assetRow.id]);

    return res.status(201).json({
      asset: mapVisualAssetRow({ ...assetRow, qc_status: 'pending' }),
      prompt_log_id: storedPromptLogId,
    });
  } catch (error: any) {
    console.error('Visual image generation error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate visual asset.' });
  }
};

export const approveVisualAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reviewer = req.user?.email || null;

    const assetResult = await pool.query(
      `UPDATE visual_assets
          SET status = 'approved',
              approved_at = NOW(),
              updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
      [id]
    );

    if (assetResult.rowCount === 0) {
      return res.status(404).json({ error: 'Visual asset not found.' });
    }

    await pool.query(
      `UPDATE visual_asset_qc_tasks
          SET status = 'completed',
              decision = 'approve',
              reviewer_email = $1,
              completed_at = NOW()
        WHERE visual_asset_id = $2 AND status = 'pending'`,
      [reviewer, id]
    );

    return res.json({ asset: mapVisualAssetRow(assetResult.rows[0]) });
  } catch (error: any) {
    console.error('Approve visual asset error:', error);
    return res.status(500).json({ error: 'Failed to approve asset.' });
  }
};

export const rejectVisualAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reviewer = req.user?.email || null;

    const assetResult = await pool.query(
      `UPDATE visual_assets
          SET status = 'rejected',
              deleted_at = NOW(),
              updated_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *`,
      [id]
    );

    if (assetResult.rowCount === 0) {
      return res.status(404).json({ error: 'Visual asset not found.' });
    }

    await pool.query(
      `UPDATE visual_asset_qc_tasks
          SET status = 'completed',
              decision = 'reject',
              reviewer_email = $1,
              completed_at = NOW()
        WHERE visual_asset_id = $2 AND status = 'pending'`,
      [reviewer, id]
    );

    return res.json({ asset: mapVisualAssetRow(assetResult.rows[0]) });
  } catch (error: any) {
    console.error('Reject visual asset error:', error);
    return res.status(500).json({ error: 'Failed to reject asset.' });
  }
};

export const updateVisualAssetRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { training_module_id, title, description, style, duration_seconds } = req.body || {};

    const existingResult = await pool.query(
      `SELECT * FROM visual_assets WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ error: 'Visual asset not found.' });
    }
    const existing = existingResult.rows[0];

    const assignments: string[] = [];
    const params: any[] = [];
    const push = (column: string, value: any) => {
      assignments.push(`${column} = $${params.length + 1}`);
      params.push(value);
    };

    if (training_module_id !== undefined) {
      push('training_module_id', training_module_id || null);
    }
    if (title !== undefined) {
      push('title', title?.trim() ? title.trim() : null);
    }
    if (description !== undefined) {
      push('description', description?.trim() ? description.trim() : null);
    }
    if (style !== undefined) {
      push('style', style?.trim() ? style.trim() : null);
    }
    if (duration_seconds !== undefined) {
      const normalized =
        duration_seconds === null || duration_seconds === ''
          ? null
          : Number(duration_seconds) || null;
      push('duration_seconds', normalized);
    }

    if (!assignments.length) {
      return res.json({ asset: mapVisualAssetRow(existing) });
    }

    const query = `
      UPDATE visual_assets
         SET ${assignments.join(', ')},
             updated_at = NOW()
       WHERE id = $${params.length + 1}
       RETURNING *`;
    params.push(id);
    const updateResult = await pool.query(query, params);
    const updated = updateResult.rows[0];

    if (existing.training_module_id && existing.training_module_id !== updated.training_module_id) {
      await pool.query(
        `UPDATE visual_asset_qc_tasks
            SET notes = COALESCE(notes, '') || '\nReassigned to new module.'
          WHERE visual_asset_id = $1
            AND status = 'pending'`,
        [id]
      );
    }

    return res.json({ asset: mapVisualAssetRow(updated) });
  } catch (error: any) {
    console.error('Update visual asset error:', error);
    return res.status(500).json({ error: 'Failed to update visual asset.' });
  }
};

export const deleteVisualAssetRecord = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const assetResult = await pool.query(
      `SELECT * FROM visual_assets WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (assetResult.rowCount === 0) {
      return res.status(404).json({ error: 'Visual asset not found.' });
    }

    const asset = assetResult.rows[0];

    await pool.query(
      `UPDATE visual_assets
          SET status = 'deleted',
              deleted_at = NOW(),
              updated_at = NOW()
        WHERE id = $1`,
      [id]
    );

    await pool.query(
      `UPDATE visual_asset_qc_tasks
          SET status = 'dismissed',
              completed_at = NOW()
        WHERE visual_asset_id = $1
          AND status = 'pending'`,
      [id]
    );

    if (asset.storage_path) {
      try {
        await fs.unlink(asset.storage_path);
      } catch (error) {
        console.warn('[visuals] Unable to delete file:', asset.storage_path, error);
      }
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Delete visual asset error:', error);
    return res.status(500).json({ error: 'Failed to delete visual asset.' });
  }
};

const buildAbsoluteAssetUrl = (relativeUrl: string) => {
  const base =
    process.env.VISUAL_ASSET_BASE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.MELODY_PUBLIC_URL ||
    '';
  if (!base) return relativeUrl;
  return `${base.replace(/\/$/, '')}${relativeUrl}`;
};

export const createVideoFromImage = async (req: AuthRequest, res: Response) => {
  try {
    const { source_image_id, animation_prompt, duration, resolution } = req.body || {};

    if (!source_image_id) {
      return res.status(400).json({ error: 'source_image_id is required.' });
    }
    if (!animation_prompt || !animation_prompt.trim()) {
      return res.status(400).json({ error: 'animation_prompt is required.' });
    }
    if (!VALID_DURATIONS.has(Number(duration))) {
      return res.status(400).json({ error: 'duration must be 5 or 10 seconds.' });
    }
    if (!VALID_RESOLUTIONS.has(resolution)) {
      return res
        .status(400)
        .json({ error: 'resolution must be one of 720p, 1080p, or 4k.' });
    }

    const imageResult = await pool.query(
      `SELECT *
         FROM visual_assets
        WHERE id = $1
          AND asset_type = 'image'
          AND status = 'approved'
          AND deleted_at IS NULL`,
      [source_image_id]
    );

    if (imageResult.rowCount === 0) {
      return res.status(404).json({ error: 'Approved source image not found.' });
    }

    const imageAsset = imageResult.rows[0];
    const absoluteImageUrl = buildAbsoluteAssetUrl(imageAsset.public_url);

    const jobResponse = await submitVideoJob({
      image_url: absoluteImageUrl,
      prompt: animation_prompt.trim(),
      duration: Number(duration),
      resolution,
    });

    const providerMetadata = {
      job_id: jobResponse.job_id,
      duration: Number(duration),
      resolution,
      prompt: animation_prompt.trim(),
    };

    const insertResult = await pool.query(
      `INSERT INTO visual_assets (
         training_module_id,
         asset_type,
         public_url,
         storage_path,
         file_size_bytes,
         mime_type,
         prompt,
         provider,
         provider_metadata,
         quality_metrics,
         source_reminder_phrase,
         status,
         created_by,
         job_id,
         parent_asset_id
       ) VALUES (
         $1,
         'video',
         NULL,
         NULL,
         NULL,
         'video/mp4',
         $2,
         'akool_video',
         $3::jsonb,
         $4::jsonb,
         $5,
         'processing',
         $6,
         $7,
         $8
       )
       RETURNING *`,
      [
        imageAsset.training_module_id,
        animation_prompt.trim(),
        JSON.stringify(providerMetadata),
        JSON.stringify({ resolution, duration: Number(duration) }),
        imageAsset.source_reminder_phrase || null,
        req.user?.email || null,
        jobResponse.job_id,
        imageAsset.id,
      ]
    );

    const newAsset = insertResult.rows[0];

    return res.status(202).json({
      job_id: jobResponse.job_id,
      visual_asset_id: newAsset.id,
      status: 'processing',
    });
  } catch (error: any) {
    console.error('Create video from image error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to submit video job.' });
  }
};

const finalizeVideoAsset = async (asset: any, videoUrl: string) => {
  const download = await downloadVideo(videoUrl);
  const saved = await persistVideoFile(
    asset.training_module_id,
    download.buffer,
    download.contentType.includes('webm')
      ? '.webm'
      : download.contentType.includes('mov')
      ? '.mov'
      : '.mp4'
  );

  const providerMetadata = {
    ...(asset.provider_metadata || {}),
    job_status: 'completed',
    remote_video_url: videoUrl,
  };

  const updateResult = await pool.query(
    `UPDATE visual_assets
        SET status = 'pending',
            public_url = $1,
            storage_path = $2,
            file_size_bytes = $3,
            mime_type = $4,
            provider_metadata = $5::jsonb,
            updated_at = NOW()
      WHERE id = $6
      RETURNING *`,
    [
      saved.publicUrl,
      saved.storagePath,
      saved.fileSize,
      download.contentType || 'video/mp4',
      JSON.stringify(providerMetadata),
      asset.id,
    ]
  );

  await pool.query(`INSERT INTO visual_asset_qc_tasks (visual_asset_id) VALUES ($1)`, [asset.id]);
  return updateResult.rows[0];
};

export const getVideoGenerationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const assetResult = await pool.query(
      `SELECT *
         FROM visual_assets
        WHERE id = $1
          AND asset_type = 'video'`,
      [id]
    );

    if (assetResult.rowCount === 0) {
      return res.status(404).json({ error: 'Video asset not found.' });
    }

    const asset = assetResult.rows[0];
    if (!asset.job_id) {
      return res.status(400).json({ error: 'Video asset has no associated job.' });
    }

    if (asset.status === 'pending' || asset.status === 'approved') {
      return res.json({
        status: asset.status === 'approved' ? 'completed' : 'pending',
        visual_asset: mapVisualAssetRow(asset),
      });
    }

    const jobStatus = await getVideoJobStatus(asset.job_id);

    if (jobStatus.status === 'completed' && jobStatus.video_url) {
      const updated = await finalizeVideoAsset(asset, jobStatus.video_url);
      return res.json({
        status: 'completed',
        visual_asset: mapVisualAssetRow(updated),
      });
    }

    if (jobStatus.status === 'failed') {
      const providerMetadata = {
        ...(asset.provider_metadata || {}),
        job_status: 'failed',
        error: jobStatus.error || 'Unknown error',
      };
      const updateResult = await pool.query(
        `UPDATE visual_assets
            SET status = 'failed',
                provider_metadata = $1::jsonb,
                updated_at = NOW()
          WHERE id = $2
          RETURNING *`,
        [JSON.stringify(providerMetadata), asset.id]
      );

      return res.json({
        status: 'failed',
        error: jobStatus.error || 'Video generation failed',
        visual_asset: mapVisualAssetRow(updateResult.rows[0]),
      });
    }

    return res.json({
      status: jobStatus.status,
      progress_percent: jobStatus.progress_percent,
      visual_asset: mapVisualAssetRow(asset),
    });
  } catch (error: any) {
    console.error('Video generation status error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to fetch video generation status.',
    });
  }
};
