import dotenv from 'dotenv';
import pool from '../config/database';
import { executeRetentionPolicies, getRetentionStats } from '../services/retentionService';

dotenv.config();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const statsOnly = args.includes('--stats-only');

const parseRetentionValue = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const config = {
  quizAttemptsRetentionDays: parseRetentionValue(process.env.QUIZ_ATTEMPTS_RETENTION_DAYS, 90),
  watchSessionsRetentionDays: parseRetentionValue(process.env.WATCH_SESSIONS_RETENTION_DAYS, 180),
  dryRun,
};

const formatRow = (table: string, count: number, retentionDays: number) =>
  `${table.padEnd(18)} ${count.toLocaleString()} records (${retentionDays} day retention)`;

async function runStatsOnly() {
  console.log('Fetching cleanup statistics...\n');
  const stats = await getRetentionStats(config);
  stats.forEach((stat) => console.log(`  ${formatRow(stat.table, stat.eligibleRecords, stat.retentionDays)}`));

  const total = stats.reduce((sum, stat) => sum + stat.eligibleRecords, 0);
  console.log(`\n  TOTAL: ${total.toLocaleString()} records eligible for cleanup\n`);
}

async function runCleanup() {
  if (dryRun) {
    console.log('DRY RUN MODE — no records will be deleted.\n');
  }
  const results = await executeRetentionPolicies(config);
  console.log('\n=== Cleanup Summary ===');
  results.forEach((result) => {
    const action = dryRun ? 'Identified' : 'Deleted';
    console.log(`  ${formatRow(result.table, result.recordsDeleted, result.retentionDays)} (${result.executionTimeMs}ms)`);
  });
  const total = results.reduce((sum, result) => sum + result.recordsDeleted, 0);
  console.log(`\n  TOTAL: ${dryRun ? 'Identified' : 'Deleted'} ${total.toLocaleString()} records\n`);
}

async function main() {
  console.log('=== MelodyLMS Database Cleanup Utility ===');
  console.log(`Quiz attempts retention: ${config.quizAttemptsRetentionDays} days`);
  console.log(`Watch sessions retention: ${config.watchSessionsRetentionDays} days`);
  console.log('');

  if (statsOnly) {
    await runStatsOnly();
    return;
  }

  await runCleanup();
}

main()
  .catch((error) => {
    console.error('\nCleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    pool
      .end()
      .catch(() => {})
      .finally(() => {
        if (process.exitCode && process.exitCode !== 0) {
          process.exit(process.exitCode);
        }
      });
  });
