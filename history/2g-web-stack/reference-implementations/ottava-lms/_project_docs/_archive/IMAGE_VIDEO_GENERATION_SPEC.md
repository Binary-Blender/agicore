# Image and Video Generation Feature Specification
## MelodyLMS AI Studio Enhancement

**Created:** November 16, 2025
**Status:** Planning
**Priority:** High

---

## Executive Summary

This document specifies the implementation of two new AI Studio features:
1. **Image Generation** - Generate images tied to reminder phrases for visual reinforcement
2. **Image-to-Video** - Convert generated images into animated videos

The core innovation is **contextual prompt generation**: When a user selects a reminder phrase, the system analyzes the policy text and song lyrics to generate an intelligent image prompt that visually reinforces the training concept.

---

## Feature Overview

### User Workflow

```
Policy Upload → Lyrics Generation → Reminder Phrases
                                          ↓
                              [User clicks phrase]
                                          ↓
                              AI Generates Image Prompt
                              (using policy + lyrics context)
                                          ↓
                              [User adjusts prompt]
                                          ↓
                              [User clicks "Generate"]
                                          ↓
                              Image Created & Stored
                                          ↓
                              [User clicks "Create Video"]
                                          ↓
                              Video Generated from Image
```

### Asset Lineage Tracking

```
reminder_phrase → image_asset → video_asset
      ↓                ↓              ↓
  "Always lock        Image of      5-second
   your screen"       locked PC     animation
```

---

## Database Schema

### New Tables

#### 1. `visual_assets` - Central Asset Repository
```sql
CREATE TABLE visual_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID REFERENCES training_modules(id),
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('image', 'video')),

    -- Content & Storage
    public_url TEXT NOT NULL,
    storage_path TEXT,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),

    -- Generation Context
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    original_prompt TEXT,  -- AI-generated before user adjustments

    -- Provider Tracking (from ai-workflow-spc patterns)
    provider VARCHAR(50) NOT NULL,  -- 'openai_dalle', 'akool', 'akool_video'
    provider_metadata JSONB DEFAULT '{}',
    -- Example: {"size": "1024x1024", "quality": "standard", "style": "vivid"}

    -- Quality Metrics
    quality_metrics JSONB DEFAULT '{}',
    -- Example: {"generation_time_ms": 15000, "cost_usd": 0.04}

    -- Lineage (critical for tracking relationships)
    source_reminder_phrase TEXT,  -- The reminder phrase this visualizes
    source_image_id UUID REFERENCES visual_assets(id),  -- For videos: which image

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deleted')),

    -- Metadata
    duration_seconds INTEGER,  -- For videos
    width INTEGER,
    height INTEGER,

    -- Audit
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Soft delete
    INDEX idx_visual_assets_module (training_module_id),
    INDEX idx_visual_assets_status (status),
    INDEX idx_visual_assets_type (asset_type),
    INDEX idx_visual_assets_source (source_image_id)
);
```

#### 2. `visual_asset_qc_tasks` - QC Workflow
```sql
CREATE TABLE visual_asset_qc_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visual_asset_id UUID NOT NULL REFERENCES visual_assets(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
    reviewer_email VARCHAR(255),
    decision VARCHAR(20) CHECK (decision IN ('approve', 'reject')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    INDEX idx_qc_tasks_status (status)
);
```

#### 3. `prompt_generation_logs` - AI Prompt History
```sql
CREATE TABLE prompt_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID REFERENCES training_modules(id),
    reminder_phrase TEXT NOT NULL,

    -- Context used
    policy_snippet TEXT,  -- Relevant policy text extracted
    lyrics_snippet TEXT,  -- Relevant lyrics extracted

    -- Generated prompt
    generated_prompt TEXT NOT NULL,
    user_modified_prompt TEXT,

    -- Metadata
    model_used VARCHAR(50) DEFAULT 'gpt-4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Schema Migration File

Create: `backend/migrations/021_add_visual_assets.sql`

```sql
-- Migration: Add visual asset generation support
-- Created: 2025-11-16

BEGIN;

