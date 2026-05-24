import React, { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

const StatsView: React.FC = () => {
  const { stats, loadStats } = useAppStore();

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Loading metrics...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Statistics</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Conversational dispatch metrics across all sessions.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Conversations"
            value={stats.totalConversations.toString()}
            detail="Total sessions initialized"
          />
          <StatCard
            label="Successful Escapes"
            value={stats.totalEscapes.toString()}
            detail="Sessions reaching a terminal persona state"
            accent
          />
          <StatCard
            label="Messages Sent"
            value={stats.totalUserMessages.toString()}
            detail="User inputs processed"
          />
          <StatCard
            label="Responses Generated"
            value={stats.totalAssistantMessages.toString()}
            detail="Deterministic dispatches emitted"
          />
        </div>

        <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-panel)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Conversational Memory
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            <MetricRow label="Total Messages" value={stats.totalMessages.toString()} />
            <MetricRow label="Topic Memories Extracted" value={stats.memoriesStored.toString()} />
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center pt-4 pb-8">
          All data is stored locally. No network calls were made in the generation of these metrics.
        </p>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; detail: string; accent?: boolean }> = ({
  label, value, detail, accent,
}) => (
  <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-panel)] p-5 space-y-2">
    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-medium">{label}</p>
    <p className={`text-3xl font-bold ${accent ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
      {value}
    </p>
    <p className="text-xs text-[var(--text-muted)]">{detail}</p>
  </div>
);

const MetricRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-5 py-3">
    <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">{value}</span>
  </div>
);

export default StatsView;
