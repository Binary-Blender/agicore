import React, { useEffect, useState } from 'react';
import { useSocialStore } from '../store/socialStore';
import type { SpcMetric, AutomationTierEntry } from '../../shared/types';

// -- Formatting helpers --

const RESPONSE_MODE_LABELS: Record<string, { label: string; color: string }> = {
  standard: { label: 'Standard', color: 'bg-indigo-500/20 text-indigo-400' },
  agree_amplify: { label: 'Agree & Amplify', color: 'bg-green-500/20 text-green-400' },
  educate: { label: 'Educate', color: 'bg-amber-500/20 text-amber-400' },
  battle: { label: 'High Stakes', color: 'bg-red-500/20 text-red-400' },
};

const TIER_LABELS: Record<number, string> = {
  0: 'Manual Only',
  1: 'Assisted Drafting',
  2: 'Auto-Send Low-Risk',
  3: 'Autonomous',
};

const TIER_BADGE_COLORS: Record<number, string> = {
  0: 'bg-gray-500/20 text-gray-400',
  1: 'bg-blue-500/20 text-blue-400',
  2: 'bg-green-500/20 text-green-400',
  3: 'bg-purple-500/20 text-purple-400',
};

const CONTROL_STATE_BADGES: Record<string, string> = {
  in_control: 'bg-green-500/20 text-green-400',
  warning: 'bg-amber-500/20 text-amber-400',
  out_of_control: 'bg-red-500/20 text-red-400',
  monitoring: 'bg-gray-500/20 text-gray-400',
};

const CONTROL_STATE_LABELS: Record<string, string> = {
  in_control: 'In Control',
  warning: 'Warning',
  out_of_control: 'Out of Control',
  monitoring: 'Monitoring',
};

function formatChannelType(channel: string): string {
  return channel
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '--';
  return `${(value * 100).toFixed(1)}%`;
}

function acceptanceRateColor(rate: number): string {
  if (rate >= 0.8) return 'text-green-400';
  if (rate >= 0.6) return 'text-amber-400';
  return 'text-red-400';
}

// Tier thresholds: { minSamples, minAcceptance }
const TIER_THRESHOLDS: Record<number, { samples: number; acceptance: number }> = {
  1: { samples: 50, acceptance: 0.80 },
  2: { samples: 100, acceptance: 0.95 },
  3: { samples: 500, acceptance: 0.98 },
};

function timeToTierEstimate(
  currentTier: number,
  sampleSize: number,
  acceptanceRate: number,
  responseMode: string
): string | null {
  if (responseMode === 'battle') return null; // locked at T0
  const nextTier = currentTier + 1;
  const threshold = TIER_THRESHOLDS[nextTier];
  if (!threshold) return null; // already at max

  const samplesNeeded = Math.max(0, threshold.samples - sampleSize);
  const rateOk = acceptanceRate >= threshold.acceptance;

  if (samplesNeeded === 0 && rateOk) return 'Eligible now';
  if (samplesNeeded > 0 && rateOk) return `${samplesNeeded} more samples to T${nextTier}`;
  if (samplesNeeded === 0 && !rateOk)
    return `Need ${(threshold.acceptance * 100).toFixed(0)}% acceptance for T${nextTier}`;
  return `${samplesNeeded} samples + ${(threshold.acceptance * 100).toFixed(0)}% rate for T${nextTier}`;
}

// -- SVG Control Chart --

interface ControlChartProps {
  metric: SpcMetric;
}

