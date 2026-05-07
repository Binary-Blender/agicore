import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateMetricsQuery } from '../middleware/validation';
import {
  getPerformanceSummary,
  getEndpointStats,
  getRecentPerformanceMetrics,
} from '../middleware/performanceMonitor';
import {
  clearSlowQueries,
  getSlowQueries,
  getSlowQueryCount,
  getSlowQueryThreshold,
} from '../middleware/queryLogger';

const router = Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/performance', validateMetricsQuery, (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const summary = getPerformanceSummary(limit);
  res.json(summary);
});

router.get('/slow-queries', validateMetricsQuery, (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  res.json({
    totalSlowQueries: getSlowQueryCount(),
    threshold: getSlowQueryThreshold(),
    queries: getSlowQueries(limit),
  });
});

router.post('/slow-queries/clear', (_req: Request, res: Response) => {
  const clearedCount = clearSlowQueries();
  res.json({
    message: 'Slow query buffer cleared',
    clearedCount,
  });
});

router.get('/endpoints', (_req: Request, res: Response) => {
  const stats = getEndpointStats();
  res.json({ endpoints: stats });
});

router.get('/recent', validateMetricsQuery, (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  res.json({ metrics: getRecentPerformanceMetrics(limit) });
});

export default router;
