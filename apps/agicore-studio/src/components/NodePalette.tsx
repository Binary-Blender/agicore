// Node palette — left rail. Drag a card onto the canvas to add a node.
// Items come from the central node-kind registry; this component just
// renders them. To add a new kind, register it in lib/node-kinds/index.ts —
// it appears here automatically.

import React from 'react';
import { getAllNodeKinds } from '../lib/node-kinds';
import type { NodeKind } from '../types/workflow';

const ITEMS = getAllNodeKinds();

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
            style={{ borderLeftWidth: 4, borderLeftColor: item.cssVar }}
          >
            <p className="text-sm font-semibold">{item.paletteLabel}</p>
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
