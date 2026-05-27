// Node palette — left rail. Drag a card onto the canvas to add a node,
// or click / Enter to drop one at the canvas's default position. The
// click-to-add path exists so keyboard-only users can author without
// the mouse — drag-and-drop has no keyboard equivalent in HTML5 DnD.
//
// Items come from the central node-kind registry; this component just
// renders them. To add a new kind, register it in lib/node-kinds/index.ts —
// it appears here automatically.

import React from 'react';
import { getAllNodeKinds } from '../lib/node-kinds';
import { useWorkflowStore } from '../store/workflowStore';
import type { NodeKind } from '../types/workflow';

const ITEMS = getAllNodeKinds();

/** Where click-to-add drops the new node. The drag-and-drop path
 *  places it at the cursor; click-to-add has no cursor context, so
 *  we use a sensible canvas-center position. Successive clicks
 *  cascade so adds don't stack on top of each other. */
const ADD_ORIGIN = { x: 320, y: 240 };
const ADD_OFFSET = 28;

const NodePalette: React.FC = () => {
  const addNode = useWorkflowStore((s) => s.addNode);
  const nodeCount = useWorkflowStore((s) => s.workflow.nodes.length);

  const onDragStart = (e: React.DragEvent<HTMLDivElement>, kind: NodeKind) => {
    e.dataTransfer.setData('application/agicore-studio-node-kind', kind);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onActivate = (kind: NodeKind) => {
    // Cascade the position so repeated clicks fan out rather than stacking.
    addNode(kind, {
      x: ADD_ORIGIN.x + nodeCount * ADD_OFFSET,
      y: ADD_ORIGIN.y + nodeCount * ADD_OFFSET,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, kind: NodeKind) => {
    // Standard activation keys for role="button" — Enter and Space.
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate(kind);
    }
  };

  return (
    <aside
      className="w-56 h-full bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col overflow-hidden"
      aria-label="Node palette"
    >
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">Nodes</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
          Drag onto the canvas, or click to add.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" role="list">
        {ITEMS.map((item) => (
          <div
            key={item.kind}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(e) => onDragStart(e, item.kind)}
            onClick={() => onActivate(item.kind)}
            onKeyDown={(e) => onKeyDown(e, item.kind)}
            aria-label={`Add a ${item.paletteLabel} node`}
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
