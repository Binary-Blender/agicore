import { NextFunction, Request, Response } from 'express';
import { performance } from 'node:perf_hooks';

export type PerformanceMetric = {
  path: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: string;
};

const MAX_METRICS = 1000;
const SLOW_REQUEST_THRESHOLD_MS = 3000;
const metricsBuffer: PerformanceMetric[] = [];
let totalRequests = 0;
let totalDuration = 0;
const metricsEnabled = process.env.PERFORMANCE_METRICS_ENABLED !== 'false';

const sanitizePath = (req: Request): string => {
  if (req.baseUrl && req.route?.path) {
    return `${req.baseUrl}${req.route.path}`;
  }
  const originalUrl = req.originalUrl || req.url || req.path || '';
  return originalUrl.split('?')[0];
};

const recordMetric = (metric: PerformanceMetric) => {
  metricsBuffer.push(metric);
  if (metricsBuffer.length > MAX_METRICS) {
    metricsBuffer.shift();
  }
  totalRequests += 1;
  totalDuration += metric.duration;

  if (metric.duration >= SLOW_REQUEST_THRESHOLD_MS) {
    console.warn(
      `[SlowRequest] ${metric.method} ${metric.path} ${metric.duration.toFixed(2)}ms ${metric.statusCode}`
    );
  }
};

export const performanceMonitorMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!metricsEnabled) {
    return next();
  }

  const start = performance.now();
  res.on('finish', () => {
    const duration = performance.now() - start;
    const metric: PerformanceMetric = {
      path: sanitizePath(req),
      method: req.method.toUpperCase(),
      duration: Number(duration.toFixed(2)),
      statusCode: res.statusCode,
      timestamp: new Date().toISOString(),
    };
    recordMetric(metric);
  });

  next();
};

export const getRecentPerformanceMetrics = (limit = 50): PerformanceMetric[] => {
  const safeLimit = Math.max(1, Math.min(limit, MAX_METRICS));
  return metricsBuffer.slice(-safeLimit).reverse();
};

export const getTotalRequests = (): number => totalRequests;
export const getAverageResponseTime = (): number =>
  totalRequests ? Number((totalDuration / totalRequests).toFixed(2)) : 0;

export const getEndpointStats = () => {
  const map = new Map<string, { total: number; count: number; min: number; max: number }>();
  for (const metric of metricsBuffer) {
    const key = `${metric.method} ${metric.path}`;
    const existing = map.get(key) || { total: 0, count: 0, min: Number.POSITIVE_INFINITY, max: 0 };
    existing.total += metric.duration;
    existing.count += 1;
    existing.min = Math.min(existing.min, metric.duration);
    existing.max = Math.max(existing.max, metric.duration);
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([path, data]) => ({
    path,
    avgDuration: Number((data.total / data.count).toFixed(2)),
    count: data.count,
    minDuration: data.count ? Number(data.min.toFixed(2)) : 0,
    maxDuration: Number(data.max.toFixed(2)),
  }));
};

export const getSlowestEndpoints = (limit = 5) => {
  const stats = getEndpointStats();
  return stats
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, Math.max(1, limit));
};

export const getPerformanceSummary = (limit = 50) => ({
  totalRequests: getTotalRequests(),
  averageResponseTimeMs: getAverageResponseTime(),
  slowestEndpoints: getSlowestEndpoints(5),
  recentMetrics: getRecentPerformanceMetrics(limit),
});

export const isPerformanceMonitoringEnabled = () => metricsEnabled;