-- 1. Create visual_assets table
CREATE TABLE IF NOT EXISTS visual_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    asset_type VARCHAR(20) NOT NULL,
    public_url TEXT NOT NULL,
    storage_path TEXT,
    file_size_bytes INTEGER,
    mime_type VARCHAR(100),
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    original_prompt TEXT,
    provider VARCHAR(50) NOT NULL,
    provider_metadata JSONB DEFAULT '{}',
    quality_metrics JSONB DEFAULT '{}',
    source_reminder_phrase TEXT,
    source_image_id UUID REFERENCES visual_assets(id),
    status VARCHAR(20) DEFAULT 'pending',
    duration_seconds INTEGER,
    width INTEGER,
    height INTEGER,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT visual_assets_type_check
        CHECK (asset_type IN ('image', 'video')),
    CONSTRAINT visual_assets_status_check
        CHECK (status IN ('pending', 'approved', 'rejected', 'deleted'))
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_visual_assets_module
    ON visual_assets(training_module_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_status
    ON visual_assets(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visual_assets_type
    ON visual_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_visual_assets_source
    ON visual_assets(source_image_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_phrase
    ON visual_assets(source_reminder_phrase);

-- 3. Create QC tasks table
CREATE TABLE IF NOT EXISTS visual_asset_qc_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visual_asset_id UUID NOT NULL REFERENCES visual_assets(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    reviewer_email VARCHAR(255),
    decision VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT qc_tasks_status_check
        CHECK (status IN ('pending', 'completed', 'dismissed')),
    CONSTRAINT qc_tasks_decision_check
        CHECK (decision IN ('approve', 'reject') OR decision IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_visual_qc_status
    ON visual_asset_qc_tasks(status);

-- 4. Create prompt generation logs
CREATE TABLE IF NOT EXISTS prompt_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
    reminder_phrase TEXT NOT NULL,
    policy_snippet TEXT,
    lyrics_snippet TEXT,
    generated_prompt TEXT NOT NULL,
    user_modified_prompt TEXT,
    model_used VARCHAR(50) DEFAULT 'gpt-4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_logs_module
    ON prompt_generation_logs(training_module_id);

COMMIT;
```

---

## Backend API Specification

### New Endpoints

#### 1. Generate Image Prompt from Reminder Phrase
```
POST /api/ai/image-prompt
Authorization: Bearer <token>
Role: admin, manager
```

**Request:**
```json
{
  "training_module_id": "uuid",
  "reminder_phrase": "Always lock your workstation when stepping away",
  "policy_text": "Optional: specific policy section to consider",
  "lyrics": "Optional: specific lyrics to consider"
}
```

**Response:**
```json
{
  "generated_prompt": "Professional office environment, computer monitor displaying lock screen with security shield icon, clean modern desk, soft natural lighting, corporate training visual style, 16:9 aspect ratio",
  "context_used": {
    "policy_keywords": ["security", "workstation", "unauthorized access"],
    "lyrics_keywords": ["lock it up", "keep it safe"],
    "emphasis": "physical security and data protection"
  },
  "suggestions": [
    "Add specific industry context (healthcare, finance, etc.)",
    "Specify color scheme to match brand",
    "Consider adding human element showing correct behavior"
  ]
}
```

**Implementation Pattern (from ai-workflow-spc):**
```javascript
// Use OpenAI to generate contextual prompt
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {
      role: "system",
      content: `You are an expert at creating image generation prompts for corporate training materials.
      Generate a detailed, professional image prompt that visually reinforces the training concept.
      Focus on: clarity, professionalism, appropriate workplace context, educational value.
      Always specify: style, lighting, composition, and aspect ratio.`
    },
    {
      role: "user",
      content: `Create an image prompt for this training reminder phrase: "${reminder_phrase}"

      Policy Context: ${policy_text}
      Song Lyrics Context: ${lyrics}

      The image should visually reinforce this compliance concept.`
    }
  ]
});
```

#### 2. Generate Image
```
POST /api/ai/visual/image
Authorization: Bearer <token>
Role: admin, manager
```

**Request:**
```json
{
  "training_module_id": "uuid",
  "prompt": "User's final prompt (may be modified from AI suggestion)",
  "original_prompt": "AI-generated prompt before modifications",
  "source_reminder_phrase": "Always lock your workstation",
  "provider": "openai_dalle",  // or "akool"
  "config": {
    "size": "1024x1024",      // DALL-E: 1024x1024, 1792x1024, 1024x1792
    "quality": "standard",     // "standard" or "hd"
    "style": "vivid",          // "vivid" or "natural"
    "num_images": 1            // Akool can do 1-4
  },
  "auto_approve": false  // If true, skip QC queue
}
```

**Response:**
```json
{
  "asset": {
    "id": "uuid",
    "asset_type": "image",
    "public_url": "https://...",
    "prompt": "...",
    "provider": "openai_dalle",
    "provider_metadata": {
      "size": "1024x1024",
      "quality": "standard",
      "style": "vivid",
      "revised_prompt": "DALL-E's internal revision (if applicable)"
    },
    "quality_metrics": {
      "generation_time_ms": 12500,
      "cost_usd": 0.04
    },
    "source_reminder_phrase": "Always lock your workstation",
    "status": "pending",
    "created_at": "2025-11-16T..."
  },
  "qc_task": {
    "id": "uuid",
    "status": "pending"
  }
}
```

**Provider Implementation:**

```javascript
// DALL-E 3 Pattern (from ai-workflow-spc)
async function generateWithDalle(prompt, config) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    size: config.size || "1024x1024",
    quality: config.quality || "standard",
    style: config.style || "vivid",
    n: 1  // DALL-E 3 only supports 1
  });

  return {
    url: response.data[0].url,
    revised_prompt: response.data[0].revised_prompt
  };
}

