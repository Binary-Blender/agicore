// NovaSyn Social — SPC (Statistical Process Control) Service
// Calculates quality metrics from feedback data, manages automation tiers,
// and enforces redline topics.

import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

// ============================================================================
// Constants
// ============================================================================

const MIN_SAMPLES_FOR_SPC = 20;
const LIGHT_EDIT_THRESHOLD = 0.3; // edit_distance < 0.3 = light edit

// Tier promotion requirements: { minSamples, minAcceptance }
const TIER_REQUIREMENTS: Record<number, { minSamples: number; minAcceptance: number }> = {
  1: { minSamples: 50, minAcceptance: 0.80 },
  2: { minSamples: 100, minAcceptance: 0.95 },
  3: { minSamples: 500, minAcceptance: 0.98 },
};

// Tier descriptions
const TIER_LABELS: Record<number, string> = {
  0: 'Manual only',
  1: 'Assisted drafting',
  2: 'Auto-send low-risk',
  3: 'Autonomous (experimental)',
};

// ============================================================================
// SPC Metric Calculation
// ============================================================================

interface SpcCalculation {
  channelType: string;
  responseMode: string;
  acceptanceRate: number;
  lightEditRate: number;
  heavyEditRate: number;
  misclassificationRate: number;
  sampleSize: number;
  controlState: string;
  upperControlLimit: number | null;
  lowerControlLimit: number | null;
  meanValue: number | null;
}

/**
 * Calculate SPC metrics for all channel/mode combinations from feedback data.
 * Uses a p-chart (proportion chart) with 3-sigma control limits.
 */
