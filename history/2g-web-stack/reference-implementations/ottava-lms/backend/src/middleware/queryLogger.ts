import { Pool, QueryResult } from 'pg';
import { performance } from 'node:perf_hooks';

export interface SlowQueryRecord {
  query: string;
  durationMs: number;
  timestamp: string;
  rows?: number;
  error?: string;
}

const MAX_SLOW_QUERIES = 100;
const slowQueryThresholdMs = Number(process.env.SLOW_QUERY_THRESHOLD_MS || 1000);
const loggingEnabled = process.env.ENABLE_QUERY_LOGGING !== 'false';
const slowQueries: SlowQueryRecord[] = [];
let attached = false;

const sanitizeQueryText = (text: string | undefined): string => {
  if (!text) {
    return 'UNKNOWN_QUERY';
  }
  return text.replace(/\s+/g, ' ').trim().slice(0, 200);
};

const storeSlowQuery = (record: SlowQueryRecord) => {
  slowQueries.unshift(record);
  if (slowQueries.length > MAX_SLOW_QUERIES) {
    slowQueries.pop();
  }
};

const shouldLog = (durationMs: number) => durationMs >= slowQueryThresholdMs;

const extractQueryText = (args: any[]): string => {
  const [firstArg] = args;
  if (typeof firstArg === 'string') {
    return firstArg;
  }
  if (firstArg && typeof firstArg === 'object' && 'text' in firstArg) {
    return (firstArg as { text: string }).text;
  }
  return 'UNKNOWN_QUERY';
};

const recordSlowQuery = (
  queryText: string,
  durationMs: number,
  result?: QueryResult,
  error?: Error
) => {
  const rows = typeof result?.rowCount === 'number' ? result.rowCount : undefined;
  const record: SlowQueryRecord = {
    query: sanitizeQueryText(queryText),
    durationMs: Number(durationMs.toFixed(2)),
    timestamp: new Date().toISOString(),
    rows,
    ...(error ? { error: error.message } : {}),
  };
  storeSlowQuery(record);
  console.warn(
    `[SlowQuery] ${record.durationMs}ms | rows=${rows ?? 'n/a'} | ${record.query}${
      error ? ` | error=${error.message}` : ''
    }`
  );
};

export const attachQueryLogger = (pool: Pool): void => {
  if (!loggingEnabled || attached) {
    return;
  }
  attached = true;

  const executeQuery = pool.query.bind(pool) as (...args: any[]) => Promise<QueryResult>;
  const poolWithAny = pool as any;

  poolWithAny.query = async (...args: any[]) => {
    const start = performance.now();
    const queryText = extractQueryText(args);
    try {
      const result: QueryResult = await executeQuery(...args);
      const duration = performance.now() - start;
      if (shouldLog(duration)) {
        recordSlowQuery(queryText, duration, result);
      }
      return result;
    } catch (error: any) {
      const duration = performance.now() - start;
      if (shouldLog(duration)) {
        recordSlowQuery(queryText, duration, undefined, error);
      }
      throw error;
    }
  };
};

export const getSlowQueries = (limit = MAX_SLOW_QUERIES): SlowQueryRecord[] => {
  return slowQueries.slice(0, Math.min(limit, MAX_SLOW_QUERIES));
};

export const clearSlowQueries = (): number => {
  const count = slowQueries.length;
  slowQueries.length = 0;
  return count;
};

export const getSlowQueryCount = (): number => slowQueries.length;
export const getSlowQueryThreshold = (): number => slowQueryThresholdMs;
export const isQueryLoggingEnabled = (): boolean => loggingEnabled;
