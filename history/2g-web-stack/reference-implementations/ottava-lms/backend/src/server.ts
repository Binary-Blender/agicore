import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/authRoutes';
import videoRoutes from './routes/videoRoutes';
import quizRoutes from './routes/quizRoutes';
import progressRoutes from './routes/progressRoutes';
import favoritesRoutes from './routes/favoritesRoutes';
import preferencesRoutes from './routes/preferencesRoutes';
import trainingModuleRoutes from './routes/trainingModuleRoutes';
import aiRoutes from './routes/aiRoutes';
import assetRoutes from './routes/assetRoutes';
import visualAssetRoutes from './routes/visualAssetRoutes';
import healthRoutes from './routes/healthRoutes';
import metricsRoutes from './routes/metricsRoutes';
import playlistRoutes from './routes/playlistRoutes';
import pool from './config/database';
import { pruneOrphanedSongs } from './utils/songCleanup';
import { resolveVisualLibraryDir } from './utils/visualLibrary';
import { pruneOrphanedVisuals } from './utils/visualCleanup';
import { apiRateLimiter } from './middleware/rateLimit';
import { demoModeEnabled } from './middleware/auth';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import {
  performanceMonitorMiddleware,
  isPerformanceMonitoringEnabled,
} from './middleware/performanceMonitor';
import { startCleanupScheduler, stopCleanupScheduler } from './services/cleanupScheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const DEFAULT_ORIGINS = ['http://localhost:3000'];
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

if (!allowedOrigins.length) {
  allowedOrigins.push(...DEFAULT_ORIGINS);
}

if (demoModeEnabled()) {
  console.warn('⚠️  WARNING: DEMO_MODE is enabled. Authentication is bypassed!');
}

const resolveSongLibraryDir = (): string => {
  const preferred = process.env.SONG_LIBRARY_DIR || path.resolve(process.cwd(), 'songs');
  try {
    fs.mkdirSync(preferred, { recursive: true });
    return preferred;
  } catch (error: any) {
    if (error?.code !== 'EACCES') {
      throw error;
    }
    const fallback = path.resolve('/tmp', 'melody-songs');
    fs.mkdirSync(fallback, { recursive: true });
    console.warn(
      `[songs] Unable to write to ${preferred} (${error.message}). Falling back to ${fallback}.`
    );
    return fallback;
  }
};

const SONGS_DIR = resolveSongLibraryDir();
process.env.SONG_LIBRARY_DIR = SONGS_DIR;

const VISUALS_DIR = resolveVisualLibraryDir();
process.env.VISUAL_LIBRARY_DIR = VISUALS_DIR;

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const cleanupConfig = {
  enabled: process.env.ENABLE_AUTOMATED_CLEANUP !== 'false',
  schedule: process.env.CLEANUP_SCHEDULE || '0 2 * * *',
  quizAttemptsRetentionDays: parsePositiveInt(process.env.QUIZ_ATTEMPTS_RETENTION_DAYS, 90),
  watchSessionsRetentionDays: parsePositiveInt(process.env.WATCH_SESSIONS_RETENTION_DAYS, 180),
};

startCleanupScheduler(cleanupConfig);

if (process.env.PRUNE_SONGS_ON_BOOT !== 'false') {
  pruneOrphanedSongs(SONGS_DIR)
    .then((stats) => {
      if (stats.scanned === 0 && stats.deleted === 0 && stats.directoriesRemoved === 0) {
        console.log('[songs] Cleanup complete: no orphaned files found.');
        return;
      }
      console.log(
        `[songs] Cleanup complete: scanned ${stats.scanned}, removed ${stats.deleted} orphaned files, removed ${stats.directoriesRemoved} empty directories`
      );
      if (stats.errors) {
        console.warn(`[songs] Cleanup completed with ${stats.errors} warnings.`);
      }
    })
    .catch((error) => console.error('[songs] Cleanup failed:', error));
}

if (process.env.PRUNE_VISUALS_ON_BOOT !== 'false') {
  pruneOrphanedVisuals(VISUALS_DIR)
    .then((stats) => {
      if (stats.scanned === 0 && stats.deleted === 0 && stats.directoriesRemoved === 0) {
        console.log('[visuals] Cleanup complete: no orphaned files found.');
        return;
      }
      console.log(
        `[visuals] Cleanup complete: scanned ${stats.scanned}, removed ${stats.deleted} orphaned files, removed ${stats.directoriesRemoved} empty directories`
      );
      if (stats.errors) {
        console.warn(`[visuals] Cleanup completed with ${stats.errors} warnings.`);
      }
    })
    .catch((error) => console.error('[visuals] Cleanup failed:', error));
}

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        connectSrc: ["'self'", 'https://api.akool.com', 'https://api.akool.com/v1'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[cors] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
});

app.use((req, res, next) => {
  corsMiddleware(req, res, (err) => {
    if (err) {
      return res.status(403).json({ error: 'CORS origin not allowed' });
    }
    return next();
  });
});

if (isPerformanceMonitoringEnabled()) {
  app.use(performanceMonitorMiddleware);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);
app.use('/api', apiRateLimiter);

app.get('/songs/:moduleId/:filename', async (req, res, next) => {
  const { moduleId, filename } = req.params;
  const localPath = path.join(SONGS_DIR, moduleId, filename);
  try {
    await fs.promises.access(localPath);
    return res.sendFile(localPath);
  } catch {
    // fall through to DB lookup
  }

  try {
    const songUrl = `/songs/${moduleId}/${filename}`;
    const result = await pool.query(
      `SELECT song_file
         FROM training_module_songs
        WHERE song_url = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [songUrl]
    );

    const songRow = result.rows[0];
    if (songRow?.song_file) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      return res.end(songRow.song_file);
    }
  } catch (error) {
    console.error('Streaming song fallback error:', error);
  }

  next();
});

app.use('/songs', express.static(SONGS_DIR));
app.use('/visuals', express.static(VISUALS_DIR));

app.use('/health', healthRoutes);

app.get('/api/system/config', (req, res) => {
  res.json({
    demo_mode: demoModeEnabled(),
    environment: process.env.NODE_ENV || 'development',
    allowed_origins: allowedOrigins,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/training-modules', trainingModuleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/visual-assets', visualAssetRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/metrics', metricsRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);
  stopCleanupScheduler();
  server.close(() => {
    console.log('HTTP server closed');
    pool
      .end()
      .then(() => {
        console.log('Database pool closed');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Error closing database pool:', err);
        process.exit(1);
      });
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
