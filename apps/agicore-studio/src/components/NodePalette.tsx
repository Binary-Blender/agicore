// Node palette — left rail. Drag a card onto the canvas to add a node.

import React from 'react';
import type { NodeKind } from '../types/workflow';

interface PaletteItem {
  kind: NodeKind;
  label: string;
  description: string;
  accentVar: string;          // CSS var for the accent stripe
}

const ITEMS: PaletteItem[] = [
  { kind: 'start',           label: 'Start',           description: 'Workflow entry point',                accentVar: 'var(--node-start)' },
  { kind: 'http_call',       label: 'HTTP Call',       description: 'GET / POST / PUT / DELETE',           accentVar: 'var(--node-http)' },
  { kind: 'ai_call',         label: 'AI Call',         description: 'LLM with templated prompt',           accentVar: 'var(--node-ai)' },
  { kind: 'qc_checkpoint',   label: 'Human QC',        description: 'Pause for human approval',            accentVar: 'var(--node-qc)' },
  { kind: 'branch',          label: 'Branch',          description: 'Conditional routing',                 accentVar: 'var(--node-branch)' },
  { kind: 'loop',            label: 'Loop',            description: 'Iterate downstream over a collection', accentVar: 'var(--node-loop)' },
  { kind: 'parallel_fanout', label: 'Parallel Fanout', description: 'Run multiple downstream paths',       accentVar: 'var(--node-fanout)' },
  { kind: 'router_call',     label: 'Router Call',     description: 'Dispatch via a tier-based router',    accentVar: 'var(--node-router)' },
  { kind: 'end',             label: 'End',             description: 'Workflow exit',                       accentVar: 'var(--node-end)' },
];

const NodePalette: React.FC = () => {
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, kind: NodeKind) => {
    e.dataTransfer.setData('application/agicore-studio-node-kind', kind);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-56 h-full bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">Nodes</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
          Drag onto the canvas
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {ITEMS.map((item) => (
          <div
            key={item.kind}
            draggable
            onDragStart={(e) => onDragStart(e, item.kind)}
            className="px-3 py-2 rounded-md bg-[var(--bg-panel-2)] border border-[var(--border)] hover:border-[var(--accent)] cursor-grab active:cursor-grabbing transition-colors"
            style={{ borderLeftWidth: 4, borderLeftColor: item.accentVar }}
          >
            <p className="text-sm font-semibold">{item.label}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default NodePalette;