const ControlChart: React.FC<ControlChartProps> = ({ metric }) => {
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 60, bottom: 20, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Determine y-axis range
  const values = [
    metric.acceptanceRate,
    metric.upperControlLimit,
    metric.lowerControlLimit,
    metric.meanValue,
  ].filter((v): v is number => v != null);

  let yMin = Math.min(...values, 0);
  let yMax = Math.max(...values, 1);
  // Add padding
  const yRange = yMax - yMin || 0.1;
  yMin = Math.max(0, yMin - yRange * 0.1);
  yMax = Math.min(1, yMax + yRange * 0.1);

  const toY = (val: number) => {
    const ratio = (val - yMin) / (yMax - yMin);
    return padding.top + chartH * (1 - ratio);
  };

  const toX = (_idx: number) => padding.left + chartW / 2;

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => yMin + (i * (yMax - yMin)) / tickCount);

  // Point color
  let pointColor = '#9ca3af'; // gray
  if (metric.controlState === 'in_control') pointColor = '#4ade80';
  else if (metric.controlState === 'warning') pointColor = '#fbbf24';
  else if (metric.controlState === 'out_of_control') pointColor = '#f87171';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 200 }}>
      {/* Background */}
      <rect x={padding.left} y={padding.top} width={chartW} height={chartH} fill="var(--bg-input)" rx={4} />

      {/* Y-axis ticks and labels */}
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={padding.left}
            y1={toY(tick)}
            x2={padding.left + chartW}
            y2={toY(tick)}
            stroke="var(--border)"
            strokeWidth={0.5}
          />
          <text
            x={padding.left - 8}
            y={toY(tick) + 4}
            textAnchor="end"
            fill="var(--text-muted)"
            fontSize={10}
          >
            {(tick * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* UCL line (red dashed) */}
      {metric.upperControlLimit != null && (
        <>
          <line
            x1={padding.left}
            y1={toY(metric.upperControlLimit)}
            x2={padding.left + chartW}
            y2={toY(metric.upperControlLimit)}
            stroke="#f87171"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
          <text
            x={padding.left + chartW + 6}
            y={toY(metric.upperControlLimit) + 4}
            fill="#f87171"
            fontSize={10}
          >
            UCL
          </text>
        </>
      )}

      {/* LCL line (red dashed) */}
      {metric.lowerControlLimit != null && (
        <>
          <line
            x1={padding.left}
            y1={toY(metric.lowerControlLimit)}
            x2={padding.left + chartW}
            y2={toY(metric.lowerControlLimit)}
            stroke="#f87171"
            strokeWidth={1.5}
            strokeDasharray="6 3"
          />
          <text
            x={padding.left + chartW + 6}
            y={toY(metric.lowerControlLimit) + 4}
            fill="#f87171"
            fontSize={10}
          >
            LCL
          </text>
        </>
      )}

      {/* Mean line (blue solid) */}
      {metric.meanValue != null && (
        <>
          <line
            x1={padding.left}
            y1={toY(metric.meanValue)}
            x2={padding.left + chartW}
            y2={toY(metric.meanValue)}
            stroke="#60a5fa"
            strokeWidth={1.5}
          />
          <text
            x={padding.left + chartW + 6}
            y={toY(metric.meanValue) + 4}
            fill="#60a5fa"
            fontSize={10}
          >
            Mean
          </text>
        </>
      )}

      {/* Data point (filled circle) */}
      <circle
        cx={toX(0)}
        cy={toY(metric.acceptanceRate)}
        r={8}
        fill={pointColor}
        stroke="white"
        strokeWidth={2}
      />
      <text
        x={toX(0)}
        y={toY(metric.acceptanceRate) - 14}
        textAnchor="middle"
        fill={pointColor}
        fontSize={11}
        fontWeight="bold"
      >
        {(metric.acceptanceRate * 100).toFixed(1)}%
      </text>
    </svg>
  );
};

// -- Main Component --

