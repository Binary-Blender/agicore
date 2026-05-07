import React, { useEffect, useRef } from 'react';
import { useWriterStore } from '../store/writerStore';

export default function WritingDashboardPanel() {
  const {
    setShowDashboard,
    dashboardStats,
    dashboardLoading,
    loadDashboardStats,
  } = useWriterStore();

  useEffect(() => {
    loadDashboardStats();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-lg border border-[var(--border)] w-[720px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Writing Dashboard</h2>
          <button
            onClick={() => setShowDashboard(false)}
            className="text-surface-500 hover:text-surface-300"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {dashboardLoading && !dashboardStats && (
            <div className="flex items-center justify-center py-12 text-surface-500">
              Loading stats...
            </div>
          )}

          {dashboardStats && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Total Words" value={dashboardStats.totalWords.toLocaleString()} color="text-primary-300" />
                <StatCard label="Chapters" value={dashboardStats.totalChapters.toString()} color="text-blue-300" />
                <StatCard label="Avg Words/Ch" value={dashboardStats.avgWordsPerChapter.toLocaleString()} color="text-green-300" />
                <StatCard label="Encyclopedia" value={dashboardStats.totalEncyclopediaEntries.toString()} color="text-purple-300" />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Sessions" value={dashboardStats.totalSessions.toString()} color="text-cyan-300" />
                <StatCard label="Writing Time" value={`${dashboardStats.totalWritingMinutes}m`} color="text-yellow-300" />
                <StatCard label="Avg Session" value={`${dashboardStats.avgSessionMinutes}m`} color="text-orange-300" />
                <StatCard label="AI Ops" value={`${dashboardStats.totalAiOperations} (${dashboardStats.aiAcceptRate}%)`} color="text-pink-300" />
              </div>

              {/* Chapter extremes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1a1a2e]/80 border border-green-500/20 rounded p-3">
                  <div className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Longest Chapter</div>
                  <div className="text-sm text-green-300">{dashboardStats.longestChapter.title}</div>
                  <div className="text-xs text-surface-400">{dashboardStats.longestChapter.words.toLocaleString()} words</div>
                </div>
                <div className="bg-[#1a1a2e]/80 border border-orange-500/20 rounded p-3">
                  <div className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Shortest Chapter</div>
                  <div className="text-sm text-orange-300">{dashboardStats.shortestChapter.title}</div>
                  <div className="text-xs text-surface-400">{dashboardStats.shortestChapter.words.toLocaleString()} words</div>
                </div>
              </div>

              {/* Words per day chart */}
              {dashboardStats.wordsPerDay.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Words Per Day</h3>
                  <BarChart
                    data={dashboardStats.wordsPerDay}
                    labelKey="date"
                    valueKey="words"
                    color="#4c6ef5"
                    height={140}
                    formatLabel={(d: string) => d.slice(5)} // MM-DD
                  />
                </div>
              )}

              {/* Words by chapter chart */}
              {dashboardStats.wordsByChapter.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Words by Chapter</h3>
                  <BarChart
                    data={dashboardStats.wordsByChapter}
                    labelKey="title"
                    valueKey="words"
                    color="#22c55e"
                    height={Math.max(100, dashboardStats.wordsByChapter.length * 28)}
                    horizontal
                  />
                </div>
              )}
            </div>
          )}

          {!dashboardLoading && !dashboardStats && (
            <div className="flex items-center justify-center py-12 text-surface-500">
              No data available yet. Start writing!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] flex justify-between items-center shrink-0">
          <button
            onClick={loadDashboardStats}
            disabled={dashboardLoading}
            className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {dashboardLoading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowDashboard(false)}
            className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1a1a2e]/80 border border-[var(--border)] rounded p-3 text-center">
      <div className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function BarChart({
  data,
  labelKey,
  valueKey,
  color,
  height,
  horizontal,
  formatLabel,
}: {
  data: any[];
  labelKey: string;
  valueKey: string;
  color: string;
  height: number;
  horizontal?: boolean;
  formatLabel?: (val: string) => string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
    const labelW = horizontal ? 100 : 0;
    const bottomPad = horizontal ? 0 : 30;
    const leftPad = horizontal ? labelW : 10;
    const rightPad = horizontal ? 40 : 10;
    const topPad = 5;
    const chartW = w - leftPad - rightPad;
    const chartH = h - topPad - bottomPad;

    ctx.font = '10px -apple-system, sans-serif';

    if (horizontal) {
      // Horizontal bar chart (chapters)
      const barH = Math.min(20, chartH / data.length - 4);
      const gap = (chartH - barH * data.length) / (data.length + 1);

      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const y = topPad + gap + i * (barH + gap);
        const barW = (d[valueKey] / maxVal) * chartW;

        // Label
        ctx.fillStyle = '#adb5bd';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const label = d[labelKey].length > 14 ? d[labelKey].slice(0, 13) + '...' : d[labelKey];
        ctx.fillText(label, leftPad - 8, y + barH / 2);

        // Bar
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(leftPad, y, Math.max(2, barW), barH);
        ctx.globalAlpha = 1;

        // Value
        ctx.fillStyle = '#adb5bd';
        ctx.textAlign = 'left';
        ctx.fillText(d[valueKey].toLocaleString(), leftPad + barW + 4, y + barH / 2);
      }
    } else {
      // Vertical bar chart (daily words)
      const barW = Math.min(30, chartW / data.length - 2);
      const gap = (chartW - barW * data.length) / (data.length + 1);

      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const x = leftPad + gap + i * (barW + gap);
        const barH2 = (d[valueKey] / maxVal) * chartH;

        // Bar
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, topPad + chartH - barH2, barW, Math.max(1, barH2));
        ctx.globalAlpha = 1;

        // Label (every Nth to avoid overlap)
        const showEvery = Math.max(1, Math.floor(data.length / 10));
        if (i % showEvery === 0) {
          ctx.fillStyle = '#6c6f85';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const label = formatLabel ? formatLabel(d[labelKey]) : d[labelKey];
          ctx.fillText(label, x + barW / 2, topPad + chartH + 4);
        }
      }
    }
  }, [data, color, horizontal]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height }}
      className="bg-[#1a1a2e]/40 rounded border border-[var(--border)]"
    />
  );
}