// Akool Pattern (from ai-workflow-spc)
async function generateWithAkool(prompt, config) {
  // 1. Submit generation request
  const submitResponse = await axios.post(
    'https://openapi.akool.com/api/open/v3/content/image/createbyprompt',
    {
      prompt: prompt,
      scale: config.aspect_ratio || "1:1",  // 1:1, 4:3, 16:9, etc.
      num_images: config.num_images || 4
    },
    {
      headers: { 'x-api-key': process.env.AKOOL_API_KEY }
    }
  );

  const taskId = submitResponse.data.data._id;

  // 2. Poll for completion (max 60 seconds)
  for (let attempt = 0; attempt < 30; attempt++) {
    await sleep(2000);

    const pollResponse = await axios.get(
      `https://openapi.akool.com/api/open/v3/content/image/infobymodelid?image_model_id=${taskId}`,
      { headers: { 'x-api-key': process.env.AKOOL_API_KEY } }
    );

    if (pollResponse.data.data.image_status === 3) {
      return pollResponse.data.data.upscaled_urls;
    }

    if (pollResponse.data.data.image_status === 4) {
      throw new Error('Image generation failed: ' + pollResponse.data.data.error_reasons);
    }
  }

  throw new Error('Image generation timed out after 60 seconds');
}
```

#### 3. Generate Video from Image
```
POST /api/ai/visual/video
Authorization: Bearer <token>
Role: admin, manager
```

**Request:**
```json
{
  "source_image_id": "uuid",  // Reference to visual_assets.id
  "prompt": "Camera slowly pans across the scene, gentle motion",
  "config": {
    "resolution": "720p",      // "720p", "1080p", "4k"
    "video_length": 5,         // 5 or 10 seconds
    "audio_type": 3,           // 1=AI audio, 2=custom, 3=none
    "audio_url": "",           // If audio_type=2
    "extend_prompt": false     // Let Akool enhance prompt
  },
  "auto_approve": false
}
```

**Response:**
```json
{
  "asset": {
    "id": "uuid",
    "asset_type": "video",
    "public_url": "https://...",
    "prompt": "...",
    "source_image_id": "uuid",
    "source_reminder_phrase": "Always lock your workstation",  // Inherited from image
    "provider": "akool_video",
    "provider_metadata": {
      "resolution": "720p",
      "video_length": 5,
      "source_image_url": "https://..."
    },
    "quality_metrics": {
      "generation_time_ms": 45000,
      "cost_usd": 1.50
    },
    "duration_seconds": 5,
    "status": "pending",
    "created_at": "2025-11-16T..."
  },
  "qc_task": {...}
}
```

**Akool Image-to-Video Implementation:**

```javascript
async function generateVideoFromImage(imageUrl, prompt, config) {
  // 1. Submit video generation request
  const submitResponse = await axios.post(
    'https://openapi.akool.com/api/open/v4/image2Video/createBySourcePrompt',
    {
      image_url: imageUrl,
      prompt: prompt,
      negative_prompt: config.negative_prompt || "",
      resolution: config.resolution || "720p",
      video_length: config.video_length || 5,
      extend_prompt: config.extend_prompt || false,
      audio_type: config.audio_type || 3,
      audio_url: config.audio_url || "",
      is_premium_model: false,
      webhookurl: ""
    },
    {
      headers: { 'x-api-key': process.env.AKOOL_API_KEY }
    }
  );

  const taskId = submitResponse.data.data._id;

  // 2. Poll for completion (max 6 minutes for video)
  for (let attempt = 0; attempt < 120; attempt++) {
    await sleep(3000);

    const pollResponse = await axios.post(
      'https://openapi.akool.com/api/open/v4/image2Video/resultsByIds',
      { _ids: taskId },
      { headers: { 'x-api-key': process.env.AKOOL_API_KEY } }
    );

    const result = pollResponse.data.data[0];

    if (result.status === 3) {
      return result.video_url;
    }

    if (result.status === 4) {
      throw new Error('Video generation failed');
    }
  }

  throw new Error('Video generation timed out after 6 minutes');
}
```

#### 4. List Visual Assets
```
GET /api/ai/visual/assets?training_module_id=uuid&asset_type=image&status=approved
Authorization: Bearer <token>
```

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "asset_type": "image",
      "public_url": "...",
      "prompt": "...",
      "source_reminder_phrase": "...",
      "status": "approved",
      "provider": "openai_dalle",
      "created_at": "...",
      "videos": [  // Nested videos created from this image
        {
          "id": "uuid",
          "public_url": "...",
          "status": "pending"
        }
      ]
    }
  ]
}
```

#### 5. Approve/Reject Visual Asset
```
POST /api/ai/visual/assets/:id/approve
POST /api/ai/visual/assets/:id/reject
Authorization: Bearer <token>
Role: admin, manager
```

**Request (reject only):**
```json
{
  "reason": "Image quality too low for professional training"
}
```

#### 6. Delete Visual Asset
```
DELETE /api/ai/visual/assets/:id
Authorization: Bearer <token>
Role: admin, manager
```

---

## Backend Controller Implementation

### File: `backend/src/controllers/visualAssetController.ts`

```typescript
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';
import OpenAI from 'openai';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: Generate contextual image prompt
export const generateImagePrompt = async (req: AuthRequest, res: Response) => {
  try {
    const { training_module_id, reminder_phrase, policy_text, lyrics } = req.body;

    if (!reminder_phrase) {
      return res.status(400).json({ error: 'Reminder phrase is required' });
    }

    // Fetch module context if not provided
    let policyContext = policy_text;
    let lyricsContext = lyrics;

    if (training_module_id && (!policyContext || !lyricsContext)) {
      const moduleResult = await pool.query(
        `SELECT policy_summary, ai_lyrics FROM training_modules WHERE id = $1`,
        [training_module_id]
      );
      if (moduleResult.rows[0]) {
        policyContext = policyContext || moduleResult.rows[0].policy_summary || '';
        lyricsContext = lyricsContext || moduleResult.rows[0].ai_lyrics || '';
      }
    }

    // Generate prompt using GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating image generation prompts for corporate compliance training materials.
Generate a detailed, professional image prompt that visually reinforces the training concept.
Focus on: clarity, professionalism, appropriate workplace context, educational value.
Always include: visual style (photorealistic/illustration), lighting, composition, colors, and suggested aspect ratio.
Keep prompts under 200 words but very descriptive.`
        },
        {
          role: 'user',
          content: `Create an image generation prompt for this compliance training reminder phrase:

REMINDER PHRASE: "${reminder_phrase}"

POLICY CONTEXT:
${policyContext ? policyContext.substring(0, 1000) : 'No specific policy context provided'}

SONG LYRICS CONTEXT:
${lyricsContext ? lyricsContext.substring(0, 500) : 'No lyrics context provided'}

Generate a prompt that creates a professional training visual that reinforces this compliance concept.
The image should be appropriate for corporate training materials.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const generatedPrompt = completion.choices[0]?.message?.content || '';

    // Log the generation
    await pool.query(
      `INSERT INTO prompt_generation_logs (
        training_module_id, reminder_phrase, policy_snippet, lyrics_snippet,
        generated_prompt, model_used
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        training_module_id || null,
        reminder_phrase,
        policyContext?.substring(0, 2000) || null,
        lyricsContext?.substring(0, 1000) || null,
        generatedPrompt,
        'gpt-4'
      ]
    );

    return res.json({
      generated_prompt: generatedPrompt,
      context_used: {
        policy_available: !!policyContext,
        lyrics_available: !!lyricsContext,
        reminder_phrase: reminder_phrase
      },
      suggestions: [
        'Adjust the style to match your organization\'s brand guidelines',
        'Consider adding industry-specific context',
        'Specify any required brand colors or logos'
      ]
    });
  } catch (error: any) {
    console.error('Generate image prompt error:', error);
    return res.status(500).json({ error: 'Failed to generate image prompt' });
  }
};

