// Interactive canvas — MVP version.
// Reads from the workflow store, writes back via store actions.
// Supports drop-from-palette, drag-to-move, click-to-select,
// drag-handle-to-connect, keyboard-to-delete.

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import StudioNode from './StudioNode';
import {
  useWorkflowStore,
} from '../store/workflowStore';
import type { NodeKind, WorkflowNode } from '../types/workflow';

const nodeTypes: NodeTypes = { studio: StudioNode };

const CanvasInner: React.FC = () => {
  const { screenToFlowPosition } = useReactFlow();

  const workflow = useWorkflowStore((s) => s.workflow);
  const addNode = useWorkflowStore((s) => s.addNode);
  const moveNode = useWorkflowStore((s) => s.moveNode);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const deleteEdge = useWorkflowStore((s) => s.deleteEdge);
  const addEdge = useWorkflowStore((s) => s.addEdge);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const selectEdge = useWorkflowStore((s) => s.selectEdge);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const selectedEdgeId = useWorkflowStore((s) => s.selectedEdgeId);

  // Map our workflow model into the shape React Flow consumes.
  const rfNodes: Node[] = useMemo(
    () =>
      workflow.nodes.map((n) => ({
        id: n.id,
        type: 'studio',
        position: n.position,
        selected: n.id === selectedNodeId,
        data: {
          name: n.name,
          nodeType: n.kind,
          detail: detailFor(n),
        },
      })),
    [workflow.nodes, selectedNodeId],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      workflow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.whenExpression ?? undefined,
        selected: e.id === selectedEdgeId,
      })),
    [workflow.edges, selectedEdgeId],
  );

  // Position updates from React Flow's internal change stream
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      for (const c of changes) {
        if (c.type === 'position' && c.position) {
          moveNode(c.id, c.position);
        }
      }
    },
    [moveNode],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (_changes) => {
      // Edge changes (delete, select) are handled via our own onEdgesDelete
      // and selection callbacks; we ignore RF's internal change events.
    },
    [],
  );

  const onConnect: OnConnect = useCallback(
    (conn: Connection) => {
      if (conn.source && conn.target) {
        addEdge(conn.source, conn.target);
      }
    },
    [addEdge],
  );

  const onSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) => {
      if (nodes.length > 0) {
        selectNode(nodes[0].id);
      } else if (edges.length > 0) {
        selectEdge(edges[0].id);
      } else {
        selectNode(null);
      }
    },
    [selectNode, selectEdge],
  );

  const onNodesDelete = useCallback(
    (nodes: Node[]) => {
      for (const n of nodes) deleteNode(n.id);
    },
    [deleteNode],
  );

  const onEdgesDelete = useCallback(
    (edges: Edge[]) => {
      for (const e of edges) deleteEdge(e.id);
    },
    [deleteEdge],
  );

  // Drop-from-palette
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData(
        'application/agicore-studio-node-kind',
      ) as NodeKind;
      if (!kind) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(kind, position);
    },
    [addNode, screenToFlowPosition],
  );

  // Keyboard delete (when nothing else is focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      // Don't steal Delete when typing in an input
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (selectedNodeId) {
        e.preventDefault();
        deleteNode(selectedNodeId);
      } else if (selectedEdgeId) {
        e.preventDefault();
        deleteEdge(selectedEdgeId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge]);

  return (
    <div className="w-full h-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.0}
        deleteKeyCode={null}             // we handle delete ourselves
        defaultEdgeOptions={{
          style: { strokeWidth: 1.5 },
          labelStyle: { fontSize: 10, fill: '#71717a' },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as { nodeType: NodeKind };
            switch (data.nodeType) {
              case 'start':         return '#10b981';
              case 'http_call':     return '#475569';
              case 'ai_call':       return '#7c3aed';
              case 'qc_checkpoint': return '#06b6d4';
              case 'branch':        return '#f59e0b';
              case 'end':           return '#6b7280';
              default:              return '#52525b';
            }
          }}
          maskColor="rgba(10, 10, 10, 0.6)"
        />
      </ReactFlow>
    </div>
  );
};

// Render-time accessor for the node's display detail line.
function detailFor(n: WorkflowNode): string | undefined {
  const p = n.properties;
  switch (n.kind) {
    case 'http_call':     return p.method && p.url ? `${p.method} ${p.url}` : undefined;
    case 'ai_call':       return p.prompt ? truncate(p.prompt as string, 60) : undefined;
    case 'qc_checkpoint': return p.upstreamFrom ? `from ${p.upstreamFrom}` : undefined;
    case 'branch':        return p.condition ? truncate(p.condition as string, 60) : undefined;
    default:              return undefined;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

const Canvas: React.FC = () => (
  <ReactFlowProvider>
    <CanvasInner />
  </ReactFlowProvider>
);

export default Canvas;
