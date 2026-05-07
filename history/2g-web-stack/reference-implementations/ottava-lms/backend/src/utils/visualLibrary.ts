import fs from 'fs';
import path from 'path';

let cachedVisualDir: string | null = null;

const createDirectory = (dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
};

export const resolveVisualLibraryDir = (): string => {
  if (cachedVisualDir) return cachedVisualDir;

  const preferred = process.env.VISUAL_LIBRARY_DIR || path.resolve(process.cwd(), 'visuals');
  try {
    cachedVisualDir = createDirectory(preferred);
  } catch (error: any) {
    if (error?.code !== 'EACCES') {
      throw error;
    }
    const fallback = path.resolve('/tmp', 'melody-visuals');
    cachedVisualDir = createDirectory(fallback);
    console.warn(
      `[visuals] Unable to write to ${preferred} (${error.message}). Falling back to ${fallback}.`
    );
  }

  process.env.VISUAL_LIBRARY_DIR = cachedVisualDir;
  return cachedVisualDir;
};

export const buildVisualPublicUrl = (folder: string, filename: string) =>
  `/visuals/${folder}/${filename}`;
