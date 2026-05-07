import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import type { QcTask, AiAsset } from '../../shared/types';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export default function QcQueueView() {
  const { qcTasks, setQcTasks, aiAssets, setAiAssets } = useAppStore();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tasks, assets] = await Promise.all([
        window.electronAPI.getQcTasks(),
        window.electronAPI.getAiAssets(),
      ]);
      setQcTasks(tasks);
      setAiAssets(assets);
    } catch (err) {
      console.error('Failed to load QC data:', err);
    }
    setLoading(false);
  }

  const filteredTasks = filter === 'all'
    ? qcTasks
    : qcTasks.filter((t) => t.status === filter);

  function getAssetForTask(task: QcTask): AiAsset | undefined {
    return aiAssets.find((a) => a.id === task.assetId);
  }

  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: qcTasks.length },
    { key: 'pending', label: 'Pending', count: qcTasks.filter((t) => t.status === 'pending').length },
    { key: 'approved', label: 'Approved', count: qcTasks.filter((t) => t.status === 'approved').length },
    { key: 'rejected', label: 'Rejected', count: qcTasks.filter((t) => t.status === 'rejected').length },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">QC Queue</h1>
      <p className="text-gray-400 text-sm mb-5">
        Review pending assets and approve or reject them before they go live.
      </p>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setExpandedTaskId(null); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              filter === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-gray-200 hover:bg-slate-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse text-sm">Loading QC tasks...</p>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-10 text-center">
          <p className="text-gray-500 text-sm">
            {filter === 'all' ? 'No QC tasks found.' : `No ${filter} tasks.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const asset = getAssetForTask(task);
            const isExpanded = expandedTaskId === task.id;

            return (
              <div key={task.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                {/* Summary row */}
                <button
                  onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-750 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {asset?.title ?? 'Unknown Asset'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Created {formatDate(task.createdAt)}
                      {task.reviewer && <> &middot; Reviewer: {task.reviewer}</>}
                    </p>
                  </div>
                  <TypeBadge type={task.assetType} />
                  <StatusBadge status={task.status} />
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Detail panel */}
                {isExpanded && (
                  <TaskDetail
                    task={task}
                    asset={asset ?? null}
                    onAction={loadData}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task Detail (expanded view)
// ---------------------------------------------------------------------------

function TaskDetail({
  task,
  asset,
  onAction,
}: {
  task: QcTask;
  asset: AiAsset | null;
  onAction: () => Promise<void>;
}) {
  const [notes, setNotes] = useState(task.notes ?? '');
  const [reviewer, setReviewer] = useState(task.reviewer ?? '');
  const [processing, setProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function handleApprove() {
    if (!reviewer.trim()) return;
    setProcessing(true);
    try {
      await window.electronAPI.approveQcTask(task.id, reviewer.trim(), notes.trim() || undefined);
      await onAction();
    } catch (err) {
      console.error('Failed to approve task:', err);
    }
    setProcessing(false);
  }

  async function handleReject() {
    if (!reviewer.trim() || !notes.trim()) return;
    setProcessing(true);
    try {
      await window.electronAPI.rejectQcTask(task.id, reviewer.trim(), notes.trim());
      await onAction();
    } catch (err) {
      console.error('Failed to reject task:', err);
    }
    setProcessing(false);
  }

  function toggleAudio() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }

  const isPending = task.status === 'pending';

  return (
    <div className="border-t border-slate-700 px-4 py-4 bg-slate-800/60">
      {/* Asset info */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
        <InfoRow label="Title" value={asset?.title ?? 'N/A'} />
        <InfoRow label="Type" value={asset?.assetType ?? task.assetType} />
        <InfoRow label="Description" value={asset?.description || '(none)'} />
        <InfoRow label="Style" value={asset?.style ?? 'N/A'} />
        <InfoRow label="File Path" value={asset?.filePath ?? 'N/A'} />
        <InfoRow label="Source" value={asset?.source ?? 'N/A'} />
        {asset?.durationSeconds != null && (
          <InfoRow
            label="Duration"
            value={`${Math.floor(asset.durationSeconds / 60)}:${String(asset.durationSeconds % 60).padStart(2, '0')}`}
          />
        )}
      </div>

      {/* Audio playback */}
      {asset?.assetType === 'audio' && asset.filePath && (
        <div className="mb-4">
          <audio
            ref={audioRef}
            src={`file://${asset.filePath}`}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <button
            onClick={toggleAudio}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-200 text-xs rounded-lg transition"
          >
            {isPlaying ? 'Pause Audio' : 'Play Audio'}
          </button>
        </div>
      )}

      {/* Image preview */}
      {asset?.assetType === 'image' && asset.filePath && (
        <div className="mb-4">
          <img
            src={`file://${asset.filePath}`}
            alt={asset.title}
            className="max-h-48 rounded-lg border border-slate-700"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Review controls (only for pending tasks) */}
      {isPending && (
        <div className="space-y-3 pt-2 border-t border-slate-700">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Reviewer Name</label>
            <input
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              placeholder="Your name..."
              className="w-full max-w-xs bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Review notes (required for rejection)..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-200 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={processing || !reviewer.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {processing ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={handleReject}
              disabled={processing || !reviewer.trim() || !notes.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
              title={!notes.trim() ? 'Notes are required for rejection' : ''}
            >
              {processing ? 'Processing...' : 'Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Completed review info */}
      {!isPending && (
        <div className="pt-2 border-t border-slate-700">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {task.reviewer && <InfoRow label="Reviewed By" value={task.reviewer} />}
            {task.completedAt && <InfoRow label="Completed" value={formatDate(task.completedAt)} />}
            {task.notes && <InfoRow label="Notes" value={task.notes} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
      <p className="text-sm text-gray-300 truncate">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-300',
    approved: 'bg-green-500/20 text-green-300',
    rejected: 'bg-red-500/20 text-red-300',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap ${colors[status] ?? 'bg-slate-600 text-gray-300'}`}>
      {status.toUpperCase()}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    image: 'bg-sky-500/20 text-sky-300',
    video: 'bg-purple-500/20 text-purple-300',
    audio: 'bg-teal-500/20 text-teal-300',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-medium whitespace-nowrap ${colors[type] ?? 'bg-slate-600 text-gray-300'}`}>
      {type.toUpperCase()}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
