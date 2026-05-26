// In-memory representation of the canonical workflow (examples/canonical_workflow.agi).
// Used by the Sprint 0 bench scaffolds to render the canvas + populate the editor.
//
// When the .agi parser is wired up in MVP work, this hardcoded structure goes
// away — the canvas will render whatever the parsed file produces.

import type { Edge, Node } from '@xyflow/react';

export type StudioNodeType =
  | 'start'
  | 'http_call'
  | 'ai_call'
  | 'qc_checkpoint'
  | 'branch'
  | 'end';

export interface StudioNodeData {
  name: string;
  nodeType: StudioNodeType;
  detail?: string;
  [key: string]: unknown;
}

export const CANONICAL_NODES: Node<StudioNodeData>[] = [
  {
    id: 'start',
    type: 'studio',
    position: { x: 60, y: 200 },
    data: { name: 'Start', nodeType: 'start' },
  },
  {
    id: 'fetch_article',
    type: 'studio',
    position: { x: 280, y: 200 },
    data: {
      name: 'fetch_article',
      nodeType: 'http_call',
      detail: 'GET {{input.article_url}}',
    },
  },
  {
    id: 'summarize',
    type: 'studio',
    position: { x: 560, y: 200 },
    data: {
      name: 'summarize',
      nodeType: 'ai_call',
      detail: 'Summarize in 3 sentences',
    },
  },
  {
    id: 'human_review',
    type: 'studio',
    position: { x: 840, y: 200 },
    data: {
      name: 'human_review',
      nodeType: 'qc_checkpoint',
      detail: 'Approve / edit / reject',
    },
  },
  {
    id: 'post_summary',
    type: 'studio',
    position: { x: 1120, y: 200 },
    data: {
      name: 'post_summary',
      nodeType: 'http_call',
      detail: 'POST {{input.destination_url}}',
    },
  },
  {
    id: 'end',
    type: 'studio',
    position: { x: 1380, y: 200 },
    data: { name: 'End', nodeType: 'end' },
  },
];

export const CANONICAL_EDGES: Edge[] = [
  { id: 'e-start-fetch',    source: 'start',         target: 'fetch_article', animated: false },
  { id: 'e-fetch-summ',     source: 'fetch_article', target: 'summarize',     animated: false },
  { id: 'e-summ-qc',        source: 'summarize',     target: 'human_review',  animated: false },
  { id: 'e-qc-post',        source: 'human_review',  target: 'post_summary',  animated: false,
    label: 'approved | edited' },
  { id: 'e-post-end',       source: 'post_summary',  target: 'end',           animated: false },
];