const SPCDashboard: React.FC = () => {
  const spcMetrics = useSocialStore((s) => s.spcMetrics);
  const automationTiers = useSocialStore((s) => s.automationTiers);
  const redlineTopics = useSocialStore((s) => s.redlineTopics);
  const isRecalculating = useSocialStore((s) => s.isRecalculating);
  const loadSpcMetrics = useSocialStore((s) => s.loadSpcMetrics);
  const loadAutomationTiers = useSocialStore((s) => s.loadAutomationTiers);
  const calculateSpcMetrics = useSocialStore((s) => s.calculateSpcMetrics);
  const updateAutomationTier = useSocialStore((s) => s.updateAutomationTier);
  const loadRedlineTopics = useSocialStore((s) => s.loadRedlineTopics);
  const saveRedlineTopics = useSocialStore((s) => s.saveRedlineTopics);

  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [newRedlineTopic, setNewRedlineTopic] = useState('');
  const [tierOverrides, setTierOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    loadSpcMetrics();
    loadAutomationTiers();
    loadRedlineTopics();
  }, []);

  // -- Overview calculations --

  const totalFeedback = spcMetrics.reduce((sum, m) => sum + m.sampleSize, 0);

  const avgAcceptance =
    totalFeedback > 0
      ? spcMetrics.reduce((sum, m) => sum + m.acceptanceRate * m.sampleSize, 0) / totalFeedback
      : 0;

  const activeCombos = spcMetrics.length;

  const tierCounts = [0, 1, 2, 3].map(
    (tier) => automationTiers.filter((t) => t.currentTier === tier).length
  );

  const selectedMetric = spcMetrics.find((m) => m.id === selectedMetricId) ?? null;

  // -- Handlers --

  const handleRecalculate = () => {
    calculateSpcMetrics();
  };

  const handleAddRedlineTopic = () => {
    const topic = newRedlineTopic.trim();
    if (!topic || redlineTopics.includes(topic)) return;
    saveRedlineTopics([...redlineTopics, topic]);
    setNewRedlineTopic('');
  };

  const handleRemoveRedlineTopic = (topic: string) => {
    saveRedlineTopics(redlineTopics.filter((t) => t !== topic));
  };

  const handleTierOverride = (entry: AutomationTierEntry) => {
    const key = `${entry.channelType}:${entry.responseMode}`;
    const newTier = tierOverrides[key];
    if (newTier == null || newTier === entry.currentTier) return;
    updateAutomationTier(entry.channelType, entry.responseMode, newTier, 'Manual override');
    setTierOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleRedlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRedlineTopic();
    }
  };

  // -- Render --

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* 1. Header Bar (sticky) */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border)]"
        style={{ backgroundColor: 'var(--bg-page)' }}
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-heading)]">SPC Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">Statistical Process Control</p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isRecalculating && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          Recalculate
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* 2. Overview Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-4">
            <p className="text-sm text-[var(--text-muted)] mb-1">Total Feedback</p>
            <p className="text-3xl font-bold text-indigo-400">{totalFeedback}</p>
          </div>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-4">
            <p className="text-sm text-[var(--text-muted)] mb-1">Avg Acceptance</p>
            <p className={`text-3xl font-bold ${acceptanceRateColor(avgAcceptance)}`}>
              {totalFeedback > 0 ? `${(avgAcceptance * 100).toFixed(1)}%` : '--'}
            </p>
          </div>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-4">
            <p className="text-sm text-[var(--text-muted)] mb-1">Active Combos</p>
            <p className="text-3xl font-bold text-sky-400">{activeCombos}</p>
          </div>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-4">
            <p className="text-sm text-[var(--text-muted)] mb-1">Tier Distribution</p>
            <div className="flex items-baseline gap-3 mt-1">
              {[0, 1, 2, 3].map((tier) => (
                <span key={tier} className="text-sm text-[var(--text-primary)]">
                  <span className="text-[var(--text-muted)]">T{tier}:</span>{' '}
                  <span className="font-semibold">{tierCounts[tier]}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Metrics Table + Control Chart */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-heading)]">SPC Metrics by Channel / Mode</h2>
          </div>

          {spcMetrics.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
              No SPC metrics yet. Submit feedback on drafts to generate data.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="text-left px-4 py-2 font-medium">Channel</th>
                    <th className="text-left px-4 py-2 font-medium">Mode</th>
                    <th className="text-right px-4 py-2 font-medium">Acceptance</th>
                    <th className="text-right px-4 py-2 font-medium">Sample</th>
                    <th className="text-left px-4 py-2 font-medium">Control State</th>
                    <th className="text-right px-4 py-2 font-medium">UCL</th>
                    <th className="text-right px-4 py-2 font-medium">Mean</th>
                    <th className="text-right px-4 py-2 font-medium">LCL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {spcMetrics.map((metric) => {
                    const modeInfo = RESPONSE_MODE_LABELS[metric.responseMode] ?? {
                      label: metric.responseMode,
                      color: 'bg-gray-500/20 text-gray-400',
                    };
                    const isSelected = metric.id === selectedMetricId;

                    return (
                      <tr
                        key={metric.id}
                        onClick={() => setSelectedMetricId(isSelected ? null : metric.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-500/10'
                            : 'hover:bg-[var(--bg-hover)]'
                        }`}
                      >
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-[var(--text-primary)]">
                            {formatChannelType(metric.channelType)}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${modeInfo.color}`}
                          >
                            {modeInfo.label}
                          </span>
                        </td>
                        <td className={`px-4 py-2 text-right font-semibold ${acceptanceRateColor(metric.acceptanceRate)}`}>
                          {formatPercent(metric.acceptanceRate)}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-primary)]">
                          {metric.sampleSize}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              CONTROL_STATE_BADGES[metric.controlState] ?? 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            {CONTROL_STATE_LABELS[metric.controlState] ?? metric.controlState}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-muted)]">
                          {formatPercent(metric.upperControlLimit)}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-muted)]">
                          {formatPercent(metric.meanValue)}
                        </td>
                        <td className="px-4 py-2 text-right text-[var(--text-muted)]">
                          {formatPercent(metric.lowerControlLimit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Control Chart */}
          <div className="border-t border-[var(--border)] px-4 py-4">
            {selectedMetric ? (
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  Control Chart: {formatChannelType(selectedMetric.channelType)} /{' '}
                  {RESPONSE_MODE_LABELS[selectedMetric.responseMode]?.label ?? selectedMetric.responseMode}
                </p>
                <ControlChart metric={selectedMetric} />
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">
                Select a row above to view control chart
              </p>
            )}
          </div>
        </div>

        {/* 4. Automation Tiers Section */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-heading)]">Automation Tiers</h2>
          </div>

          {automationTiers.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">
              No automation tier entries yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="text-left px-4 py-2 font-medium">Channel</th>
                    <th className="text-left px-4 py-2 font-medium">Mode</th>
                    <th className="text-left px-4 py-2 font-medium">Current Tier</th>
                    <th className="text-left px-4 py-2 font-medium">Next Tier</th>
                    <th className="text-left px-4 py-2 font-medium">Reason</th>
                    <th className="text-left px-4 py-2 font-medium">Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {automationTiers.map((entry) => {
                    const modeInfo = RESPONSE_MODE_LABELS[entry.responseMode] ?? {
                      label: entry.responseMode,
                      color: 'bg-gray-500/20 text-gray-400',
                    };
                    const key = `${entry.channelType}:${entry.responseMode}`;
                    const isBattle = entry.responseMode === 'battle';
                    const matchingMetric = spcMetrics.find(
                      (m) => m.channelType === entry.channelType && m.responseMode === entry.responseMode
                    );
                    const tierEstimate = timeToTierEstimate(
                      entry.currentTier,
                      matchingMetric?.sampleSize ?? 0,
                      matchingMetric?.acceptanceRate ?? 0,
                      entry.responseMode
                    );

                    return (
                      <tr key={entry.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-[var(--text-primary)]">
                            {formatChannelType(entry.channelType)}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${modeInfo.color}`}
                          >
                            {modeInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              TIER_BADGE_COLORS[entry.currentTier] ?? 'bg-gray-500/20 text-gray-400'
                            }`}
                          >
                            T{entry.currentTier}: {TIER_LABELS[entry.currentTier] ?? 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {tierEstimate ? (
                            <span className={`text-xs ${tierEstimate === 'Eligible now' ? 'text-green-400 font-medium' : 'text-[var(--text-muted)]'}`}>
                              {tierEstimate}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">
                              {isBattle ? 'Locked' : 'Max tier'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-[var(--text-muted)] max-w-[200px] truncate">
                          {entry.reason || '--'}
                        </td>
                        <td className="px-4 py-2">
                          {isBattle ? (
                            <span className="text-xs text-red-400 font-medium">Locked</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                value={tierOverrides[key] ?? entry.currentTier}
                                onChange={(e) =>
                                  setTierOverrides((prev) => ({
                                    ...prev,
                                    [key]: parseInt(e.target.value, 10),
                                  }))
                                }
                                className="bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value={0}>T0: Manual Only</option>
                                <option value={1}>T1: Assisted Drafting</option>
                                <option value={2}>T2: Auto-Send Low-Risk</option>
                                <option value={3}>T3: Autonomous</option>
                              </select>
                              <button
                                onClick={() => handleTierOverride(entry)}
                                disabled={
                                  tierOverrides[key] == null ||
                                  tierOverrides[key] === entry.currentTier
                                }
                                className="px-2 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded transition-colors"
                              >
                                Override
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 5. Redline Topics Section */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-heading)]">Redline Topics</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Messages containing these topics are forced to Tier 0 (manual only)
            </p>
          </div>

          <div className="p-4 space-y-3">
            {/* Add input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newRedlineTopic}
                onChange={(e) => setNewRedlineTopic(e.target.value)}
                onKeyDown={handleRedlineKeyDown}
                placeholder="Enter a redline topic..."
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={handleAddRedlineTopic}
                disabled={!newRedlineTopic.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>

            {/* Topic pills */}
            {redlineTopics.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] py-2">No redline topics configured</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {redlineTopics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-red-500/15 text-red-400 border border-red-500/30"
                  >
                    {topic}
                    <button
                      onClick={() => handleRemoveRedlineTopic(topic)}
                      className="hover:text-red-300 transition-colors"
                      aria-label={`Remove ${topic}`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SPCDashboard;