export function calculateAllMetrics(db: Database.Database): SpcCalculation[] {
  // Query all feedback joined with draft + message to get channel/mode
  const rows = db.prepare(`
    SELECT
      m.channel_type,
      d.response_mode,
      fe.was_accepted,
      fe.edit_distance,
      fe.edit_classification,
      fe.was_sent
    FROM feedback_events fe
    JOIN drafts d ON d.id = fe.draft_id
    JOIN messages m ON m.id = d.message_id
    ORDER BY fe.created_at ASC
  `).all() as any[];

  // Group by channel_type + response_mode
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const key = `${row.channel_type}|${row.response_mode}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const results: SpcCalculation[] = [];

  for (const [key, events] of groups) {
    const [channelType, responseMode] = key.split('|');
    const n = events.length;

    // --- Acceptance rate ---
    const accepted = events.filter((e: any) => e.was_accepted).length;
    const acceptanceRate = n > 0 ? accepted / n : 0;

    // --- Edit rates (among accepted drafts only) ---
    const acceptedEvents = events.filter((e: any) => e.was_accepted);
    const lightEdits = acceptedEvents.filter(
      (e: any) => e.edit_distance > 0 && e.edit_distance < LIGHT_EDIT_THRESHOLD
    ).length;
    const heavyEdits = acceptedEvents.filter(
      (e: any) => e.edit_distance >= LIGHT_EDIT_THRESHOLD
    ).length;
    const lightEditRate = acceptedEvents.length > 0 ? lightEdits / acceptedEvents.length : 0;
    const heavyEditRate = acceptedEvents.length > 0 ? heavyEdits / acceptedEvents.length : 0;

    // --- Misclassification rate (factual corrections) ---
    const misclassified = events.filter(
      (e: any) => e.edit_classification === 'factual'
    ).length;
    const misclassificationRate = n > 0 ? misclassified / n : 0;

    // --- P-chart control limits ---
    let controlState = 'monitoring';
    let ucl: number | null = null;
    let lcl: number | null = null;
    let mean: number | null = null;

    if (n >= MIN_SAMPLES_FOR_SPC) {
      mean = acceptanceRate;
      const sigma = Math.sqrt((mean * (1 - mean)) / n);

      ucl = Math.min(1, mean + 3 * sigma);
      lcl = Math.max(0, mean - 3 * sigma);

      // Evaluate control state from recent samples (last 10 or all)
      const recentCount = Math.min(10, n);
      const recentEvents = events.slice(-recentCount);
      const recentAcceptance =
        recentEvents.filter((e: any) => e.was_accepted).length / recentCount;

      if (recentAcceptance > ucl || recentAcceptance < lcl) {
        controlState = 'out_of_control';
      } else {
        const sigma2Upper = mean + 2 * sigma;
        const sigma2Lower = mean - 2 * sigma;
        if (recentAcceptance > sigma2Upper || recentAcceptance < sigma2Lower) {
          controlState = 'warning';
        } else {
          controlState = 'in_control';
        }
      }
    }

    results.push({
      channelType,
      responseMode,
      acceptanceRate,
      lightEditRate,
      heavyEditRate,
      misclassificationRate,
      sampleSize: n,
      controlState,
      upperControlLimit: ucl,
      lowerControlLimit: lcl,
      meanValue: mean,
    });
  }

  return results;
}

/**
 * Upsert calculated metrics into the spc_metrics table.
 * Uses UNIQUE(channel_type, response_mode) for conflict resolution.
 */
export function upsertMetrics(db: Database.Database, metrics: SpcCalculation[]): void {
  const upsert = db.prepare(`
    INSERT INTO spc_metrics (
      id, channel_type, response_mode,
      acceptance_rate, light_edit_rate, heavy_edit_rate, misclassification_rate,
      sample_size, control_state,
      upper_control_limit, lower_control_limit, mean_value,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(channel_type, response_mode) DO UPDATE SET
      acceptance_rate = excluded.acceptance_rate,
      light_edit_rate = excluded.light_edit_rate,
      heavy_edit_rate = excluded.heavy_edit_rate,
      misclassification_rate = excluded.misclassification_rate,
      sample_size = excluded.sample_size,
      control_state = excluded.control_state,
      upper_control_limit = excluded.upper_control_limit,
      lower_control_limit = excluded.lower_control_limit,
      mean_value = excluded.mean_value,
      updated_at = datetime('now')
  `);

  db.transaction(() => {
    for (const m of metrics) {
      upsert.run(
        uuidv4(),
        m.channelType,
        m.responseMode,
        m.acceptanceRate,
        m.lightEditRate,
        m.heavyEditRate,
        m.misclassificationRate,
        m.sampleSize,
        m.controlState,
        m.upperControlLimit,
        m.lowerControlLimit,
        m.meanValue
      );
    }
  })();
}

// ============================================================================
// Automation Tier Evaluation
// ============================================================================

/**
 * Evaluate and update automation tiers based on current SPC metrics.
 * Rules:
 * - Battle mode: ALWAYS Tier 0 (permanent)
 * - Promotion: one tier at a time, requires in_control + threshold
 * - Demotion: out_of_control or acceptance drops below tier requirement
 */
export function evaluateAutomationTiers(db: Database.Database): void {
  const metrics = db.prepare('SELECT * FROM spc_metrics').all() as any[];

  const upsert = db.prepare(`
    INSERT INTO automation_tiers (id, channel_type, response_mode, current_tier, reason, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(channel_type, response_mode) DO UPDATE SET
      current_tier = excluded.current_tier,
      reason = excluded.reason,
      updated_at = datetime('now')
  `);

  db.transaction(() => {
    for (const m of metrics) {
      // Battle mode is ALWAYS Tier 0 — no exceptions
      if (m.response_mode === 'battle') {
        upsert.run(
          uuidv4(), m.channel_type, m.response_mode, 0,
          'Battle Mode: permanently manual'
        );
        continue;
      }

      // Get current tier (default 0)
      const currentRow = db.prepare(
        'SELECT current_tier FROM automation_tiers WHERE channel_type = ? AND response_mode = ?'
      ).get(m.channel_type, m.response_mode) as any;
      const currentTier: number = currentRow?.current_tier ?? 0;

      // Out of control → demote one tier
      if (m.control_state === 'out_of_control' && currentTier > 0) {
        const newTier = currentTier - 1;
        upsert.run(
          uuidv4(), m.channel_type, m.response_mode, newTier,
          `Demoted: SPC out of control (acceptance: ${(m.acceptance_rate * 100).toFixed(1)}%)`
        );
        continue;
      }

      // Determine highest qualifying tier
      let qualifiedTier = 0;
      for (const [tier, req] of Object.entries(TIER_REQUIREMENTS)) {
        const t = parseInt(tier);
        if (
          m.sample_size >= req.minSamples &&
          m.acceptance_rate >= req.minAcceptance &&
          m.control_state === 'in_control'
        ) {
          qualifiedTier = t;
        }
      }

      if (qualifiedTier > currentTier) {
        // Promote one tier at a time
        const newTier = currentTier + 1;
        upsert.run(
          uuidv4(), m.channel_type, m.response_mode, newTier,
          `Promoted to ${TIER_LABELS[newTier]}: ${m.sample_size} samples, ${(m.acceptance_rate * 100).toFixed(1)}% acceptance`
        );
      } else if (currentTier > 0) {
        // Check if current tier requirements still met
        const req = TIER_REQUIREMENTS[currentTier];
        if (req && m.acceptance_rate < req.minAcceptance * 0.95) {
          // 5% grace buffer before demotion
          const newTier = currentTier - 1;
          upsert.run(
            uuidv4(), m.channel_type, m.response_mode, newTier,
            `Demoted: acceptance dropped to ${(m.acceptance_rate * 100).toFixed(1)}%`
          );
        } else {
          // Maintain
          upsert.run(
            uuidv4(), m.channel_type, m.response_mode, currentTier,
            `${TIER_LABELS[currentTier]}: ${(m.acceptance_rate * 100).toFixed(1)}% acceptance`
          );
        }
      } else {
        // Tier 0 — still collecting data
        upsert.run(
          uuidv4(), m.channel_type, m.response_mode, 0,
          m.sample_size > 0
            ? `Collecting data: ${m.sample_size} samples, ${(m.acceptance_rate * 100).toFixed(1)}% acceptance`
            : 'Tier 0: no feedback data yet'
        );
      }
    }
  })();
}

// ============================================================================
// Full SPC Recalculation
// ============================================================================

/**
 * Run the full SPC pipeline: calculate metrics → upsert → evaluate tiers.
 * Call this after submitting feedback or on a manual "Recalculate" action.
 */
export function recalculateSpc(db: Database.Database): void {
  const metrics = calculateAllMetrics(db);
  upsertMetrics(db, metrics);
  evaluateAutomationTiers(db);
  console.log(`[SPC] Recalculated: ${metrics.length} channel/mode combinations`);
}

// ============================================================================
// Redline Topics
// ============================================================================

/**
 * Check if message text contains any redline topics.
 * If a redline is detected, the message should be forced to Tier 0.
 */
export function checkRedlineTopics(text: string, topics: string[]): boolean {
  if (!topics || topics.length === 0) return false;
  const lowerText = text.toLowerCase();
  return topics.some((topic) => lowerText.includes(topic.toLowerCase()));
}

/**
 * Get redline topics from settings.
 */
export function getRedlineTopics(db: Database.Database): string[] {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'redline_topics'").get() as any;
  if (!row?.value) return [];
  try {
    return JSON.parse(row.value);
  } catch {
    return [];
  }
}

/**
 * Save redline topics to settings.
 */
export function saveRedlineTopics(db: Database.Database, topics: string[]): void {
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('redline_topics', ?)"
  ).run(JSON.stringify(topics));
}

/**
 * Get the effective automation tier for a message, considering redline topics.
 * If the message contains a redline topic, returns 0 regardless of SPC tier.
 */
export function getEffectiveTier(
  db: Database.Database,
  channelType: string,
  responseMode: string,
  messageBody: string
): { tier: number; reason: string; isRedlined: boolean } {
  // Battle mode is always 0
  if (responseMode === 'battle') {
    return { tier: 0, reason: 'Battle Mode: permanently manual', isRedlined: false };
  }

  // Check redline topics
  const topics = getRedlineTopics(db);
  if (checkRedlineTopics(messageBody, topics)) {
    return { tier: 0, reason: 'Redline topic detected — forced manual', isRedlined: true };
  }

  // Look up the automation tier
  const row = db.prepare(
    'SELECT current_tier, reason FROM automation_tiers WHERE channel_type = ? AND response_mode = ?'
  ).get(channelType, responseMode) as any;

  return {
    tier: row?.current_tier ?? 0,
    reason: row?.reason ?? 'No tier data',
    isRedlined: false,
  };
}