// Helper: Download and save image
const saveImageLocally = async (
  imageUrl: string,
  moduleId: string,
  assetId: string
): Promise<{ localPath: string; publicUrl: string }> => {
  const assetsDir = process.env.VISUAL_ASSETS_DIR || path.resolve(process.cwd(), 'visual_assets');
  const moduleDir = path.join(assetsDir, moduleId);
  await fs.mkdir(moduleDir, { recursive: true });

  const filename = `${assetId}.png`;
  const localPath = path.join(moduleDir, filename);

  // Download image
  const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  await fs.writeFile(localPath, response.data);

  const publicUrl = `/visual_assets/${moduleId}/${filename}`;
  return { localPath, publicUrl };
};

// Generate image with DALL-E or Akool
export const generateImage = async (req: AuthRequest, res: Response) => {
  try {
    const {
      training_module_id,
      prompt,
      original_prompt,
      source_reminder_phrase,
      provider = 'openai_dalle',
      config = {},
      auto_approve = false
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const startTime = Date.now();
    let imageUrl: string;
    let providerMetadata: any = {};

    if (provider === 'openai_dalle') {
      // DALL-E 3 generation
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        size: (config.size as any) || '1024x1024',
        quality: (config.quality as any) || 'standard',
        style: (config.style as any) || 'vivid',
        n: 1
      });

      imageUrl = response.data[0].url!;
      providerMetadata = {
        size: config.size || '1024x1024',
        quality: config.quality || 'standard',
        style: config.style || 'vivid',
        revised_prompt: response.data[0].revised_prompt
      };
    } else if (provider === 'akool') {
      // Akool generation - implementation would go here
      // Following the pattern from ai-workflow-spc
      throw new Error('Akool provider not yet implemented');
    } else {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const generationTime = Date.now() - startTime;

    // Create asset record
    const assetId = uuidv4();
    const status = auto_approve ? 'approved' : 'pending';

    // Save image locally (optional - can also just store external URL)
    let finalUrl = imageUrl;
    let storagePath = null;
    if (training_module_id && process.env.SAVE_IMAGES_LOCALLY === 'true') {
      const saved = await saveImageLocally(imageUrl, training_module_id, assetId);
      finalUrl = saved.publicUrl;
      storagePath = saved.localPath;
    }

    const assetResult = await pool.query(
      `INSERT INTO visual_assets (
        id, training_module_id, asset_type, public_url, storage_path,
        prompt, original_prompt, provider, provider_metadata, quality_metrics,
        source_reminder_phrase, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13)
      RETURNING *`,
      [
        assetId,
        training_module_id || null,
        'image',
        finalUrl,
        storagePath,
        prompt,
        original_prompt || null,
        provider,
        JSON.stringify(providerMetadata),
        JSON.stringify({
          generation_time_ms: generationTime,
          cost_usd: provider === 'openai_dalle' ? 0.04 : 0.05 // Estimated costs
        }),
        source_reminder_phrase || null,
        status,
        req.user?.email || null
      ]
    );

    // Create QC task if not auto-approved
    let qcTask = null;
    if (!auto_approve) {
      const qcResult = await pool.query(
        `INSERT INTO visual_asset_qc_tasks (visual_asset_id) VALUES ($1) RETURNING *`,
        [assetId]
      );
      qcTask = qcResult.rows[0];
    }

    return res.json({
      asset: assetResult.rows[0],
      qc_task: qcTask
    });
  } catch (error: any) {
    console.error('Generate image error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
};

// Generate video from image (Akool)
export const generateVideo = async (req: AuthRequest, res: Response) => {
  try {
    const { source_image_id, prompt, config = {}, auto_approve = false } = req.body;

    if (!source_image_id || !prompt) {
      return res.status(400).json({ error: 'Source image ID and prompt are required' });
    }

    // Fetch source image
    const imageResult = await pool.query(
      `SELECT * FROM visual_assets WHERE id = $1 AND asset_type = 'image' AND deleted_at IS NULL`,
      [source_image_id]
    );

    if (imageResult.rowCount === 0) {
      return res.status(404).json({ error: 'Source image not found' });
    }

    const sourceImage = imageResult.rows[0];
    const startTime = Date.now();

    // For now, return a placeholder - actual Akool integration would go here
    // Following the pattern from ai-workflow-spc mcp_akool_video_module.py

    // 1. Submit to Akool
    // 2. Poll for completion (up to 6 minutes)
    // 3. Get video URL

    // Placeholder response for documentation
    const videoUrl = `https://placeholder-video-url.com/video_${uuidv4()}.mp4`;
    const generationTime = 45000; // Typical video generation time

    const assetId = uuidv4();
    const status = auto_approve ? 'approved' : 'pending';

    const assetResult = await pool.query(
      `INSERT INTO visual_assets (
        id, training_module_id, asset_type, public_url,
        prompt, provider, provider_metadata, quality_metrics,
        source_reminder_phrase, source_image_id, status,
        duration_seconds, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        assetId,
        sourceImage.training_module_id,
        'video',
        videoUrl,
        prompt,
        'akool_video',
        JSON.stringify({
          resolution: config.resolution || '720p',
          video_length: config.video_length || 5,
          source_image_url: sourceImage.public_url,
          audio_type: config.audio_type || 3
        }),
        JSON.stringify({
          generation_time_ms: generationTime,
          cost_usd: 1.50 // Estimated cost for video
        }),
        sourceImage.source_reminder_phrase, // Inherit from image
        source_image_id,
        status,
        config.video_length || 5,
        req.user?.email || null
      ]
    );

    let qcTask = null;
    if (!auto_approve) {
      const qcResult = await pool.query(
        `INSERT INTO visual_asset_qc_tasks (visual_asset_id) VALUES ($1) RETURNING *`,
        [assetId]
      );
      qcTask = qcResult.rows[0];
    }

    return res.json({
      asset: assetResult.rows[0],
      qc_task: qcTask
    });
  } catch (error: any) {
    console.error('Generate video error:', error);
    return res.status(500).json({ error: 'Failed to generate video' });
  }
};

// List visual assets
export const listVisualAssets = async (req: AuthRequest, res: Response) => {
  try {
    const { training_module_id, asset_type, status } = req.query;

    const conditions: string[] = ['va.deleted_at IS NULL'];
    const params: any[] = [];

    if (training_module_id) {
      params.push(training_module_id);
      conditions.push(`va.training_module_id = $${params.length}`);
    }

    if (asset_type) {
      params.push(asset_type);
      conditions.push(`va.asset_type = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`va.status = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT va.*,
              tm.title AS training_module_title,
              (
                SELECT json_agg(v)
                FROM visual_assets v
                WHERE v.source_image_id = va.id AND v.deleted_at IS NULL
              ) AS derived_videos
       FROM visual_assets va
       LEFT JOIN training_modules tm ON tm.id = va.training_module_id
       ${whereClause}
       ORDER BY va.created_at DESC
       LIMIT 200`,
      params
    );

    return res.json({ assets: result.rows });
  } catch (error: any) {
    console.error('List visual assets error:', error);
    return res.status(500).json({ error: 'Failed to list visual assets' });
  }
};

// Approve asset
export const approveVisualAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE visual_assets
       SET status = 'approved', approved_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Complete QC task
    await pool.query(
      `UPDATE visual_asset_qc_tasks
       SET status = 'completed', decision = 'approve', completed_at = NOW(),
           reviewer_email = $1
       WHERE visual_asset_id = $2 AND status = 'pending'`,
      [req.user?.email, id]
    );

    return res.json({ asset: result.rows[0] });
  } catch (error: any) {
    console.error('Approve visual asset error:', error);
    return res.status(500).json({ error: 'Failed to approve asset' });
  }
};

