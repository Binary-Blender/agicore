import React, { useEffect, useState, useMemo } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { Version } from '../../shared/types';

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

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  auto: { label: 'Auto', color: 'text-surface-500 bg-surface-800' },
  manual: { label: 'Checkpoint', color: 'text-green-400 bg-green-600/20' },
  'ai-operation': { label: 'AI', color: 'text-accent-400 bg-accent-600/20' },
};

// Simple line-based diff
interface DiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack
  const ops: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: 'same', text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', text: newLines[j - 1] });
      j--;
    } else {
      ops.push({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }
  ops.reverse();
  return ops;
}

function extractText(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.content && Array.isArray(node.content)) {
    return node.content
      .map((child: any) => extractText(child))
      .join(node.type === 'paragraph' || node.type === 'heading' ? '\n' : '');
  }
  return '';
}

function versionToText(version: Version): string {
  try {
    const doc = JSON.parse(version.content);
    return extractText(doc);
  } catch {
    return '(empty)';
  }
}

export default function VersionHistoryPanel() {
  const {
    versions,
    currentChapter,
    loadVersions,
    createVersion,
    restoreVersion,
    deleteVersion,
    setShowVersionHistory,
  } = useWriterStore();

  const [snapshotName, setSnapshotName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [diffVersionA, setDiffVersionA] = useState<string | null>(null);
  const [diffVersionB, setDiffVersionB] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [currentChapter?.id]);

  const handleCreateCheckpoint = async () => {
    if (!snapshotName.trim()) return;
    await createVersion(snapshotName.trim());
    setSnapshotName('');
    setShowNameInput(false);
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm('This will overwrite the current chapter content. A pre-restore snapshot will be saved automatically. Continue?')) return;
    await restoreVersion(versionId);
  };

  const handleDelete = async (versionId: string) => {
    if (!confirm('Delete this version snapshot?')) return;
    await deleteVersion(versionId);
  };

  const handleCompare = (versionId: string) => {
    if (!diffVersionA) {
      setDiffVersionA(versionId);
    } else if (diffVersionA === versionId) {
      setDiffVersionA(null);
    } else {
      setDiffVersionB(versionId);
      setShowDiff(true);
    }
  };

  const closeDiff = () => {
    setShowDiff(false);
    setDiffVersionA(null);
    setDiffVersionB(null);
  };

  const diffLines = useMemo(() => {
    if (!showDiff || !diffVersionA || !diffVersionB) return [];
    const vA = versions.find((v) => v.id === diffVersionA);
    const vB = versions.find((v) => v.id === diffVersionB);
    if (!vA || !vB) return [];
    // A is older, B is newer — sort by creation date
    const older = new Date(vA.createdAt) < new Date(vB.createdAt) ? vA : vB;
    const newer = older === vA ? vB : vA;
    return computeDiff(versionToText(older), versionToText(newer));
  }, [showDiff, diffVersionA, diffVersionB, versions]);

  const versionLabel = (id: string) => {
    const v = versions.find((v) => v.id === id);
    return v?.snapshotName || timeAgo(v?.createdAt || '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className={`bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] ${showDiff ? 'w-[900px]' : 'w-[500px]'} max-h-[80vh] flex flex-col shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-surface-200">
              {showDiff ? 'Version Comparison' : 'Version History'}
            </h2>
            <p className="text-xs text-surface-500 mt-0.5">
              {showDiff
                ? `${versionLabel(diffVersionA!)} vs ${versionLabel(diffVersionB!)}`
                : (currentChapter?.title ?? 'No chapter selected')}
            </p>
          </div>
          <div className="flex gap-2">
            {showDiff && (
              <button
                onClick={closeDiff}
                className="text-primary-400 hover:text-primary-300 text-sm"
              >
                Back
              </button>
            )}
            <button
              onClick={() => setShowVersionHistory(false)}
              className="text-surface-500 hover:text-surface-300 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {showDiff ? (
          /* Diff view */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex gap-4 mb-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-600/30 border border-red-500/30" />
                <span className="text-surface-400">Removed</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-600/30 border border-green-500/30" />
                <span className="text-surface-400">Added</span>
              </span>
            </div>
            <div className="bg-[var(--bg-page)] rounded border border-[var(--border)] p-3 font-mono text-xs leading-relaxed max-h-[55vh] overflow-y-auto">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  className={`px-2 py-0.5 ${
                    line.type === 'added'
                      ? 'bg-green-600/15 text-green-300'
                      : line.type === 'removed'
                      ? 'bg-red-600/15 text-red-300'
                      : 'text-surface-400'
                  }`}
                >
                  <span className="inline-block w-4 text-surface-600 select-none">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </span>
                  {line.text || '\u00A0'}
                </div>
              ))}
              {diffLines.length === 0 && (
                <div className="text-surface-500 text-center py-4">No differences found.</div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Save checkpoint */}
            <div className="px-4 py-3 border-b border-[var(--border)] shrink-0">
              {showNameInput ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="flex-1 bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1.5 text-sm border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                    placeholder="Checkpoint name..."
                    value={snapshotName}
                    onChange={(e) => setSnapshotName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateCheckpoint();
                      if (e.key === 'Escape') { setShowNameInput(false); setSnapshotName(''); }
                    }}
                  />
                  <button
                    onClick={handleCreateCheckpoint}
                    disabled={!snapshotName.trim()}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm rounded transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setShowNameInput(false); setSnapshotName(''); }}
                    className="px-3 py-1.5 text-surface-400 hover:text-surface-200 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNameInput(true)}
                    disabled={!currentChapter}
                    className="flex-1 py-2 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 text-sm rounded transition-colors disabled:opacity-50"
                  >
                    Save Checkpoint
                  </button>
                  {diffVersionA && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-primary-400">Select second version to compare...</span>
                      <button
                        onClick={() => setDiffVersionA(null)}
                        className="text-xs text-surface-500 hover:text-surface-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Version list */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {!currentChapter ? (
                <p className="text-sm text-surface-500 text-center py-8">No chapter selected</p>
              ) : versions.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-8">
                  No versions yet. Versions are created automatically when you edit, or you can save a named checkpoint above.
                </p>
              ) : (
                <div className="space-y-1">
                  {versions.map((version, idx) => {
                    const source = SOURCE_LABELS[version.source] ?? SOURCE_LABELS.auto;
                    const prevVersion = versions[idx + 1];
                    const wordDiff = prevVersion
                      ? version.wordCount - prevVersion.wordCount
                      : null;
                    const isSelectedForDiff = diffVersionA === version.id;

                    return (
                      <div
                        key={version.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-white/5 group ${
                          isSelectedForDiff ? 'ring-1 ring-primary-500 bg-primary-600/10' : ''
                        }`}
                      >
                        {/* Source badge */}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${source.color}`}>
                          {source.label}
                        </span>

                        {/* Name / time */}
                        <div className="flex-1 min-w-0">
                          {version.snapshotName ? (
                            <div className="text-sm text-surface-200 truncate">{version.snapshotName}</div>
                          ) : null}
                          <div className="text-xs text-surface-500">{timeAgo(version.createdAt)}</div>
                        </div>

                        {/* Word count + diff */}
                        <div className="text-right shrink-0">
                          <div className="text-xs text-surface-500">{version.wordCount}w</div>
                          {wordDiff !== null && wordDiff !== 0 && (
                            <div className={`text-[10px] ${wordDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {wordDiff > 0 ? '+' : ''}{wordDiff}w
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => handleCompare(version.id)}
                            className={`px-2 py-1 text-[10px] rounded transition-colors ${
                              isSelectedForDiff
                                ? 'bg-primary-600/30 text-primary-300'
                                : 'bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30'
                            }`}
                          >
                            {isSelectedForDiff ? 'Selected' : 'Compare'}
                          </button>
                          <button
                            onClick={() => handleRestore(version.id)}
                            className="px-2 py-1 text-[10px] bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 rounded transition-colors"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleDelete(version.id)}
                            className="px-2 py-1 text-[10px] bg-red-600/10 text-red-400 hover:bg-red-600/20 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
