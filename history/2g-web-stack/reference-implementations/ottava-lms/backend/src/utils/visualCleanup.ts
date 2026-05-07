import fs from 'fs/promises';
import path from 'path';
import pool from '../config/database';

type VisualCleanupStats = {
  scanned: number;
  deleted: number;
  directoriesRemoved: number;
  errors: number;
};

const supportedExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.mov']);

const hasSupportedExtension = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  return supportedExtensions.has(ext);
};

const removeDirIfEmpty = async (dirPath: string) => {
  const remaining = await fs.readdir(dirPath);
  if (remaining.length === 0) {
    await fs.rm(dirPath, { recursive: false, force: true });
    return true;
  }
  return false;
};

export const pruneOrphanedVisuals = async (libraryRoot: string): Promise<VisualCleanupStats> => {
  const stats: VisualCleanupStats = {
    scanned: 0,
    deleted: 0,
    directoriesRemoved: 0,
    errors: 0,
  };

  try {
    await fs.mkdir(libraryRoot, { recursive: true });
  } catch (error) {
    console.error('[visuals] Unable to access visual library directory:', error);
    stats.errors += 1;
    return stats;
  }

  const moduleEntries = await fs.readdir(libraryRoot, { withFileTypes: true });
  for (const entry of moduleEntries) {
    if (!entry.isDirectory()) continue;
    const folderName = entry.name;
    const folderPath = path.join(libraryRoot, folderName);

    let files: string[] = [];
    try {
      files = await fs.readdir(folderPath);
    } catch (error) {
      console.warn(`[visuals] Unable to read ${folderPath}:`, error);
      stats.errors += 1;
      continue;
    }

    for (const file of files) {
      if (!hasSupportedExtension(file)) continue;
      stats.scanned += 1;
      const assetUrl = `/visuals/${folderName}/${file}`;
      try {
        const result = await pool.query(
          `SELECT 1 FROM visual_assets WHERE public_url = $1 AND deleted_at IS NULL LIMIT 1`,
          [assetUrl]
        );
        if (result.rowCount === 0) {
          await fs.unlink(path.join(folderPath, file));
          stats.deleted += 1;
        }
      } catch (error) {
        console.error('[visuals] Failed to verify asset record:', assetUrl, error);
        stats.errors += 1;
      }
    }

    try {
      const removed = await removeDirIfEmpty(folderPath);
      if (removed) {
        stats.directoriesRemoved += 1;
      }
    } catch (error) {
      console.warn(`[visuals] Unable to remove ${folderPath}:`, error);
      stats.errors += 1;
    }
  }

  return stats;
};
