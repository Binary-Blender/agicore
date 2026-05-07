import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/music/compose';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export type SongGenerationOptions = {
  moduleId: string;
  moduleTitle: string;
  lyrics: string;
  style: string;
  durationMs: number;
  emphasisPoints?: string[];
};

export type SongGenerationResult = {
  filePath: string;
  publicPath: string;
  durationSeconds: number;
  buffer: Buffer;
};

const clampDuration = (value: number) => Math.min(Math.max(value, 10000), 300000);

const buildPrompt = (options: SongGenerationOptions) => {
  const sections: string[] = [];
  sections.push(
    `Create a polished corporate training song for the module "${options.moduleTitle}".`
  );
  sections.push(`Target style: ${options.style}.`);
  if (options.emphasisPoints && options.emphasisPoints.length) {
    sections.push(`Emphasize the following themes: ${options.emphasisPoints.join(', ')}.`);
  }
  sections.push(
    'Ensure vocals are clear, engaging, and family-friendly. Avoid advertising language or company names.'
  );
  sections.push('Lyrics:\n' + options.lyrics.trim());
  return sections.join('\n\n');
};

export const generateTrainingSong = async (
  options: SongGenerationOptions
): Promise<SongGenerationResult> => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const durationMs = clampDuration(options.durationMs);
  const prompt = buildPrompt(options);

  const response = await axios.post(
    ELEVENLABS_API_URL,
    {
      prompt,
      duration_ms: durationMs,
      output_format: 'mp3_44100_128',
    },
    {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 5 * 60 * 1000,
    }
  );

  const fileBuffer = Buffer.from(response.data);

  const songLibraryRoot = process.env.SONG_LIBRARY_DIR || path.resolve(process.cwd(), 'songs');
  const moduleDir = path.join(songLibraryRoot, options.moduleId);
  await fs.mkdir(moduleDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `training_song_${timestamp}.mp3`;
  const absolutePath = path.join(moduleDir, filename);

  await fs.writeFile(absolutePath, fileBuffer);

  return {
    filePath: absolutePath,
    publicPath: `/songs/${options.moduleId}/${filename}`,
    durationSeconds: Math.round(durationMs / 1000),
    buffer: fileBuffer,
  };
};
