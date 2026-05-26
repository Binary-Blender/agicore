// Custom React Flow node renderer — one component handles all node types
// via the nodeType field on data. Per-type styling via the border-left color.
// Status painting (idle/running/succeeded/failed) reads from runStore.

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeKind } from '../types/workflow';
import { useNodeRunStatus } from '../store/runStore';
import type { NodeRunStatus } from '../types/run';

interface StudioNodeData {
  id: string;
  name: string;
  nodeType: NodeKind;
  detail?: string;
  [key: string]: unknown;
}

const TYPE_COLORS: Record<NodeKind, string> = {
  start:           'var(--node-start)',
  http_call:       'var(--node-http)',
  ai_call:         'var(--node-ai)',
  qc_checkpoint:   'var(--node-qc)',
  branch:          'var(--node-branch)',
  loop:            'var(--node-loop)',
  parallel_fanout: 'var(--node-fanout)',
  router_call:     'var(--node-router)',
  end:             'var(--node-end)',
};

const TYPE_LABEL: Record<NodeKind, string> = {
  start:           'start',
  http_call:       'HTTP',
  ai_call:         'AI',
  qc_checkpoint:   'Human QC',
  branch:          'branch',
  loop:            'loop',
  parallel_fanout: 'fanout',
  router_call:     'router',
  end:             'end',
};

const STATUS_RING: Record<NodeRunStatus, string> = {
  idle:       'transparent',
  running:    '#fbbf24',     // amber
  succeeded:  '#10b981',     // green
  failed:     '#ef4444',     // red
  paused_qc:  '#06b6d4',     // cyan — same as QC accent
  skipped:    '#52525b',     // muted
};

const STATUS_GLYPH: Record<NodeRunStatus, string> = {
  idle:       '',
  running:    '●',
  succeeded:  '✓',
  failed:     '✕',
  paused_qc:  '◐',
  skipped:    '—',
};

const StudioNode: React.FC<NodeProps> = ({ id, data }) => {
  const d = data as StudioNodeData;
  const accentColor = TYPE_COLORS[d.nodeType];
  const isStart = d.nodeType === 'start';
  const isEnd = d.nodeType === 'end';
  const runStatus = useNodeRunStatus(id);
  const ringColor = STATUS_RING[runStatus];
  const glyph = STATUS_GLYPH[runStatus];

  return (
    <div
      className={`studio-node ${runStatus === 'running' ? 'studio-node-running' : ''}`}
      style={{
        borderLeftColor: accentColor,
        boxShadow: runStatus !== 'idle' ? `0 0 0 2px ${ringColor}, 0 2px 8px rgba(0,0,0,0.4)` : undefined,
      }}
    >
      {!isStart && <Handle type="target" position={Position.Left} />}
      <div className="flex items-center justify-between gap-2">
        <div className="node-type" style={{ color: accentColor }}>
          {TYPE_LABEL[d.nodeType]}
        </div>
        {glyph && (
          <span className="text-xs font-bold" style={{ color: ringColor }}>
            {glyph}
          </span>
        )}
      </div>
      <div className="node-name">{d.name}</div>
      {d.detail && <div className="node-detail">{d.detail}</div>}
      {!isEnd && <Handle type="source" position={Position.Right} />}
    </div>
  );
};

export default StudioNode;
