import { executeRetentionPolicies, CleanupResult } from './retentionService';

export interface SchedulerConfig {
  enabled: boolean;
  schedule: string;
  quizAttemptsRetentionDays: number;
  watchSessionsRetentionDays: number;
  runOnStart?: boolean;
}

interface ParsedSchedule {
  hour: number;
  minute: number;
}

interface SchedulerSummary {
  totalRecordsProcessed: number;
  tables: CleanupResult[];
  error?: string;
}

let scheduledTimeout: NodeJS.Timeout | null = null;
let parsedSchedule: ParsedSchedule | null = null;
let schedulerConfig: SchedulerConfig | null = null;
let lastRunAt: string | null = null;
let nextRunAt: string | null = null;
let lastSummary: SchedulerSummary | null = null;
let jobRunning = false;

const DAILY_CRON_PATTERN = /^([0-5]?\d)\s+([01]?\d|2[0-3])\s+\*\s+\*\s+\*$/;
const HH_MM_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const parseSchedule = (schedule: string): ParsedSchedule | null => {
  const trimmed = (schedule || '').trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed === '@daily' || trimmed === '@midnight') {
    return { hour: trimmed === '@midnight' ? 0 : 0, minute: 0 };
  }

  const cronMatch = trimmed.match(DAILY_CRON_PATTERN);
  if (cronMatch) {
    const minute = Number.parseInt(cronMatch[1], 10);
    const hour = Number.parseInt(cronMatch[2], 10);
    return { hour, minute };
  }

  const hhmmMatch = trimmed.match(HH_MM_PATTERN);
  if (hhmmMatch) {
    const hour = Number.parseInt(hhmmMatch[1], 10);
    const minute = Number.parseInt(hhmmMatch[2], 10);
    return { hour, minute };
  }

  return null;
};

const computeNextRun = (scheduleInfo: ParsedSchedule): Date => {
  const now = new Date();
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setHours(scheduleInfo.hour, scheduleInfo.minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

const queueNextRun = () => {
  if (!parsedSchedule || !schedulerConfig?.enabled) {
    return;
  }

  const nextDate = computeNextRun(parsedSchedule);
  const delay = Math.max(nextDate.getTime() - Date.now(), 0);
  nextRunAt = nextDate.toISOString();

  scheduledTimeout = setTimeout(async () => {
    scheduledTimeout = null;
    jobRunning = true;
    lastRunAt = new Date().toISOString();
    try {
      const results = await executeRetentionPolicies({
        quizAttemptsRetentionDays: schedulerConfig!.quizAttemptsRetentionDays,
        watchSessionsRetentionDays: schedulerConfig!.watchSessionsRetentionDays,
        dryRun: false,
      });
      const totalRecords = results.reduce((sum, result) => sum + result.recordsDeleted, 0);
      lastSummary = { totalRecordsProcessed: totalRecords, tables: results };
      console.log(
        `[Scheduler] Cleanup job finished: ${totalRecords} records deleted across ${results.length} tasks`
      );
    } catch (error: any) {
      console.error('[Scheduler] Cleanup job failed:', error);
      lastSummary = {
        totalRecordsProcessed: 0,
        tables: [],
        error: error?.message || 'Unknown error',
      };
    } finally {
      jobRunning = false;
      queueNextRun();
    }
  }, delay);

  if (typeof scheduledTimeout.unref === 'function') {
    scheduledTimeout.unref();
  }

  console.log(`(Scheduler) Next cleanup job scheduled for ${nextRunAt}`);
};

export const startCleanupScheduler = (config: SchedulerConfig): void => {
  schedulerConfig = config;

  if (!config.enabled) {
    console.log('[Scheduler] Automated cleanup disabled (ENABLE_AUTOMATED_CLEANUP=false)');
    return;
  }

  parsedSchedule = parseSchedule(config.schedule);

  if (!parsedSchedule) {
    console.error(
      `[Scheduler] Invalid schedule "${config.schedule}". Expected cron format "m h * * *" or HH:MM.`
    );
    return;
  }

  console.log(
    `[Scheduler] Starting cleanup scheduler for ${config.schedule} (local time, hour=${parsedSchedule.hour}, minute=${parsedSchedule.minute})`
  );

  if (scheduledTimeout) {
    clearTimeout(scheduledTimeout);
    scheduledTimeout = null;
  }

  if (config.runOnStart) {
    (async () => {
      jobRunning = true;
      lastRunAt = new Date().toISOString();
      try {
        const results = await executeRetentionPolicies({
          quizAttemptsRetentionDays: config.quizAttemptsRetentionDays,
          watchSessionsRetentionDays: config.watchSessionsRetentionDays,
          dryRun: false,
        });
        const totalRecords = results.reduce((sum, result) => sum + result.recordsDeleted, 0);
        lastSummary = { totalRecordsProcessed: totalRecords, tables: results };
        console.log(
          `[Scheduler] Initial cleanup job finished: ${totalRecords} records deleted across ${results.length} tasks`
        );
      } catch (error: any) {
        console.error('[Scheduler] Initial cleanup job failed:', error);
        lastSummary = {
          totalRecordsProcessed: 0,
          tables: [],
          error: error?.message || 'Unknown error',
        };
      } finally {
        jobRunning = false;
        queueNextRun();
      }
    })();
  } else {
    queueNextRun();
  }
};

export const stopCleanupScheduler = (): void => {
  if (scheduledTimeout) {
    clearTimeout(scheduledTimeout);
    scheduledTimeout = null;
  }
  nextRunAt = null;
  parsedSchedule = null;
  jobRunning = false;
  console.log('[Scheduler] Cleanup scheduler stopped');
};

export const getSchedulerStatus = () => ({
  enabled: schedulerConfig?.enabled ?? false,
  running: jobRunning,
  schedule: schedulerConfig?.schedule || null,
  nextRunAt,
  lastRunAt,
  lastRunSummary: lastSummary,
});
