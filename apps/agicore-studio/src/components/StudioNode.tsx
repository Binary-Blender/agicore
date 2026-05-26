// Custom React Flow node renderer — one component handles all node types
// via the nodeType field on data. Per-type styling via the border-left color.

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeKind } from '../types/workflow';

interface StudioNodeData {
  name: string;
  nodeType: NodeKind;
  detail?: string;
  [key: string]: unknown;
}

const TYPE_COLORS: Record<NodeKind, string> = {
  start:         'var(--node-start)',
  http_call:     'var(--node-http)',
  ai_call:       'var(--node-ai)',
  qc_checkpoint: 'var(--node-qc)',
  branch:        'var(--node-branch)',
  end:           'var(--node-end)',
};

const TYPE_LABEL: Record<NodeKind, string> = {
  start:         'start',
  http_call:     'HTTP',
  ai_call:       'AI',
  qc_checkpoint: 'Human QC',
  branch:        'branch',
  end:           'end',
};

const StudioNode: React.FC<NodeProps> = ({ data }) => {
  const d = data as StudioNodeData;
  const accentColor = TYPE_COLORS[d.nodeType];
  const isStart = d.nodeType === 'start';
  const isEnd = d.nodeType === 'end';

  return (
    <div className="studio-node" style={{ borderLeftColor: accentColor }}>
      {!isStart && <Handle type="target" position={Position.Left} />}
      <div className="node-type" style={{ color: accentColor }}>
        {TYPE_LABEL[d.nodeType]}
      </div>
      <div className="node-name">{d.name}</div>
      {d.detail && <div className="node-detail">{d.detail}</div>}
      {!isEnd && <Handle type="source" position={Position.Right} />}
    </div>
  );
};

export default StudioNode;
