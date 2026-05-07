import { Router, Request, Response } from 'express';
import os from 'os';
import fs from 'fs';
import pool from '../config/database';
import { resolveVisualLibraryDir } from '../utils/visualLibrary';
import { getSchedulerStatus } from '../services/cleanupScheduler';
import { getAverageResponseTime, getTotalRequests } from '../middleware/performanceMonitor';
import { getSlowQueryCount } from '../middleware/queryLogger';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/detailed', async (_req: Request, res: Response) => {
  const checks: Record<string, any> = {};
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    checks.database = { status: 'ok', latency_ms: Date.now() - start };
  } catch (error: any) {
    checks.database = { status: 'error', error: error.message };
    status = 'unhealthy';
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
  checks.memory = {
    status: usedPercent > 90 ? 'warning' : 'ok',
    used_percent: Number(usedPercent.toFixed(1)),
    free_mb: Math.round(freeMem / 1024 / 1024),
  };
  if (usedPercent > 90 && status === 'healthy') status = 'degraded';

  const visualDir = resolveVisualLibraryDir();
  try {
    const stats = fs.statSync(visualDir, { bigint: false } as any);
    if ('bfree' in stats) {
      const statFs: any = (fs as any).statfsSync?.(visualDir);
      if (statFs) {
        const freeGb = (statFs.bfree * statFs.bsize) / 1024 / 1024 / 1024;
        checks.disk_space = {
          status: freeGb < 1 ? 'warning' : 'ok',
          free_gb: Number(freeGb.toFixed(2)),
        };
        if (freeGb < 1 && status === 'healthy') status = 'degraded';
      }
    }
  } catch (error: any) {
    checks.disk_space = { status: 'unknown', error: error.message };
  }

  checks.uptime = {
    seconds: Math.floor(process.uptime()),
    formatted: formatUptime(process.uptime()),
  };

  const averageResponseTimeMs = getAverageResponseTime();
  const performanceStatus = averageResponseTimeMs >= 1000 ? 'degraded' : 'ok';
  checks.performance = {
    averageResponseTimeMs,
    slowQueriesCount: getSlowQueryCount(),
    totalRequests: getTotalRequests(),
    status: performanceStatus,
  };
  if (performanceStatus === 'degraded' && status === 'healthy') {
    status = 'degraded';
  }

  const schedulerStatus = getSchedulerStatus();
  checks.cleanup_scheduler = schedulerStatus;
  if (schedulerStatus.enabled && !schedulerStatus.running && status === 'healthy') {
    status = 'degraded';
  }

  res.json({
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    demo_mode: process.env.DEMO_MODE === 'true',
    checks,
  });
});

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
};

export default router;
