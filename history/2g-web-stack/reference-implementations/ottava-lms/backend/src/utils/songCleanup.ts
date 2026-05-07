import fs from 'fs/promises';
import path from 'path';
import pool from '../config/database';

export interface SongCleanupStats {
  scanned: number;
  deleted: number;
  directoriesRemoved: number;
  errors: number;
}

const isAudioFile = (filename: string) => filename.toLowerCase().endsWith('.mp3');

const removeDirectoryIfEmpty = async (dirPath: string) => {
  const remaining = await fs.readdir(dirPath);
  if (remaining.length === 0) {
    await fs.rm(dirPath, { recursive: false, force: true });
    return true;
  }
  return false;
};

export const pruneOrphanedSongs = async (libraryRoot: string): Promise<SongCleanupStats> => {
  const stats: SongCleanupStats = {
    scanned: 0,
    deleted: 0,
    directoriesRemoved: 0,
    errors: 0,
  };

  try {
    await fs.mkdir(libraryRoot, { recursive: true });
  } catch (error) {
    console.error('[songs] Unable to access song library directory:', error);
    stats.errors += 1;
    return stats;
  }

  const moduleEntries = await fs.readdir(libraryRoot, { withFileTypes: true });

  for (const entry of moduleEntries) {
    if (!entry.isDirectory()) continue;
    const moduleId = entry.name;
    const moduleDir = path.join(libraryRoot, moduleId);
    let files: string[] = [];
    try {
      files = await fs.readdir(moduleDir);
    } catch (error) {
      console.warn(`[songs] Unable to read ${moduleDir}:`, error);
      stats.errors += 1;
      continue;
    }

    for (const file of files) {
      if (!isAudioFile(file)) continue;
      stats.scanned += 1;
      const songUrl = `/songs/${moduleId}/${file}`;
      try {
        const result = await pool.query(
          `SELECT 1
             FROM training_module_songs
            WHERE song_url = $1
              AND deleted_at IS NULL
            LIMIT 1`,
          [songUrl]
        );

        if (result.rowCount === 0) {
          await fs.unlink(path.join(moduleDir, file));
          stats.deleted += 1;
        }
      } catch (error) {
        console.error('[songs] Failed to verify song record:', songUrl, error);
        stats.errors += 1;
      }
    }

    try {
      const removed = await removeDirectoryIfEmpty(moduleDir);
      if (removed) {
        stats.directoriesRemoved += 1;
      }
    } catch (error) {
      console.warn(`[songs] Unable to remove ${moduleDir}:`, error);
      stats.errors += 1;
    }
  }

  return stats;
};
