// Custom React Flow node renderer — one component handles all node types
// via the nodeType field on data. Per-type styling via the border-left color.
// Status painting (idle/running/succeeded/failed) reads from runStore.

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeKind } from '../types/workflow';
import { useNodeRunStatus } from '../store/runStore';
import { useDebugStore, useHasBreakpoint } from '../store/debugStore';
import { getNodeKind } from '../lib/node-kinds';
import type { NodeRunStatus } from '../types/run';

interface StudioNodeData {
  id: string;
  name: string;
  nodeType: NodeKind;
  detail?: string;
  [key: string]: unknown;
}

const STATUS_RING: Record<NodeRunStatus, string> = {
  idle:              'transparent',
  running:           '#fbbf24',     // amber
  succeeded:         '#10b981',     // green
  failed:            '#ef4444',     // red
  paused_qc:         '#06b6d4',     // cyan — same as QC accent
  paused_breakpoint: '#ef4444',     // red — matches the breakpoint dot
  skipped:           '#52525b',     // muted
};

const STATUS_GLYPH: Record<NodeRunStatus, string> = {
  idle:              '',
  running:           '●',
  succeeded:         '✓',
  failed:            '✕',
  paused_qc:         '◐',
  paused_breakpoint: '⏸',
  skipped:           '—',
};

const StudioNodeImpl: React.FC<NodeProps> = ({ id, data }) => {
  const d = data as StudioNodeData;
  const def = getNodeKind(d.nodeType);
  const accentColor = def.cssVar;
  const runStatus = useNodeRunStatus(id);
  const ringColor = STATUS_RING[runStatus];
  const glyph = STATUS_GLYPH[runStatus];
  const hasBreakpoint = useHasBreakpoint(id);
  const toggleBreakpoint = useDebugStore((s) => s.toggleBreakpoint);

  return (
    <div
      className={`studio-node ${runStatus === 'running' ? 'studio-node-running' : ''}`}
      style={{
        borderLeftColor: accentColor,
        boxShadow: runStatus !== 'idle' ? `0 0 0 2px ${ringColor}, 0 2px 8px rgba(0,0,0,0.4)` : undefined,
      }}
    >
      {/* Breakpoint marker — clickable, always-visible when set, hover-revealed otherwise */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleBreakpoint(id); }}
        title={hasBreakpoint ? 'Clear breakpoint' : 'Set breakpoint'}
        className={`absolute -top-1.5 -left-1.5 w-3 h-3 rounded-full border transition-opacity ${
          hasBreakpoint
            ? 'bg-red-500 border-red-700 opacity-100'
            : 'bg-transparent border-[var(--text-muted)] opacity-0 hover:opacity-100 group-hover:opacity-60'
        }`}
        style={{ zIndex: 2 }}
      />
      {def.hasInput && <Handle type="target" position={Position.Left} />}
      <div className="flex items-center justify-between gap-2">
        <div className="node-type" style={{ color: accentColor }}>
          {def.shortLabel}
        </div>
        {glyph && (
          <span className="text-xs font-bold" style={{ color: ringColor }}>
            {glyph}
          </span>
        )}
      </div>
      <div className="node-name">{d.name}</div>
      {d.detail && <div className="node-detail">{d.detail}</div>}
      {def.hasOutput && <Handle type="source" position={Position.Right} />}
    </div>
  );
};

// Memoized — React Flow re-renders nodes on every position change of
// any node by default. Memoizing on (id, data) means a single drag of
// node A doesn't churn the DOM of nodes B..Z. Run-status and
// breakpoint changes still propagate because the store-subscribed
// hooks inside trigger their own re-renders on those slices.
const StudioNode = React.memo(StudioNodeImpl, (prev, next) => {
  if (prev.id !== next.id) return false;
  // data is rebuilt on every Canvas render via useMemo; compare by
  // discriminator fields only — name, kind, detail.
  const pd = prev.data as { name: string; nodeType: string; detail?: string };
  const nd = next.data as { name: string; nodeType: string; detail?: string };
  return pd.name === nd.name && pd.nodeType === nd.nodeType && pd.detail === nd.detail;
});

export default StudioNode;
