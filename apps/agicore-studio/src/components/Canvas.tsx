// Canvas — React Flow rendering of the canonical workflow.
//
// Sprint 0 scope: load the hardcoded canonical workflow, render it, allow
// pan / zoom / drag of existing nodes. No add-node, no draw-edge, no
// delete. Validates React Flow at our planned scale (5 nodes here, will
// stress to 200+ in MVP work).

import React, { useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
} from '@xyflow/react';
import StudioNode from './StudioNode';
import { CANONICAL_NODES, CANONICAL_EDGES, type StudioNodeData } from '../lib/canonical-workflow';

const nodeTypes: NodeTypes = { studio: StudioNode };

const CanvasInner: React.FC = () => {
  const [nodes, setNodes] = useState<Node<StudioNodeData>[]>(CANONICAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(CANONICAL_EDGES);

  const onNodesChange = (changes: NodeChange[]) =>
    setNodes((ns) => applyNodeChanges(changes, ns) as Node<StudioNodeData>[]);
  const onEdgesChange = (changes: EdgeChange[]) =>
    setEdges((es) => applyEdgeChanges(changes, es));

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2.0}
      defaultEdgeOptions={{
        style: { strokeWidth: 1.5 },
        labelStyle: { fontSize: 10, fill: '#71717a' },
      }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(n) => {
          const data = n.data as StudioNodeData;
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
  );
};

const Canvas: React.FC = () => (
  <ReactFlowProvider>
    <CanvasInner />
  </ReactFlowProvider>
);

export default Canvas;
