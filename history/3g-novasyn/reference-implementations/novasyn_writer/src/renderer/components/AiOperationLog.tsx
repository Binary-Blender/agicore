import React, { useEffect, useState } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { AiOperation } from '../../shared/types';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const OP_COLORS: Record<string, string> = {
  continue: 'text-blue-400 bg-blue-600/20',
  expand: 'text-green-400 bg-green-600/20',
  rewrite: 'text-yellow-400 bg-yellow-600/20',
  brainstorm: 'text-purple-400 bg-purple-600/20',
  dialogue: 'text-pink-400 bg-pink-600/20',
  show: 'text-orange-400 bg-orange-600/20',
  compress: 'text-red-400 bg-red-600/20',
  tone: 'text-indigo-400 bg-indigo-600/20',
  summarize: 'text-cyan-400 bg-cyan-600/20',
  scene: 'text-emerald-400 bg-emerald-600/20',
  custom: 'text-surface-400 bg-surface-700',
};

function StarRating({ rating, onRate }: { rating: number | null; onRate: (r: number) => void }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={(e) => { e.stopPropagation(); onRate(star); }}
          onMouseEnter={() => setHover(star)}
          className="text-sm transition-colors"
        >
          <span className={
            (hover || rating || 0) >= star
              ? 'text-yellow-400'
              : 'text-surface-600'
          }>
            *
          </span>
        </button>
      ))}
    </div>
  );
}

function OperationRow({ op, onRate }: { op: AiOperation; onRate: (id: string, rating: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const color = OP_COLORS[op.operationType] ?? OP_COLORS.custom;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/5 cursor-pointer"
      >
        {/* Operation type */}
        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 capitalize ${color}`}>
          {op.operationType}
        </span>

        {/* Model */}
        <span className="text-[10px] text-surface-500 shrink-0">{op.model}</span>

        {/* Prompt preview */}
        <span className="flex-1 text-xs text-surface-400 truncate min-w-0">
          {op.prompt.slice(0, 80)}{op.prompt.length > 80 ? '...' : ''}
        </span>

        {/* Rating */}
        <StarRating rating={op.rating} onRate={(r) => onRate(op.id, r)} />

        {/* Status */}
        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
          op.accepted === 1
            ? 'text-green-400 bg-green-600/20'
            : 'text-surface-500 bg-surface-800'
        }`}>
          {op.accepted === 1 ? 'Accepted' : 'Rejected'}
        </span>

        {/* Tokens */}
        <span className="text-[10px] text-surface-600 shrink-0">
          {op.contextTokens + op.responseTokens}t
        </span>

        {/* Time */}
        <span className="text-[10px] text-surface-600 shrink-0 w-12 text-right">
          {timeAgo(op.createdAt)}
        </span>

        {/* Expand indicator */}
        <span className="text-surface-600 text-xs shrink-0">
          {expanded ? '▼' : '▶'}
        </span>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div>
            <label className="text-[10px] text-surface-500 uppercase tracking-wider block mb-1">Prompt</label>
            <div className="bg-[var(--bg-page)] rounded p-2 text-xs text-surface-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {op.prompt}
            </div>
          </div>
          {op.response && (
            <div>
              <label className="text-[10px] text-surface-500 uppercase tracking-wider block mb-1">Response</label>
              <div className="bg-[var(--bg-page)] rounded p-2 text-xs text-surface-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {op.response}
              </div>
            </div>
          )}
          <div className="flex gap-4 text-[10px] text-surface-500">
            <span>Context: {op.contextTokens} tokens</span>
            <span>Response: {op.responseTokens} tokens</span>
            <span>Model: {op.model}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AiOperationLog() {
  const {
    aiOperations,
    loadAiOperations,
    setShowAiLog,
    chapters,
  } = useWriterStore();

  useEffect(() => {
    loadAiOperations();
  }, []);

  const handleRate = async (id: string, rating: number) => {
    await window.electronAPI.updateAiOperation(id, { rating });
    await loadAiOperations();
  };

  // Summary stats
  const totalOps = aiOperations.length;
  const acceptedOps = aiOperations.filter((op) => op.accepted === 1).length;
  const acceptRate = totalOps > 0 ? Math.round((acceptedOps / totalOps) * 100) : 0;
  const totalTokens = aiOperations.reduce((sum, op) => sum + op.contextTokens + op.responseTokens, 0);

  // Average rating
  const ratedOps = aiOperations.filter((op) => op.rating !== null);
  const avgRating = ratedOps.length > 0
    ? (ratedOps.reduce((sum, op) => sum + (op.rating || 0), 0) / ratedOps.length).toFixed(1)
    : null;

  // Contribution metrics
  const totalWordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const aiWords = aiOperations
    .filter((op) => op.accepted === 1 && op.response)
    .reduce((sum, op) => sum + (op.response?.trim().split(/\s+/).filter(Boolean).length || 0), 0);
  const humanWords = Math.max(0, totalWordCount - aiWords);
  const humanPct = totalWordCount > 0 ? Math.round((humanWords / totalWordCount) * 100) : 100;
  const aiPct = totalWordCount > 0 ? Math.round((aiWords / totalWordCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[700px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">AI Operation Log</h2>
          <button
            onClick={() => setShowAiLog(false)}
            className="text-surface-500 hover:text-surface-300 text-sm"
          >
            Close
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--border)] shrink-0 flex-wrap">
          <div className="text-xs">
            <span className="text-surface-500">Operations: </span>
            <span className="text-surface-300">{totalOps}</span>
          </div>
          <div className="text-xs">
            <span className="text-surface-500">Accepted: </span>
            <span className="text-green-400">{acceptRate}%</span>
          </div>
          <div className="text-xs">
            <span className="text-surface-500">Tokens: </span>
            <span className="text-surface-300">{totalTokens.toLocaleString()}</span>
          </div>
          {avgRating && (
            <div className="text-xs">
              <span className="text-surface-500">Avg Rating: </span>
              <span className="text-yellow-400">{avgRating}/5</span>
            </div>
          )}
          <div className="text-xs ml-auto">
            <span className="text-surface-500">Contribution: </span>
            <span className="text-primary-400">{humanPct}% human</span>
            <span className="text-surface-600"> / </span>
            <span className="text-accent-400">{aiPct}% AI</span>
          </div>
        </div>

        {/* Contribution bar */}
        {totalWordCount > 0 && (
          <div className="px-4 py-1.5 border-b border-[var(--border)] shrink-0">
            <div className="w-full h-2 bg-[var(--bg-page)] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-primary-500 transition-all"
                style={{ width: `${humanPct}%` }}
              />
              <div
                className="h-full bg-accent-500 transition-all"
                style={{ width: `${aiPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Operation list */}
        <div className="flex-1 overflow-y-auto">
          {aiOperations.length === 0 ? (
            <p className="text-sm text-surface-500 text-center py-8">
              No AI operations yet. Use the AI assistant to generate content.
            </p>
          ) : (
            aiOperations.map((op) => (
              <OperationRow key={op.id} op={op} onRate={handleRate} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