// Reject asset
export const rejectVisualAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE visual_assets
       SET status = 'rejected', deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    await pool.query(
      `UPDATE visual_asset_qc_tasks
       SET status = 'completed', decision = 'reject', completed_at = NOW(),
           reviewer_email = $1, notes = $2
       WHERE visual_asset_id = $3 AND status = 'pending'`,
      [req.user?.email, reason || null, id]
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Reject visual asset error:', error);
    return res.status(500).json({ error: 'Failed to reject asset' });
  }
};

// Delete asset
export const deleteVisualAsset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE visual_assets
       SET status = 'deleted', deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Also mark any derived videos as deleted
    await pool.query(
      `UPDATE visual_assets
       SET status = 'deleted', deleted_at = NOW()
       WHERE source_image_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Delete visual asset error:', error);
    return res.status(500).json({ error: 'Failed to delete asset' });
  }
};
```

### File: `backend/src/routes/visualAssetRoutes.ts`

```typescript
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  generateImagePrompt,
  generateImage,
  generateVideo,
  listVisualAssets,
  approveVisualAsset,
  rejectVisualAsset,
  deleteVisualAsset
} from '../controllers/visualAssetController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// AI prompt generation
router.post('/image-prompt', requireRole('admin', 'manager'), generateImagePrompt);

// Asset generation
router.post('/image', requireRole('admin', 'manager'), generateImage);
router.post('/video', requireRole('admin', 'manager'), generateVideo);

// Asset management
router.get('/assets', listVisualAssets);
router.post('/assets/:id/approve', requireRole('admin', 'manager'), approveVisualAsset);
router.post('/assets/:id/reject', requireRole('admin', 'manager'), rejectVisualAsset);
router.delete('/assets/:id', requireRole('admin', 'manager'), deleteVisualAsset);

export default router;
```

### Update `backend/src/server.ts`

```typescript
// Add import
import visualAssetRoutes from './routes/visualAssetRoutes';

// Add route registration (after line 116)
app.use('/api/ai/visual', visualAssetRoutes);
```

---

## Frontend UI Components

### Tab 8: Image Generation Tab

**File:** `frontend/components/ai-studio/ImageGenerationTab.tsx`

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { visualAssetsAPI } from '@/lib/api';

interface ImageAsset {
  id: string;
  public_url: string;
  prompt: string;
  source_reminder_phrase: string | null;
  status: string;
  provider: string;
  quality_metrics?: any;
  created_at: string;
}

interface ImageGenerationTabProps {
  selectedModuleId: string | null;
  policyText: string;
  lyrics: string;
  reminderPhrases: string[];
  onShowToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export default function ImageGenerationTab({
  selectedModuleId,
  policyText,
  lyrics,
  reminderPhrases,
  onShowToast
}: ImageGenerationTabProps) {
  const [selectedPhrase, setSelectedPhrase] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [editablePrompt, setEditablePrompt] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<ImageAsset[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Configuration options
  const [provider, setProvider] = useState('openai_dalle');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageQuality, setImageQuality] = useState('standard');
  const [imageStyle, setImageStyle] = useState('vivid');

  // Load existing images for module
  const loadImages = useCallback(async () => {
    if (!selectedModuleId) return;
    setLoadingImages(true);
    try {
      const response = await visualAssetsAPI.list({
        training_module_id: selectedModuleId,
        asset_type: 'image'
      });
      setGeneratedImages(response?.assets || []);
    } catch (error: any) {
      console.error('Failed to load images', error);
    } finally {
      setLoadingImages(false);
    }
  }, [selectedModuleId]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Generate image prompt from reminder phrase
  const handleGeneratePrompt = async () => {
    if (!selectedPhrase.trim()) {
      onShowToast('error', 'Please select or enter a reminder phrase first.');
      return;
    }

    setIsGeneratingPrompt(true);
    try {
      const response = await visualAssetsAPI.generatePrompt({
        training_module_id: selectedModuleId || undefined,
        reminder_phrase: selectedPhrase,
        policy_text: policyText,
        lyrics: lyrics
      });

      setGeneratedPrompt(response.generated_prompt);
      setEditablePrompt(response.generated_prompt);
      onShowToast('success', 'Image prompt generated! Review and adjust as needed.');
    } catch (error: any) {
      console.error('Prompt generation failed', error);
      onShowToast('error', error?.response?.data?.error || 'Failed to generate prompt.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Generate image from prompt
  const handleGenerateImage = async () => {
    if (!editablePrompt.trim()) {
      onShowToast('error', 'Please enter an image prompt first.');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const response = await visualAssetsAPI.generateImage({
        training_module_id: selectedModuleId || undefined,
        prompt: editablePrompt,
        original_prompt: generatedPrompt || undefined,
        source_reminder_phrase: selectedPhrase || undefined,
        provider: provider,
        config: {
          size: imageSize,
          quality: imageQuality,
          style: imageStyle
        },
        auto_approve: false
      });

      onShowToast('success', 'Image generated successfully!');
      setGeneratedImages(prev => [response.asset, ...prev]);

      // Reset for next generation
      setSelectedPhrase('');
      setGeneratedPrompt('');
      setEditablePrompt('');
    } catch (error: any) {
      console.error('Image generation failed', error);
      onShowToast('error', error?.response?.data?.error || 'Failed to generate image.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Image Generation</h2>
        <p className="text-gray-600">
          Create visual reinforcements for your reminder phrases. Select a phrase, generate a contextual prompt, and create professional training images.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Generation Controls */}
        <div className="space-y-6">
          {/* Step 1: Select Reminder Phrase */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Step 1: Select Reminder Phrase
            </h3>

            {reminderPhrases.length > 0 ? (
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {reminderPhrases.filter(p => p.trim()).map((phrase, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedPhrase(phrase)}
                    className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedPhrase === phrase
                        ? 'bg-primary-100 text-primary-800 border-2 border-primary-500'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                No reminder phrases available. Add them in the Reminder Phrases tab first.
              </p>
            )}

            <textarea
              value={selectedPhrase}
              onChange={(e) => setSelectedPhrase(e.target.value)}
              placeholder="Or type a custom phrase to visualize..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              rows={2}
            />
          </div>

          {/* Step 2: Generate & Edit Prompt */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Step 2: Generate Image Prompt
            </h3>

            <button
              type="button"
              onClick={handleGeneratePrompt}
              disabled={isGeneratingPrompt || !selectedPhrase.trim()}
              className="mb-4 w-full inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-60"
            >
              {isGeneratingPrompt ? 'Generating Prompt...' : 'Generate AI Prompt'}
            </button>

            <textarea
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              placeholder="AI-generated prompt will appear here. You can edit it before generating the image."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              rows={6}
            />

            {generatedPrompt && editablePrompt !== generatedPrompt && (
              <p className="text-xs text-gray-500 mt-2">
                Prompt has been modified from AI suggestion
              </p>
            )}
          </div>

          {/* Step 3: Configure & Generate */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Step 3: Generate Image
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="openai_dalle">DALL-E 3</option>
                  <option value="akool" disabled>Akool (coming soon)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Size</label>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="1024x1024">Square (1024x1024)</option>
                  <option value="1792x1024">Landscape (1792x1024)</option>
                  <option value="1024x1792">Portrait (1024x1792)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quality</label>
                <select
                  value={imageQuality}
                  onChange={(e) => setImageQuality(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="standard">Standard ($0.04)</option>
                  <option value="hd">HD ($0.08)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Style</label>
                <select
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="vivid">Vivid</option>
                  <option value="natural">Natural</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !editablePrompt.trim()}
              className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 text-sm font-semibold text-white shadow hover:from-green-700 hover:to-green-800 disabled:opacity-60"
            >
              {isGeneratingImage ? 'Generating Image (15-30s)...' : 'Generate Image'}
            </button>
          </div>
        </div>

        {/* Right Column: Generated Images Gallery */}
        <div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Generated Images ({generatedImages.length})
              </h3>
              <button
                type="button"
                onClick={loadImages}
                disabled={loadingImages}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                {loadingImages ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {generatedImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No images generated yet. Start by selecting a reminder phrase.
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {generatedImages.map((image) => (
                  <div key={image.id} className="border border-gray-200 rounded-xl p-4">
                    <img
                      src={image.public_url}
                      alt={image.source_reminder_phrase || 'Generated image'}
                      className="w-full rounded-lg mb-3"
                    />
                    <div className="space-y-1 text-xs">
                      {image.source_reminder_phrase && (
                        <p className="text-gray-700">
                          <span className="font-semibold">Phrase:</span> {image.source_reminder_phrase}
                        </p>
                      )}
                      <p className="text-gray-500">
                        <span className="font-semibold">Status:</span>{' '}
                        <span className={`${
                          image.status === 'approved' ? 'text-green-600' :
                          image.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {image.status}
                        </span>
                      </p>
                      <p className="text-gray-500">
                        <span className="font-semibold">Provider:</span> {image.provider}
                      </p>
                      {image.quality_metrics?.generation_time_ms && (
                        <p className="text-gray-500">
                          <span className="font-semibold">Time:</span> {(image.quality_metrics.generation_time_ms / 1000).toFixed(1)}s
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a
                        href={image.public_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary-600 hover:underline"
                      >
                        View Full Size
                      </a>
                      {image.status === 'approved' && (
                        <button
                          type="button"
                          className="text-xs text-green-600 hover:underline"
                          onClick={() => {/* Navigate to video generation with this image */}}
                        >
                          Create Video
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Tab 9: Image-to-Video Tab

**File:** `frontend/components/ai-studio/ImageToVideoTab.tsx`

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { visualAssetsAPI } from '@/lib/api';

interface ImageAsset {
  id: string;
  public_url: string;
  prompt: string;
  source_reminder_phrase: string | null;
  status: string;
}

interface VideoAsset {
  id: string;
  public_url: string;
  prompt: string;
  source_image_id: string;
  source_reminder_phrase: string | null;
  status: string;
  duration_seconds: number;
  provider_metadata?: any;
  created_at: string;
}

interface ImageToVideoTabProps {
  selectedModuleId: string | null;
  onShowToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export default function ImageToVideoTab({
  selectedModuleId,
  onShowToast
}: ImageToVideoTabProps) {
  const [approvedImages, setApprovedImages] = useState<ImageAsset[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<VideoAsset[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Video configuration
  const [animationPrompt, setAnimationPrompt] = useState('');
  const [resolution, setResolution] = useState('720p');
  const [videoLength, setVideoLength] = useState(5);
  const [audioType, setAudioType] = useState(3); // No audio

  // Load approved images
  const loadImages = useCallback(async () => {
    if (!selectedModuleId) return;
    setLoadingImages(true);
    try {
      const response = await visualAssetsAPI.list({
        training_module_id: selectedModuleId,
        asset_type: 'image',
        status: 'approved'
      });
      setApprovedImages(response?.assets || []);
    } catch (error: any) {
      console.error('Failed to load images', error);
    } finally {
      setLoadingImages(false);
    }
  }, [selectedModuleId]);

  // Load generated videos
  const loadVideos = useCallback(async () => {
    if (!selectedModuleId) return;
    setLoadingVideos(true);
    try {
      const response = await visualAssetsAPI.list({
        training_module_id: selectedModuleId,
        asset_type: 'video'
      });
      setGeneratedVideos(response?.assets || []);
    } catch (error: any) {
      console.error('Failed to load videos', error);
    } finally {
      setLoadingVideos(false);
    }
  }, [selectedModuleId]);

  useEffect(() => {
    loadImages();
    loadVideos();
  }, [loadImages, loadVideos]);

  // Generate video from selected image
  const handleGenerateVideo = async () => {
    if (!selectedImage) {
      onShowToast('error', 'Please select an image first.');
      return;
    }

    if (!animationPrompt.trim()) {
      onShowToast('error', 'Please enter an animation prompt.');
      return;
    }

    setIsGeneratingVideo(true);
    try {
      const response = await visualAssetsAPI.generateVideo({
        source_image_id: selectedImage.id,
        prompt: animationPrompt,
        config: {
          resolution,
          video_length: videoLength,
          audio_type: audioType
        },
        auto_approve: false
      });

      onShowToast('success', 'Video generation started! This may take 1-5 minutes.');
      setGeneratedVideos(prev => [response.asset, ...prev]);

      // Reset
      setSelectedImage(null);
      setAnimationPrompt('');
    } catch (error: any) {
      console.error('Video generation failed', error);
      onShowToast('error', error?.response?.data?.error || 'Failed to generate video.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Suggest animation prompt based on image
  const suggestAnimationPrompt = () => {
    if (!selectedImage) return;

    const suggestions = [
      'Camera slowly pans across the scene from left to right',
      'Gentle zoom into the main subject with soft focus transition',
      'Subtle movement with floating particles effect',
      'Professional training video with smooth motion blur',
      'Ken Burns effect with slow zoom and pan'
    ];

    setAnimationPrompt(suggestions[Math.floor(Math.random() * suggestions.length)]);
  };

  return (
    <div className="px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Image to Video</h2>
        <p className="text-gray-600">
          Transform your approved images into animated videos. Select an image, describe the motion, and generate professional training videos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Image Selection */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Select Source Image
          </h3>

          {loadingImages ? (
            <p className="text-sm text-gray-500">Loading images...</p>
          ) : approvedImages.length === 0 ? (
            <p className="text-sm text-gray-500">
              No approved images available. Generate and approve images first.
            </p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {approvedImages.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`block w-full text-left rounded-xl border p-2 transition ${
                    selectedImage?.id === image.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image.public_url}
                    alt={image.source_reminder_phrase || 'Image'}
                    className="w-full rounded-lg mb-2"
                  />
                  <p className="text-xs text-gray-700 truncate">
                    {image.source_reminder_phrase || 'No phrase'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Video Configuration */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Animation Settings
            </h3>

            {selectedImage && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-600">Selected Image:</p>
                <p className="text-sm text-gray-800 truncate">
                  {selectedImage.source_reminder_phrase || 'Unnamed image'}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600">
                    Animation Prompt
                  </label>
                  <button
                    type="button"
                    onClick={suggestAnimationPrompt}
                    className="text-xs text-primary-600 hover:underline"
                    disabled={!selectedImage}
                  >
                    Suggest
                  </button>
                </div>
                <textarea
                  value={animationPrompt}
                  onChange={(e) => setAnimationPrompt(e.target.value)}
                  placeholder="Describe how the image should animate (e.g., 'Camera slowly pans across the scene')"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="720p">720p HD (~$1.00)</option>
                  <option value="1080p">1080p Full HD (~$2.00)</option>
                  <option value="4k">4K Ultra HD (~$5.00)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Video Length
                </label>
                <select
                  value={videoLength}
                  onChange={(e) => setVideoLength(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Audio
                </label>
                <select
                  value={audioType}
                  onChange={(e) => setAudioType(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value={3}>No audio</option>
                  <option value={1}>AI-generated audio</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateVideo}
              disabled={isGeneratingVideo || !selectedImage || !animationPrompt.trim()}
              className="mt-6 w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-sm font-semibold text-white shadow hover:from-purple-700 hover:to-purple-800 disabled:opacity-60"
            >
              {isGeneratingVideo ? 'Generating Video (1-5 min)...' : 'Generate Video'}
            </button>
          </div>
        </div>

        {/* Column 3: Generated Videos */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Generated Videos ({generatedVideos.length})
            </h3>
            <button
              type="button"
              onClick={loadVideos}
              disabled={loadingVideos}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              {loadingVideos ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {generatedVideos.length === 0 ? (
            <p className="text-sm text-gray-500">
              No videos generated yet. Select an image and create your first video.
            </p>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {generatedVideos.map((video) => (
                <div key={video.id} className="border border-gray-200 rounded-xl p-3">
                  <video
                    controls
                    className="w-full rounded-lg mb-2"
                    preload="metadata"
                  >
                    <source src={video.public_url} type="video/mp4" />
                    Your browser does not support video playback.
                  </video>
                  <div className="space-y-1 text-xs">
                    <p className="text-gray-700 truncate">
                      <span className="font-semibold">Phrase:</span>{' '}
                      {video.source_reminder_phrase || 'N/A'}
                    </p>
                    <p className="text-gray-500">
                      <span className="font-semibold">Status:</span>{' '}
                      <span className={`${
                        video.status === 'approved' ? 'text-green-600' :
                        video.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {video.status}
                      </span>
                    </p>
                    <p className="text-gray-500">
                      <span className="font-semibold">Duration:</span> {video.duration_seconds}s
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Update Frontend API Client

**File:** `frontend/lib/api.ts` (add to existing file)

```typescript
// Visual Assets API
export const visualAssetsAPI = {
  // Generate contextual image prompt
  generatePrompt: async (data: {
    training_module_id?: string;
    reminder_phrase: string;
    policy_text?: string;
    lyrics?: string;
  }) => {
    const response = await api.post('/api/ai/visual/image-prompt', data);
    return response.data;
  },

  // Generate image
  generateImage: async (data: {
    training_module_id?: string;
    prompt: string;
    original_prompt?: string;
    source_reminder_phrase?: string;
    provider?: string;
    config?: {
      size?: string;
      quality?: string;
      style?: string;
      num_images?: number;
    };
    auto_approve?: boolean;
  }) => {
    const response = await api.post('/api/ai/visual/image', data);
    return response.data;
  },

  // Generate video from image
  generateVideo: async (data: {
    source_image_id: string;
    prompt: string;
    config?: {
      resolution?: string;
      video_length?: number;
      audio_type?: number;
      audio_url?: string;
      extend_prompt?: boolean;
    };
    auto_approve?: boolean;
  }) => {
    const response = await api.post('/api/ai/visual/video', data);
    return response.data;
  },

  // List visual assets
  list: async (params?: {
    training_module_id?: string;
    asset_type?: string;
    status?: string;
  }) => {
    const response = await api.get('/api/ai/visual/assets', { params });
    return response.data;
  },

  // Approve asset
  approve: async (assetId: string) => {
    const response = await api.post(`/api/ai/visual/assets/${assetId}/approve`);
    return response.data;
  },

  // Reject asset
  reject: async (assetId: string, reason?: string) => {
    const response = await api.post(`/api/ai/visual/assets/${assetId}/reject`, { reason });
    return response.data;
  },

  // Delete asset
  remove: async (assetId: string) => {
    const response = await api.delete(`/api/ai/visual/assets/${assetId}`);
    return response.data;
  }
};
```

---

## Environment Variables

Add to `backend/.env.example`:

```bash
# Visual Asset Generation
OPENAI_API_KEY=your-openai-api-key-here
AKOOL_API_KEY=your-akool-api-key-here

# Storage (optional - defaults to SONG_LIBRARY_DIR parent)
VISUAL_ASSETS_DIR=./visual_assets
SAVE_IMAGES_LOCALLY=false  # Set to true to download and store images locally
```

---

## Cost Estimation

### DALL-E 3 Pricing
- Standard Quality (1024x1024): $0.04/image
- HD Quality (1024x1024): $0.08/image
- Landscape/Portrait: Same pricing

### Akool Pricing (Estimated)
- Image Generation: ~$0.05/request (produces 4 images)
- Image-to-Video (720p, 5s): ~$1.00/video
- Image-to-Video (1080p, 10s): ~$3.00/video
- Image-to-Video (4K, 10s): ~$5.00/video

### Budget Recommendations
- Small Deployment (10 modules): ~$50-100
- Medium Deployment (50 modules): ~$250-500
- Enterprise (100+ modules): Budget accordingly with QC to avoid waste

---

## Implementation Timeline

### Phase 1: Database & Backend (2-3 days)
1. Create database migration
2. Implement visualAssetController
3. Create routes and register in server
4. Test API endpoints with Postman

### Phase 2: DALL-E Integration (1-2 days)
1. Implement OpenAI image generation
2. Test prompt generation with GPT-4
3. Add cost tracking
4. Test QC workflow

### Phase 3: Frontend Image Generation Tab (2-3 days)
1. Create ImageGenerationTab component
2. Integrate with API
3. Add to AI Studio tabs
4. Test end-to-end flow

### Phase 4: Akool Video Integration (3-4 days)
1. Implement Akool API client
2. Add polling logic for async generation
3. Handle timeouts and errors
4. Test video generation

### Phase 5: Frontend Video Tab (2-3 days)
1. Create ImageToVideoTab component
2. Video playback UI
3. Integration with image selection
4. QC workflow for videos

### Phase 6: Testing & Polish (2-3 days)
1. End-to-end testing
2. Error handling improvements
3. Loading states and progress indicators
4. Documentation updates

**Total Estimated Time: 12-18 days**

---

## Testing Checklist

- [ ] Database migration applies successfully
- [ ] Image prompt generation uses policy and lyrics context
- [ ] DALL-E image generation works with all size/quality/style options
- [ ] Images are correctly linked to reminder phrases
- [ ] QC tasks are created for non-auto-approved assets
- [ ] Approval/rejection updates asset status correctly
- [ ] Video generation polls until completion
- [ ] Videos inherit source_reminder_phrase from parent image
- [ ] Asset lineage is trackable (phrase → image → video)
- [ ] Frontend displays generated assets correctly
- [ ] Cost tracking records generation metrics
- [ ] Error handling covers timeouts and API failures

---

## Security Considerations

1. **API Key Protection**: Never expose OPENAI_API_KEY or AKOOL_API_KEY to frontend
2. **File Upload Validation**: Validate file types and sizes
3. **Rate Limiting**: Consider adding rate limits to prevent abuse
4. **Cost Controls**: Implement budget alerts to prevent runaway costs
5. **Content Moderation**: DALL-E has built-in content policy; consider additional filtering
6. **Access Control**: Ensure proper role checks on all endpoints

---

## Future Enhancements

1. **Batch Generation**: Generate images for all reminder phrases at once
2. **Template Library**: Pre-approved image templates for common training scenarios
3. **Brand Guidelines**: Enforce brand colors and styles automatically
4. **A/B Testing**: Compare image effectiveness in training retention
5. **Video Stitching**: Combine multiple video clips into longer sequences
6. **Audio Overlay**: Add generated song audio to videos
7. **Automated QC**: Use AI to pre-approve high-quality generations
8. **Usage Analytics**: Track which visual assets improve quiz scores

---

*This specification document should be referenced during implementation and updated as features are completed.*
