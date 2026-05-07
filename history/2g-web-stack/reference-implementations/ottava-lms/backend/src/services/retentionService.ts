import pool from '../config/database';

export interface CleanupResult {
  table: string;
  recordsDeleted: number;
  retentionDays: number;
  executionTimeMs: number;
  timestamp: string;
  dryRun?: boolean;
}

export interface RetentionConfig {
  quizAttemptsRetentionDays: number;
  watchSessionsRetentionDays: number;
  dryRun?: boolean;
}

const MIN_RETENTION_DAYS = 1;

const normalizeRetentionDays = (value: number): number => {
  if (!Number.isFinite(value) || value < MIN_RETENTION_DAYS) {
    return MIN_RETENTION_DAYS;
  }
  return Math.floor(value);
};

const buildResult = (
  table: string,
  retentionDays: number,
  startTime: number,
  recordsDeleted: number,
  dryRun: boolean
): CleanupResult => ({
  table,
  recordsDeleted,
  retentionDays,
  executionTimeMs: Date.now() - startTime,
  timestamp: new Date().toISOString(),
  ...(dryRun ? { dryRun: true } : {}),
});

/**
 * Prune quiz attempts older than retention period while preserving
 * the most recent attempt per user/quiz pair regardless of age.
 */
export const pruneQuizAttempts = async (
  retentionDays: number,
  dryRun = false
): Promise<CleanupResult> => {
  const startTime = Date.now();
  const normalized = normalizeRetentionDays(retentionDays);
  const countQuery = `
    WITH ranked AS (
      SELECT id,
             completed_at,
             ROW_NUMBER() OVER (PARTITION BY user_id, quiz_id ORDER BY completed_at DESC, id DESC) AS rn
        FROM quiz_attempts
    )
    SELECT COUNT(*) AS count
      FROM ranked
     WHERE rn > 1
       AND completed_at < NOW() - make_interval(days => $1)
  `;

  if (dryRun) {
    const result = await pool.query<{ count: string }>(countQuery, [normalized]);
    const eligible = Number.parseInt(result.rows[0]?.count || '0', 10);
    console.log(
      `[Retention] Quiz attempts cleanup: ${eligible} records eligible (${normalized} day retention) [DRY RUN]`
    );
    return buildResult('quiz_attempts', normalized, startTime, eligible, true);
  }

  const deleteQuery = `
    WITH ranked AS (
      SELECT id,
             completed_at,
             ROW_NUMBER() OVER (PARTITION BY user_id, quiz_id ORDER BY completed_at DESC, id DESC) AS rn
        FROM quiz_attempts
    )
    DELETE FROM quiz_attempts qa
          USING ranked
     WHERE qa.id = ranked.id
       AND ranked.rn > 1
       AND qa.completed_at < NOW() - make_interval(days => $1)
    RETURNING qa.id
  `;

  const result = await pool.query(deleteQuery, [normalized]);
  const deleted = result.rowCount || 0;
  console.log(`[Retention] Quiz attempts cleanup: deleted ${deleted} records (${normalized} day retention)`);
  return buildResult('quiz_attempts', normalized, startTime, deleted, false);
};

/**
 * Prune watch sessions older than retention period. Aggregated
 * progress is stored separately so historical sessions are safe to remove.
 */
export const pruneWatchSessions = async (
  retentionDays: number,
  dryRun = false
): Promise<CleanupResult> => {
  const startTime = Date.now();
  const normalized = normalizeRetentionDays(retentionDays);
  const condition = 'COALESCE(completed_at, started_at) < NOW() - make_interval(days => $1)';

  if (dryRun) {
    const countQuery = `SELECT COUNT(*) AS count FROM watch_sessions WHERE ${condition}`;
    const result = await pool.query<{ count: string }>(countQuery, [normalized]);
    const eligible = Number.parseInt(result.rows[0]?.count || '0', 10);
    console.log(
      `[Retention] Watch sessions cleanup: ${eligible} records eligible (${normalized} day retention) [DRY RUN]`
    );
    return buildResult('watch_sessions', normalized, startTime, eligible, true);
  }

  const deleteQuery = `
    DELETE FROM watch_sessions
     WHERE ${condition}
     RETURNING id
  `;
  const result = await pool.query(deleteQuery, [normalized]);
  const deleted = result.rowCount || 0;
  console.log(`[Retention] Watch sessions cleanup: deleted ${deleted} records (${normalized} day retention)`);
  return buildResult('watch_sessions', normalized, startTime, deleted, false);
};

/**
 * Run all configured retention policies sequentially.
 */
export const executeRetentionPolicies = async (
  config: RetentionConfig
): Promise<CleanupResult[]> => {
  const normalized: RetentionConfig = {
    quizAttemptsRetentionDays: normalizeRetentionDays(config.quizAttemptsRetentionDays),
    watchSessionsRetentionDays: normalizeRetentionDays(config.watchSessionsRetentionDays),
    dryRun: config.dryRun,
  };

  console.log('[Retention] Starting retention policy execution');

  const results: CleanupResult[] = [];

  try {
    results.push(await pruneQuizAttempts(normalized.quizAttemptsRetentionDays, normalized.dryRun));
    results.push(await pruneWatchSessions(normalized.watchSessionsRetentionDays, normalized.dryRun));

    const totalDeleted = results.reduce((sum, result) => sum + result.recordsDeleted, 0);
    console.log(
      `[Retention] Cleanup complete: ${totalDeleted} total records ${normalized.dryRun ? 'identified' : 'deleted'}${
        normalized.dryRun ? ' [DRY RUN]' : ''
      }`
    );

    return results;
  } catch (error) {
    console.error('[Retention] Retention policy execution failed:', error);
    throw error;
  }
};

/**
 * Retrieve the number of records that would be cleaned up for each table.
 */
export const getRetentionStats = async (
  config: RetentionConfig
): Promise<{ table: string; eligibleRecords: number; retentionDays: number }[]> => {
  const normalizedQuiz = normalizeRetentionDays(config.quizAttemptsRetentionDays);
  const normalizedWatch = normalizeRetentionDays(config.watchSessionsRetentionDays);
  const stats: { table: string; eligibleRecords: number; retentionDays: number }[] = [];

  const quizResult = await pool.query(
    `
      WITH ranked AS (
        SELECT id,
               completed_at,
               ROW_NUMBER() OVER (PARTITION BY user_id, quiz_id ORDER BY completed_at DESC, id DESC) AS rn
          FROM quiz_attempts
      )
      SELECT COUNT(*) AS count
        FROM ranked
       WHERE rn > 1
         AND completed_at < NOW() - make_interval(days => $1)
    `,
    [normalizedQuiz]
  );
  stats.push({
    table: 'quiz_attempts',
    eligibleRecords: Number.parseInt(quizResult.rows[0]?.count || '0', 10),
    retentionDays: normalizedQuiz,
  });

  const watchResult = await pool.query(
    `SELECT COUNT(*) AS count FROM watch_sessions WHERE COALESCE(completed_at, started_at) < NOW() - make_interval(days => $1)`,
    [normalizedWatch]
  );
  stats.push({
    table: 'watch_sessions',
    eligibleRecords: Number.parseInt(watchResult.rows[0]?.count || '0', 10),
    retentionDays: normalizedWatch,
  });

  return stats;
};
