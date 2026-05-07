import dotenv from 'dotenv';
import path from 'path';
import pool from '../config/database';
import { pruneOrphanedSongs } from '../utils/songCleanup';

dotenv.config();

const libraryRoot = process.env.SONG_LIBRARY_DIR || path.resolve(process.cwd(), 'songs');

const run = async () => {
  console.log(`[songs] Pruning orphaned files in ${libraryRoot}...`);
  const stats = await pruneOrphanedSongs(libraryRoot);
  console.log(
    `[songs] Scan finished: scanned ${stats.scanned}, removed ${stats.deleted}, removed ${stats.directoriesRemoved} empty directories`
  );
  if (stats.errors) {
    console.warn(`[songs] Encountered ${stats.errors} errors. Check logs above for details.`);
  }
};

run()
  .catch((error) => {
    console.error('[songs] Cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end().catch(() => {});
  });
